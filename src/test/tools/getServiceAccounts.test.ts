import { getServiceAccounts, ServiceAccountFilters } from "../../tools/getServiceAccounts.js";
import { resetClient } from "../../admina-api.js";
import axios from "axios";
import { URLSearchParams } from "node:url";

// Define the shape of our mock response
interface MockApiResponse {
  data: Array<{
    id: string;
    email: string;
    status: string;
    role?: string;
  }>;
}

// Mock axios to prevent real API calls
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("getServiceAccounts", () => {
  // Define mock response for service accounts endpoint
  const mockServiceAccountsResponse = {
    data: [
      { id: "1", email: "user1@example.com", status: "active", role: "admin" },
      { id: "2", email: "user2@example.com", status: "active", role: "user" },
    ],
  };

  beforeEach(() => {
    // Reset client instance before each test
    resetClient();

    // Setup axios mock to return a specific response for the service accounts endpoint
    mockedAxios.get.mockImplementation((url) => {
      // If the URL contains "/services/{id}/accounts", return the accounts response
      if (url.includes("/services/") && url.includes("/accounts")) {
        return Promise.resolve({ data: mockServiceAccountsResponse });
      }

      // Default response for any other endpoint
      return Promise.resolve({ data: { data: [] } });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch service accounts with filters", async () => {
    const filters: ServiceAccountFilters = {
      serviceId: 123,
      keyword: "test",
      limit: 10,
      twoFa: true,
    };

    const result = (await getServiceAccounts(filters)) as MockApiResponse;

    // Verify axios.get was called with the correct URL pattern
    expect(mockedAxios.get).toHaveBeenCalled();
    const callUrl = mockedAxios.get.mock.calls[0][0];

    // Verify serviceId is included in the URL path
    expect(callUrl).toContain("/services/123/accounts");

    // Verify the parameters were passed correctly
    expect(callUrl).toContain("keyword=test");
    expect(callUrl).toContain("limit=10");
    expect(callUrl).toContain("twoFa=true");

    // Verify serviceId is NOT in the query params (it should be in the URL path)
    expect(callUrl).not.toContain("serviceId=");

    // Verify the correct mock response was returned
    expect(result).toEqual(mockServiceAccountsResponse);
  });

  it("should handle array parameters correctly", async () => {
    const filters: ServiceAccountFilters = {
      serviceId: 456,
      roles: ["admin"],
      types: ["employee", "guest"],
      workspaceIds: [1, 2, 3],
    };

    const result = (await getServiceAccounts(filters)) as MockApiResponse;

    // Verify correct URL path
    expect(mockedAxios.get).toHaveBeenCalled();
    const callUrl = mockedAxios.get.mock.calls[0][0];
    expect(callUrl).toContain("/services/456/accounts");

    // Verify array parameters are in the URL (commas might be URL encoded as %2C)
    expect(callUrl).toContain("roles=admin");
    expect(callUrl).toContain("types=");
    expect(callUrl).toMatch(/types=(employee(%2C|,)guest|employee|guest)/);
    expect(callUrl).toContain("workspaceIds=");
    expect(callUrl).toMatch(/workspaceIds=(1(%2C|,)2(%2C|,)3|1|2|3)/);

    // Verify the mock response was returned
    expect(result).toEqual(mockServiceAccountsResponse);
  });

  it("should handle boolean parameters", async () => {
    const filters: ServiceAccountFilters = {
      serviceId: 789,
      includeDeleted: true,
      expandIdentities: false,
      onlyInactive: true,
    };

    const result = (await getServiceAccounts(filters)) as MockApiResponse;

    // Verify axios.get was called with the correct URL
    expect(mockedAxios.get).toHaveBeenCalled();
    const callUrl = mockedAxios.get.mock.calls[0][0];

    // Verify boolean parameters are correctly formatted in the URL
    expect(callUrl).toContain("includeDeleted=true");
    expect(callUrl).toContain("expandIdentities=false");
    expect(callUrl).toContain("onlyInactive=true");

    // Verify the mock response was returned
    expect(result).toEqual(mockServiceAccountsResponse);
  });

  it("should require serviceId", async () => {
    const result = (await getServiceAccounts({ serviceId: 999 })) as MockApiResponse;

    // Verify correct URL with only serviceId in the path
    expect(mockedAxios.get).toHaveBeenCalled();
    const callUrl = mockedAxios.get.mock.calls[0][0];
    expect(callUrl).toContain("/services/999/accounts");

    // Verify the URL doesn't have query parameters
    const urlParts = callUrl.split("?");
    if (urlParts.length > 1) {
      expect(urlParts[1].trim()).toBeFalsy();
    }

    // Verify the mock response was returned
    expect(result).toEqual(mockServiceAccountsResponse);
  });

  it("should handle errors from the API", async () => {
    // Create a proper AxiosError instance
    const axiosError = new axios.AxiosError("Request failed with status code 403", "403", undefined, undefined, {
      status: 403,
      data: { errorId: "forbidden" },
      statusText: "Forbidden",
      headers: {},
      config: {} as any,
    } as any);

    // Setup axios to throw the AxiosError
    mockedAxios.get.mockRejectedValueOnce(axiosError);

    // Expecting the function to throw an error
    await expect(getServiceAccounts({ serviceId: 123 })).rejects.toThrow();
  });
});
