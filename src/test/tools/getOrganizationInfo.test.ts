import axios from "axios";
import { resetClient } from "../../admina-api.js";
import { getOrganizationInfo } from "../../tools/getOrganizationInfo.js";

// Define the shape of our mock response
interface MockApiResponse {
  id: string;
  name: string;
  status: string;
}

// Mock axios to prevent real API calls
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("getOrganizationInfo", () => {
  const mockOrganizationResponse = {
    id: "org-123",
    name: "Test Organization",
    status: "active",
  };

  beforeEach(() => {
    resetClient();

    mockedAxios.get.mockImplementation((url) => {
      if (url.includes("/organizations/")) {
        return Promise.resolve({ data: mockOrganizationResponse });
      }
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch organization info", async () => {
    const result = (await getOrganizationInfo()) as MockApiResponse;

    expect(mockedAxios.get).toHaveBeenCalled();
    const callUrl = mockedAxios.get.mock.calls[0][0];
    expect(callUrl).toContain("/organizations/");

    expect(result).toEqual(mockOrganizationResponse);
  });

  it("should handle errors from the API", async () => {
    const axiosError = new axios.AxiosError("Request failed with status code 500", "500", undefined, undefined, {
      status: 500,
      data: { errorId: "server_error" },
      statusText: "Internal Server Error",
      headers: {},
      config: {} as any,
    } as any);

    mockedAxios.get.mockRejectedValueOnce(axiosError);

    await expect(getOrganizationInfo()).rejects.toThrow();
  });
});
