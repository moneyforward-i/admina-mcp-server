import axios from "axios";
import { resetClient } from "../../admina-api.js";
import { UnmergeIdentitiesParams, unmergeIdentities } from "../../tools/unmergeIdentities.js";

// Mock axios to prevent real API calls
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("unmergeIdentities", () => {
  const mockResponse = {};

  beforeEach(() => {
    resetClient();
    mockedAxios.post.mockImplementation((url) => {
      if (url.includes("/identity/unmerge")) {
        return Promise.resolve({ data: mockResponse });
      }
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should call the unmerge endpoint with peopleIds", async () => {
    const params: UnmergeIdentitiesParams = {
      peopleIds: [1, 2, 3],
    };

    const result = await unmergeIdentities(params);

    expect(mockedAxios.post).toHaveBeenCalled();
    const callUrl = mockedAxios.post.mock.calls[0][0];
    const callBody = mockedAxios.post.mock.calls[0][1] as Record<string, unknown>;

    expect(callUrl).toContain("/identity/unmerge");
    expect(callBody).toHaveProperty("peopleIds");
    expect(callBody.peopleIds as number[]).toHaveLength(3);
    expect(result).toEqual(mockResponse);
  });

  it("should call the unmerge endpoint with identityIds", async () => {
    const params: UnmergeIdentitiesParams = {
      identityIds: ["identity-1", "identity-2"],
    };

    const result = await unmergeIdentities(params);

    expect(mockedAxios.post).toHaveBeenCalled();
    const callBody = mockedAxios.post.mock.calls[0][1] as Record<string, unknown>;

    expect(callBody).toHaveProperty("identityIds");
    expect(callBody.identityIds as string[]).toHaveLength(2);
    expect(result).toEqual(mockResponse);
  });

  it("should call the unmerge endpoint with both peopleIds and identityIds", async () => {
    const params: UnmergeIdentitiesParams = {
      peopleIds: [1],
      identityIds: ["identity-1"],
    };

    await unmergeIdentities(params);

    const callBody = mockedAxios.post.mock.calls[0][1] as Record<string, unknown>;

    expect(callBody).toHaveProperty("peopleIds");
    expect(callBody).toHaveProperty("identityIds");
  });

  it("should not include undefined fields in request body", async () => {
    const params: UnmergeIdentitiesParams = {
      peopleIds: [1],
    };

    await unmergeIdentities(params);

    const callBody = mockedAxios.post.mock.calls[0][1] as Record<string, unknown>;

    expect(callBody).toHaveProperty("peopleIds");
    expect(callBody).not.toHaveProperty("identityIds");
  });

  it("should handle API errors", async () => {
    const axiosError = new axios.AxiosError("Request failed with status code 400", "400", undefined, undefined, {
      status: 400,
      data: { errorId: "bad_request" },
      statusText: "Bad Request",
      headers: {},
      config: {} as any,
    } as any);

    mockedAxios.post.mockRejectedValueOnce(axiosError);

    const params: UnmergeIdentitiesParams = {
      peopleIds: [1],
    };

    await expect(unmergeIdentities(params)).rejects.toThrow();
  });
});
