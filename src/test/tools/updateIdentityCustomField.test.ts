import axios from "axios";
import { resetClient } from "../../admina-api.js";
import {
  UpdateIdentityCustomFieldParams,
  updateIdentityCustomField,
} from "../../tools/updateIdentityCustomField.js";

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

describe("updateIdentityCustomField", () => {
  const mockUpdateCustomFieldResponse = {
    id: 1,
    attributeName: "Updated Identity Field",
    attributeCode: "updated_identity_field",
    kind: "text",
  };

  beforeEach(() => {
    resetClient();

    mockedAxios.patch.mockImplementation((url) => {
      if (url.includes("/identity/fields/custom/")) {
        return Promise.resolve({ data: mockUpdateCustomFieldResponse });
      }
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should update a custom field name", async () => {
    const params: UpdateIdentityCustomFieldParams = {
      customFieldId: 1,
      attributeName: "Updated Identity Field",
    };

    const result = (await updateIdentityCustomField(params)) as MockApiResponse;

    expect(mockedAxios.patch).toHaveBeenCalled();
    const callUrl = mockedAxios.patch.mock.calls[0][0];
    const callBody = mockedAxios.patch.mock.calls[0][1];

    expect(callUrl).toContain("/identity/fields/custom/1");
    expect(callBody).toEqual({ attributeName: params.attributeName });

    expect(result).toEqual(mockUpdateCustomFieldResponse);
  });

  it("should update attribute code", async () => {
    const params: UpdateIdentityCustomFieldParams = {
      customFieldId: 2,
      attributeCode: "new_code",
    };

    await updateIdentityCustomField(params);

    expect(mockedAxios.patch).toHaveBeenCalled();
    const callUrl = mockedAxios.patch.mock.calls[0][0];
    const callBody = mockedAxios.patch.mock.calls[0][1];

    expect(callUrl).toContain("/identity/fields/custom/2");
    expect(callBody).toEqual({ attributeCode: params.attributeCode });
  });

  it("should update both name and code", async () => {
    const params: UpdateIdentityCustomFieldParams = {
      customFieldId: 3,
      attributeName: "Updated Field",
      attributeCode: "updated_field",
    };

    await updateIdentityCustomField(params);

    expect(mockedAxios.patch).toHaveBeenCalled();
    const callBody = mockedAxios.patch.mock.calls[0][1];

    expect(callBody).toEqual({
      attributeName: params.attributeName,
      attributeCode: params.attributeCode,
    });
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

    const params: UpdateIdentityCustomFieldParams = {
      customFieldId: 999,
      attributeName: "Test",
    };

    await expect(updateIdentityCustomField(params)).rejects.toThrow();
  });

  it("should handle conflict errors (duplicate attribute code)", async () => {
    const axiosError = new axios.AxiosError("Request failed with status code 409", "409", undefined, undefined, {
      status: 409,
      data: { errorId: "conflict" },
      statusText: "Conflict",
      headers: {},
      config: {} as any,
    } as any);

    mockedAxios.patch.mockRejectedValueOnce(axiosError);

    const params: UpdateIdentityCustomFieldParams = {
      customFieldId: 1,
      attributeCode: "existing_code",
    };

    await expect(updateIdentityCustomField(params)).rejects.toThrow();
  });
});
