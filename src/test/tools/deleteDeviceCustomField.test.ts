import axios from "axios";
import { resetClient } from "../../admina-api.js";
import { DeleteDeviceCustomFieldParams, deleteDeviceCustomField } from "../../tools/deleteDeviceCustomField.js";

// Mock axios to prevent real API calls
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("deleteDeviceCustomField", () => {
  beforeEach(() => {
    resetClient();

    mockedAxios.delete.mockImplementation((url) => {
      if (url.includes("/fields/custom/")) {
        return Promise.resolve({ data: {} });
      }
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should delete a custom field by id", async () => {
    const params: DeleteDeviceCustomFieldParams = {
      customFieldId: 1,
    };

    await deleteDeviceCustomField(params);

    expect(mockedAxios.delete).toHaveBeenCalled();
    const callUrl = mockedAxios.delete.mock.calls[0][0];

    expect(callUrl).toContain("/fields/custom/1");
  });

  it("should handle errors from the API", async () => {
    const axiosError = new axios.AxiosError("Request failed with status code 404", "404", undefined, undefined, {
      status: 404,
      data: { errorId: "not_found" },
      statusText: "Not Found",
      headers: {},
      config: {} as any,
    } as any);

    mockedAxios.delete.mockRejectedValueOnce(axiosError);

    const params: DeleteDeviceCustomFieldParams = {
      customFieldId: 999,
    };

    await expect(deleteDeviceCustomField(params)).rejects.toThrow();
  });
});
