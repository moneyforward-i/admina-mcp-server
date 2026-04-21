// src/test/remote/handler.test.ts

jest.mock("../../remote/server.js", () => ({
  createRemoteMcpServer: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock StreamableHTTPServerTransport so it doesn't hang on handleRequest
jest.mock("@modelcontextprotocol/sdk/server/streamableHttp.js", () => ({
  StreamableHTTPServerTransport: jest.fn().mockImplementation(() => ({
    handleRequest: jest.fn().mockImplementation((_req: unknown, res: import("node:http").ServerResponse) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { tools: [] } }));
      return Promise.resolve();
    }),
  })),
}));

import http from "node:http";
import axios from "axios";
import { createHttpHandler } from "../../remote/handler.js";

const VALID_HEADERS = {
  accept: "application/json, text/event-stream",
  authorization: "Bearer test-api-key",
  "x-organization-id": "org-123",
  "content-type": "application/json",
};

let testServer: http.Server;
let baseUrl: string;

beforeAll((done) => {
  testServer = http.createServer(createHttpHandler());
  testServer.listen(0, () => {
    const addr = testServer.address() as { port: number };
    baseUrl = `http://localhost:${addr.port}`;
    done();
  });
});

afterAll((done) => {
  testServer.close(done);
});

// Capture values set by .jest.setup.js so we can restore them
const ORIGINAL_API_KEY = process.env.ADMINA_API_KEY;
const ORIGINAL_ORG_ID = process.env.ADMINA_ORGANIZATION_ID;

beforeEach(() => {
  // Clear env var credentials so header-based tests exercise the header path
  delete process.env.ADMINA_API_KEY;
  delete process.env.ADMINA_ORGANIZATION_ID;
});

afterEach(() => {
  jest.clearAllMocks();
  // Restore env vars after each test
  process.env.ADMINA_API_KEY = ORIGINAL_API_KEY;
  process.env.ADMINA_ORGANIZATION_ID = ORIGINAL_ORG_ID;
});

describe("HTTP handler", () => {
  it("GET /healthz returns 200 with { status: 'ok' }", async () => {
    const response = await axios.get(`${baseUrl}/healthz`);
    expect(response.status).toBe(200);
    expect(response.data).toEqual({ status: "ok" });
  });

  it("POST /mcp without Accept header returns 406 with error code -32000", async () => {
    const response = await axios.post(
      `${baseUrl}/mcp`,
      {},
      {
        headers: {
          authorization: "Bearer key",
          "x-organization-id": "org-1",
          "content-type": "application/json",
        },
        validateStatus: () => true,
      },
    );
    expect(response.status).toBe(406);
    expect(response.data.error.code).toBe(-32000);
  });

  it("POST /mcp with wrong Accept (missing text/event-stream) returns 406 with -32000", async () => {
    const response = await axios.post(
      `${baseUrl}/mcp`,
      {},
      {
        headers: {
          accept: "application/json",
          authorization: "Bearer key",
          "x-organization-id": "org-1",
          "content-type": "application/json",
        },
        validateStatus: () => true,
      },
    );
    expect(response.status).toBe(406);
    expect(response.data.error.code).toBe(-32000);
  });

  it("POST /mcp with valid Accept but no Authorization returns 401 with -32001", async () => {
    const response = await axios.post(
      `${baseUrl}/mcp`,
      {},
      {
        headers: {
          accept: "application/json, text/event-stream",
          "x-organization-id": "org-1",
          "content-type": "application/json",
        },
        validateStatus: () => true,
      },
    );
    expect(response.status).toBe(401);
    expect(response.data.error.code).toBe(-32001);
  });

  it("POST /mcp with Authorization but no X-Organization-ID returns 401 with -32001", async () => {
    const response = await axios.post(
      `${baseUrl}/mcp`,
      {},
      {
        headers: {
          accept: "application/json, text/event-stream",
          authorization: "Bearer key",
          "content-type": "application/json",
        },
        validateStatus: () => true,
      },
    );
    expect(response.status).toBe(401);
    expect(response.data.error.code).toBe(-32001);
  });

  it("POST /mcp with oversized body returns 413", async () => {
    // Build a string that exceeds 1 MB
    const largeBody = JSON.stringify({ data: "x".repeat(1.1 * 1024 * 1024) });
    const response = await axios.post(`${baseUrl}/mcp`, largeBody, {
      headers: {
        ...VALID_HEADERS,
      },
      maxBodyLength: Infinity,
      validateStatus: () => true,
    });
    expect(response.status).toBe(413);
  });

  it("POST /mcp with invalid JSON body returns 413 with -32700", async () => {
    // Use transformRequest to bypass axios's automatic JSON encoding
    const response = await axios.post(`${baseUrl}/mcp`, "this is not json", {
      headers: {
        ...VALID_HEADERS,
      },
      transformRequest: [(data) => data],
      validateStatus: () => true,
    });
    // Handler returns 413 for all body parse errors (both too-large and invalid JSON)
    expect(response.status).toBe(413);
    expect(response.data.error.code).toBe(-32700);
  });

  it("GET /unknown-path returns 404", async () => {
    const response = await axios.get(`${baseUrl}/unknown-path`, {
      validateStatus: () => true,
    });
    expect(response.status).toBe(404);
  });

  // ── AgentCore / env-var credential mode ────────────────────────────────

  it("POST /mcp uses env var credentials when set (AgentCore mode)", async () => {
    process.env.ADMINA_API_KEY = "env-api-key";
    process.env.ADMINA_ORGANIZATION_ID = "env-org-id";

    const response = await axios.post(
      `${baseUrl}/mcp`,
      { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} },
      {
        // No Authorization or X-Organization-ID headers — credentials come from env
        headers: {
          accept: "application/json, text/event-stream",
          "content-type": "application/json",
        },
        validateStatus: () => true,
      },
    );

    // Should not be rejected (401) — env vars supply the credentials
    expect(response.status).not.toBe(401);
    expect(response.status).toBe(200);
  });

  it("POST /mcp env var API key takes priority over Authorization header", async () => {
    process.env.ADMINA_API_KEY = "env-api-key";
    process.env.ADMINA_ORGANIZATION_ID = "env-org-id";

    const { createRemoteMcpServer } = await import("../../remote/server.js");
    const mockCreate = createRemoteMcpServer as jest.Mock;

    const response = await axios.post(
      `${baseUrl}/mcp`,
      { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} },
      {
        headers: {
          accept: "application/json, text/event-stream",
          authorization: "Bearer header-api-key",
          "x-organization-id": "header-org-id",
          "content-type": "application/json",
        },
        validateStatus: () => true,
      },
    );

    expect(response.status).toBe(200);
    // env var wins over header
    expect(mockCreate).toHaveBeenCalledWith("env-api-key", "env-org-id");
  });

  it("POST /mcp with valid headers and valid JSON forwards to MCP server", async () => {
    const mcpRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {},
    };

    const response = await axios.post(`${baseUrl}/mcp`, mcpRequest, {
      headers: {
        ...VALID_HEADERS,
      },
      validateStatus: () => true,
    });

    // Should not be rejected by the pre-flight checks (406, 401, 413)
    expect(response.status).not.toBe(406);
    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(413);
    // Should reach the MCP layer (mocked transport responds with 200)
    expect(response.status).toBe(200);
  });
});
