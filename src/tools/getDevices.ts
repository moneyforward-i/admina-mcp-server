import { z } from "zod";
import { getClient } from "../admina-api.js";

// Device filter options for advanced filtering
const DeviceFilterOptionsSchema = z.object({
  minDate: z.string().optional().describe("Only supported by fields with `date` kind"),
  maxDate: z.string().optional().describe("Only supported by fields with `date` kind"),
  minNumber: z
    .number()
    .optional()
    .describe("Only supported by fields with `number` kind and few special fields such as `$age`"),
  maxNumber: z
    .number()
    .optional()
    .describe("Only supported by fields with `number` kind and few special fields such as `$age`"),
  eq: z.string().optional().describe("Only supported by fields with `dropdown` kind"),
});

export const DeviceFiltersSchema = z.object({
  // Query parameters
  limit: z.number().max(200).optional().describe("Maximum number of items to return per page"),
  cursor: z.string().optional().describe("Base64-encoded cursor for pagination"),
  sortBy: z
    .string()
    .optional()
    .describe("Sort by field. Format: `<preset | custom>.<unique field name>` or `people.displayName`"),
  sortOrder: z.enum(["DESC", "ASC"]).optional().describe("Sort order for the results"),
  expands: z
    .array(z.enum(["relatedIdentity", "customFieldsMetadata"]))
    .optional()
    .describe("Expand other datasets when fetching devices"),

  // Request body parameters
  peopleId: z.number().optional().describe("Filter devices by the people ID assigned to them"),
  type: z.enum(["pc", "phone", "other"]).optional().describe("Filter devices by device type"),
  employeeStatus: z
    .enum(["active", "on_leave", "draft", "preactive", "retired", "untracked"])
    .optional()
    .describe("Filter devices by the employment status of the assigned person"),
  searchTerm: z.string().optional().describe("Search term to filter devices"),
  searchFields: z
    .array(z.string())
    .optional()
    .describe(
      "Array of field names to search within when using searchTerm. Supports memo, people fields, preset fields, and custom fields",
    ),
  filters: z
    .record(z.string(), DeviceFilterOptionsSchema)
    .optional()
    .describe(
      "Advanced filters. Keys look like `preset.<unique field name>`. There are certain extra virtual fields, such as `$age`",
    ),
});

export type DeviceFilters = z.infer<typeof DeviceFiltersSchema>;

export async function getDevices(filters: DeviceFilters) {
  const client = getClient();

  // Separate query params from request body
  const queryParams = new URLSearchParams();
  if (filters.limit !== undefined) queryParams.append("limit", filters.limit.toString());
  if (filters.cursor) queryParams.append("cursor", filters.cursor);
  if (filters.sortBy) queryParams.append("sortBy", filters.sortBy);
  if (filters.sortOrder) queryParams.append("sortOrder", filters.sortOrder);
  if (filters.expands) {
    for (const expand of filters.expands) {
      queryParams.append("expands", expand);
    }
  }

  // Build request body
  const body: Record<string, unknown> = {};
  if (filters.peopleId !== undefined) body.peopleId = filters.peopleId;
  if (filters.type) body.type = filters.type;
  if (filters.employeeStatus) body.employeeStatus = filters.employeeStatus;
  if (filters.searchTerm) body.searchTerm = filters.searchTerm;
  if (filters.searchFields) body.searchFields = filters.searchFields;
  if (filters.filters) body.filters = filters.filters;

  return client.makePostApiCall("/devices/search", queryParams, body);
}
