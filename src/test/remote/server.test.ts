// src/test/remote/server.test.ts

jest.mock("../../remote/proxy.js", () => ({
  proxyToolCall: jest.fn(),
}));

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { proxyToolCall } from "../../remote/proxy.js";
import { createRemoteMcpServer } from "../../remote/server.js";
import type { ToolRegistry } from "../../remote/types.js";

const FIXTURE_REGISTRY: ToolRegistry = {
  generatedAt: "2026-01-01T00:00:00Z",
  tools: [
    {
      name: "get_identities",
      description: "Get identities",
      method: "GET",
      path: "/organizations/{organizationId}/identities",
      parameters: [
        { name: "organizationId", in: "path", required: true },
        { name: "keyword", in: "query", required: false },
      ],
      hasBody: false,
      inputSchema: {
        type: "object",
        properties: { keyword: { type: "string" } },
      },
    },
  ],
};

const mockedProxyToolCall = proxyToolCall as jest.MockedFunction<typeof proxyToolCall>;

async function makeClientServerPair(apiKey: string, orgId: string) {
  const server = createRemoteMcpServer(apiKey, orgId, FIXTURE_REGISTRY);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);

  const client = new Client({ name: "test-client", version: "1.0.0" }, { capabilities: {} });
  await client.connect(clientTransport);

  return { server, client };
}

describe("createRemoteMcpServer", () => {
  afterEach(async () => {
    jest.clearAllMocks();
  });

  it("tools/list returns tools from registry", async () => {
    const { server, client } = await makeClientServerPair("api-key", "org-id");

    const result = await client.listTools();

    expect(result.tools).toHaveLength(1);
    expect(result.tools[0].name).toBe("get_identities");
    expect(result.tools[0].description).toBe("Get identities");

    await client.close();
    await server.close();
  });

  it("tools/call with unknown tool returns isError: true", async () => {
    const { server, client } = await makeClientServerPair("api-key", "org-id");

    const result = await client.callTool({ name: "nonexistent_tool", arguments: {} });
    const content = result.content as Array<{ type: string; text: string }>;

    expect(result.isError).toBe(true);
    expect(content[0].text).toContain("Unknown tool");

    await client.close();
    await server.close();
  });

  it("tools/call with known tool calls proxyToolCall with the correct apiKey and orgId", async () => {
    mockedProxyToolCall.mockResolvedValueOnce({ identities: [] });

    const { server, client } = await makeClientServerPair("my-api-key", "my-org-id");

    await client.callTool({ name: "get_identities", arguments: { keyword: "test" } });

    expect(mockedProxyToolCall).toHaveBeenCalledTimes(1);
    const [_tool, _args, apiKey, orgId] = mockedProxyToolCall.mock.calls[0];
    expect(apiKey).toBe("my-api-key");
    expect(orgId).toBe("my-org-id");

    await client.close();
    await server.close();
  });

  it("tools/call handles proxyToolCall error gracefully (isError: true)", async () => {
    mockedProxyToolCall.mockRejectedValueOnce(new Error("Upstream error 500: Server Error"));

    const { server, client } = await makeClientServerPair("api-key", "org-id");

    const result = await client.callTool({ name: "get_identities", arguments: {} });
    const content = result.content as Array<{ type: string; text: string }>;

    expect(result.isError).toBe(true);
    expect(content[0].text).toContain("Upstream error 500");

    await client.close();
    await server.close();
  });
});
