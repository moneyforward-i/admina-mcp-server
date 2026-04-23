import { URLSearchParams } from "node:url";
import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { createAdminaError } from "./common/errors.js";
import { getCurrentCredentials } from "./context.js";

// Header sent on every request so the API can distinguish MCP (AI) calls from other clients for usage tracking
export const MCP_USAGE_TRACKING_HEADERS = {
  "X-Request-Source": "mcp",
} as const;

function getConfigFromEnv(): { apiKey: string; organizationId: string } {
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

  // Generic method to make GET API calls
  public async makeApiCall<T>(
    endpoint: string,
    queryParams: URLSearchParams,
    config: AxiosRequestConfig = {},
  ): Promise<T> {
    try {
      const url = `${this.ADMINA_API_BASE}/organizations/${this.organizationId}${endpoint}?${queryParams.toString()}`;

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          ...MCP_USAGE_TRACKING_HEADERS,
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

  // Generic method to make POST API calls
  public async makePostApiCall<T>(
    endpoint: string,
    queryParams: URLSearchParams,
    body: Record<string, unknown> = {},
    config: AxiosRequestConfig = {},
  ): Promise<T> {
    try {
      const queryString = queryParams.toString();
      const querySuffix = queryString ? `?${queryString}` : "";
      const url = `${this.ADMINA_API_BASE}/organizations/${this.organizationId}${endpoint}${querySuffix}`;

      const response = await axios.post(url, body, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          ...MCP_USAGE_TRACKING_HEADERS,
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

  // Generic method to make PATCH API calls
  public async makePatchApiCall<T>(
    endpoint: string,
    body: Record<string, unknown> = {},
    config: AxiosRequestConfig = {},
  ): Promise<T> {
    try {
      const url = `${this.ADMINA_API_BASE}/organizations/${this.organizationId}${endpoint}`;

      const response = await axios.patch(url, body, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          ...MCP_USAGE_TRACKING_HEADERS,
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

  // Generic method to make PUT API calls
  public async makePutApiCall<T>(
    endpoint: string,
    body: Record<string, unknown> = {},
    config: AxiosRequestConfig = {},
  ): Promise<T> {
    try {
      const url = `${this.ADMINA_API_BASE}/organizations/${this.organizationId}${endpoint}`;

      const response = await axios.put(url, body, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          ...MCP_USAGE_TRACKING_HEADERS,
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

  // Generic method to make DELETE API calls
  public async makeDeleteApiCall<T>(endpoint: string, config: AxiosRequestConfig = {}): Promise<T> {
    try {
      const url = `${this.ADMINA_API_BASE}/organizations/${this.organizationId}${endpoint}`;

      const response = await axios.delete(url, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          ...MCP_USAGE_TRACKING_HEADERS,
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
}

let clientInstance: AdminaApiClient | null = null;

/**
 * Returns an AdminaApiClient for the current request.
 *
 * Resolution order:
 *   1. If running inside a `withCredentials(...)` scope (remote HTTP mode),
 *      returns a fresh client bound to those credentials. Never cached — two
 *      concurrent HTTP requests with different tenants must see isolated clients.
 *   2. Otherwise (stdio mode), returns a process-wide singleton built from
 *      `ADMINA_API_KEY` + `ADMINA_ORGANIZATION_ID` env vars. Throws if unset.
 */
export function getClient(): AdminaApiClient {
  const ctx = getCurrentCredentials();
  if (ctx) {
    return new AdminaApiClient(ctx.apiKey, ctx.organizationId);
  }

  if (!clientInstance) {
    const config = getConfigFromEnv();
    clientInstance = new AdminaApiClient(config.apiKey, config.organizationId);
  }

  return clientInstance;
}

/**
 * Resets the env-backed singleton. Useful for tests.
 */
export function resetClient(): void {
  clientInstance = null;
}
