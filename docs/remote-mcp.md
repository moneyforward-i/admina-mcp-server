# Remote MCP server

`admina-mcp-server` ships two transports:

- **stdio** (default) — the traditional local MCP setup. Clients (Claude Desktop, Cursor, VS Code, etc.) spawn the binary as a subprocess and talk to it over stdin/stdout.
- **HTTP (Streamable HTTP)** — the server listens on a TCP port and accepts MCP requests over HTTP. This is the mode to use when you want to run one shared server that multiple users or tenants connect to remotely.

## When to use HTTP mode

Pick HTTP mode when:

- You want to host a single, shared Admina MCP endpoint instead of having every user install the binary locally.
- Your clients live in environments that cannot spawn local processes (browser-based agents, hosted IDEs, serverless frameworks).
- You want to serve multiple Admina organizations from the same instance.

Otherwise, stick with stdio — it is simpler, secret-free for the operator, and still the default.

## Running in HTTP mode

```
# CLI flags
admina-mcp-server --http --port 3000 --host 127.0.0.1

# Environment
MCP_TRANSPORT=http MCP_HTTP_PORT=3000 MCP_HTTP_HOST=127.0.0.1 admina-mcp-server
```

Defaults when `--http` is set: `--port 3000`, `--host 127.0.0.1`.

Starting the server in HTTP mode does **not** read `ADMINA_API_KEY` or `ADMINA_ORGANIZATION_ID` — those credentials are supplied by each incoming request. A single deployed instance can serve any number of tenants.

On startup it logs:

```
[admina-mcp-server] listening on http://127.0.0.1:3000/mcp
```

## Authentication

Every HTTP request must include:

| Header | Required | Notes |
|---|---|---|
| `Authorization: Bearer <ADMINA_API_KEY>` | yes | Standard Admina API key |
| `X-Admina-Organization-Id: <ORGANIZATION_ID>` | yes | Admina organization the request is scoped to |
| `Content-Type: application/json` | yes (POST) | Required by the MCP Streamable HTTP spec |
| `Accept: application/json, text/event-stream` | recommended | Required by the MCP Streamable HTTP spec |

A missing or malformed `Authorization` header returns `401 Unauthorized`:

```json
{ "error": "unauthorized", "message": "Missing Authorization header. ..." }
```

A missing `X-Admina-Organization-Id` header returns the same shape.

See the [Admina API docs](https://docs.itmc.i.moneyforward.com/reference/getting-started-1#step-1-obtain-your-api-key) for how to obtain an API key.

## Endpoint

| Method | Path | Response |
|---|---|---|
| `POST` | `/mcp` | MCP JSON-RPC response (initialize, tools/list, tools/call, …) |
| any other method | `/mcp` | `405 Method Not Allowed` with `Allow: POST` |
| any method | anywhere else | `404 Not Found` |

The server runs in **stateless** mode — every request stands alone and carries its own credentials. There is no MCP session, so the spec's GET (long-lived SSE stream) and DELETE (session teardown) endpoints have nothing to operate on and return 405.

## Client configuration

### Claude Desktop / Cursor / VS Code — remote MCP

```json
{
  "mcpServers": {
    "admina-production": {
      "type": "http",
      "url": "https://your-deployment.example.com/mcp",
      "headers": {
        "Authorization": "Bearer <ADMINA_API_KEY>",
        "X-Admina-Organization-Id": "<ORG_ID>"
      }
    }
  }
}
```

The exact key names (`type`, `url`, `headers`) vary slightly between clients — consult your client's remote MCP documentation.

### Multi-tenant client setup

`admina-mcp-server` does not multiplex tenants on a single connection. To work across multiple Admina organizations in one chat, register one MCP server entry per tenant:

```json
{
  "mcpServers": {
    "admina-tenant-a": {
      "type": "http",
      "url": "https://your-deployment.example.com/mcp",
      "headers": {
        "Authorization": "Bearer <API_KEY_A>",
        "X-Admina-Organization-Id": "<ORG_A>"
      }
    },
    "admina-tenant-b": {
      "type": "http",
      "url": "https://your-deployment.example.com/mcp",
      "headers": {
        "Authorization": "Bearer <API_KEY_B>",
        "X-Admina-Organization-Id": "<ORG_B>"
      }
    }
  }
}
```

The agent can then ask the user which tenant to work in and call the corresponding server.

## Smoke test

```bash
curl -sS -X POST http://127.0.0.1:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer $ADMINA_API_KEY" \
  -H "X-Admina-Organization-Id: $ADMINA_ORGANIZATION_ID" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}'
```

## Security notes

- **Default bind is `127.0.0.1`** — the server is only reachable from the local host. To expose it on a network interface pass `--host 0.0.0.0` (or a specific IP) explicitly.
- **DNS rebinding protection is on by default for loopback binds.** When `--host` is `127.0.0.1`, `localhost`, or `::1`, incoming requests must carry a `Host` header matching one of `127.0.0.1:<port>`, `localhost:<port>`, or `[::1]:<port>`; other hosts return `403 forbidden_host`. For non-loopback binds you are responsible for configuring DNS-rebinding protection upstream (reverse proxy, API gateway, `allowedHosts` option if embedding `runHttp` programmatically).
- **Organization ID is shape-validated.** The server rejects `X-Admina-Organization-Id` values that do not match `^[A-Za-z0-9_-]{1,64}$` with `400 invalid_organization_id`. This prevents path-injection via the URL interpolated into outbound Admina API calls.
- **Always put TLS in front of a public deployment.** The bearer token and organization ID travel in request headers; they are secrets.
- **The server does no rate-limiting.** For public deployments, put an API gateway or reverse proxy (Cloudflare, nginx, AWS API Gateway, etc.) in front with appropriate rate limits.
- **Never log credentials.** The server deliberately does not emit request headers or bodies — keep that discipline in any middleware you add.
- **Bearer tokens are per-request.** There is no session; compromising a single request does not grant forward access. Rotate keys in Admina if you suspect a leak.
- **Request body size is capped at 1 MiB.** Oversized payloads return `413 payload_too_large`.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| 401 "Missing Authorization header" | No `Authorization` header sent | Add `Authorization: Bearer <ADMINA_API_KEY>` |
| 401 "Missing X-Admina-Organization-Id header" | Organization ID header absent | Add `X-Admina-Organization-Id: <ORG_ID>` |
| 400 "invalid_organization_id" | Org ID header fails shape check | Must match `/^[A-Za-z0-9_-]{1,64}$/` |
| 400 "Request body must be valid JSON." | Body is not JSON | Ensure a well-formed JSON-RPC body |
| 403 "forbidden_host" | DNS-rebinding check rejected `Host` header | For loopback binds, use `127.0.0.1:<port>`, `localhost:<port>`, or `[::1]:<port>`. For non-loopback binds, configure `allowedHosts`. |
| 404 "Unknown path" | Requested path other than `/mcp` | Use `POST /mcp` |
| 405 "method_not_allowed" | Non-POST method on `/mcp` | Use POST (stateless mode) |
| 413 "payload_too_large" | Body exceeds 1 MiB | Split work into smaller requests |
| 500 Internal from a tool call | Admina API returned an error; the MCP response wraps it | Check tool response body — `isError: true` with the Admina message |
