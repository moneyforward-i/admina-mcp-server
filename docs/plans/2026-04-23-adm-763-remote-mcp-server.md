# ADM-763 — Remote MCP server for admina-mcp-server

**Ticket:** https://www.notion.so/mfi/Remote-MCP-server-33a9b9c183cb8069aa4cd5e1b8c6545b
**PDD reference:** https://github.com/moneyforward-i/admina-product-document/discussions/36
**Branch:** `feat/adm-763-remote-mcp-server`
**Planner model used:** `anthropic/claude-opus-4-7` (max thinking)

## Context

`admina-mcp-server` is currently a **stdio-only** MCP server distributed as an npm package. End users run it locally (via `npx`) and configure it with `ADMINA_API_KEY` + `ADMINA_ORGANIZATION_ID` environment variables. All ~30 tools hit Admina's REST API at `https://api.itmc.i.moneyforward.com/api/v1`.

The ticket asks to publish a **Remote MCP server** so third-party AI agent developers and in-house builders can connect to Admina over HTTP instead of spawning a local process. This is the first piece of a broader "open platform" strategy (the second piece — Public API — is out of scope for this ticket).

### Requirements from the PDD

In scope:

1. Remote MCP transport (HTTP-based) — users connect their MCP clients over the network.
2. All existing Admina-Helpdesk tools exposed identically over remote MCP (maximum coverage).
3. Multi-tenant support — a single deployed instance can serve multiple organizations by accepting credentials per request.
4. Multi-tenant switching UX on the client side: client registers two server entries (one per tenant); server itself does not multiplex.
5. Documentation on `docs.itmc` (followed up separately — we ship a `docs/remote-mcp.md` here).

Out of scope:

- MCP for Helpdesk chat sessions (admin-bot interaction)
- Public REST API (separate ticket)
- OAuth 2.1 flow — pragmatic bearer-token auth for MVP; can layer OAuth later.

## Current architecture + gaps

```
src/
├── index.ts              # Server + Stdio transport, inlined
├── admina-api.ts         # AdminaApiClient + singleton getClient() reads env vars
├── common/               # error classes, zod schemas, helpers
└── tools/                # 30+ tool handlers — each calls getClient() at exec time
```

Gaps for remote deployment:

1. **`getClient()` singleton reads env vars at first call.** In a multi-tenant HTTP server, one process serves many tenants — a global singleton leaks credentials across requests.
2. **Server is module-scoped.** Instantiated at import time, connected to stdio. No entry point for HTTP.
3. **Tools call `getClient()` with no arguments.** Passing credentials through 30 function signatures is invasive; async context is non-invasive.
4. **No HTTP framework or request auth.**
5. **No CLI transport selector.** `admina-mcp-server` always runs stdio.

## Design decisions

### 1. Transport: Streamable HTTP, stateless mode

MCP SDK `1.26.0` ships `StreamableHTTPServerTransport` (Node-compatible wrapper around the web-standard transport). The spec defines two modes:

- **Stateful** — server generates a session ID on `initialize`, tracks it across requests.
- **Stateless** — `sessionIdGenerator: undefined`. Every POST is independent; no server-side session state.

**Chosen: stateless.**

Rationale:

- Multi-tenant remote deployment wants horizontal scalability — any node can serve any request.
- Credentials come from headers per request, not from an init handshake → no session to maintain.
- Simpler operationally (no session GC, no reconnection logic).

### 2. Auth: Bearer token + organization ID header

Pragmatic, matches Admina's existing REST API auth, minimal client-side config:

```
Authorization: Bearer <ADMINA_API_KEY>
X-Admina-Organization-Id: <ADMINA_ORGANIZATION_ID>
```

Missing/malformed headers → 401 with a JSON error body `{ error: "unauthorized", message: "..." }`.

OAuth 2.1 (the MCP spec's recommended remote auth) can be layered later by wrapping this transport. Out of scope for this ticket.

### 3. Per-request credentials: AsyncLocalStorage

Introduce `src/context.ts`:

```ts
import { AsyncLocalStorage } from "node:async_hooks";

export interface Credentials {
  apiKey: string;
  organizationId: string;
}

const store = new AsyncLocalStorage<Credentials>();

export const withCredentials = <T>(creds: Credentials, fn: () => T): T =>
  store.run(creds, fn);

export const getCurrentCredentials = (): Credentials | undefined => store.getStore();
```

`admina-api.ts` consults the context first, then falls back to env vars (preserves stdio behavior unchanged):

```ts
export const getClient = (): AdminaApiClient => {
  const ctx = getCurrentCredentials();
  if (ctx) return new AdminaApiClient(ctx.apiKey, ctx.organizationId);

  if (clientInstance) return clientInstance;
  const { apiKey, organizationId } = getConfigFromEnv();
  clientInstance = new AdminaApiClient(apiKey, organizationId);
  return clientInstance;
};
```

**Key invariant:** in HTTP mode every request runs inside `withCredentials(...)`, so `getClient()` always returns a fresh, request-scoped client. The env-var singleton path is dead code in HTTP mode.

Trade-offs considered:

- **Pass `client` through every tool function**: 30+ signature changes, touches every tool file. Rejected.
- **Pass credentials via `AuthInfo.extra`**: MCP SDK exposes `AuthInfo` to handlers only via `extra.authInfo` on request context. Usable but requires threading through request handlers. AsyncLocalStorage is simpler and tools don't need to know about the transport.
- **Module-level mutable "current credentials"**: race conditions on concurrent requests. Rejected.

### 4. Server factory: one server per HTTP request, shared factory

`createServer()` in `src/server.ts` builds a fresh `Server` instance with all handlers wired. Each POST to `/mcp` creates its own `Server` + `StreamableHTTPServerTransport`, connects them, handles the request, and closes.

Why one-per-request: the stateless mode is designed for this pattern; it avoids any shared state accidentally leaking between tenants. The `Server` object is cheap — just handler registration.

### 5. No new HTTP framework — use Node `http`

The SDK provides `createMcpExpressApp()` but that pulls in `express`. We only need a single POST endpoint; Node built-in `http` + `URL` parsing is 30 LOC and zero new deps.

Only adding `@hono/node-server` which is already a transitive dep of the MCP SDK — the Streamable HTTP transport uses it internally, no action needed on our part.

### 6. CLI: env-var + flag selector

`admina-mcp-server` (no args / env) → stdio, same as today.
`admina-mcp-server --http [--port N] [--host H]` → HTTP mode.
`MCP_TRANSPORT=http MCP_HTTP_PORT=3000 admina-mcp-server` → same.

Defaults: `--port 3000`, `--host 127.0.0.1`. Bind to loopback by default for safety; operators deploying remotely explicitly opt into `0.0.0.0` or a public interface.

### 7. Backward compatibility

No public API changes for existing stdio users. The only behavior change in stdio mode is that `getClient()` now does an AsyncLocalStorage lookup that always misses — negligible overhead, no semantic difference.

## Acceptance criteria

Derived from the PDD and the architectural decisions:

1. **AC-1 (stdio backward compat):** `admina-mcp-server` invoked with no arguments and valid env vars connects over stdio and behaves exactly as today. All 30 existing tools succeed unchanged.
2. **AC-2 (HTTP happy path):** `admina-mcp-server --http` starts an HTTP server. POST `/mcp` with `Content-Type: application/json`, `Accept: application/json, text/event-stream`, `Authorization: Bearer <valid-key>`, `X-Admina-Organization-Id: <valid-id>`, and a well-formed MCP JSON-RPC body returns a 200 with the expected MCP response.
3. **AC-3 (HTTP list_tools + call_tool):** Over HTTP, `tools/list` returns the same list as stdio; `tools/call` invocations on any existing tool produce equivalent responses (keyed off the AdminaApiClient making real calls — verified via mocked axios in tests).
4. **AC-4 (missing auth):** POST `/mcp` without `Authorization` header returns 401 with `{ error: "unauthorized", message: "Missing or invalid Authorization header" }`.
5. **AC-5 (missing org):** POST `/mcp` with a valid `Authorization` but no `X-Admina-Organization-Id` returns 401 with a clear error.
6. **AC-6 (tenant isolation):** Two concurrent requests with different `(apiKey, orgId)` credentials each see their own credentials inside tool handlers — no cross-contamination. Verified by a test that dispatches two requests with different creds and asserts the outbound axios calls carry the expected `Authorization` and URL `/organizations/<orgId>/...`.
7. **AC-7 (method enforcement):** Non-POST methods (GET, DELETE) on `/mcp` return 405 (or delegated to the SDK's transport which returns 405/400 as per the MCP spec). POST on any other path returns 404.
8. **AC-8 (localhost binding default):** By default the server binds to `127.0.0.1`. An operator can opt into `0.0.0.0` via `--host`.
9. **AC-9 (documentation):** `README.md` describes both stdio and HTTP modes. A new `docs/remote-mcp.md` covers client configuration, headers, auth, and a multi-tenant example.
10. **AC-10 (no regression):** `yarn test` passes all existing tests; `yarn lint` passes; `yarn build` emits a working `build/index.js`.

## Implementation phases

### Phase 1: AsyncLocalStorage credential context

**Files:**

- `src/context.ts` (new)

**Changes:**

- Define `Credentials` interface (`apiKey`, `organizationId`).
- Export `credentialStore` (`AsyncLocalStorage<Credentials>`), `withCredentials(creds, fn)`, `getCurrentCredentials()`.

**Tests:** `src/test/context.test.ts` — verify `run` scoping, nested calls, isolation across two `Promise.all` flows.

### Phase 2: Refactor `admina-api.ts` to read credentials from context

**Files:**

- `src/admina-api.ts` (modified)

**Changes:**

- Extract `getConfigFromEnv()` (private) that reads env vars and throws on missing.
- `getClient()` checks `getCurrentCredentials()` first, constructs and returns a **new** `AdminaApiClient` when context is present (do **not** cache — creds vary per request).
- Preserve the env-var singleton path for stdio mode (no change in behavior).
- Keep `resetClient()` for tests.

**Tests:** extend existing admin-api tests (if any) or add `src/test/admina-api.test.ts` verifying:

- With context set → returns client using context creds, does not hit env.
- Without context, with env vars → returns singleton from env.
- Without context, without env → throws.
- Two concurrent `withCredentials` scopes produce isolated clients.

### Phase 3: Extract server factory

**Files:**

- `src/server.ts` (new)
- `src/index.ts` (refactored)

**Changes:**

- Move `new Server(...)`, `setRequestHandler(ListToolsRequestSchema, ...)`, and `setRequestHandler(CallToolRequestSchema, ...)` from `index.ts` into a `createServer(): Server` factory.
- `index.ts` becomes a thin entry that picks the transport based on args/env.

**Tests:** none — this phase is a pure refactor validated by AC-1 + existing tool tests.

### Phase 4: Stdio transport module

**Files:**

- `src/transports/stdio.ts` (new)

**Changes:**

- `export const runStdio = async () => { const server = createServer(); await server.connect(new StdioServerTransport()); }`.
- Replaces the last two lines of the current `index.ts`.

### Phase 5: HTTP transport module

**Files:**

- `src/transports/http.ts` (new)

**Changes:**

- `export interface HttpOptions { port: number; host: string }`.
- `export const runHttp = async (opts: HttpOptions) => { ... }`:
  - Creates Node `http.Server`.
  - Only accepts POST `/mcp`. Other paths → 404. Other methods on `/mcp` are delegated to the MCP SDK transport which handles them per spec.
  - On POST:
    1. Extract `Authorization: Bearer <key>` and `X-Admina-Organization-Id: <id>`. Respond 401 on missing/malformed.
    2. Parse JSON body (stream `req` → Buffer → `JSON.parse`). Respond 400 on parse error.
    3. `await withCredentials({ apiKey, organizationId }, async () => { ... })`:
       - Create a fresh `Server` via `createServer()`.
       - Create `StreamableHTTPServerTransport({ sessionIdGenerator: undefined })`.
       - `await server.connect(transport)`.
       - `await transport.handleRequest(req, res, parsedBody)`.
       - `res` close triggers `transport.close()` → `server.close()`.
  - Logs basic per-request info (method, path, status) on close. Do not log credentials.

**Tests:** `src/test/transports/http.test.ts`:

- AC-4, AC-5: auth rejections.
- AC-6: two concurrent requests with different creds → axios adapter mock asserts outbound `Authorization` header matches the inbound (two distinct values).
- AC-2, AC-3: happy-path `tools/list` + `tools/call` (axios mocked to return canned Admina responses).

### Phase 6: CLI + entry point

**Files:**

- `src/index.ts` (finalized)

**Changes:**

- Parse `process.argv` for `--http`, `--port <n>`, `--host <s>`.
- Fall back to env: `MCP_TRANSPORT=http`, `MCP_HTTP_PORT`, `MCP_HTTP_HOST`.
- If HTTP mode: `await runHttp({ port, host })`. Else: `await runStdio()`.
- Preserve shebang `#!/usr/bin/env node`.

**Tests:** argv parsing unit test in `src/test/cli.test.ts` (small — just the parser function).

### Phase 7: Documentation + README

**Files:**

- `README.md` (updated)
- `docs/remote-mcp.md` (new)

**Changes:**

- README: add "HTTP (Remote) Mode" section near the existing config snippet. Show both modes.
- `docs/remote-mcp.md`:
  - Why remote MCP (brief).
  - How to run (`admina-mcp-server --http --port 3000`).
  - Required headers with examples.
  - Error responses (401, 400).
  - Multi-tenant client config example — two server entries, one per organization.
  - Security notes: default bind is loopback, use TLS terminator in front for public deployments, credentials live in request headers only.

### Phase 8: Wiring + verification

- `yarn build` — compiles.
- `yarn test` — existing tests green, new tests green.
- `yarn lint` — biome green.
- Local smoke test of HTTP mode with `curl`:
  ```
  curl -sS -X POST http://127.0.0.1:3000/mcp \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -H "Authorization: Bearer $ADMINA_API_KEY" \
    -H "X-Admina-Organization-Id: $ADMINA_ORGANIZATION_ID" \
    -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}'
  ```

## E2E scenarios (documented; automated via unit/integration tests)

1. **Scenario — stdio-mode, `tools/list`:** Spawn `build/index.js` with env vars set, write a JSON-RPC `tools/list` request to stdin, read stdout, verify `result.tools` contains 30+ entries.
2. **Scenario — HTTP-mode, `initialize` + `tools/list` + `tools/call`:** Start `runHttp({ port: 0, host: '127.0.0.1' })` in the test, POST three requests, verify each returns a valid MCP response.
3. **Scenario — HTTP-mode missing auth:** POST without `Authorization` → 401 body contains `error: "unauthorized"`.
4. **Scenario — HTTP-mode tenant isolation:** Fire two `tools/call` invocations (both `get_organization_info`) with different `(apiKey, orgId)` pairs concurrently. Mock axios to capture the outbound requests. Assert each outbound request carries the credentials of the inbound request that spawned it — never swapped.
5. **Scenario — HTTP-mode invalid JSON body:** POST with body `not-json` → 400.
6. **Scenario — HTTP-mode non-POST method:** GET `/mcp` returns 405 (delegated to transport per MCP spec).
7. **Scenario — HTTP-mode unknown path:** POST `/health` returns 404.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| AsyncLocalStorage overhead on hot path | Negligible at the QPS this server sees (Admina API itself is the bottleneck). Not optimizing. |
| StreamableHTTPServerTransport version mismatch | SDK is `^1.10.1` in package.json but installed is `1.26.0` — transport API has been stable since 1.10. Verified by reading the .d.ts. |
| Tenant credential leak through logs | Never log `Authorization` header or request body. Logs only capture method/path/status. |
| Rate-limit abuse on public endpoint | Out of scope — deployed operators are expected to put a rate-limiter / API gateway in front. Documented in `docs/remote-mcp.md`. |
| Existing stdio users break | Env-var fallback path in `getClient()` preserves current semantics exactly. Covered by AC-1 + existing tool tests (already passing on main). |
| Binding `0.0.0.0` by default would be risky | Default to `127.0.0.1`; operator must explicitly set `--host 0.0.0.0`. |

## File inventory (deltas)

| File | Change |
|---|---|
| `src/context.ts` | **new** — AsyncLocalStorage credential context |
| `src/admina-api.ts` | modified — `getClient()` reads context first, falls back to env |
| `src/server.ts` | **new** — `createServer()` factory extracted from `index.ts` |
| `src/transports/stdio.ts` | **new** — `runStdio()` |
| `src/transports/http.ts` | **new** — `runHttp(opts)` with auth + stateless transport |
| `src/index.ts` | refactored — CLI flag/env parse, delegates to transport |
| `src/test/context.test.ts` | **new** |
| `src/test/admina-api.test.ts` | **new** |
| `src/test/transports/http.test.ts` | **new** |
| `src/test/cli.test.ts` | **new** |
| `README.md` | updated — HTTP mode section |
| `docs/remote-mcp.md` | **new** |

No new runtime dependencies. No dev-dep changes unless tests need supertest-style helpers (use `node:http.request` directly to avoid the dep).

## Out of scope / follow-ups

- OAuth 2.1 flow per MCP spec.
- Session-stateful HTTP (SSE stream reuse across requests) — YAGNI for stateless multi-tenant.
- Rate limiting, per-tenant quotas — infrastructure concern.
- OpenTelemetry / structured logs — separate infra ticket.
- Publishing docs to `docs.itmc` — content delivery handled outside this repo.
- Public REST API (the other half of GitHub discussion #36).

## Commit plan

One logical commit per phase:

1. `feat(context): add AsyncLocalStorage credential context`
2. `refactor(admina-api): read credentials from context with env fallback`
3. `refactor(server): extract createServer() factory`
4. `refactor(transports): split stdio into its own module`
5. `feat(transports): add stateless HTTP transport with bearer auth`
6. `feat(cli): select transport via --http flag or MCP_TRANSPORT env`
7. `test: cover context, admina-api, cli, and http transport`
8. `docs: document remote MCP mode and multi-tenant client config`
