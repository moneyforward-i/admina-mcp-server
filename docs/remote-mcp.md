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

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/mcp` | Send an MCP JSON-RPC message (initialize, tools/list, tools/call, …) |
| `GET` | `/mcp` | Open a streaming response (reserved; not needed by most clients) |
| `DELETE` | `/mcp` | Reserved by the MCP spec for session teardown. Not meaningful in the stateless server — safe to call and ignore the response. |

The server is **stateless** — every request stands alone and includes its own credentials, so there is no MCP session to tear down between requests.

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

- **Default bind is `127.0.0.1`** — the server is only reachable from the local host. To expose it on a network interface you must pass `--host 0.0.0.0` (or a specific IP) explicitly.
- **Always put TLS in front of a public deployment.** The bearer token and organization ID travel in request headers; they are secrets.
- **The server itself does no rate-limiting.** For public deployments, put an API gateway or reverse proxy (Cloudflare, nginx, AWS API Gateway, etc.) in front with appropriate rate limits.
- **Never log credentials.** The server deliberately does not emit request headers or bodies — keep that discipline in any middleware you add.
- **Bearer tokens are per-request.** There is no session; compromising a single request does not grant forward access. Rotate keys in Admina if you suspect a leak.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| 401 "Missing Authorization header" | No `Authorization` header sent | Add `Authorization: Bearer <ADMINA_API_KEY>` |
| 401 "Missing X-Admina-Organization-Id header" | Organization ID header absent | Add `X-Admina-Organization-Id: <ORG_ID>` |
| 400 "Request body must be valid JSON." | Body is not JSON | Ensure a well-formed JSON-RPC body |
| 404 "Unknown path" | Requested path other than `/mcp` | Use `POST /mcp` |
| 500 Internal from a tool call | Admina API returned an error; the MCP response wraps it | Check tool response body — `isError: true` with the Admina message |
