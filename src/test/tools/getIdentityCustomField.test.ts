import axios from "axios";
import { resetClient } from "../../admina-api.js";
import { getIdentityCustomFields } from "../../tools/getIdentityCustomField.js";

// Define the shape of our mock response
interface MockCustomField {
  id: number;
  kind: string;
  attributeName: string;
  attributeCode: string;
  configuration: any;
}

interface MockApiResponse {
  items: MockCustomField[];
}

// Mock axios to prevent real API calls
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("getIdentityCustomFields", () => {
  beforeEach(() => {
    resetClient();

    mockedAxios.get.mockImplementation((url) => {
      if (url.includes("/identity/fields/custom")) {
        return Promise.resolve({
          data: {
            items: [
              {
                id: 1,
                kind: "text",
                attributeName: "Employee ID",
                attributeCode: "employee_id",
                configuration: null,
              },
              {
                id: 2,
                kind: "dropdown",
                attributeName: "Department",
                attributeCode: "department",
                configuration: {
                  values: [
                    { id: "1", value: "Engineering" },
                    { id: "2", value: "Sales" },
                  ],
                },
              },
              {
                id: 3,
                kind: "date",
                attributeName: "Join Date",
                attributeCode: "join_date",
                configuration: null,
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should retrieve all identity custom fields", async () => {
    const result = (await getIdentityCustomFields()) as MockApiResponse;

    expect(mockedAxios.get).toHaveBeenCalled();
    const callUrl = mockedAxios.get.mock.calls[0][0];

    expect(callUrl).toContain("/identity/fields/custom");
    expect(result).toHaveProperty("items");
    expect(Array.isArray(result.items)).toBe(true);
  });

  it("should return custom fields with different kinds", async () => {
    const result = (await getIdentityCustomFields()) as MockApiResponse;

    expect(result.items).toHaveLength(3);
    expect(result.items[0].kind).toBe("text");
    expect(result.items[1].kind).toBe("dropdown");
    expect(result.items[2].kind).toBe("date");
  });

  it("should include dropdown configuration when present", async () => {
    const result = (await getIdentityCustomFields()) as MockApiResponse;

    const dropdownField = result.items.find((item) => item.kind === "dropdown");
    expect(dropdownField).toBeDefined();
    expect(dropdownField?.configuration).toBeDefined();
    expect(dropdownField?.configuration.values).toHaveLength(2);
  });

  it("should handle errors from the API", async () => {
    const axiosError = new axios.AxiosError("Request failed with status code 500", "500", undefined, undefined, {
      status: 500,
      data: { errorId: "internal_error" },
      statusText: "Internal Server Error",
      headers: {},
      config: {} as any,
    } as any);

    mockedAxios.get.mockRejectedValueOnce(axiosError);

    await expect(getIdentityCustomFields()).rejects.toThrow();
  });
});
