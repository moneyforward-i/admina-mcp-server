// src/test/remote/e2e.test.ts
//
// End-to-end tests: spawns the real server binary, connects via MCP over HTTP,
// and verifies live responses from the vulcan API.
//
// Run with real credentials:
//   E2E_API_KEY=<key> E2E_ORG_ID=<orgId> yarn test:e2e

import { type ChildProcess, spawn } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import http from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const ROOT = process.cwd();

const API_KEY = process.env.E2E_API_KEY ?? "";
const ORG_ID = process.env.E2E_ORG_ID ?? "";
const E2E_PORT = 3098;

const SKIP = !API_KEY || !ORG_ID;

const maybeDescribe = SKIP ? describe.skip : describe;

maybeDescribe("Remote MCP server e2e (requires E2E_API_KEY + E2E_ORG_ID)", () => {
  let serverProcess: ChildProcess;
  let client: Client;

  beforeAll(async () => {
    // Use the full generated fixture (92 tools from public API spec)
    const fixture = resolve(ROOT, "src/test/remote/fixtures/e2e-tools-full.json");
    const dest = resolve(ROOT, "build/generated/tools.json");
    mkdirSync(resolve(ROOT, "build/generated"), { recursive: true });
    copyFileSync(fixture, dest);

    const entry = resolve(ROOT, "build/remote/index.js");
    serverProcess = spawn("node", [entry], {
      env: { ...process.env, ADMINA_API_KEY: API_KEY, ADMINA_ORGANIZATION_ID: ORG_ID, PORT: String(E2E_PORT) },
      stdio: ["ignore", "pipe", "pipe"],
    });
    serverProcess.stderr?.on("data", (d) => process.stderr.write(d));

    await waitForServer(`http://localhost:${E2E_PORT}/healthz`, 10_000);

    const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${E2E_PORT}/mcp`));
    client = new Client({ name: "e2e-test", version: "1.0.0" });
    await client.connect(transport);
  }, 20_000);

  afterAll(async () => {
    try { await client?.close(); } catch { /* ignore */ }
    serverProcess?.kill("SIGTERM");
  });

  // ── tool discovery ─────────────────────────────────────────────────────────

  it("tools/list returns 92 tools from the generated registry", async () => {
    const result = await client.listTools();
    expect(result.tools.length).toBe(92);
    const names = result.tools.map((t) => t.name);
    expect(names).toContain("public_get_organization");
    expect(names).toContain("public_get_identities");
    expect(names).toContain("public_get_people");
    expect(names).toContain("public_get_departments");
  });

  // ── organisation ───────────────────────────────────────────────────────────

  it("public_get_organization returns org info", async () => {
    const result = await client.callTool({ name: "public_get_organization", arguments: {} });
    expect(result.isError).toBeFalsy();
    const data = parseToolResult(result);
    expect(data).toHaveProperty("id");
    expect(data).toHaveProperty("name");
  });

  // ── identity ───────────────────────────────────────────────────────────────

  it("public_get_identities returns a list with limit=2", async () => {
    const result = await client.callTool({ name: "public_get_identities", arguments: { limit: 2 } });
    expect(result.isError).toBeFalsy();
    const data = parseToolResult(result);
    // response is either an array or { data: [...] }
    const items = Array.isArray(data) ? data : (data as Record<string, unknown>).data ?? data;
    expect(items).toBeDefined();
  });

  it("public_get_identities_stats returns stats object", async () => {
    const result = await client.callTool({ name: "public_get_identities_stats", arguments: {} });
    expect(result.isError).toBeFalsy();
    const data = parseToolResult(result);
    expect(data).toBeDefined();
    expect(typeof data).toBe("object");
  });

  it("get_identity_custom_fields returns an array or object", async () => {
    const result = await client.callTool({ name: "get_identity_custom_fields", arguments: {} });
    expect(result.isError).toBeFalsy();
    const data = parseToolResult(result);
    expect(data).toBeDefined();
  });

  // ── people ─────────────────────────────────────────────────────────────────

  it("public_get_people returns a list with limit=2", async () => {
    const result = await client.callTool({ name: "public_get_people", arguments: { limit: 2 } });
    expect(result.isError).toBeFalsy();
    const data = parseToolResult(result);
    expect(data).toBeDefined();
  });

  // ── departments / locations / companies ────────────────────────────────────

  it("public_get_departments returns departments", async () => {
    const result = await client.callTool({ name: "public_get_departments", arguments: {} });
    expect(result.isError).toBeFalsy();
    const data = parseToolResult(result);
    expect(data).toBeDefined();
  });

  it("public_get_locations returns locations", async () => {
    const result = await client.callTool({ name: "public_get_locations", arguments: {} });
    expect(result.isError).toBeFalsy();
    const data = parseToolResult(result);
    expect(data).toBeDefined();
  });

  it("public_get_companies returns companies", async () => {
    const result = await client.callTool({ name: "public_get_companies", arguments: {} });
    expect(result.isError).toBeFalsy();
    const data = parseToolResult(result);
    expect(data).toBeDefined();
  });

  // ── devices ────────────────────────────────────────────────────────────────

  it("public_get_device_custom_fields returns device custom fields", async () => {
    const result = await client.callTool({ name: "public_get_device_custom_fields", arguments: {} });
    expect(result.isError).toBeFalsy();
    const data = parseToolResult(result);
    expect(data).toBeDefined();
  });

  // ── services ───────────────────────────────────────────────────────────────

  it("public_get_services returns global service list with limit=3", async () => {
    const result = await client.callTool({ name: "public_get_services", arguments: { limit: 3 } });
    expect(result.isError).toBeFalsy();
    const data = parseToolResult(result);
    expect(data).toBeDefined();
  });

  it("public_get_organization_services returns org services with limit=3", async () => {
    const result = await client.callTool({ name: "public_get_organization_services", arguments: { limit: 3 } });
    expect(result.isError).toBeFalsy();
    const data = parseToolResult(result);
    expect(data).toBeDefined();
  });

  // ── users ──────────────────────────────────────────────────────────────────

  it("public_get_users returns org users with limit=2", async () => {
    const result = await client.callTool({ name: "public_get_users", arguments: { limit: 2 } });
    expect(result.isError).toBeFalsy();
    const data = parseToolResult(result);
    expect(data).toBeDefined();
  });
});

// ── helpers ───────────────────────────────────────────────────────────────────

function parseToolResult(result: Awaited<ReturnType<Client["callTool"]>>): unknown {
  const content = result.content as Array<{ type: string; text: string }>;
  expect(content.length).toBeGreaterThan(0);
  return JSON.parse(content[0].text);
}

function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    function poll() {
      http.get(url, (res) => {
        res.resume();
        if (res.statusCode === 200) { resolve(); return; }
        retry();
      }).on("error", retry);
    }
    function retry() {
      if (Date.now() >= deadline) { reject(new Error(`Server not ready after ${timeoutMs}ms`)); return; }
      setTimeout(poll, 200);
    }
    poll();
  });
}
