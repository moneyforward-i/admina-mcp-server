import axios from "axios";
import { resetClient } from "../../admina-api.js";
import { getDeviceCustomFields } from "../../tools/getDeviceCustomFields.js";

// Define the shape of our mock response
interface MockApiResponse {
  data: Array<{
    id: number;
    attributeName: string;
    attributeCode: string;
    kind: string;
  }>;
}

// Mock axios to prevent real API calls
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("getDeviceCustomFields", () => {
  const mockCustomFieldsResponse = {
    data: [
      { id: 1, attributeName: "Custom Field 1", attributeCode: "custom_1", kind: "text" },
      { id: 2, attributeName: "Custom Field 2", attributeCode: "custom_2", kind: "number" },
    ],
  };

  beforeEach(() => {
    resetClient();

    mockedAxios.get.mockImplementation((url) => {
      if (url.includes("/fields/custom")) {
        return Promise.resolve({ data: mockCustomFieldsResponse });
      }
      return Promise.resolve({ data: { data: [] } });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch device custom fields", async () => {
    const result = (await getDeviceCustomFields()) as MockApiResponse;

    expect(mockedAxios.get).toHaveBeenCalled();
    const callUrl = mockedAxios.get.mock.calls[0][0];
    expect(callUrl).toContain("/fields/custom");

    expect(result).toEqual(mockCustomFieldsResponse);
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

    await expect(getDeviceCustomFields()).rejects.toThrow();
  });
});
