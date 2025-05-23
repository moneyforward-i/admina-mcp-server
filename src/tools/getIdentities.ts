import { z } from "zod";
import { getClient } from "../admina-api.js";
import { filtersToParams } from "../common/helper.js";

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

export type IdentityFilters = z.infer<typeof IdentityFiltersSchema>;

export async function getIdentities(filters: IdentityFilters) {
  const client = getClient();
  const queryParams = filtersToParams(filters);
  return client.makeApiCall("/identity", queryParams);
}
