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
  });

  describe("routing", () => {
    it("returns 404 for unknown paths", async () => {
      const url = `http://${handle.host}:${handle.port}/health`;
      const res = await fetch(url, { method: "GET" });
      expect(res.status).toBe(404);
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

    it("isolates credentials across concurrent requests from different tenants", async () => {
      const calls: AxiosCall[] = [];
      installAxiosCapture(calls, { id: "x" });

      const runTenant = async (apiKey: string, organizationId: string) => {
        const { client, transport } = await makeClient(apiKey, organizationId);
        await client.callTool({ name: "get_organization_info", arguments: {} });
        await client.close();
        await transport.close();
      };

      await Promise.all([runTenant("key-A", "org-A"), runTenant("key-B", "org-B"), runTenant("key-C", "org-C")]);

      const byOrg = (org: string) => calls.find((c) => new RegExp(`/organizations/${org}(/|\\?|$)`).test(c.url));
      expect(byOrg("org-A")?.headers.Authorization).toBe("Bearer key-A");
      expect(byOrg("org-B")?.headers.Authorization).toBe("Bearer key-B");
      expect(byOrg("org-C")?.headers.Authorization).toBe("Bearer key-C");
    });
  });
});
