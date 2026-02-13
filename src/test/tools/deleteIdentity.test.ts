import axios from "axios";
import { resetClient } from "../../admina-api.js";
import { deleteIdentity } from "../../tools/deleteIdentity.js";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("deleteIdentity", () => {
  const mockDeletedIdentity = {
    id: "identity-123",
    firstName: "Jane",
    lastName: "Doe",
    employeeStatus: "active",
  };

  beforeEach(() => {
    resetClient();
    mockedAxios.delete.mockImplementation((url) => {
      if (url.includes("/identity/")) {
        return Promise.resolve({ data: mockDeletedIdentity });
      }
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should delete an identity by id", async () => {
    const result = await deleteIdentity({ identityId: "identity-123" });

    expect(mockedAxios.delete).toHaveBeenCalled();
    const callUrl = mockedAxios.delete.mock.calls[0][0];
    expect(callUrl).toContain("/identity/identity-123");
    expect(result).toEqual(mockDeletedIdentity);
  });

  it("should handle API errors", async () => {
    const axiosError = new axios.AxiosError("Not Found", "404", undefined, undefined, {
      status: 404,
      data: { errorId: "not_found" },
      statusText: "Not Found",
      headers: {},
      config: {} as any,
    } as any);

    mockedAxios.delete.mockRejectedValueOnce(axiosError);

    await expect(deleteIdentity({ identityId: "missing-id" })).rejects.toThrow();
  });
});
