import { URLSearchParams } from "node:url";
import axios from "axios";
import { resetClient } from "../../admina-api.js";
import { ServiceFilters, getServices } from "../../tools/getServices.js";

// Define the shape of our mock response
interface MockApiResponse {
  data: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  cursor?: string;
}

// Mock axios to prevent real API calls
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("getServices", () => {
  // Define mock response for services endpoint
  const mockServicesResponse = {
    data: [
      { id: "1", name: "Service 1", type: "SaaS" },
      { id: "2", name: "Service 2", type: "Cloud" },
    ],
    cursor: "next-page-token",
  };

  beforeEach(() => {
    // Reset client instance before each test
    resetClient();

    // Setup axios mock to return a specific response for the services endpoint
    mockedAxios.get.mockImplementation((url) => {
      // If the URL contains "/services", return the services response
      if (url.includes("/services")) {
        return Promise.resolve({ data: mockServicesResponse });
      }

      // Default response for any other endpoint
      return Promise.resolve({ data: { data: [] } });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch services with filters", async () => {
    const filters: ServiceFilters = {
      keyword: "test",
      limit: 10,
      sortBy: "name",
      sortOrder: "ASC",
    };

    const result = (await getServices(filters)) as MockApiResponse;

    // Verify axios.get was called with the correct URL pattern
    expect(mockedAxios.get).toHaveBeenCalled();
    const callUrl = mockedAxios.get.mock.calls[0][0];
    expect(callUrl).toContain("/services");

    // Verify the parameters were passed correctly
    expect(callUrl).toContain("keyword=test");
    expect(callUrl).toContain("limit=10");
    expect(callUrl).toContain("sortBy=name");
    expect(callUrl).toContain("sortOrder=ASC");

    // Verify the correct mock response was returned
    expect(result).toEqual(mockServicesResponse);
    expect(result.data.length).toBe(2);
    expect(result.cursor).toBe("next-page-token");
  });

  it("should handle empty filters", async () => {
    const result = (await getServices({})) as MockApiResponse;

    // Verify correct URL without query parameters
    expect(mockedAxios.get).toHaveBeenCalled();
    const callUrl = mockedAxios.get.mock.calls[0][0];
    expect(callUrl).toContain("/services");

    // The URL should not contain any query params except possibly a '?'
    const urlParts = callUrl.split("?");
    if (urlParts.length > 1) {
      expect(urlParts[1].trim()).toBeFalsy();
    }

    // Verify the mock response was returned
    expect(result).toEqual(mockServicesResponse);
  });

  it("should handle pagination cursors", async () => {
    const filters: ServiceFilters = {
      cursor: "page-2-cursor",
    };

    const result = (await getServices(filters)) as MockApiResponse;

    // Verify axios.get was called with cursor in the URL
    expect(mockedAxios.get).toHaveBeenCalled();
    const callUrl = mockedAxios.get.mock.calls[0][0];
    expect(callUrl).toContain("cursor=page-2-cursor");

    // Verify the mock response with cursor was returned
    expect(result).toEqual(mockServicesResponse);
    expect(result.cursor).toBe("next-page-token");
  });

  it("should handle errors from the API", async () => {
    // Create a proper AxiosError instance
    const axiosError = new axios.AxiosError("Request failed with status code 401", "401", undefined, undefined, {
      status: 401,
      data: { errorId: "unauthorized" },
      statusText: "Unauthorized",
      headers: {},
      config: {} as any,
    } as any);

    // Setup axios to throw the AxiosError
    mockedAxios.get.mockRejectedValueOnce(axiosError);

    // Expecting the function to throw an error
    await expect(getServices({})).rejects.toThrow();
  });
});
