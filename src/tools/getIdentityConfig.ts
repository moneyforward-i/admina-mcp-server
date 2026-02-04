import { z } from "zod";
import { getClient } from "../admina-api.js";
import { filtersToParams } from "../common/helper.js";

export const IdentityConfigFiltersSchema = z.object({
  identityId: z.string(),
});

export type IdentityConfigFilters = z.infer<typeof IdentityConfigFiltersSchema>;

export async function getIdentityConfig(filters: IdentityConfigFilters) {
  const client = getClient();
  const { identityId, ...rest } = filters;
  const queryParams = filtersToParams(rest);
  return client.makeApiCall(`/identity/configuration/configuration/${identityId}`, queryParams);
}
