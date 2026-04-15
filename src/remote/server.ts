// src/remote/server.ts

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { proxyToolCall } from "./proxy.js";
import type { ToolRegistry } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load tool registry once at module load time
function loadRegistry(): ToolRegistry {
  const registryPath = path.join(__dirname, "../generated/tools.json");
  try {
    return JSON.parse(readFileSync(registryPath, "utf-8")) as ToolRegistry;
  } catch {
    throw new Error(
      `Failed to load tool registry at ${registryPath}. Run "yarn generate:tools" first.`,
    );
  }
}

const registry = loadRegistry();

/**
 * Creates a fresh MCP Server instance scoped to one HTTP request.
 * Must be created per-request so each tool call uses the correct credentials.
 */
export function createRemoteMcpServer(apiKey: string, orgId: string): Server {
  const server = new Server(
    { name: "admina-remote-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: registry.tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;

    const tool = registry.tools.find((t) => t.name === toolName);
    if (!tool) {
      return {
        content: [{ type: "text", text: `Unknown tool: ${toolName}` }],
        isError: true,
      };
    }

    try {
      const result = await proxyToolCall(tool, args, apiKey, orgId);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}
