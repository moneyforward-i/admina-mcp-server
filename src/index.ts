#!/usr/bin/env node

import { type HttpOptions, runHttp } from "./transports/http.js";
import { runStdio } from "./transports/stdio.js";

export interface CliOptions {
  transport: "stdio" | "http";
  http: HttpOptions;
}

export const DEFAULT_HTTP_PORT = 3000;
export const DEFAULT_HTTP_HOST = "127.0.0.1";

export function parseCliOptions(argv: string[], env: NodeJS.ProcessEnv): CliOptions {
  let transport: "stdio" | "http" = env.MCP_TRANSPORT === "http" ? "http" : "stdio";
  let port = env.MCP_HTTP_PORT ? Number(env.MCP_HTTP_PORT) : DEFAULT_HTTP_PORT;
  let host = env.MCP_HTTP_HOST ?? DEFAULT_HTTP_HOST;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--http") {
      transport = "http";
    } else if (arg === "--stdio") {
      transport = "stdio";
    } else if (arg === "--port") {
      const next = argv[++i];
      if (!next) throw new Error("--port requires a value");
      const parsed = Number(next);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 65535) {
        throw new Error(`Invalid --port value: ${next}`);
      }
      port = parsed;
    } else if (arg === "--host") {
      const next = argv[++i];
      if (!next) throw new Error("--host requires a value");
      host = next;
    }
  }

  if (!Number.isFinite(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid MCP_HTTP_PORT value: ${env.MCP_HTTP_PORT}`);
  }

  return {
    transport,
    http: { port, host },
  };
}

async function main(): Promise<void> {
  const opts = parseCliOptions(process.argv.slice(2), process.env);

  if (opts.transport === "http") {
    const handle = await runHttp(opts.http);
    console.error(`[admina-mcp-server] listening on http://${handle.host}:${handle.port}/mcp`);
    return;
  }

  await runStdio();
}

// Only run when invoked as the entry point; `parseCliOptions` is also exported for tests.
// Jest sets JEST_WORKER_ID; skip auto-run in that case.
if (!process.env.JEST_WORKER_ID) {
  main().catch((err) => {
    console.error("[admina-mcp-server] fatal:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
