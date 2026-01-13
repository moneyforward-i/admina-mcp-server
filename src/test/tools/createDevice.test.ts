import axios from "axios";
import { resetClient } from "../../admina-api.js";
import { CreateDeviceParams, createDevice } from "../../tools/createDevice.js";

// Define the shape of our mock response
interface MockApiResponse {
  id: number;
  fields: Record<string, unknown>;
}

// Mock axios to prevent real API calls
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("createDevice", () => {
  const mockCreateDeviceResponse = {
    id: 123,
    fields: {
      "preset.asset_number": "A001",
      "preset.subtype": "laptop_pc",
      "preset.model_name": "MacBook Pro",
    },
  };

  beforeEach(() => {
    resetClient();

    mockedAxios.post.mockImplementation((url) => {
      if (url.includes("/devices")) {
        return Promise.resolve({ data: mockCreateDeviceResponse });
      }
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should create a device with required fields", async () => {
    const params: CreateDeviceParams = {
      fields: {
        "preset.asset_number": "A001",
        "preset.subtype": "laptop_pc",
        "preset.model_name": "MacBook Pro",
      },
    };

    const result = (await createDevice(params)) as MockApiResponse;

    expect(mockedAxios.post).toHaveBeenCalled();
    const callUrl = mockedAxios.post.mock.calls[0][0];
    const callBody = mockedAxios.post.mock.calls[0][1];

    expect(callUrl).toContain("/devices");
    expect(callBody).toEqual({ fields: params.fields });

    expect(result).toEqual(mockCreateDeviceResponse);
  });

  it("should create a device with memo", async () => {
    const params: CreateDeviceParams = {
      fields: {
        "preset.asset_number": "A002",
        "preset.subtype": "desktop_pc",
        "preset.model_name": "Dell OptiPlex",
      },
      memo: "New device for engineering team",
    };

    const result = (await createDevice(params)) as MockApiResponse;

    expect(mockedAxios.post).toHaveBeenCalled();
    const callBody = mockedAxios.post.mock.calls[0][1];

    expect(callBody).toEqual({
      fields: params.fields,
      memo: params.memo,
    });

    expect(result).toEqual(mockCreateDeviceResponse);
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

    const params: CreateDeviceParams = {
      fields: {
        "preset.asset_number": "A001",
        "preset.subtype": "laptop_pc",
        "preset.model_name": "MacBook Pro",
      },
    };

    await expect(createDevice(params)).rejects.toThrow();
  });
});
