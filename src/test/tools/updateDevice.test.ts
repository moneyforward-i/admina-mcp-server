import axios from "axios";
import { resetClient } from "../../admina-api.js";
import { UpdateDeviceParams, updateDevice } from "../../tools/updateDevice.js";

// Define the shape of our mock response
interface MockApiResponse {
  id: number;
  fields: Record<string, unknown>;
}

// Mock axios to prevent real API calls
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("updateDevice", () => {
  const mockUpdateDeviceResponse = {
    id: 123,
    fields: {
      "preset.asset_number": "A001",
      "preset.subtype": "laptop_pc",
      "preset.model_name": "MacBook Pro Updated",
    },
  };

  beforeEach(() => {
    resetClient();

    mockedAxios.patch.mockImplementation((url) => {
      if (url.includes("/devices/")) {
        return Promise.resolve({ data: mockUpdateDeviceResponse });
      }
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should update a device with required fields", async () => {
    const params: UpdateDeviceParams = {
      deviceId: 123,
      fields: {
        "preset.asset_number": "A001",
        "preset.subtype": "laptop_pc",
        "preset.model_name": "MacBook Pro Updated",
      },
    };

    const result = (await updateDevice(params)) as MockApiResponse;

    expect(mockedAxios.patch).toHaveBeenCalled();
    const callUrl = mockedAxios.patch.mock.calls[0][0];
    const callBody = mockedAxios.patch.mock.calls[0][1];

    expect(callUrl).toContain("/devices/123");
    expect(callBody).toEqual({ fields: params.fields });

    expect(result).toEqual(mockUpdateDeviceResponse);
  });

  it("should update a device with memo", async () => {
    const params: UpdateDeviceParams = {
      deviceId: 456,
      fields: {
        "preset.asset_number": "A002",
        "preset.subtype": "desktop_pc",
        "preset.model_name": "Dell OptiPlex",
      },
      memo: "Updated device notes",
    };

    await updateDevice(params);

    expect(mockedAxios.patch).toHaveBeenCalled();
    const callUrl = mockedAxios.patch.mock.calls[0][0];
    const callBody = mockedAxios.patch.mock.calls[0][1];

    expect(callUrl).toContain("/devices/456");
    expect(callBody).toEqual({
      fields: params.fields,
      memo: params.memo,
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

    const params: UpdateDeviceParams = {
      deviceId: 999,
      fields: {
        "preset.asset_number": "A001",
        "preset.subtype": "laptop_pc",
        "preset.model_name": "MacBook Pro",
      },
    };

    await expect(updateDevice(params)).rejects.toThrow();
  });
});
