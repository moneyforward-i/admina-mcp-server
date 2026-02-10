import axios from "axios";
import { resetClient } from "../../admina-api.js";
import { getIdentityFieldConfiguration } from "../../tools/getIdentityFieldConfiguration.js";

// Mock axios to prevent real API calls
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("getIdentityFieldConfiguration", () => {
  const mockConfigurationResponse = {
    presetFields: [
      { uniqueName: "display_name", hidden: false },
      { uniqueName: "primary_email", hidden: false },
      { uniqueName: "department", hidden: true },
    ],
    fieldOrder: ["preset.display_name", "preset.primary_email", "custom.custom_field_1"],
    availableFields: ["preset.display_name", "preset.primary_email", "custom.custom_field_1"],
    fieldsMetadata: [
      {
        fieldName: "preset.display_name",
        sourceOfTruth: { source: "admina" },
      },
    ],
    fields: [
      { uniqueName: "display_name", type: "preset", hidden: false, editable: true },
      { uniqueName: "primary_email", type: "preset", hidden: false, editable: false },
    ],
    restrictedFields: ["preset.display_name"],
  };

  beforeEach(() => {
    resetClient();

    mockedAxios.get.mockImplementation((url) => {
      if (url.includes("/identity/configuration/configuration")) {
        return Promise.resolve({ data: mockConfigurationResponse });
      }
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch identity field configuration for the organization", async () => {
    const result = await getIdentityFieldConfiguration({});

    expect(mockedAxios.get).toHaveBeenCalled();
    const callUrl = mockedAxios.get.mock.calls[0][0];
    expect(callUrl).toContain("/identity/configuration/configuration");

    expect(result).toEqual(mockConfigurationResponse);
  });

  it("should pass identityId as query parameter when provided", async () => {
    await getIdentityFieldConfiguration({ identityId: "abc-123" });

    expect(mockedAxios.get).toHaveBeenCalled();
    const callUrl = mockedAxios.get.mock.calls[0][0];
    expect(callUrl).toContain("/identity/configuration/configuration");
    expect(callUrl).toContain("identityId=abc-123");
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

    await expect(getIdentityFieldConfiguration({})).rejects.toThrow();
  });

  it("should handle 418 feature not available error", async () => {
    const axiosError = new axios.AxiosError("I'm a teapot", "418", undefined, undefined, {
      status: 418,
      data: { errorId: "feature_not_available" },
      statusText: "I'm a Teapot",
      headers: {},
      config: {} as any,
    } as any);

    mockedAxios.get.mockRejectedValueOnce(axiosError);

    await expect(getIdentityFieldConfiguration({})).rejects.toThrow();
  });
});
