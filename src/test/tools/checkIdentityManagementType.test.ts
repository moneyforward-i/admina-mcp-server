import axios from "axios";
import { resetClient } from "../../admina-api.js";
import {
  CheckIdentityManagementTypeParams,
  checkIdentityManagementType,
} from "../../tools/checkIdentityManagementType.js";

// Define the shape of our mock response
interface MockApiResponse {
  type: string;
}

// Mock axios to prevent real API calls
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("checkIdentityManagementType", () => {
  // Define mock response for check identity management type endpoint
  const mockCheckResponse: MockApiResponse = {
    type: "hr_master",
  };

  beforeEach(() => {
    // Reset client instance before each test
    resetClient();

    // Setup axios mock to return a specific response
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes("/identity/check")) {
        return Promise.resolve({ data: mockCheckResponse });
      }
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should check identity management type with email", async () => {
    const params: CheckIdentityManagementTypeParams = {
      email: "test@example.com",
    };

    const result = (await checkIdentityManagementType(params)) as MockApiResponse;

    // Verify axios.get was called with the correct URL pattern
    expect(mockedAxios.get).toHaveBeenCalled();
    const callUrl = mockedAxios.get.mock.calls[0][0];
    expect(callUrl).toContain("/identity/check");
    expect(callUrl).toContain("email=test%40example.com");

    // Verify the correct mock response was returned
    expect(result).toEqual(mockCheckResponse);
  });

  it("should check identity management type with identityId", async () => {
    const params: CheckIdentityManagementTypeParams = {
      identityId: "identity-123",
    };

    const result = (await checkIdentityManagementType(params)) as MockApiResponse;

    // Verify axios.get was called
    expect(mockedAxios.get).toHaveBeenCalled();
    const callUrl = mockedAxios.get.mock.calls[0][0];
    expect(callUrl).toContain("/identity/check");
    expect(callUrl).toContain("identityId=identity-123");

    // Verify the mock response was returned
    expect(result).toEqual(mockCheckResponse);
  });

  it("should check identity management type with both email and identityId", async () => {
    const params: CheckIdentityManagementTypeParams = {
      email: "test@example.com",
      identityId: "identity-123",
    };

    const result = (await checkIdentityManagementType(params)) as MockApiResponse;

    // Verify axios.get was called
    expect(mockedAxios.get).toHaveBeenCalled();
    const callUrl = mockedAxios.get.mock.calls[0][0];
    expect(callUrl).toContain("/identity/check");
    expect(callUrl).toContain("email=test%40example.com");
    expect(callUrl).toContain("identityId=identity-123");

    // Verify the mock response was returned
    expect(result).toEqual(mockCheckResponse);
  });

  it("should handle empty parameters", async () => {
    const result = (await checkIdentityManagementType({})) as MockApiResponse;

    // Verify correct URL without query parameters
    expect(mockedAxios.get).toHaveBeenCalled();
    const callUrl = mockedAxios.get.mock.calls[0][0];
    expect(callUrl).toContain("/identity/check");

    // Verify the mock response was returned
    expect(result).toEqual(mockCheckResponse);
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
    await expect(checkIdentityManagementType({})).rejects.toThrow();
  });
});
