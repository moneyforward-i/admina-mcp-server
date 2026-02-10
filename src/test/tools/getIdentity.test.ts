import axios from "axios";
import { resetClient } from "../../admina-api.js";
import { getIdentity } from "../../tools/getIdentity.js";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("getIdentity", () => {
  const mockIdentity = {
    id: "identity-123",
    firstName: "Jane",
    lastName: "Doe",
    primaryEmail: "jane@example.com",
    employeeStatus: "active",
    employeeType: "full_time_employee",
  };

  beforeEach(() => {
    resetClient();
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes("/identity/")) {
        return Promise.resolve({ data: mockIdentity });
      }
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch a single identity by id", async () => {
    const result = await getIdentity({ identityId: "identity-123" });

    expect(mockedAxios.get).toHaveBeenCalled();
    const callUrl = mockedAxios.get.mock.calls[0][0];
    expect(callUrl).toContain("/identity/identity-123");
    expect(result).toEqual(mockIdentity);
  });

  it("should pass expands query when provided", async () => {
    await getIdentity({ identityId: "identity-123", expands: ["customFieldsMetadata"] });

    const callUrl = mockedAxios.get.mock.calls[0][0];
    expect(callUrl).toContain("expands=customFieldsMetadata");
  });

  it("should handle API errors", async () => {
    const axiosError = new axios.AxiosError("Not Found", "404", undefined, undefined, {
      status: 404,
      data: { errorId: "not_found" },
      statusText: "Not Found",
      headers: {},
      config: {} as any,
    } as any);

    mockedAxios.get.mockRejectedValueOnce(axiosError);

    await expect(getIdentity({ identityId: "missing-id" })).rejects.toThrow();
  });
});
