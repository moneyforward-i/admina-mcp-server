import axios from "axios";
import { resetClient } from "../../admina-api.js";
import { unregisterIdentity } from "../../tools/unregisterIdentity.js";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("unregisterIdentity", () => {
  const mockIdentity = {
    id: "identity-123",
    firstName: "Jane",
    lastName: "Doe",
    managementType: "unregistered",
  };

  beforeEach(() => {
    resetClient();
    mockedAxios.put.mockImplementation((url) => {
      if (url.includes("/identity/") && url.includes("/unregister")) {
        return Promise.resolve({ data: mockIdentity });
      }
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should toggle the unregistered management type for an identity", async () => {
    const result = await unregisterIdentity({ identityId: "identity-123" });

    expect(mockedAxios.put).toHaveBeenCalled();
    const [url, body] = mockedAxios.put.mock.calls[0];
    expect(url).toContain("/identity/identity-123/unregister");
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

    await expect(unregisterIdentity({ identityId: "missing-id" })).rejects.toThrow();
  });
});
