import axios from "axios";
import { resetClient } from "../../admina-api.js";
import { CreateDeviceCustomFieldParams, createDeviceCustomField } from "../../tools/createDeviceCustomField.js";

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

describe("createDeviceCustomField", () => {
  const mockCreateCustomFieldResponse = {
    id: 1,
    attributeName: "Custom Field",
    attributeCode: "custom_field",
    kind: "text",
  };

  beforeEach(() => {
    resetClient();

    mockedAxios.post.mockImplementation((url) => {
      if (url.includes("/fields/custom")) {
        return Promise.resolve({ data: mockCreateCustomFieldResponse });
      }
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should create a text custom field", async () => {
    const params: CreateDeviceCustomFieldParams = {
      attributeName: "Custom Field",
      attributeCode: "custom_field",
      kind: "text",
    };

    const result = (await createDeviceCustomField(params)) as MockApiResponse;

    expect(mockedAxios.post).toHaveBeenCalled();
    const callUrl = mockedAxios.post.mock.calls[0][0];
    const callBody = mockedAxios.post.mock.calls[0][1];

    expect(callUrl).toContain("/fields/custom");
    expect(callBody).toEqual({
      attributeName: params.attributeName,
      attributeCode: params.attributeCode,
      kind: params.kind,
    });

    expect(result).toEqual(mockCreateCustomFieldResponse);
  });

  it("should create a dropdown custom field with configuration", async () => {
    const params: CreateDeviceCustomFieldParams = {
      attributeName: "Status Field",
      attributeCode: "status_field",
      kind: "dropdown",
      configuration: {
        values: [
          { id: "1", value: "Option 1" },
          { id: "2", value: "Option 2" },
        ],
      },
    };

    await createDeviceCustomField(params);

    expect(mockedAxios.post).toHaveBeenCalled();
    const callBody = mockedAxios.post.mock.calls[0][1];

    expect(callBody).toEqual({
      attributeName: params.attributeName,
      attributeCode: params.attributeCode,
      kind: params.kind,
      configuration: params.configuration,
    });
  });

  it("should handle errors from the API", async () => {
    const axiosError = new axios.AxiosError("Request failed with status code 400", "400", undefined, undefined, {
      status: 400,
      data: { errorId: "validation_error" },
      statusText: "Bad Request",
      headers: {},
      config: {} as any,
    } as any);

    mockedAxios.post.mockRejectedValueOnce(axiosError);

    const params: CreateDeviceCustomFieldParams = {
      attributeName: "Custom Field",
      attributeCode: "custom_field",
      kind: "text",
    };

    await expect(createDeviceCustomField(params)).rejects.toThrow();
  });
});
