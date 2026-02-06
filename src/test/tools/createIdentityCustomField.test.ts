import axios from "axios";
import { resetClient } from "../../admina-api.js";
import { CreateIdentityCustomFieldParams, createIdentityCustomField } from "../../tools/createIdentityCustomField.js";

// Define the shape of our mock response
interface MockApiResponse {
  id: number;
  serviceSource: {
    attributeName: string;
    attributeCode: string;
  };
  kind: string;
}

// Mock axios to prevent real API calls
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("createIdentityCustomField", () => {
  const mockCreateCustomFieldResponse = {
    id: 1,
    uniqueName: "custom_text_field",
    name: "Foo bar",
    kind: "dropdown",
    serviceSource: {
      workspaceId: 1,
      serviceFieldId: "smarthr_city",
    },
    serviceDetails: {
      id: 33,
      name: "SmartHR",
      uniqueName: "smarthr",
      serviceTopUrl: "https://smarthr.jp/",
    },
    configuration: {
      values: [
        {
          id: "option_1",
          value: "Option 1",
          group: "string",
          label: {
            ja: "こんにちは",
            en: "Hello",
          },
        },
      ],
      groups: [
        {
          label: {
            ja: "こんにちは",
            en: "Hello",
          },
          value: "phone",
        },
      ],
    },
    required: true,
  };

  beforeEach(() => {
    resetClient();

    mockedAxios.post.mockImplementation((url) => {
      if (url.includes("identity/fields/custom")) {
        return Promise.resolve({ data: mockCreateCustomFieldResponse });
      }
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should create a text custom field", async () => {
    const params: CreateIdentityCustomFieldParams = {
      attributeName: "Custom Field",
      attributeCode: "custom_field",
      serviceSource: {
        serviceFieldId: "smarthr_city",
        workspaceId: 1,
      },
      kind: "text",
    };

    const result = (await createIdentityCustomField(params)) as MockApiResponse;

    expect(mockedAxios.post).toHaveBeenCalled();
    const callUrl = mockedAxios.post.mock.calls[0][0];
    const callBody = mockedAxios.post.mock.calls[0][1];

    expect(callUrl).toContain("/fields/custom");
    expect(callBody).toEqual({
      attributeName: params.attributeName,
      attributeCode: params.attributeCode,
      serviceSource: {
        serviceFieldId: params.serviceSource!.serviceFieldId,
        workspaceId: params.serviceSource!.workspaceId,
      },
      kind: params.kind,
      configuration: null,
    });

    expect(result).toEqual(mockCreateCustomFieldResponse);
  });

  it("should create a dropdown custom field with configuration", async () => {
    const params: CreateIdentityCustomFieldParams = {
      attributeName: "Status Field",
      attributeCode: "status_field",
      kind: "dropdown",
      serviceSource: {
        serviceFieldId: "smarthr_city",
        workspaceId: 1,
      },
      configuration: {
        values: [
          { id: "1", value: "Option 1" },
          { id: "2", value: "Option 2" },
        ],
      },
    };

    await createIdentityCustomField(params);

    expect(mockedAxios.post).toHaveBeenCalled();
    const callBody = mockedAxios.post.mock.calls[0][1];

    expect(callBody).toEqual({
      attributeName: params.attributeName,
      attributeCode: params.attributeCode,
      serviceSource: {
        serviceFieldId: params.serviceSource!.serviceFieldId,
        workspaceId: params.serviceSource!.workspaceId,
      },
      kind: params.kind,
      configuration: params.configuration,
    });
  });

  it("should create a custom field without serviceSource", async () => {
    const params: CreateIdentityCustomFieldParams = {
      attributeName: "Standalone Field",
      attributeCode: "standalone_field",
      kind: "text",
    };

    await createIdentityCustomField(params);

    expect(mockedAxios.post).toHaveBeenCalled();
    const callBody = mockedAxios.post.mock.calls[0][1];

    expect(callBody).toEqual({
      attributeName: params.attributeName,
      attributeCode: params.attributeCode,
      kind: params.kind,
      configuration: null,
    });
    // Verify serviceSource is not included in the body
    expect(callBody).not.toHaveProperty("serviceSource");
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

    const params: CreateIdentityCustomFieldParams = {
      attributeName: "Custom Field",
      attributeCode: "custom_field",
      serviceSource: {
        serviceFieldId: "smarthr_city",
        workspaceId: 1,
      },
      kind: "text",
    };

    await expect(createIdentityCustomField(params)).rejects.toThrow();
  });
});
