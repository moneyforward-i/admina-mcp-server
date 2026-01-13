import axios from "axios";
import { resetClient } from "../../admina-api.js";
import { UpdateDeviceCustomFieldParams, updateDeviceCustomField } from "../../tools/updateDeviceCustomField.js";

// Define the shape of our mock response
interface MockApiResponse {
  id: number;
  attributeName: string;
  attributeCode: string;
  kind: string;
}

// Mock axios to prevent real API calls
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("updateDeviceCustomField", () => {
  const mockUpdateCustomFieldResponse = {
    id: 1,
    attributeName: "Updated Custom Field",
    attributeCode: "custom_field",
    kind: "text",
  };

  beforeEach(() => {
    resetClient();

    mockedAxios.patch.mockImplementation((url) => {
      if (url.includes("/fields/custom/")) {
        return Promise.resolve({ data: mockUpdateCustomFieldResponse });
      }
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should update a custom field name", async () => {
    const params: UpdateDeviceCustomFieldParams = {
      customFieldId: 1,
      attributeName: "Updated Custom Field",
    };

    const result = (await updateDeviceCustomField(params)) as MockApiResponse;

    expect(mockedAxios.patch).toHaveBeenCalled();
    const callUrl = mockedAxios.patch.mock.calls[0][0];
    const callBody = mockedAxios.patch.mock.calls[0][1];

    expect(callUrl).toContain("/fields/custom/1");
    expect(callBody).toEqual({ attributeName: params.attributeName });

    expect(result).toEqual(mockUpdateCustomFieldResponse);
  });

  it("should update visible device types", async () => {
    const params: UpdateDeviceCustomFieldParams = {
      customFieldId: 2,
      visibleForType: ["pc", "phone"],
    };

    await updateDeviceCustomField(params);

    expect(mockedAxios.patch).toHaveBeenCalled();
    const callUrl = mockedAxios.patch.mock.calls[0][0];
    const callBody = mockedAxios.patch.mock.calls[0][1];

    expect(callUrl).toContain("/fields/custom/2");
    expect(callBody).toEqual({ visibleForType: params.visibleForType });
  });

  it("should update dropdown configuration", async () => {
    const params: UpdateDeviceCustomFieldParams = {
      customFieldId: 3,
      configuration: {
        values: [
          { id: "1", value: "New Option 1" },
          { id: "2", value: "New Option 2" },
        ],
      },
    };

    await updateDeviceCustomField(params);

    expect(mockedAxios.patch).toHaveBeenCalled();
    const callBody = mockedAxios.patch.mock.calls[0][1];

    expect(callBody).toEqual({ configuration: params.configuration });
  });

  it("should handle errors from the API", async () => {
    const axiosError = new axios.AxiosError("Request failed with status code 404", "404", undefined, undefined, {
      status: 404,
      data: { errorId: "not_found" },
      statusText: "Not Found",
      headers: {},
      config: {} as any,
    } as any);

    mockedAxios.patch.mockRejectedValueOnce(axiosError);

    const params: UpdateDeviceCustomFieldParams = {
      customFieldId: 999,
      attributeName: "Test",
    };

    await expect(updateDeviceCustomField(params)).rejects.toThrow();
  });
});
