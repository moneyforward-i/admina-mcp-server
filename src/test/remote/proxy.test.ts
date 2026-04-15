// src/test/remote/proxy.test.ts

import axios, { AxiosError } from "axios";
import { proxyToolCall } from "../../remote/proxy.js";
import type { ToolDefinition } from "../../remote/types.js";

jest.mock("axios");

const mockedAxios = axios as jest.MockedFunction<typeof axios>;

const BASE_TOOL: ToolDefinition = {
  name: "get_identity",
  description: "Get an identity",
  method: "GET",
  path: "/organizations/{organizationId}/identities/{identityId}",
  parameters: [
    { name: "organizationId", in: "path", required: true },
    { name: "identityId", in: "path", required: true },
  ],
  hasBody: false,
  inputSchema: {
    type: "object",
    properties: { identityId: { type: "string" } },
    required: ["identityId"],
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedAxios.mockResolvedValue({ data: { id: "1" } } as any);
});

describe("proxyToolCall", () => {
  it("substitutes path params correctly (organizationId from orgId, identityId from args)", async () => {
    await proxyToolCall(BASE_TOOL, { identityId: "id-42" }, "api-key", "org-99");

    const callArgs = mockedAxios.mock.calls[0][0] as any;
    expect(callArgs.url).toContain("/org-99/");
    expect(callArgs.url).toContain("/id-42");
    expect(callArgs.url).not.toMatch(/\{[^}]+\}/);
  });

  it("appends query params to the URL", async () => {
    const tool: ToolDefinition = {
      ...BASE_TOOL,
      path: "/organizations/{organizationId}/identities",
      parameters: [
        { name: "organizationId", in: "path", required: true },
        { name: "keyword", in: "query", required: false },
        { name: "page", in: "query", required: false },
      ],
    };

    await proxyToolCall(tool, { keyword: "alice", page: 2 }, "api-key", "org-1");

    const callArgs = mockedAxios.mock.calls[0][0] as any;
    expect(callArgs.url).toContain("keyword=alice");
    expect(callArgs.url).toContain("page=2");
  });

  it("puts non-path, non-query args in the request body for POST requests", async () => {
    const tool: ToolDefinition = {
      name: "create_identity",
      description: "Create identity",
      method: "POST",
      path: "/organizations/{organizationId}/identities",
      parameters: [
        { name: "organizationId", in: "path", required: true },
      ],
      hasBody: true,
      inputSchema: {
        type: "object",
        properties: {
          firstName: { type: "string" },
          lastName: { type: "string" },
        },
      },
    };

    await proxyToolCall(tool, { firstName: "John", lastName: "Doe" }, "api-key", "org-1");

    const callArgs = mockedAxios.mock.calls[0][0] as any;
    expect(callArgs.data).toEqual({ firstName: "John", lastName: "Doe" });
  });

  it("handles array query params with repeated keys", async () => {
    const tool: ToolDefinition = {
      ...BASE_TOOL,
      path: "/organizations/{organizationId}/identities",
      parameters: [
        { name: "organizationId", in: "path", required: true },
        { name: "statuses", in: "query", required: false },
      ],
    };

    await proxyToolCall(tool, { statuses: ["active", "inactive"] }, "api-key", "org-1");

    const callArgs = mockedAxios.mock.calls[0][0] as any;
    expect(callArgs.url).toContain("statuses=active");
    expect(callArgs.url).toContain("statuses=inactive");
  });

  it("throws when a required path param is missing", async () => {
    await expect(
      proxyToolCall(BASE_TOOL, {}, "api-key", "org-1"),
    ).rejects.toThrow(/unresolved path parameters|Missing required path parameters/i);
  });

  it("re-throws AxiosError as a plain Error with upstream status in the message", async () => {
    const axiosError = new AxiosError("Not Found");
    // Manually set the response property so error.response?.status is 404
    Object.defineProperty(axiosError, "response", {
      value: {
        status: 404,
        data: { message: "not found" },
        statusText: "Not Found",
        headers: {},
        config: {},
      },
      writable: true,
    });

    mockedAxios.mockRejectedValueOnce(axiosError);

    await expect(
      proxyToolCall(BASE_TOOL, { identityId: "x" }, "api-key", "org-1"),
    ).rejects.toThrow("Upstream error 404");
  });

  it("sends Authorization and X-Request-Source headers", async () => {
    await proxyToolCall(BASE_TOOL, { identityId: "abc" }, "my-api-key", "org-1");

    const callArgs = mockedAxios.mock.calls[0][0] as any;
    expect(callArgs.headers["Authorization"]).toBe("Bearer my-api-key");
    expect(callArgs.headers["X-Request-Source"]).toBe("mcp");
  });

  it("sets axios timeout to 30000", async () => {
    await proxyToolCall(BASE_TOOL, { identityId: "abc" }, "api-key", "org-1");

    const callArgs = mockedAxios.mock.calls[0][0] as any;
    expect(callArgs.timeout).toBe(30000);
  });
});
