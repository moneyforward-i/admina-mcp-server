#!/usr/bin/env node
import http from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createHttpHandler } from "./handler.js";
import type { ToolRegistry } from "./types.js";

const _dir = path.dirname(fileURLToPath(import.meta.url));
const registryPath = path.join(_dir, "../generated/tools.json");

let registry: ToolRegistry;
try {
  registry = JSON.parse(readFileSync(registryPath, "utf-8")) as ToolRegistry;
} catch {
  console.error(`Failed to load tool registry at ${registryPath}. Run "yarn generate:tools && yarn build" first.`);
  process.exit(1);
}

const PORT = Number(process.env.PORT ?? 3000);

const server = http.createServer(createHttpHandler(registry));

server.listen(PORT, () => {
  console.log(`admina-remote-mcp-server listening on port ${PORT}`);
  console.log(`  POST /mcp   — MCP Streamable HTTP`);
  console.log(`  GET  /healthz — health check`);
});

server.on("error", (err) => {
  console.error("Server error:", err);
  process.exit(1);
});
