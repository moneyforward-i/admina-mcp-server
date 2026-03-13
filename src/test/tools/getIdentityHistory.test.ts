import axios from "axios";
import { resetClient } from "../../admina-api.js";
import { GetIdentityHistoryParams, getIdentityHistory } from "../../tools/getIdentityHistory.js";

// Mock axios to prevent real API calls
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("getIdentityHistory", () => {
  const mockResponse = {
    meta: { cursor: null },
    items: [
      {
        id: "history-1",
        field: "employeeStatus",
        previous: "draft",
        current: "active",
        type: "update",
        source: "manual",
        actor: "admin@example.com",
        metadata: null,
        createdAt: "2024-01-01T00:00:00.000Z",
      },
    ],
  };

  beforeEach(() => {
    resetClient();
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes("/history")) {
        return Promise.resolve({ data: mockResponse });
      }
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should call GET /identity/:identityId/history with the correct URL", async () => {
    const params: GetIdentityHistoryParams = {
      identityId: "identity-123",
    };

    const result = await getIdentityHistory(params);

    expect(mockedAxios.get).toHaveBeenCalled();
    const callUrl = mockedAxios.get.mock.calls[0][0];
    expect(callUrl).toContain("/identity/identity-123/history");
    expect(result).toEqual(mockResponse);
  });

  it("should pass limit query parameter when provided", async () => {
    const params: GetIdentityHistoryParams = {
      identityId: "identity-123",
      limit: 20,
    };

    await getIdentityHistory(params);

    const callUrl = mockedAxios.get.mock.calls[0][0];
    expect(callUrl).toContain("limit=20");
  });

  it("should pass cursor query parameter when provided", async () => {
    const params: GetIdentityHistoryParams = {
      identityId: "identity-123",
      cursor: "dGVzdC1jdXJzb3I=",
    };

    await getIdentityHistory(params);

    const callUrl = mockedAxios.get.mock.calls[0][0];
    expect(callUrl).toContain("cursor=dGVzdC1jdXJzb3I%3D");
  });

  it("should pass both limit and cursor when provided", async () => {
    const params: GetIdentityHistoryParams = {
      identityId: "identity-456",
      limit: 5,
      cursor: "abc123",
    };

    await getIdentityHistory(params);

    const callUrl = mockedAxios.get.mock.calls[0][0];
    expect(callUrl).toContain("/identity/identity-456/history");
    expect(callUrl).toContain("limit=5");
    expect(callUrl).toContain("cursor=abc123");
  });

  it("should not append query params when only identityId is provided", async () => {
    const params: GetIdentityHistoryParams = {
      identityId: "identity-789",
    };

    await getIdentityHistory(params);

    const callUrl = mockedAxios.get.mock.calls[0][0];
    expect(callUrl).toContain("/identity/identity-789/history");
    expect(callUrl).not.toContain("limit=");
    expect(callUrl).not.toContain("cursor=");
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

    const params: GetIdentityHistoryParams = {
      identityId: "missing-id",
    };

    await expect(getIdentityHistory(params)).rejects.toThrow();
  });
});
