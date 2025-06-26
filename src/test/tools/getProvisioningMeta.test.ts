import { getProvisioningMeta, ProvisioningMetaFiltersSchema } from "../../tools/getProvisioningMeta.js";
import { resetClient } from "../../admina-api.js";

beforeEach(() => {
  resetClient();
});

describe("getProvisioningMeta", () => {
  test("should validate required fields", () => {
    const validInput = {
      organizationId: 123,
      workspaceId: 456,
    };
    expect(() => ProvisioningMetaFiltersSchema.parse(validInput)).not.toThrow();
  });

  test("should use default language", () => {
    const input = {
      organizationId: 123,
      workspaceId: 456,
    };
    const parsed = ProvisioningMetaFiltersSchema.parse(input);
    expect(parsed.lang).toBe("ja");
  });

  test("should accept explicit language", () => {
    const input = {
      organizationId: 123,
      workspaceId: 456,
      lang: "en" as const,
    };
    const parsed = ProvisioningMetaFiltersSchema.parse(input);
    expect(parsed.lang).toBe("en");
  });

  test("should reject invalid organization ID", () => {
    const invalidInput = {
      organizationId: "invalid",
      workspaceId: 456,
    };
    expect(() => ProvisioningMetaFiltersSchema.parse(invalidInput)).toThrow();
  });
});