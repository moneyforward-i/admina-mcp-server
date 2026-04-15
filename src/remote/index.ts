#!/usr/bin/env node
import http from "node:http";
import { createHttpHandler } from "./handler.js";

const PORT = Number(process.env.PORT ?? 3000);

const server = http.createServer(createHttpHandler());

server.listen(PORT, () => {
  console.log(`admina-remote-mcp-server listening on port ${PORT}`);
  console.log(`  POST /mcp   — MCP Streamable HTTP`);
  console.log(`  GET  /healthz — health check`);
});

server.on("error", (err) => {
  console.error("Server error:", err);
  process.exit(1);
});
