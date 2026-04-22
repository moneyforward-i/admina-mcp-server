// src/remote/handler.ts
//
// HTTP handler logic for the remote MCP server.
// Extracted from index.ts so it can be imported in tests without starting a server.

import http from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createRemoteMcpServer } from "./server.js";
import type { ToolRegistry } from "./types.js";

export const MAX_BODY_SIZE = 1 * 1024 * 1024; // 1 MB

/** Structured JSON log — picked up by Datadog / CloudWatch log agent */
function log(fields: Record<string, unknown>): void {
  console.log(JSON.stringify({ ...fields, ts: new Date().toISOString() }));
}

/** Read the full request body as a string */
export function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalSize = 0;
    req.on("data", (chunk: Buffer) => {
      totalSize += chunk.length;
      if (totalSize > MAX_BODY_SIZE) {
        reject(new Error("Request body too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

/** Write a JSON-RPC error response */
export function rejectWithError(res: http.ServerResponse, httpStatus: number, code: number, message: string): void {
  res.writeHead(httpStatus, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ jsonrpc: "2.0", error: { code, message }, id: null }));
}

function extractCredentials(req: http.IncomingMessage): { apiKey: string; orgId: string } {
  const authHeader = (req.headers["authorization"] ?? "") as string;
  const apiKey = process.env.ADMINA_API_KEY ?? (authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "");
  const orgId = process.env.ADMINA_ORGANIZATION_ID ?? ((req.headers["x-organization-id"] ?? "") as string);
  return { apiKey, orgId };
}

async function parseBody(
  req: http.IncomingMessage,
): Promise<{ ok: true; body: unknown } | { ok: false; status: number; code: number; message: string }> {
  try {
    const bodyText = await readBody(req);
    return { ok: true, body: bodyText ? JSON.parse(bodyText) : undefined };
  } catch (err) {
    const isTooLarge = err instanceof Error && err.message === "Request body too large";
    return {
      ok: false,
      status: 413,
      code: isTooLarge ? -32600 : -32700,
      message: isTooLarge ? "Request body too large (max 1 MB)" : "Parse error: invalid JSON body",
    };
  }
}

async function handleMcpPost(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  registry: ToolRegistry,
): Promise<void> {
  const accept = (req.headers["accept"] ?? "") as string;
  if (!accept.includes("application/json") || !accept.includes("text/event-stream")) {
    rejectWithError(
      res,
      406,
      -32000,
      "Not Acceptable: Accept header must include 'application/json' and 'text/event-stream'",
    );
    return;
  }

  const { apiKey, orgId } = extractCredentials(req);
  if (!apiKey || !orgId) {
    rejectWithError(
      res,
      401,
      -32001,
      "Missing credentials: set ADMINA_API_KEY + ADMINA_ORGANIZATION_ID env vars, or pass Authorization (Bearer) + X-Organization-ID headers",
    );
    return;
  }

  const bodyResult = await parseBody(req);
  if (!bodyResult.ok) {
    rejectWithError(res, bodyResult.status, bodyResult.code, bodyResult.message);
    return;
  }

  const mcpServer = createRemoteMcpServer(apiKey, orgId, registry);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  res.on("finish", () => {
    mcpServer.close().catch(() => {});
  });

  try {
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, bodyResult.body);
  } catch (error) {
    log({ level: "error", msg: "MCP request error", orgId, error: String(error) });
    if (!res.headersSent) {
      rejectWithError(res, 500, -32603, "Internal error");
    }
  }
}

/** Create the HTTP request handler */
export function createHttpHandler(
  registry: ToolRegistry,
): (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void> {
  return async (req, res) => {
    const url = req.url ?? "/";
    const method = req.method ?? "GET";
    const startMs = Date.now();

    res.on("finish", () => {
      log({ method, path: url, status: res.statusCode, durationMs: Date.now() - startMs });
    });

    if (method === "GET" && url === "/healthz") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    if (method === "POST" && url === "/mcp") {
      await handleMcpPost(req, res, registry);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  };
}
