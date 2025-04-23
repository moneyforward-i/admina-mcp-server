import { URLSearchParams } from "node:url";
import axios from "axios";
import { resetClient } from "../../admina-api.js";
import { IdentityFilters, getIdentities } from "../../tools/getIdentities.js";

// Define the shape of our mock response
interface MockApiResponse {
  data: Array<{
    id: string;
    name: string;
    status: string;
    department?: string;
  }>;
}

// Mock axios to prevent real API calls
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("getIdentities", () => {
  // Define mock response for identities endpoint
  const mockIdentitiesResponse = {
    data: [
      { id: "1", name: "User 1", status: "active", department: "Engineering" },
      { id: "2", name: "User 2", status: "active", department: "Marketing" },
    ],
  };

  beforeEach(() => {
    // Reset client instance before each test
    resetClient();

    // Setup axios mock to return a specific response for the identities endpoint
    mockedAxios.get.mockImplementation((url) => {
      // If the URL contains "/identity", return the identities response
      if (url.includes("/identity")) {
        return Promise.resolve({ data: mockIdentitiesResponse });
      }

      // Default response for any other endpoint
      return Promise.resolve({ data: { data: [] } });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch identities with filters", async () => {
    const filters: IdentityFilters = {
      keyword: "test",
      limit: 10,
      statuses: ["active"],
    };

    const result = (await getIdentities(filters)) as MockApiResponse;

    // Verify axios.get was called with the correct URL pattern
    expect(mockedAxios.get).toHaveBeenCalled();
    const callUrl = mockedAxios.get.mock.calls[0][0];
    expect(callUrl).toContain("/identity");

    // Verify the parameters were passed correctly
    expect(callUrl).toContain("keyword=test");
    expect(callUrl).toContain("limit=10");
    expect(callUrl).toContain("statuses=active");

    // Verify the correct mock response was returned
    expect(result).toEqual(mockIdentitiesResponse);
  });

  it("should handle array parameters correctly", async () => {
    const filters: IdentityFilters = {
      departments: ["Engineering", "Marketing"],
    };

    const result = (await getIdentities(filters)) as MockApiResponse;

    // Verify axios.get was called
    expect(mockedAxios.get).toHaveBeenCalled();
    const callUrl = mockedAxios.get.mock.calls[0][0];

    // Verify array parameter is in the URL (commas might be URL encoded as %2C)
    expect(callUrl).toContain("departments=");
    expect(callUrl).toMatch(/departments=(Engineering(%2C|,)Marketing|Engineering|Marketing)/);

    // Verify the mock response was returned
    expect(result).toEqual(mockIdentitiesResponse);
  });

  it("should handle empty filters", async () => {
    const result = (await getIdentities({})) as MockApiResponse;

    // Verify correct URL without query parameters
    expect(mockedAxios.get).toHaveBeenCalled();
    const callUrl = mockedAxios.get.mock.calls[0][0];
    expect(callUrl).toContain("/identity");

    // The URL should not contain any query params except possibly a '?'
    const urlParts = callUrl.split("?");
    if (urlParts.length > 1) {
      expect(urlParts[1].trim()).toBeFalsy();
    }

    // Verify the mock response was returned
    expect(result).toEqual(mockIdentitiesResponse);
  });

  it("should handle errors from the API", async () => {
    // Create a proper AxiosError instance
    const axiosError = new axios.AxiosError("Request failed with status code 404", "404", undefined, undefined, {
      status: 404,
      data: { errorId: "not_found" },
      statusText: "Not Found",
      headers: {},
      config: {} as any,
    } as any);

    // Setup axios to throw the AxiosError
    mockedAxios.get.mockRejectedValueOnce(axiosError);

    // Expecting the function to throw an error
    await expect(getIdentities({})).rejects.toThrow();
  });
});
