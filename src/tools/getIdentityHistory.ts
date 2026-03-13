import { z } from "zod";
import { getClient } from "../admina-api.js";
import { filtersToParams } from "../common/helper.js";

export const GetIdentityHistorySchema = z.object({
  identityId: z.string().describe("The ID of the identity to retrieve history for"),
  limit: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Maximum number of history items to return per page. Defaults to 10."),
  cursor: z.string().optional().describe("Base64-encoded cursor for pagination"),
});

export type GetIdentityHistoryParams = z.infer<typeof GetIdentityHistorySchema>;

export async function getIdentityHistory(params: GetIdentityHistoryParams) {
  const client = getClient();
  const { identityId, ...rest } = params;
  const queryParams = filtersToParams(rest);
  return client.makeApiCall(`/identity/${identityId}/history`, queryParams);
}
