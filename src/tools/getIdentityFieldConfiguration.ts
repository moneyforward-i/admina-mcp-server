import { z } from "zod";
import { getClient } from "../admina-api.js";
import { filtersToParams } from "../common/helper.js";

export const GetIdentityFieldConfigurationSchema = z.object({
  identityId: z
    .string()
    .optional()
    .describe("Optional identity ID to get the effective configuration for a specific identity"),
});

export type GetIdentityFieldConfigurationParams = z.infer<typeof GetIdentityFieldConfigurationSchema>;

export async function getIdentityFieldConfiguration(params: GetIdentityFieldConfigurationParams) {
  const client = getClient();
  const queryParams = filtersToParams(params);
  return client.makeApiCall("/identity/configuration/configuration", queryParams);
}
