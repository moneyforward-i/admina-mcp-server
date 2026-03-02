import axios from "axios";
import { resetClient } from "../../admina-api.js";
import { archiveIdentity } from "../../tools/archiveIdentity.js";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("archiveIdentity", () => {
  const mockIdentity = {
    id: "identity-123",
    firstName: "Jane",
    lastName: "Doe",
    employeeStatus: "archived",
  };

  beforeEach(() => {
    resetClient();
    mockedAxios.put.mockImplementation((url) => {
      if (url.includes("/identity/") && url.includes("/archive")) {
        return Promise.resolve({ data: mockIdentity });
      }
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should toggle the archive flag for an identity", async () => {
    const result = await archiveIdentity({ identityId: "identity-123" });

    expect(mockedAxios.put).toHaveBeenCalled();
    const [url, body] = mockedAxios.put.mock.calls[0];
    expect(url).toContain("/identity/identity-123/archive");
    expect(body).toEqual({});
    expect(result).toEqual(mockIdentity);
  });

  it("should handle API errors", async () => {
    const axiosError = new axios.AxiosError("Not Found", "404", undefined, undefined, {
      status: 404,
      data: { errorId: "not_found" },
      statusText: "Not Found",
      headers: {},
      config: {} as any,
    } as any);

    mockedAxios.put.mockRejectedValueOnce(axiosError);

    await expect(archiveIdentity({ identityId: "missing-id" })).rejects.toThrow();
  });
});
