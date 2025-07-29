import { URLSearchParams } from "node:url";
import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { createAdminaError } from "./common/errors.js";

function getConfig(): { apiKey: string; organizationId: string } {
  if (!process.env.ADMINA_API_KEY || !process.env.ADMINA_ORGANIZATION_ID) {
    throw new Error("ADMINA_API_KEY and ADMINA_ORGANIZATION_ID must be set");
  }

  return {
    apiKey: process.env.ADMINA_API_KEY,
    organizationId: process.env.ADMINA_ORGANIZATION_ID,
  };
}

export class AdminaApiClient {
  private readonly apiKey: string;
  private readonly organizationId: string;
  private readonly ADMINA_API_BASE = "https://api.itmc.i.moneyforward.com/api/v1";

  constructor(apiKey: string, organizationId: string) {
    this.apiKey = apiKey;
    this.organizationId = organizationId;
  }

  // Generic method to make API calls
  public async makeApiCall<T>(
    endpoint: string,
    queryParams: URLSearchParams | Record<string, string | number> = {},
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    body?: any,
    config: AxiosRequestConfig = {},
  ): Promise<T> {
    try {
      let url = `${this.ADMINA_API_BASE}/organizations/${this.organizationId}${endpoint}`;
      
      // Handle query parameters
      if (queryParams instanceof URLSearchParams) {
        if (queryParams.toString()) {
          url += `?${queryParams.toString()}`;
        }
      } else if (Object.keys(queryParams).length > 0) {
        const params = new URLSearchParams();
        Object.entries(queryParams).forEach(([key, value]) => {
          params.append(key, String(value));
        });
        url += `?${params.toString()}`;
      }

      const requestConfig: AxiosRequestConfig = {
        method,
        url,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        ...config,
      };

      if (body && (method === "POST" || method === "PUT")) {
        requestConfig.data = body;
      }

      const response = await axios(requestConfig);
      return response.data as T;
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        throw createAdminaError(error.status ?? 500, error.response?.data);
      }
      throw createAdminaError(500, { errorId: "non_axios_error" });
    }
  }
}

let clientInstance: AdminaApiClient | null = null;

export function getClient(): AdminaApiClient {
  if (!clientInstance) {
    const config = getConfig();
    clientInstance = new AdminaApiClient(config.apiKey, config.organizationId);
  }

  return clientInstance;
}

/**
 * Resets the client instance. Useful for testing or reconfiguration.
 */
export function resetClient(): void {
  clientInstance = null;
}
