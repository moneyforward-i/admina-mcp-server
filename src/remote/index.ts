#!/usr/bin/env node
// src/remote/index.ts
//
// Remote MCP server entry point.
// Env vars:
//   PORT              - TCP port to listen on (default: 3000)
//
// Required request headers on POST /mcp:
//   Authorization: Bearer <ADMINA_API_KEY>
//   X-Organization-ID: <organizationId>
//   Accept: application/json, text/event-stream

import http from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createRemoteMcpServer } from "./server.js";

const PORT = Number(process.env.PORT ?? 3000);

const MAX_BODY_SIZE = 1 * 1024 * 1024; // 1 MB

/** Read the full request body as a string */
function readBody(req: http.IncomingMessage): Promise<string> {
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
function rejectWithError(res: http.ServerResponse, httpStatus: number, code: number, message: string): void {
  res.writeHead(httpStatus, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ jsonrpc: "2.0", error: { code, message }, id: null }));
}

const server = http.createServer(async (req, res) => {
  const url = req.url ?? "/";
  const method = req.method ?? "GET";

  // ── Health check ────────────────────────────────────────────────────────
  if (method === "GET" && url === "/healthz") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  // ── MCP endpoint ────────────────────────────────────────────────────────
  if (method === "POST" && url === "/mcp") {
    // Validate Accept header per MCP Streamable HTTP spec
    const accept = req.headers["accept"] ?? "";
    if (!accept.includes("application/json") || !accept.includes("text/event-stream")) {
      rejectWithError(res, 406, -32000, "Not Acceptable: Accept header must include 'application/json' and 'text/event-stream'");
      return;
    }

    // Extract caller credentials
    const authHeader = (req.headers["authorization"] ?? "") as string;
    const orgId = (req.headers["x-organization-id"] ?? "") as string;
    const apiKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!apiKey || !orgId) {
      rejectWithError(res, 401, -32001, "Missing required headers: Authorization (Bearer token) and X-Organization-ID");
      return;
    }

    // Parse body
    let parsedBody: unknown;
    try {
      const bodyText = await readBody(req);
      parsedBody = bodyText ? JSON.parse(bodyText) : undefined;
    } catch (err) {
      const msg = err instanceof Error && err.message === "Request body too large"
        ? "Request body too large (max 1 MB)"
        : "Parse error: invalid JSON body";
      const code = err instanceof Error && err.message === "Request body too large" ? -32600 : -32700;
      rejectWithError(res, 413, code, msg);
      return;
    }

    // Create fresh server + transport per request (stateless)
    const mcpServer = createRemoteMcpServer(apiKey, orgId);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    // Register cleanup before handleRequest so it fires even for fast responses
    res.on("finish", () => {
      mcpServer.close().catch(() => {});
    });

    try {
      await mcpServer.connect(transport);
      await transport.handleRequest(req, res, parsedBody);
    } catch (error) {
      console.error("MCP request error:", error);
      if (!res.headersSent) {
        rejectWithError(res, 500, -32603, "Internal error");
      }
    }
    return;
  }

  // ── 404 ─────────────────────────────────────────────────────────────────
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});

server.listen(PORT, () => {
  console.log(`admina-remote-mcp-server listening on port ${PORT}`);
  console.log(`  POST /mcp   — MCP Streamable HTTP`);
  console.log(`  GET  /healthz — health check`);
});

server.on("error", (err) => {
  console.error("Server error:", err);
  process.exit(1);
});
