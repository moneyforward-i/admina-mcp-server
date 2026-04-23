import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "../server.js";

/**
 * Runs the MCP server over stdio.
 *
 * Credentials are read from `ADMINA_API_KEY` and `ADMINA_ORGANIZATION_ID`
 * environment variables on first tool invocation (see `getClient()` in
 * `admina-api.ts`).
 */
export async function runStdio(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
