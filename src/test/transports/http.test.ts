import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import axios from "axios";
import { resetClient } from "../../admina-api.js";
import { HttpHandle, runHttp } from "../../transports/http.js";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

type AxiosCall = { method: string; url: string; headers: Record<string, string>; body?: unknown };

function installAxiosCapture(sink: AxiosCall[], canned: unknown) {
  const capture =
    (method: string) =>
    (url: string, ...rest: any[]) => {
      const hasBody = method === "post" || method === "put" || method === "patch";
      const config = hasBody ? rest[1] : rest[0];
      const body = hasBody ? rest[0] : undefined;
      sink.push({
        method,
        url,
        headers: (config?.headers ?? {}) as Record<string, string>,
        body,
      });
      return Promise.resolve({ data: canned });
    };
  mockedAxios.get.mockImplementation(capture("get") as any);
  mockedAxios.post.mockImplementation(capture("post") as any);
  mockedAxios.patch.mockImplementation(capture("patch") as any);
  mockedAxios.put.mockImplementation(capture("put") as any);
  mockedAxios.delete.mockImplementation(capture("delete") as any);
}

// Install axios mocks that only resolve once `release()` is called. Used to
// prove credential isolation under genuine concurrent in-flight execution:
// every concurrent handler's axios call parks in the same mock until we
// release them, so all ALS contexts must be live simultaneously.
function installGatedAxios(sink: AxiosCall[], canned: unknown) {
  const waiters: Array<() => void> = [];
  const gate = new Promise<void>((resolve) => {
    waiters.push(resolve);
  });
  let releaseResolve: (() => void) | null = null;
  const release = new Promise<void>((resolve) => {
    releaseResolve = resolve;
  });

  const impl =
    (method: string) =>
    async (url: string, ...rest: any[]) => {
      const hasBody = method === "post" || method === "put" || method === "patch";
      const config = hasBody ? rest[1] : rest[0];
      const body = hasBody ? rest[0] : undefined;
      sink.push({ method, url, headers: (config?.headers ?? {}) as Record<string, string>, body });
      await release;
      return { data: canned };
    };

  mockedAxios.get.mockImplementation(impl("get") as any);
  mockedAxios.post.mockImplementation(impl("post") as any);
  mockedAxios.patch.mockImplementation(impl("patch") as any);
  mockedAxios.put.mockImplementation(impl("put") as any);
  mockedAxios.delete.mockImplementation(impl("delete") as any);

  return {
    waitUntilInFlight: async (count: number) => {
      // Poll the sink until `count` calls are recorded.
      const deadline = Date.now() + 3000;
      while (sink.length < count && Date.now() < deadline) {
        await new Promise((r) => setImmediate(r));
      }
      if (sink.length < count) throw new Error(`Only ${sink.length}/${count} calls reached axios before timeout`);
    },
    release: () => releaseResolve?.(),
    gate,
    waiters,
  };
}

async function startServer(): Promise<HttpHandle> {
  return runHttp({ port: 0, host: "127.0.0.1" });
}

function endpoint(h: HttpHandle): string {
  return `http://${h.host}:${h.port}/mcp`;
}

function rawPost(url: string, headers: Record<string, string>, body: string): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", ...headers },
    body,
  });
}

describe("runHttp", () => {
  let handle: HttpHandle;

  beforeEach(async () => {
    resetClient();
    mockedAxios.get.mockReset();
    mockedAxios.post.mockReset();
    mockedAxios.patch.mockReset();
    mockedAxios.put.mockReset();
    mockedAxios.delete.mockReset();
    handle = await startServer();
  });

  afterEach(async () => {
    await handle.close();
    jest.clearAllMocks();
  });

  describe("auth", () => {
    it("rejects requests without Authorization header (401)", async () => {
      const res = await rawPost(endpoint(handle), { "X-Admina-Organization-Id": "org-1" }, "{}");
      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("unauthorized");
    });

    it("rejects malformed Authorization header (401)", async () => {
      const res = await rawPost(
        endpoint(handle),
        { Authorization: "Token abc", "X-Admina-Organization-Id": "org-1" },
        "{}",
      );
      expect(res.status).toBe(401);
    });

    it("rejects empty bearer token (401)", async () => {
      const res = await rawPost(
        endpoint(handle),
        { Authorization: "Bearer   ", "X-Admina-Organization-Id": "org-1" },
        "{}",
      );
      expect(res.status).toBe(401);
    });

    it("rejects requests missing X-Admina-Organization-Id (401)", async () => {
      const res = await rawPost(endpoint(handle), { Authorization: "Bearer key-1" }, "{}");
      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: string; message: string };
      expect(body.error).toBe("unauthorized");
      expect(body.message).toMatch(/Organization/);
    });

    it("rejects X-Admina-Organization-Id with path-injection characters (400)", async () => {
      const res = await rawPost(
        endpoint(handle),
        { Authorization: "Bearer key-1", "X-Admina-Organization-Id": "org/../admin" },
        "{}",
      );
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("invalid_organization_id");
    });
  });

  describe("method + path routing", () => {
    it("returns 404 for unknown paths", async () => {
      const url = `http://${handle.host}:${handle.port}/health`;
      const res = await fetch(url, { method: "GET" });
      expect(res.status).toBe(404);
    });

    it("returns 405 for GET /mcp (stateless mode supports POST only)", async () => {
      const res = await fetch(endpoint(handle), {
        method: "GET",
        headers: { Authorization: "Bearer key-1", "X-Admina-Organization-Id": "org-1" },
      });
      expect(res.status).toBe(405);
      expect(res.headers.get("allow")).toBe("POST");
    });

    it("returns 405 for DELETE /mcp", async () => {
      const res = await fetch(endpoint(handle), {
        method: "DELETE",
        headers: { Authorization: "Bearer key-1", "X-Admina-Organization-Id": "org-1" },
      });
      expect(res.status).toBe(405);
    });
  });

  describe("body handling", () => {
    it("returns 400 for invalid JSON body", async () => {
      const res = await rawPost(
        endpoint(handle),
        { Authorization: "Bearer key-1", "X-Admina-Organization-Id": "org-1" },
        "not-json",
      );
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("invalid_json");
    });
  });

  describe("DNS rebinding protection", () => {
    it("rejects requests with a disallowed Host header (403)", async () => {
      const res = await fetch(endpoint(handle), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          Authorization: "Bearer key-1",
          "X-Admina-Organization-Id": "org-1",
          Host: "evil.example.com",
        },
        body: "{}",
      });
      expect(res.status).toBe(403);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("forbidden_host");
    });
  });

  describe("end-to-end via MCP client", () => {
    const makeClient = async (apiKey: string, organizationId: string) => {
      const transport = new StreamableHTTPClientTransport(new URL(endpoint(handle)), {
        requestInit: {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "X-Admina-Organization-Id": organizationId,
          },
        },
      });
      const client = new Client({ name: "test-client", version: "0.0.0" }, {});
      await client.connect(transport);
      return { client, transport };
    };

    it("lists tools via MCP protocol", async () => {
      installAxiosCapture([], {});
      const { client, transport } = await makeClient("key-1", "org-1");

      const { tools } = await client.listTools();
      expect(tools.length).toBeGreaterThan(10);
      expect(tools.map((t) => t.name)).toContain("get_organization_info");

      await client.close();
      await transport.close();
    });

    it("calls a tool and forwards the configured credentials to Admina", async () => {
      const calls: AxiosCall[] = [];
      installAxiosCapture(calls, { id: "org-1", name: "Tenant 1" });

      const { client, transport } = await makeClient("key-alpha", "org-alpha");

      const result = await client.callTool({ name: "get_organization_info", arguments: {} });
      expect(result.isError).toBeFalsy();

      const call = calls.find((c) => /\/organizations\/org-alpha(\/|\?|$)/.test(c.url));
      expect(call).toBeDefined();
      expect(call?.headers.Authorization).toBe("Bearer key-alpha");

      await client.close();
      await transport.close();
    });

    it("isolates credentials across genuinely concurrent in-flight requests", async () => {
      // This variant uses a gated axios mock to force all three requests to be
      // in-flight simultaneously before any returns. Only then can we release
      // them. If AsyncLocalStorage isolation were broken, the captured axios
      // call for each tenant would carry the wrong credentials.
      const calls: AxiosCall[] = [];
      const gate = installGatedAxios(calls, { id: "x" });

      const runTenant = async (apiKey: string, organizationId: string) => {
        const { client, transport } = await makeClient(apiKey, organizationId);
        await client.callTool({ name: "get_organization_info", arguments: {} });
        await client.close();
        await transport.close();
      };

      const pending = Promise.all([
        runTenant("key-A", "org-A"),
        runTenant("key-B", "org-B"),
        runTenant("key-C", "org-C"),
      ]);

      // Wait for all three tool handlers to reach the axios mock — this proves
      // all three requests are holding live credentials concurrently.
      await gate.waitUntilInFlight(3);
      expect(calls).toHaveLength(3);

      // Release and let all requests complete.
      gate.release();
      await pending;

      const byOrg = (org: string) => calls.find((c) => new RegExp(`/organizations/${org}(/|\\?|$)`).test(c.url));
      expect(byOrg("org-A")?.headers.Authorization).toBe("Bearer key-A");
      expect(byOrg("org-B")?.headers.Authorization).toBe("Bearer key-B");
      expect(byOrg("org-C")?.headers.Authorization).toBe("Bearer key-C");
    });
  });
});
