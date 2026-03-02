import { z } from "zod";
import { getClient } from "../admina-api.js";
import { filtersToParams } from "../common/helper.js";

const AlertTypeEnum = z.enum([
  "retired_account",
  "inactive_account",
  "on_leave_account",
  "unknown_account",
  "public_files",
]);

const IdentitySortByEnum = z.enum([
  "name",
  "type",
  "status",
  "company",
  "department",
  "location",
  "servicesCount",
  "devicesCount",
  "costUsd",
  "costJpy",
]);

const IdentityExpandEnum = z.enum(["devices", "accounts", "customFieldsMetadata", "relatedIdentity"]);

export const IdentityFiltersSchema = z.object({
  limit: z.number().optional().describe("Maximum number of items to return per page"),
  cursor: z.string().optional().describe("Cursor for pagination"),
  keyword: z
    .string()
    .optional()
    .describe("Filter results by username, identityId, department name, email or displayName (prefix search)"),
  statuses: z
    .array(z.enum(["active", "on_leave", "draft", "preactive", "retired", "untracked", "archived"]))
    .optional()
    .describe("Filter results by status. Accepts multiple options."),
  types: z.array(z.string()).optional().describe("Filter results by employee type. Accepts multiple options."),
  managementTypes: z
    .array(z.enum(["managed", "external", "system", "unknown", "unregistered"]))
    .optional()
    .describe("Filter results by management type. Accepts multiple options."),
  departments: z.array(z.string()).optional().describe("Filter results by departments. Accepts multiple options."),
  companies: z.array(z.string()).optional().describe("Filter results by companies. Accepts multiple options."),
  locations: z.array(z.string()).optional().describe("Filter results by locations. Accepts multiple options."),
  identityIds: z.array(z.string()).optional().describe("Filter results by identityIds. Accepts multiple options."),
  peopleIds: z.array(z.number()).optional().describe("Filter results by peopleIds. Accepts multiple options."),
  excludeIds: z.array(z.string()).optional().describe("Exclude identities by id. Accepts multiple options."),
  alertTypes: z
    .array(AlertTypeEnum)
    .optional()
    .describe("Filter results by alert type. Accepts multiple options."),
  expands: z
    .array(IdentityExpandEnum)
    .optional()
    .describe("Expand other datasets when fetching identities. Accepts multiple options."),
  sortBy: IdentitySortByEnum.optional().describe("Sort results by a specific field."),
  sortOrder: z.enum(["ASC", "DESC"]).optional().describe("Sort results in ascending or descending order."),
  contractStartRange: z
    .string()
    .optional()
    .describe(
      "Filter results by contract start date range. Format: YYYY-MM-DD:YYYY-MM-DD, separated by a colon.",
    ),
  contractEndRange: z
    .string()
    .optional()
    .describe("Filter results by contract end date range. Format: YYYY-MM-DD:YYYY-MM-DD, separated by a colon."),
  suspensionStartRange: z
    .string()
    .optional()
    .describe(
      "Filter results by suspension start date range. Format: YYYY-MM-DD:YYYY-MM-DD, separated by a colon.",
    ),
  suspensionEndRange: z
    .string()
    .optional()
    .describe(
      "Filter results by suspension end date range. Format: YYYY-MM-DD:YYYY-MM-DD, separated by a colon.",
    ),
  createdAtRange: z
    .string()
    .optional()
    .describe("Filter results by created date range. Format: YYYY-MM-DD:YYYY-MM-DD, separated by a colon."),
  updatedAtRange: z
    .string()
    .optional()
    .describe("Filter results by updated date range. Format: YYYY-MM-DD:YYYY-MM-DD, separated by a colon."),
  serviceCountFrom: z.number().int().optional().describe("Filter results by minimum service count."),
  serviceCountTo: z.number().int().optional().describe("Filter results by maximum service count."),
  managerId: z.string().optional().describe("Filter results by managerId."),
  serviceId: z.string().optional().describe("Filter results by serviceId."),
  customFields: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      "Filter results by custom fields. For date fields, use date range format: YYYY-MM-DD:YYYY-MM-DD",
    ),
  hasHRM: z
    .boolean()
    .optional()
    .describe(
      "Filter results by HRM (employee master) linkage. When true, returns only UIDs with HRM linkage.",
    ),
  haveAssignedDevice: z
    .boolean()
    .optional()
    .describe("Filter results by identities that have at least one assigned device."),
  haveSaasAccount: z
    .boolean()
    .optional()
    .describe("Filter results by identities that have at least one SaaS account."),
  includeActiveInternalOnly: z
    .boolean()
    .optional()
    .describe(
      "When true, limits results to active employees with internal management (ACTIVE status, MANAGED/SYSTEM types only).",
    ),
});

export type IdentityFilters = z.infer<typeof IdentityFiltersSchema>;

export async function getIdentities(filters: IdentityFilters) {
  const client = getClient();
  const queryParams = filtersToParams(filters);
  return client.makeApiCall("/identity", queryParams);
}
