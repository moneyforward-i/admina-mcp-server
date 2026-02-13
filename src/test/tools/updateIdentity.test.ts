import axios from "axios";
import { resetClient } from "../../admina-api.js";
import { UpdateIdentityParams, updateIdentity } from "../../tools/updateIdentity.js";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("updateIdentity", () => {
  const mockUpdatedIdentity = {
    id: "identity-123",
    firstName: "Jane",
    lastName: "Smith",
    primaryEmail: "jane.smith@example.com",
    employeeStatus: "active",
    employeeType: "full_time_employee",
  };

  beforeEach(() => {
    resetClient();
    mockedAxios.put.mockImplementation((url) => {
      if (url.includes("/identity/")) {
        return Promise.resolve({ data: mockUpdatedIdentity });
      }
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should update an identity with given fields", async () => {
    const params: UpdateIdentityParams = {
      identityId: "identity-123",
      lastName: "Smith",
      primaryEmail: "jane.smith@example.com",
    };

    const result = await updateIdentity(params);

    expect(mockedAxios.put).toHaveBeenCalled();
    const [url, body] = mockedAxios.put.mock.calls[0];
    expect(url).toContain("/identity/identity-123");
    expect(body).toEqual({
      lastName: "Smith",
      primaryEmail: "jane.smith@example.com",
    });
    expect(result).toEqual(mockUpdatedIdentity);
  });

  it("should not include identityId in request body", async () => {
    await updateIdentity({
      identityId: "identity-123",
      displayName: "Updated Name",
    });

    const body = mockedAxios.put.mock.calls[0][1] as Record<string, unknown>;
    expect(body.identityId).toBeUndefined();
    expect(body.displayName).toBe("Updated Name");
  });

  it("should handle API errors", async () => {
    const axiosError = new axios.AxiosError("Bad Request", "400", undefined, undefined, {
      status: 400,
      data: { errorId: "identity_duplicated_email" },
      statusText: "Bad Request",
      headers: {},
      config: {} as any,
    } as any);

    mockedAxios.put.mockRejectedValueOnce(axiosError);

    await expect(
      updateIdentity({
        identityId: "identity-123",
        primaryEmail: "duplicate@example.com",
      }),
    ).rejects.toThrow();
  });
});
