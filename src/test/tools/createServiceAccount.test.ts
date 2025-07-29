import { createServiceAccount, CreateServiceAccountSchema } from "../../tools/createServiceAccount.js";
import { resetClient } from "../../admina-api.js";

beforeEach(() => {
  resetClient();
});

describe("createServiceAccount", () => {
  test("should validate required fields", () => {
    const validInput = {
      organizationId: 123,
      workspaceId: 456,
      data: {
        email: "test@example.com",
        displayName: "Test User",
      },
    };
    expect(() => CreateServiceAccountSchema.parse(validInput)).not.toThrow();
  });

  test("should accept workflow run ID", () => {
    const input = {
      organizationId: 123,
      workspaceId: 456,
      data: { email: "test@example.com" },
      workflowRunId: "12345678-1234-1234-1234-123456789012",
    };
    const parsed = CreateServiceAccountSchema.parse(input);
    expect(parsed.workflowRunId).toBe("12345678-1234-1234-1234-123456789012");
  });

  test("should reject invalid UUID for workflowRunId", () => {
    const invalidInput = {
      organizationId: 123,
      workspaceId: 456,
      data: { email: "test@example.com" },
      workflowRunId: "invalid-uuid",
    };
    expect(() => CreateServiceAccountSchema.parse(invalidInput)).toThrow();
  });

  test("should accept array values in data", () => {
    const input = {
      organizationId: 123,
      workspaceId: 456,
      data: {
        email: "test@example.com",
        licenses: ["license1", "license2"],
        roles: ["admin"],
      },
    };
    expect(() => CreateServiceAccountSchema.parse(input)).not.toThrow();
  });
});