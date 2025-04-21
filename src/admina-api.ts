import { URLSearchParams } from "node:url";
import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { z } from "zod";
import { createAdminaError } from "./errors.js";

const ADMINA_API_BASE = "https://api.itmc.i.moneyforward.com/api/v1";

// Define Zod schemas for each API parameter type
export const DeviceFiltersSchema = z.object({
  status: z.enum(["in_stock", "pre_use", "active", "missing", "malfunction", "decommissioned"]).optional(),
  asset_number: z.string().optional(),
  serial_number: z.string().optional(),
  identityId: z.string().optional(),
  peopleId: z.number().optional(),
  locale: z.enum(["ja", "en"]).default("ja"),
  limit: z.number().optional(),
  cursor: z.string().optional(),
  type: z.string().optional(),
});

export const IdentityFiltersSchema = z.object({
  limit: z.number().optional(),
  cursor: z.string().optional(),
  types: z.array(z.string()).optional(),
  statuses: z
    .array(z.enum(["active", "on_leave", "draft", "preactive", "retired", "untracked", "archived"]))
    .length(1, "statuses must be an array with exactly one element")
    .optional(),
  departments: z.array(z.string()).optional(),
  keyword: z.string().optional(),
});

export const ServiceFiltersSchema = z.object({
  limit: z.number().optional(),
  cursor: z.string().optional(),
  keyword: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.string().optional(),
});

export const ServiceAccountFiltersSchema = z.object({
  serviceId: z.number(),
  limit: z.number().optional(),
  cursor: z.string().optional(),
  keyword: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.string().optional(),
  workspaceIds: z.array(z.number()).optional(),
  twoFa: z.boolean().optional(),
  roles: z
    .array(z.enum(["admin", "guest", "other"]))
    .length(1, "roles must be an array with exactly one element")
    .optional(),
  serviceRoles: z.array(z.string()).optional(),
  types: z.array(z.enum(["employee", "guest", "system", "unknown"])).optional(),
  employeeTypes: z
    .array(
      z.enum([
        "board_member",
        "full_time_employee",
        "fixed_time_employee",
        "temporary_employee",
        "part_time_employee",
        "secondment_employee",
        "contract_employee",
        "collaborator",
        "group_address",
        "shared_address",
        "test_address",
        "other",
        "unknown",
        "unregistered",
      ]),
    )
    .length(1, "employeeTypes must be an array with exactly one element")
    .optional(),
  employeeStatuses: z
    .array(z.enum(["active", "on_leave", "draft", "preactive", "retired", "untracked"]))
    .length(1, "employeeStatuses must be an array with exactly one element")
    .optional(),
  statuses: z
    .array(z.enum(["active", "on_leave", "draft", "preactive", "retired", "untracked"]))
    .length(1, "employeeStatuses must be an array with exactly one element")
    .optional(),
  includeDeleted: z.boolean().optional(),
  expandIdentities: z.boolean().optional(),
  onlyInactive: z.boolean().optional(),
  licenses: z.array(z.string()).optional(),
  alertType: z
    .enum(["retired_account", "inactive_account", "on_leave_account", "unknown_account", "public_files"])
    .optional(),
  alertStatus: z.enum(["muted", "unmuted"]).optional(),
});

// Infer types from Zod schemas
export type DeviceFilters = z.infer<typeof DeviceFiltersSchema>;
export type IdentityFilters = z.infer<typeof IdentityFiltersSchema>;
export type ServiceFilters = z.infer<typeof ServiceFiltersSchema>;
export type ServiceAccountFilters = z.infer<typeof ServiceAccountFiltersSchema>;

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
