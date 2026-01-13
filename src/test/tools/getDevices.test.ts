import axios from "axios";
import { resetClient } from "../../admina-api.js";
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
    // Note: getDevices uses POST /devices/search, so we mock axios.post
    mockedAxios.post.mockImplementation((url) => {
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
      limit: 10,
    };

    const result = (await getDevices(filters)) as MockApiResponse;

    // Verify axios.post was called with the correct URL pattern
    expect(mockedAxios.post).toHaveBeenCalled();
    const callUrl = mockedAxios.post.mock.calls[0][0];
    expect(callUrl).toContain("/devices/search");

    // Verify the limit parameter was passed in query string
    expect(callUrl).toContain("limit=10");

    // Verify the correct mock response was returned
    expect(result).toEqual(mockDevicesResponse);
  });

  it("should call devices search endpoint with empty filters", async () => {
    const result = (await getDevices({})) as MockApiResponse;

    // Verify correct URL for devices search endpoint
    expect(mockedAxios.post).toHaveBeenCalled();
    const callUrl = mockedAxios.post.mock.calls[0][0];
    expect(callUrl).toContain("/devices/search");

    // Verify empty body was passed
    const callBody = mockedAxios.post.mock.calls[0][1];
    expect(callBody).toEqual({});

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
    mockedAxios.post.mockRejectedValueOnce(axiosError);

    // Expecting the function to throw an error
    await expect(getDevices({})).rejects.toThrow();
  });
});
