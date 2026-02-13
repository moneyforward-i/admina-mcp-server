import axios from "axios";
import { resetClient } from "../../admina-api.js";
import { getIdentitiesStats } from "../../tools/getIdentitiesStats.js";

// Define the shape of our mock response
interface ManagementTypeDto {
  type: string;
  count: number;
}

interface HrMasterStatistic {
  workspaceId: number;
  serviceId: number;
  serviceUniqueName: string;
  lastSynchronizationAt: string | null;
  serviceName: string;
}

interface MockApiResponse {
  managementTypes: ManagementTypeDto[];
  hrMasters: HrMasterStatistic[];
  domains: string[];
}

// Mock axios to prevent real API calls
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("getIdentitiesStats", () => {
  // Define mock response for identities stats endpoint
  const mockStatsResponse: MockApiResponse = {
    managementTypes: [
      { type: "hr_master", count: 50 },
      { type: "manual", count: 25 },
      { type: "unregistered", count: 10 },
    ],
    hrMasters: [
      {
        workspaceId: 1,
        serviceId: 100,
        serviceUniqueName: "hr-service-1",
        lastSynchronizationAt: "2024-01-15T10:30:00Z",
        serviceName: "HR System 1",
      },
    ],
    domains: ["example.com", "test.com"],
  };

  beforeEach(() => {
    // Reset client instance before each test
    resetClient();

    // Setup axios mock to return a specific response
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes("/identity/stats")) {
        return Promise.resolve({ data: mockStatsResponse });
      }
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch identities statistics", async () => {
    const result = (await getIdentitiesStats({})) as MockApiResponse;

    // Verify axios.get was called with the correct URL pattern
    expect(mockedAxios.get).toHaveBeenCalled();
    const callUrl = mockedAxios.get.mock.calls[0][0];
    expect(callUrl).toContain("/identity/stats");

    // Verify the correct mock response was returned
    expect(result).toEqual(mockStatsResponse);
    expect(result.managementTypes).toHaveLength(3);
    expect(result.hrMasters).toHaveLength(1);
    expect(result.domains).toHaveLength(2);
  });

  it("should return management types with counts", async () => {
    const result = (await getIdentitiesStats({})) as MockApiResponse;

    // Verify the management types structure
    expect(result.managementTypes[0]).toHaveProperty("type");
    expect(result.managementTypes[0]).toHaveProperty("count");
    expect(result.managementTypes[0].type).toBe("hr_master");
    expect(result.managementTypes[0].count).toBe(50);
  });

  it("should return hr masters information", async () => {
    const result = (await getIdentitiesStats({})) as MockApiResponse;

    // Verify the hr masters structure
    const hrMaster = result.hrMasters[0];
    expect(hrMaster).toHaveProperty("workspaceId");
    expect(hrMaster).toHaveProperty("serviceId");
    expect(hrMaster).toHaveProperty("serviceUniqueName");
    expect(hrMaster).toHaveProperty("lastSynchronizationAt");
    expect(hrMaster).toHaveProperty("serviceName");
  });

  it("should return domains list", async () => {
    const result = (await getIdentitiesStats({})) as MockApiResponse;

    // Verify the domains structure
    expect(Array.isArray(result.domains)).toBe(true);
    expect(result.domains).toContain("example.com");
    expect(result.domains).toContain("test.com");
  });

  it("should handle errors from the API", async () => {
    // Create a proper AxiosError instance
    const axiosError = new axios.AxiosError("Request failed with status code 500", "500", undefined, undefined, {
      status: 500,
      data: { errorId: "internal_server_error" },
      statusText: "Internal Server Error",
      headers: {},
      config: {} as any,
    } as any);

    // Setup axios to throw the AxiosError
    mockedAxios.get.mockRejectedValueOnce(axiosError);

    // Expecting the function to throw an error
    await expect(getIdentitiesStats({})).rejects.toThrow();
  });
});
