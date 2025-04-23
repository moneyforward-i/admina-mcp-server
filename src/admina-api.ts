import { URLSearchParams } from "node:url";
import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { createAdminaError } from "./errors.js";
import {
  DeviceFilters,
  DeviceFiltersSchema,
  IdentityFilters,
  IdentityFiltersSchema,
  ServiceAccountFilters,
  ServiceFilters,
  ServiceFiltersSchema,
} from "./schemas/index.js";

const ADMINA_API_BASE = "https://api.itmc.i.moneyforward.com/api/v1";

export class AdminaApiClient {
  private readonly apiKey: string;
  private readonly organizationId: string;

  constructor(apiKey: string, organizationId: string) {
    this.apiKey = apiKey;
    this.organizationId = organizationId;
  }

  // Generic method to make API calls
  private async makeApiCall<T>(
    endpoint: string,
    queryParams: URLSearchParams,
    config: AxiosRequestConfig = {},
  ): Promise<T> {
    try {
      const url = `${ADMINA_API_BASE}/organizations/${this.organizationId}${endpoint}?${queryParams.toString()}`;

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        ...config,
      });

      return response.data as T;
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        throw createAdminaError(error.status ?? 500, error.response?.data);
      }
      throw createAdminaError(500, { errorId: "non_axios_error" });
    }
  }

  // Convert filters to URLSearchParams
  private filtersToParams(filters: Record<string, any>): URLSearchParams {
    const queryParams = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value) && value.length > 0) {
          queryParams.append(key, value.join(","));
        } else if (typeof value === "boolean") {
          queryParams.append(key, value.toString());
        } else {
          queryParams.append(key, String(value));
        }
      }
    });
    return queryParams;
  }

  async getDevices(filters: DeviceFilters) {
    // Validate filters with Zod schema
    const validatedFilters = DeviceFiltersSchema.parse(filters);
    const queryParams = this.filtersToParams(validatedFilters);

    // Locale will always be set because it has a default value in the schema
    return this.makeApiCall("/devices", queryParams);
  }

  async getIdentities(filters: IdentityFilters) {
    const validatedFilters = IdentityFiltersSchema.parse(filters);
    const queryParams = this.filtersToParams(validatedFilters);

    return this.makeApiCall("/identity", queryParams);
  }

  async getServices(filters: ServiceFilters) {
    const validatedFilters = ServiceFiltersSchema.parse(filters);
    const queryParams = this.filtersToParams(validatedFilters);

    return this.makeApiCall("/services", queryParams);
  }

  async getServiceAccounts(filters: ServiceAccountFilters) {
    const { serviceId, ...rest } = filters;
    const queryParams = this.filtersToParams(rest);

    return this.makeApiCall(`/services/${serviceId}/accounts`, queryParams);
  }
}
