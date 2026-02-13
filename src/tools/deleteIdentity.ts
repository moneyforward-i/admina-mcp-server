import { z } from "zod";
import { getClient } from "../admina-api.js";

export const DeleteIdentitySchema = z.object({
  identityId: z.string().describe("The ID of the identity to delete"),
});

export type DeleteIdentityParams = z.infer<typeof DeleteIdentitySchema>;

export async function deleteIdentity(params: DeleteIdentityParams) {
  const client = getClient();
  return client.makeDeleteApiCall(`/identity/${params.identityId}`);
}
