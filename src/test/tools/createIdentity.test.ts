import axios from "axios";
import { resetClient } from "../../admina-api.js";
import { CreateIdentityParams, createIdentity } from "../../tools/createIdentity.js";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("createIdentity", () => {
  const mockCreatedIdentity = {
    id: "identity-123",
    firstName: "Jane",
    lastName: "Doe",
    primaryEmail: "jane@example.com",
    employeeStatus: "active",
    employeeType: "full_time_employee",
  };

  beforeEach(() => {
    resetClient();
    mockedAxios.post.mockImplementation((url) => {
      if (url.includes("/identity") && !url.includes("/identity/")) {
        return Promise.resolve({ data: mockCreatedIdentity, status: 201 });
      }
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should create an identity with required fields only", async () => {
    const params: CreateIdentityParams = {
      employeeStatus: "active",
      employeeType: "full_time_employee",
      firstName: "Jane",
      lastName: "Doe",
    };

    const result = await createIdentity(params);

    expect(mockedAxios.post).toHaveBeenCalled();
    const [url, body] = mockedAxios.post.mock.calls[0];
    expect(url).toContain("/identity");
    expect(body).toEqual(params);
    expect(result).toEqual(mockCreatedIdentity);
  });

  it("should create an identity with optional fields", async () => {
    const params: CreateIdentityParams = {
      employeeStatus: "active",
      employeeType: "full_time_employee",
      firstName: "Jane",
      lastName: "Doe",
      displayName: "Jane Doe",
      primaryEmail: "jane@example.com",
      jobTitle: "Engineer",
      department: { name: "Engineering" },
      manager: { id: "mgr-1" },
    };

    await createIdentity(params);

    const body = mockedAxios.post.mock.calls[0][1];
    expect(body).toMatchObject({
      employeeStatus: "active",
      employeeType: "full_time_employee",
      firstName: "Jane",
      lastName: "Doe",
      displayName: "Jane Doe",
      primaryEmail: "jane@example.com",
      jobTitle: "Engineer",
      department: { name: "Engineering" },
      manager: { id: "mgr-1" },
    });
  });

  it("should handle API errors", async () => {
    const axiosError = new axios.AxiosError("Bad Request", "400", undefined, undefined, {
      status: 400,
      data: { errorId: "identity_duplicated_email" },
      statusText: "Bad Request",
      headers: {},
      config: {} as any,
    } as any);

    mockedAxios.post.mockRejectedValueOnce(axiosError);

    await expect(
      createIdentity({
        employeeStatus: "active",
        employeeType: "full_time_employee",
        firstName: "Jane",
        lastName: "Doe",
      }),
    ).rejects.toThrow();
  });
});
