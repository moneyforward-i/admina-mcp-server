import { z } from "zod";
import { getClient } from "../admina-api.js";
import { filtersToParams } from "../common/helper.js";

export const CheckIdentityManagementTypeSchema = z.object({
  email: z.string().email().optional().describe("Email of the new Identity to check"),
  identityId: z.string().optional().describe("Identity Id to be checked"),
});

export type CheckIdentityManagementTypeParams = z.infer<typeof CheckIdentityManagementTypeSchema>;

export async function checkIdentityManagementType(params: CheckIdentityManagementTypeParams) {
  const client = getClient();
  const queryParams = filtersToParams(params);
  return client.makeApiCall("/identity/check", queryParams);
}
