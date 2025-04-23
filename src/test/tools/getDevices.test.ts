import { URLSearchParams } from "node:url";
import axios from "axios";
import { AdminaApiClient, getClient, resetClient } from "../../admina-api.js";
import { DeviceFilters, getDevices } from "../../tools/getDevices.js";

// Define the shape of our mock response
interface MockApiResponse {
  data: Array<{
    id: string;
    name: string;
    status: string;
    asset_number?: string;
  }>;
}

// Mock axios to prevent real API calls
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("getDevices", () => {
  // Define mock response for devices endpoint
  const mockDevicesResponse = {
    data: [
      { id: "1", name: "Device 1", status: "active", asset_number: "A001" },
      { id: "2", name: "Device 2", status: "active", asset_number: "A002" },
    ],
  };

  beforeEach(() => {
    // Reset client instance before each test
    resetClient();

    // Setup axios mock to return a specific response for the devices endpoint
    mockedAxios.get.mockImplementation((url) => {
      // If the URL contains "/devices", return the devices response
      if (url.includes("/devices")) {
        return Promise.resolve({ data: mockDevicesResponse });
      }

      // Default response for any other endpoint
      return Promise.resolve({ data: { data: [] } });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch devices with filters", async () => {
    const filters: DeviceFilters = {
      status: "active",
      limit: 10,
      locale: "en",
    };

    const result = (await getDevices(filters)) as MockApiResponse;

    // Verify axios.get was called with the correct URL pattern
    expect(mockedAxios.get).toHaveBeenCalled();
    const callUrl = mockedAxios.get.mock.calls[0][0];
    expect(callUrl).toContain("/devices");

    // Verify the parameters were passed correctly
    expect(callUrl).toContain("status=active");
    expect(callUrl).toContain("limit=10");
    expect(callUrl).toContain("locale=en");

    // Verify the correct mock response was returned
    expect(result).toEqual(mockDevicesResponse);
  });

  it("should use default locale when minimal filters provided", async () => {
    const result = (await getDevices({ locale: "ja" })) as MockApiResponse;

    // Verify correct URL with locale parameter
    expect(mockedAxios.get).toHaveBeenCalled();
    const callUrl = mockedAxios.get.mock.calls[0][0];
    expect(callUrl).toContain("/devices");
    expect(callUrl).toContain("locale=ja");

    // Verify the mock response was returned
    expect(result).toEqual(mockDevicesResponse);
  });

  it("should handle errors from the API", async () => {
    // Create a proper AxiosError instance
    const axiosError = new axios.AxiosError("Request failed with status code 500", "500", undefined, undefined, {
      status: 500,
      data: { errorId: "server_error" },
      statusText: "Internal Server Error",
      headers: {},
      config: {} as any,
    } as any);

    // Setup axios to throw the AxiosError
    mockedAxios.get.mockRejectedValueOnce(axiosError);

    // Expecting the function to throw an error
    await expect(getDevices({ locale: "en" })).rejects.toThrow();
  });
});
