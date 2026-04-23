import { IncomingMessage, Server as NodeHttpServer, ServerResponse, createServer as createHttpServer } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { type Credentials, withCredentials } from "../context.js";
import { createServer } from "../server.js";

export interface HttpOptions {
  port: number;
  host: string;
  /**
   * Explicit allow-list of Host header values to accept. When omitted, the
   * transport auto-populates this with `host:port`, `localhost:port`,
   * `127.0.0.1:port`, and `[::1]:port` if `host` is a loopback address —
   * enabling DNS-rebinding protection by default for loopback binds.
   *
   * Pass `null` to disable host validation entirely (not recommended).
   */
  allowedHosts?: string[] | null;
}

export interface HttpHandle {
  server: NodeHttpServer;
  port: number;
  host: string;
  close: () => Promise<void>;
}

const MCP_PATH = "/mcp";
const MAX_BODY_BYTES = 1_048_576; // 1 MiB — MCP JSON-RPC envelopes are small.

// Admina organization IDs are numeric in production but we accept any short
// ASCII-safe identifier to stay forward-compatible. The explicit allow-list
// prevents path-injection via the URL we interpolate into.
const ORG_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

type AuthSuccess = { ok: true; credentials: Credentials };
type AuthFailure = { ok: false; status: number; error: string; message: string };

function extractCredentials(req: IncomingMessage): AuthSuccess | AuthFailure {
  const authHeader = req.headers.authorization;
  if (!authHeader || Array.isArray(authHeader)) {
    return {
      ok: false,
      status: 401,
      error: "unauthorized",
      message: "Missing Authorization header. Expected: 'Authorization: Bearer <ADMINA_API_KEY>'.",
    };
  }

  // Allow a single leading/trailing whitespace in the raw header (RFC 7230
  // permits OWS between field-value and folding), then match the Bearer scheme.
  const match = /^\s*Bearer\s+(\S.*?)\s*$/i.exec(authHeader);
  if (!match) {
    return {
      ok: false,
      status: 401,
      error: "unauthorized",
      message: "Invalid Authorization header. Expected: 'Authorization: Bearer <ADMINA_API_KEY>'.",
    };
  }

  const apiKey = match[1];

  const orgHeader = req.headers["x-admina-organization-id"];
  const organizationIdRaw = Array.isArray(orgHeader) ? orgHeader[0] : orgHeader;
  const organizationId = organizationIdRaw?.trim() ?? "";
  if (!organizationId) {
    return {
      ok: false,
      status: 401,
      error: "unauthorized",
      message: "Missing X-Admina-Organization-Id header.",
    };
  }
  if (!ORG_ID_PATTERN.test(organizationId)) {
    return {
      ok: false,
      status: 400,
      error: "invalid_organization_id",
      message: "X-Admina-Organization-Id must match /^[A-Za-z0-9_-]{1,64}$/.",
    };
  }

  return { ok: true, credentials: { apiKey, organizationId } };
}

function validateHost(req: IncomingMessage, allowedHosts: string[] | null): boolean {
  if (allowedHosts === null) return true;
  const host = req.headers.host;
  if (!host || Array.isArray(host)) return false;
  return allowedHosts.includes(host.toLowerCase());
}

function isLoopbackAddress(host: string): boolean {
  const h = host.toLowerCase();
  return h === "127.0.0.1" || h === "localhost" || h === "::1" || h === "[::1]";
}

function resolveAllowedHosts(opts: HttpOptions, boundPort: number): string[] | null {
  if (opts.allowedHosts === null) return null; // explicit opt-out
  if (opts.allowedHosts !== undefined) {
    return opts.allowedHosts.map((h) => h.toLowerCase());
  }
  if (!isLoopbackAddress(opts.host)) return null;
  // Loopback default: allow common loopback representations.
  return [
    `${opts.host.toLowerCase()}:${boundPort}`,
    `localhost:${boundPort}`,
    `127.0.0.1:${boundPort}`,
    `[::1]:${boundPort}`,
  ];
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  if (res.headersSent) return;
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function readRequestBody(
  req: IncomingMessage,
): Promise<{ ok: true; body: string } | { ok: false; reason: "too_large" | "network"; message: string }> {
  return new Promise((resolve) => {
    let total = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        resolve({ ok: false, reason: "too_large", message: `Request body exceeds ${MAX_BODY_BYTES} bytes.` });
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve({ ok: true, body: Buffer.concat(chunks).toString("utf8") }));
    req.on("error", (err) => resolve({ ok: false, reason: "network", message: err.message }));
  });
}

async function handleMcpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  allowedHosts: string[] | null,
): Promise<void> {
  if (!validateHost(req, allowedHosts)) {
    sendJson(res, 403, {
      error: "forbidden_host",
      message: "Host header is not in the allowed-hosts list.",
    });
    return;
  }

  // Only POST carries an MCP JSON-RPC payload in stateless mode. GET/DELETE
  // are reserved by the spec for session streams and teardown; we do not
  // support sessions, so both are meaningless here. 405 with a clear message
  // is more honest than delegating and hoping the SDK returns the right code.
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, {
      error: "method_not_allowed",
      message: `Method ${req.method} not allowed on ${MCP_PATH}. Only POST is supported (stateless mode).`,
    });
    return;
  }

  const auth = extractCredentials(req);
  if (!auth.ok) {
    sendJson(res, auth.status, { error: auth.error, message: auth.message });
    return;
  }

  const bodyResult = await readRequestBody(req);
  if (!bodyResult.ok) {
    const status = bodyResult.reason === "too_large" ? 413 : 400;
    sendJson(res, status, {
      error: bodyResult.reason === "too_large" ? "payload_too_large" : "bad_request",
      message: bodyResult.message,
    });
    return;
  }

  let parsedBody: unknown;
  if (bodyResult.body.length > 0) {
    try {
      parsedBody = JSON.parse(bodyResult.body);
    } catch {
      sendJson(res, 400, {
        error: "invalid_json",
        message: "Request body must be valid JSON.",
      });
      return;
    }
  }

  // Freeze a defensive copy so downstream readers cannot mutate the scope.
  const credentials: Credentials = Object.freeze({ ...auth.credentials });

  await withCredentials(credentials, async () => {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, parsedBody);
    } catch (err) {
      sendJson(res, 500, {
        error: "internal_error",
        message: err instanceof Error ? err.message : "Unexpected transport error",
      });
    } finally {
      // Idempotent: SDK close() is safe to call multiple times.
      await transport.close().catch(() => {});
      await server.close().catch(() => {});
    }
  });
}

/**
 * Starts an HTTP server that accepts Streamable HTTP MCP requests at `/mcp`.
 *
 * Every request carries its own Admina credentials via headers:
 *   - Authorization: Bearer <ADMINA_API_KEY>
 *   - X-Admina-Organization-Id: <ADMINA_ORGANIZATION_ID>
 *
 * Transports are constructed per request in stateless mode — a single deployed
 * instance can serve multiple tenants concurrently without cross-request state.
 *
 * DNS-rebinding protection: when binding to a loopback interface (the default)
 * the server requires incoming Host headers to match one of the known loopback
 * host:port combinations. Pass `allowedHosts: [...]` for a non-loopback bind,
 * or `allowedHosts: null` to opt out (not recommended).
 */
export async function runHttp(options: HttpOptions): Promise<HttpHandle> {
  let finalAllowedHosts: string[] | null = null;

  const nodeServer = createHttpServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://placeholder");

    if (url.pathname !== MCP_PATH) {
      sendJson(res, 404, {
        error: "not_found",
        message: `Unknown path: ${url.pathname}. Only ${MCP_PATH} is supported.`,
      });
      return;
    }

    handleMcpRequest(req, res, finalAllowedHosts).catch((err) => {
      sendJson(res, 500, {
        error: "internal_error",
        message: err instanceof Error ? err.message : "Unexpected error",
      });
    });
  });

  await new Promise<void>((resolve, reject) => {
    nodeServer.once("error", reject);
    nodeServer.listen(options.port, options.host, () => {
      nodeServer.off("error", reject);
      resolve();
    });
  });

  const address = nodeServer.address();
  const boundPort = typeof address === "object" && address ? address.port : options.port;
  finalAllowedHosts = resolveAllowedHosts(options, boundPort);

  return {
    server: nodeServer,
    port: boundPort,
    host: options.host,
    close: () =>
      new Promise<void>((resolve, reject) => {
        nodeServer.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
