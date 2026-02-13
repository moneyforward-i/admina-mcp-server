import axios from "axios";
import { resetClient } from "../../admina-api.js";
import { MergeIdentitiesParams, mergeIdentities } from "../../tools/mergeIdentities.js";

// Mock axios to prevent real API calls
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("mergeIdentities", () => {
  // Define mock response for merge identities endpoint
  const mockMergeResponse = {};

  beforeEach(() => {
    // Reset client instance before each test
    resetClient();

    // Setup axios mock to return a specific response
    mockedAxios.post.mockImplementation((url) => {
      if (url.includes("/identity/merge")) {
        return Promise.resolve({ data: mockMergeResponse });
      }
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should merge people entities", async () => {
    const params: MergeIdentitiesParams = {
      merges: [
        { fromPeopleId: 1, toPeopleId: 2 },
        { fromPeopleId: 3, toPeopleId: 4 },
      ],
    };

    const result = await mergeIdentities(params);

    // Verify axios.post was called with the correct URL pattern
    expect(mockedAxios.post).toHaveBeenCalled();
    const callUrl = mockedAxios.post.mock.calls[0][0];
    const callBody = mockedAxios.post.mock.calls[0][1] as Record<string, unknown>;

    expect(callUrl).toContain("/identity/merge");
    expect(callBody).toHaveProperty("merges");
    expect(callBody.merges as unknown[]).toHaveLength(2);
    expect((callBody.merges as unknown[])[0]).toEqual({ fromPeopleId: 1, toPeopleId: 2 });

    // Verify the correct mock response was returned
    expect(result).toEqual(mockMergeResponse);
  });

  it("should merge identity entities", async () => {
    const params: MergeIdentitiesParams = {
      identityMerges: [
        { fromIdentityId: "identity-1", toIdentityId: "identity-2" },
        { fromIdentityId: "identity-3", toIdentityId: "identity-4" },
      ],
    };

    const result = await mergeIdentities(params);

    // Verify axios.post was called
    expect(mockedAxios.post).toHaveBeenCalled();
    const callUrl = mockedAxios.post.mock.calls[0][0];
    const callBody = mockedAxios.post.mock.calls[0][1] as Record<string, unknown>;

    expect(callUrl).toContain("/identity/merge");
    expect(callBody).toHaveProperty("identityMerges");
    expect(callBody.identityMerges as unknown[]).toHaveLength(2);
    expect((callBody.identityMerges as unknown[])[0]).toEqual({
      fromIdentityId: "identity-1",
      toIdentityId: "identity-2",
    });

    // Verify the mock response was returned
    expect(result).toEqual(mockMergeResponse);
  });

  it("should merge both people and identity entities", async () => {
    const params: MergeIdentitiesParams = {
      merges: [{ fromPeopleId: 1, toPeopleId: 2 }],
      identityMerges: [{ fromIdentityId: "identity-1", toIdentityId: "identity-2" }],
    };

    const result = await mergeIdentities(params);

    // Verify axios.post was called
    expect(mockedAxios.post).toHaveBeenCalled();
    const callBody = mockedAxios.post.mock.calls[0][1] as Record<string, unknown>;

    expect(callBody).toHaveProperty("merges");
    expect(callBody).toHaveProperty("identityMerges");
    expect(callBody.merges as unknown[]).toHaveLength(1);
    expect(callBody.identityMerges as unknown[]).toHaveLength(1);

    // Verify the mock response was returned
    expect(result).toEqual(mockMergeResponse);
  });

  it("should handle maximum batch size for people merges", async () => {
    // Create 50 merge operations (maximum allowed)
    const merges = Array.from({ length: 50 }, (_, i) => ({
      fromPeopleId: i * 2 + 1,
      toPeopleId: i * 2 + 2,
    }));

    const params: MergeIdentitiesParams = { merges };

    const result = await mergeIdentities(params);

    // Verify axios.post was called
    expect(mockedAxios.post).toHaveBeenCalled();
    const callBody = mockedAxios.post.mock.calls[0][1] as Record<string, unknown>;

    expect(callBody.merges as unknown[]).toHaveLength(50);
    expect(result).toEqual(mockMergeResponse);
  });

  it("should handle maximum batch size for identity merges", async () => {
    // Create 50 identity merge operations (maximum allowed)
    const identityMerges = Array.from({ length: 50 }, (_, i) => ({
      fromIdentityId: `identity-${i * 2 + 1}`,
      toIdentityId: `identity-${i * 2 + 2}`,
    }));

    const params: MergeIdentitiesParams = { identityMerges };

    const result = await mergeIdentities(params);

    // Verify axios.post was called
    expect(mockedAxios.post).toHaveBeenCalled();
    const callBody = mockedAxios.post.mock.calls[0][1] as Record<string, unknown>;

    expect(callBody.identityMerges as unknown[]).toHaveLength(50);
    expect(result).toEqual(mockMergeResponse);
  });

  it("should only include defined parameters in request body", async () => {
    const params: MergeIdentitiesParams = {
      merges: [{ fromPeopleId: 1, toPeopleId: 2 }],
    };

    await mergeIdentities(params);

    const callBody = mockedAxios.post.mock.calls[0][1] as Record<string, unknown>;

    // Should only have merges, not identityMerges
    expect(callBody).toHaveProperty("merges");
    expect(callBody).not.toHaveProperty("identityMerges");
  });

  it("should handle errors from the API", async () => {
    // Create a proper AxiosError instance
    const axiosError = new axios.AxiosError("Request failed with status code 400", "400", undefined, undefined, {
      status: 400,
      data: { errorId: "bad_request" },
      statusText: "Bad Request",
      headers: {},
      config: {} as any,
    } as any);

    // Setup axios to throw the AxiosError
    mockedAxios.post.mockRejectedValueOnce(axiosError);

    const params: MergeIdentitiesParams = {
      merges: [{ fromPeopleId: 1, toPeopleId: 2 }],
    };

    // Expecting the function to throw an error
    await expect(mergeIdentities(params)).rejects.toThrow();
  });

  it("should handle conflict errors (409)", async () => {
    // Create a proper AxiosError instance for conflict
    const axiosError = new axios.AxiosError("Request failed with status code 409", "409", undefined, undefined, {
      status: 409,
      data: { errorId: "conflict", message: "Merge conflict detected" },
      statusText: "Conflict",
      headers: {},
      config: {} as any,
    } as any);

    // Setup axios to throw the AxiosError
    mockedAxios.post.mockRejectedValueOnce(axiosError);

    const params: MergeIdentitiesParams = {
      identityMerges: [{ fromIdentityId: "identity-1", toIdentityId: "identity-2" }],
    };

    // Expecting the function to throw an error
    await expect(mergeIdentities(params)).rejects.toThrow();
  });
});
