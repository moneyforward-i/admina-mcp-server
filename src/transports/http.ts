import { IncomingMessage, Server as NodeHttpServer, ServerResponse, createServer as createHttpServer } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Credentials, withCredentials } from "../context.js";
import { createServer } from "../server.js";

export interface HttpOptions {
  port: number;
  host: string;
}

export interface HttpHandle {
  server: NodeHttpServer;
  port: number;
  host: string;
  close: () => Promise<void>;
}

const MCP_PATH = "/mcp";
const MAX_BODY_BYTES = 1_048_576; // 1 MiB — Admina MCP payloads are small JSON-RPC envelopes.

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

  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  if (!match) {
    return {
      ok: false,
      status: 401,
      error: "unauthorized",
      message: "Invalid Authorization header. Expected: 'Authorization: Bearer <ADMINA_API_KEY>'.",
    };
  }

  const apiKey = match[1].trim();
  if (!apiKey) {
    return {
      ok: false,
      status: 401,
      error: "unauthorized",
      message: "Empty bearer token.",
    };
  }

  const orgHeader = req.headers["x-admina-organization-id"];
  const organizationId = Array.isArray(orgHeader) ? orgHeader[0] : orgHeader;
  if (!organizationId || !organizationId.trim()) {
    return {
      ok: false,
      status: 401,
      error: "unauthorized",
      message: "Missing X-Admina-Organization-Id header.",
    };
  }

  return { ok: true, credentials: { apiKey, organizationId: organizationId.trim() } };
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function handleMcpRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const auth = extractCredentials(req);
  if (!auth.ok) {
    sendJson(res, auth.status, { error: auth.error, message: auth.message });
    return;
  }

  let parsedBody: unknown;
  if (req.method === "POST") {
    let raw: string;
    try {
      raw = await readRequestBody(req);
    } catch (err) {
      sendJson(res, 413, {
        error: "payload_too_large",
        message: err instanceof Error ? err.message : "Failed to read request body",
      });
      return;
    }

    if (raw.length > 0) {
      try {
        parsedBody = JSON.parse(raw);
      } catch {
        sendJson(res, 400, {
          error: "invalid_json",
          message: "Request body must be valid JSON.",
        });
        return;
      }
    }
  }

  await withCredentials(auth.credentials, async () => {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    res.on("close", () => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, parsedBody);
    } catch (err) {
      if (!res.headersSent) {
        sendJson(res, 500, {
          error: "internal_error",
          message: err instanceof Error ? err.message : "Unexpected transport error",
        });
      }
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
 */
export async function runHttp(options: HttpOptions): Promise<HttpHandle> {
  const nodeServer = createHttpServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (url.pathname !== MCP_PATH) {
      sendJson(res, 404, {
        error: "not_found",
        message: `Unknown path: ${url.pathname}. Only ${MCP_PATH} is supported.`,
      });
      return;
    }

    handleMcpRequest(req, res).catch((err) => {
      if (!res.headersSent) {
        sendJson(res, 500, {
          error: "internal_error",
          message: err instanceof Error ? err.message : "Unexpected error",
        });
      }
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
