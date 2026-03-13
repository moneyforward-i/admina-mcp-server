import { z } from "zod";
import { getClient } from "../admina-api.js";

export const UnregisterIdentitySchema = z.object({
  identityId: z.string().describe("The ID of the identity to toggle the unregistered management type for"),
});

export type UnregisterIdentityParams = z.infer<typeof UnregisterIdentitySchema>;

export async function unregisterIdentity(params: UnregisterIdentityParams) {
  const client = getClient();
  return client.makePutApiCall(`/identity/${params.identityId}/unregister`, {});
}
