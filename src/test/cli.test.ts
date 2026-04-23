import { DEFAULT_HTTP_HOST, DEFAULT_HTTP_PORT, parseCliOptions } from "../index.js";

describe("parseCliOptions", () => {
  it("defaults to stdio with no args or env", () => {
    const opts = parseCliOptions([], {});
    expect(opts.transport).toBe("stdio");
    expect(opts.http.port).toBe(DEFAULT_HTTP_PORT);
    expect(opts.http.host).toBe(DEFAULT_HTTP_HOST);
  });

  it("selects http via --http flag", () => {
    const opts = parseCliOptions(["--http"], {});
    expect(opts.transport).toBe("http");
  });

  it("selects http via MCP_TRANSPORT=http", () => {
    const opts = parseCliOptions([], { MCP_TRANSPORT: "http" });
    expect(opts.transport).toBe("http");
  });

  it("reads port and host from flags", () => {
    const opts = parseCliOptions(["--http", "--port", "4000", "--host", "0.0.0.0"], {});
    expect(opts.http).toEqual({ port: 4000, host: "0.0.0.0" });
  });

  it("reads port and host from env", () => {
    const opts = parseCliOptions([], {
      MCP_TRANSPORT: "http",
      MCP_HTTP_PORT: "4001",
      MCP_HTTP_HOST: "::1",
    });
    expect(opts.http).toEqual({ port: 4001, host: "::1" });
  });

  it("flags override env", () => {
    const opts = parseCliOptions(["--port", "5000"], {
      MCP_HTTP_PORT: "4000",
    });
    expect(opts.http.port).toBe(5000);
  });

  it("rejects invalid port flag value", () => {
    expect(() => parseCliOptions(["--port", "not-a-number"], {})).toThrow(/Invalid --port/);
    expect(() => parseCliOptions(["--port", "70000"], {})).toThrow(/Invalid --port/);
  });

  it("rejects --port without value", () => {
    expect(() => parseCliOptions(["--port"], {})).toThrow(/--port requires a value/);
  });

  it("rejects --host without value", () => {
    expect(() => parseCliOptions(["--host"], {})).toThrow(/--host requires a value/);
  });

  it("rejects invalid MCP_HTTP_PORT env value", () => {
    expect(() => parseCliOptions([], { MCP_HTTP_PORT: "abc" })).toThrow(/Invalid MCP_HTTP_PORT/);
  });

  it("allows explicit --stdio", () => {
    const opts = parseCliOptions(["--stdio"], { MCP_TRANSPORT: "http" });
    expect(opts.transport).toBe("stdio");
  });
});
