import axios from "axios";
import { AdminaApiClient, MCP_USAGE_TRACKING_HEADERS, getClient, resetClient } from "../admina-api.js";
import { withCredentials } from "../context.js";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("admina-api getClient", () => {
  const originalKey = process.env.ADMINA_API_KEY;
  const originalOrg = process.env.ADMINA_ORGANIZATION_ID;

  beforeEach(() => {
    resetClient();
    mockedAxios.get.mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    jest.clearAllMocks();
    // biome-ignore lint/performance/noDelete: env-var-unset semantics matter; `= undefined` sets the string "undefined"
    if (originalKey === undefined) delete process.env.ADMINA_API_KEY;
    else process.env.ADMINA_API_KEY = originalKey;
    // biome-ignore lint/performance/noDelete: env-var-unset semantics matter; `= undefined` sets the string "undefined"
    if (originalOrg === undefined) delete process.env.ADMINA_ORGANIZATION_ID;
    else process.env.ADMINA_ORGANIZATION_ID = originalOrg;
  });

  describe("without credential context (stdio mode)", () => {
    it("returns a singleton built from env vars", () => {
      process.env.ADMINA_API_KEY = "env-key";
      process.env.ADMINA_ORGANIZATION_ID = "env-org";

      const a = getClient();
      const b = getClient();

      expect(a).toBeInstanceOf(AdminaApiClient);
      expect(a).toBe(b);
    });

    it("throws when env vars are missing", () => {
      // biome-ignore lint/performance/noDelete: env-var-unset semantics matter; `= undefined` sets the string "undefined"
      delete process.env.ADMINA_API_KEY;
      // biome-ignore lint/performance/noDelete: env-var-unset semantics matter; `= undefined` sets the string "undefined"
      delete process.env.ADMINA_ORGANIZATION_ID;
      expect(() => getClient()).toThrow("ADMINA_API_KEY and ADMINA_ORGANIZATION_ID must be set");
    });
  });

  describe("inside withCredentials (HTTP mode)", () => {
    it("uses context credentials and ignores env vars", async () => {
      process.env.ADMINA_API_KEY = "env-key";
      process.env.ADMINA_ORGANIZATION_ID = "env-org";

      await withCredentials({ apiKey: "ctx-key", organizationId: "ctx-org" }, async () => {
        const client = getClient();
        await client.makeApiCall("/organizations/whatever", new URLSearchParams());

        const [url, config] = mockedAxios.get.mock.calls[0];
        expect(url).toContain("/organizations/ctx-org/");
        expect(config?.headers).toMatchObject({
          Authorization: "Bearer ctx-key",
          ...MCP_USAGE_TRACKING_HEADERS,
        });
      });
    });

    it("does not share the instance with the env-backed singleton", () => {
      process.env.ADMINA_API_KEY = "env-key";
      process.env.ADMINA_ORGANIZATION_ID = "env-org";

      const envClient = getClient();
      const ctxClient = withCredentials({ apiKey: "ctx-key", organizationId: "ctx-org" }, () => getClient());

      expect(ctxClient).not.toBe(envClient);
    });

    it("isolates clients across concurrent scopes", async () => {
      const seenOrgIds: string[] = [];

      mockedAxios.get.mockImplementation((url: string) => {
        const m = url.match(/\/organizations\/([^/]+)\//);
        if (m) seenOrgIds.push(m[1]);
        return Promise.resolve({ data: {} });
      });

      const run = async (apiKey: string, organizationId: string) =>
        withCredentials({ apiKey, organizationId }, async () => {
          const client = getClient();
          await client.makeApiCall("/organizations/me", new URLSearchParams());
        });

      await Promise.all([run("keyA", "orgA"), run("keyB", "orgB"), run("keyC", "orgC")]);

      expect(seenOrgIds.sort()).toEqual(["orgA", "orgB", "orgC"]);
    });
  });
});
