import { z } from "zod";
import { getClient } from "../admina-api.js";
import { filtersToParams } from "../common/helper.js";

export const ServiceFiltersSchema = z.object({
  limit: z.number().optional(),
  cursor: z.string().optional(),
  keyword: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.string().optional(),
});

export type ServiceFilters = z.infer<typeof ServiceFiltersSchema>;

export async function getServices(filters: ServiceFilters) {
  const client = getClient();
  const queryParams = filtersToParams(filters);
  return client.makeApiCall("/services", queryParams);
}
