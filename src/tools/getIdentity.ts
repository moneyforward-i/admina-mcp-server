import { z } from "zod";
import { getClient } from "../admina-api.js";
import { filtersToParams } from "../common/helper.js";

export const GetIdentitySchema = z.object({
  identityId: z.string().describe("The ID of the identity to retrieve"),
  expands: z
    .array(z.enum(["customFieldsMetadata"]))
    .optional()
    .describe("Expand other datasets when fetching the identity (e.g. customFieldsMetadata)"),
});

export type GetIdentityParams = z.infer<typeof GetIdentitySchema>;

export async function getIdentity(params: GetIdentityParams) {
  const client = getClient();
  const { identityId, ...rest } = params;
  const queryParams = filtersToParams(rest);
  return client.makeApiCall(`/identity/${identityId}`, queryParams);
}
