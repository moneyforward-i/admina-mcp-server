import axios from "axios";
import { getPeopleAccounts } from "../../tools/getPeopleAccounts.js";
import { resetClient } from "../../admina-api.js";

// Mock axios to prevent real API calls
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

interface MockApiResponse {
  data: Array<{
    id: string;
    email: string;
    status: string;
    role: string;
  }>;
}

describe("getPeopleAccounts", () => {
  // Define mock response for people accounts endpoint
  const mockPeopleAccountsResponse = {
    data: [
      { id: "1", email: "user1@example.com", status: "active", role: "admin" },
      { id: "2", email: "user2@example.com", status: "active", role: "user" },
    ],
  };

  beforeEach(() => {
    // Reset client instance before each test
    resetClient();

    // Setup environment variables required by the client
    process.env.ADMINA_API_KEY = "test-api-key";
    process.env.ADMINA_ORGANIZATION_ID = "test-org-id";

    // Setup axios mock to return a specific response for the people accounts endpoint
    mockedAxios.get.mockImplementation((url) => {
      // If the URL contains "/people/{id}/accounts", return the accounts response
      if (url.includes("/people/") && url.includes("/accounts")) {
        return Promise.resolve({ data: mockPeopleAccountsResponse });
      }

      // Default response for any other endpoint
      return Promise.resolve({ data: { data: [] } });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch people accounts with filters", async () => {
    const filters = {
      peopleId: 123,
      keyword: "test",
      limit: 10,
      twoFa: true,
      role: "admin" as const,
    };

    const result = (await getPeopleAccounts(filters)) as MockApiResponse;

    // Verify axios.get was called with the correct URL pattern
    expect(mockedAxios.get).toHaveBeenCalled();
    const callUrl = mockedAxios.get.mock.calls[0][0];

    // Verify peopleId is included in the URL path
    expect(callUrl).toContain("/people/123/accounts");

    // Verify the parameters were passed correctly
    expect(callUrl).toContain("keyword=test");
    expect(callUrl).toContain("limit=10");
    expect(callUrl).toContain("twoFa=true");
    expect(callUrl).toContain("role=admin");

    // Verify peopleId is NOT in the query params (it should be in the URL path)
    expect(callUrl).not.toContain("peopleId=");

    // Verify the correct mock response was returned
    expect(result).toEqual(mockPeopleAccountsResponse);
  });

  it("should handle array parameters correctly", async () => {
    const filters = {
      peopleId: 123,
      serviceIds: [1, 2, 3],
      workspaceIds: [4, 5, 6],
      licenses: ["license1", "license2"],
    };

    await getPeopleAccounts(filters);

    const callUrl = mockedAxios.get.mock.calls[0][0];

    // Verify array parameters are properly serialized
    expect(callUrl).toContain("serviceIds=1");
    expect(callUrl).toContain("serviceIds=2");
    expect(callUrl).toContain("serviceIds=3");
    expect(callUrl).toContain("workspaceIds=4");
    expect(callUrl).toContain("workspaceIds=5");
    expect(callUrl).toContain("workspaceIds=6");
    expect(callUrl).toContain("licenses=license1");
    expect(callUrl).toContain("licenses=license2");
    
    // Test with correct sort values
    const filtersWithSort = {
      peopleId: 123,
      sortBy: "service" as const,
      sortOrder: "ASC" as const,
    };
    
    await getPeopleAccounts(filtersWithSort);
    const sortCallUrl = mockedAxios.get.mock.calls[1][0];
    expect(sortCallUrl).toContain("sortBy=service");
    expect(sortCallUrl).toContain("sortOrder=ASC");
  });

  it("should handle optional parameters", async () => {
    const filters = {
      peopleId: 123,
    };

    await getPeopleAccounts(filters);

    const callUrl = mockedAxios.get.mock.calls[0][0];

    // Verify only required parameters are included
    expect(callUrl).toContain("/people/123/accounts");
    expect(callUrl).not.toContain("limit=");
    expect(callUrl).not.toContain("cursor=");
    expect(callUrl).not.toContain("role=");
    expect(callUrl).not.toContain("twoFa=");
  });
});
