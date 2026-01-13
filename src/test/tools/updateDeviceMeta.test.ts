import axios from "axios";
import { resetClient } from "../../admina-api.js";
import { UpdateDeviceMetaParams, updateDeviceMeta } from "../../tools/updateDeviceMeta.js";

// Define the shape of our mock response
interface MockApiResponse {
  id: number;
  status: string;
  peopleId: number | null;
}

// Mock axios to prevent real API calls
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("updateDeviceMeta", () => {
  const mockUpdateDeviceMetaResponse = {
    id: 123,
    status: "active",
    peopleId: 456,
  };

  beforeEach(() => {
    resetClient();

    mockedAxios.patch.mockImplementation((url) => {
      if (url.includes("/devices/") && url.includes("/meta")) {
        return Promise.resolve({ data: mockUpdateDeviceMetaResponse });
      }
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should update device status", async () => {
    const params: UpdateDeviceMetaParams = {
      deviceId: 123,
      status: "active",
    };

    const result = (await updateDeviceMeta(params)) as MockApiResponse;

    expect(mockedAxios.patch).toHaveBeenCalled();
    const callUrl = mockedAxios.patch.mock.calls[0][0];
    const callBody = mockedAxios.patch.mock.calls[0][1];

    expect(callUrl).toContain("/devices/123/meta");
    expect(callBody).toEqual({ status: params.status });

    expect(result).toEqual(mockUpdateDeviceMetaResponse);
  });

  it("should assign device to a person", async () => {
    const params: UpdateDeviceMetaParams = {
      deviceId: 123,
      peopleId: 456,
      assignmentStartDate: "2024-01-01",
    };

    await updateDeviceMeta(params);

    expect(mockedAxios.patch).toHaveBeenCalled();
    const callBody = mockedAxios.patch.mock.calls[0][1];

    expect(callBody).toEqual({
      peopleId: params.peopleId,
      assignmentStartDate: params.assignmentStartDate,
    });
  });

  it("should unassign device by setting peopleId to null", async () => {
    const params: UpdateDeviceMetaParams = {
      deviceId: 123,
      peopleId: null,
      status: "in_stock",
    };

    await updateDeviceMeta(params);

    expect(mockedAxios.patch).toHaveBeenCalled();
    const callBody = mockedAxios.patch.mock.calls[0][1];

    expect(callBody).toEqual({
      peopleId: null,
      status: "in_stock",
    });
  });

  it("should update device location", async () => {
    const params: UpdateDeviceMetaParams = {
      deviceId: 123,
      location1: "Building A",
      location2: "Floor 3",
    };

    await updateDeviceMeta(params);

    expect(mockedAxios.patch).toHaveBeenCalled();
    const callBody = mockedAxios.patch.mock.calls[0][1];

    expect(callBody).toEqual({
      location1: params.location1,
      location2: params.location2,
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

    const params: UpdateDeviceMetaParams = {
      deviceId: 999,
      status: "active",
    };

    await expect(updateDeviceMeta(params)).rejects.toThrow();
  });
});
