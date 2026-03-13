import axios from "axios";
import { resetClient } from "../../admina-api.js";
import { BulkUpdateIdentitiesParams, bulkUpdateIdentities } from "../../tools/bulkUpdateIdentities.js";

// Mock axios to prevent real API calls
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("bulkUpdateIdentities", () => {
  const mockResponse = {};

  beforeEach(() => {
    resetClient();
    mockedAxios.patch.mockImplementation((url) => {
      if (url.includes("/identity/bulk")) {
        return Promise.resolve({ data: mockResponse });
      }
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should call PATCH /identity/bulk with identityIds and identityUpdates", async () => {
    const params: BulkUpdateIdentitiesParams = {
      identityIds: ["identity-1", "identity-2"],
      identityUpdates: {
        employeeStatus: "active",
      },
    };

    const result = await bulkUpdateIdentities(params);

    expect(mockedAxios.patch).toHaveBeenCalled();
    const callUrl = mockedAxios.patch.mock.calls[0][0];
    const callBody = mockedAxios.patch.mock.calls[0][1] as Record<string, unknown>;

    expect(callUrl).toContain("/identity/bulk");
    expect(callBody).toHaveProperty("identityIds");
    expect(callBody.identityIds).toEqual(["identity-1", "identity-2"]);
    expect(callBody).toHaveProperty("identityUpdates");
    expect((callBody.identityUpdates as Record<string, unknown>).employeeStatus).toBe("active");
    expect(result).toEqual(mockResponse);
  });

  it("should include all provided identityUpdates fields in the request body", async () => {
    const params: BulkUpdateIdentitiesParams = {
      identityIds: ["identity-1"],
      identityUpdates: {
        employeeType: "full_time_employee",
        department: { name: "Engineering" },
        jobTitle: "Software Engineer",
        note: "Bulk updated",
      },
    };

    await bulkUpdateIdentities(params);

    const callBody = mockedAxios.patch.mock.calls[0][1] as Record<string, unknown>;
    const updates = callBody.identityUpdates as Record<string, unknown>;

    expect(updates).toHaveProperty("employeeType", "full_time_employee");
    expect(updates).toHaveProperty("department", { name: "Engineering" });
    expect(updates).toHaveProperty("jobTitle", "Software Engineer");
    expect(updates).toHaveProperty("note", "Bulk updated");
  });

  it("should not include undefined identityUpdates fields in the request body", async () => {
    const params: BulkUpdateIdentitiesParams = {
      identityIds: ["identity-1"],
      identityUpdates: {
        employeeStatus: "on_leave",
      },
    };

    await bulkUpdateIdentities(params);

    const callBody = mockedAxios.patch.mock.calls[0][1] as Record<string, unknown>;
    const updates = callBody.identityUpdates as Record<string, unknown>;

    expect(updates).toHaveProperty("employeeStatus", "on_leave");
    expect(updates).not.toHaveProperty("employeeType");
    expect(updates).not.toHaveProperty("displayName");
    expect(updates).not.toHaveProperty("department");
  });

  it("should handle empty identityUpdates (no update fields provided)", async () => {
    const params: BulkUpdateIdentitiesParams = {
      identityIds: ["identity-1", "identity-2", "identity-3"],
      identityUpdates: {},
    };

    await bulkUpdateIdentities(params);

    const callBody = mockedAxios.patch.mock.calls[0][1] as Record<string, unknown>;

    expect(callBody.identityIds).toHaveLength(3);
    expect(callBody.identityUpdates).toEqual({});
  });

  it("should handle API errors", async () => {
    const axiosError = new axios.AxiosError("Request failed with status code 400", "400", undefined, undefined, {
      status: 400,
      data: { errorId: "validation_exception" },
      statusText: "Bad Request",
      headers: {},
      config: {} as any,
    } as any);

    mockedAxios.patch.mockRejectedValueOnce(axiosError);

    const params: BulkUpdateIdentitiesParams = {
      identityIds: ["identity-1"],
      identityUpdates: { employeeStatus: "active" },
    };

    await expect(bulkUpdateIdentities(params)).rejects.toThrow();
  });
});
