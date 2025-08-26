import { z } from "zod";
import { getClient } from "../admina-api.js";
import { filtersToParams } from "../common/helper.js";

export const PeopleAccountsFiltersSchema = z.object({
  peopleId: z.number(),
  limit: z.number().optional(),
  cursor: z.string().optional(),
  role: z.enum(["admin", "guest", "other"]).optional(),
  twoFa: z.boolean().optional(),
  keyword: z.string().optional(),
  serviceIds: z.array(z.number()).optional(),
  workspaceIds: z.array(z.number()).optional(),
  sortBy: z.enum(["service", "twoFa", "lastActivity"]).optional(),
  sortOrder: z.enum(["ASC", "DESC"]).optional(),
  licenses: z.array(z.string()).optional(),
  status: z.enum(["active", "on_leave", "draft", "preactive", "retired", "untracked"]).optional(),
});

export type PeopleAccountsFilters = z.infer<typeof PeopleAccountsFiltersSchema>;

export async function getPeopleAccounts(filters: PeopleAccountsFilters) {
  const client = getClient();
  const { peopleId, ...rest } = filters;
  const queryParams = filtersToParams(rest);
  return client.makeApiCall(`/people/${peopleId}/accounts`, queryParams);
}