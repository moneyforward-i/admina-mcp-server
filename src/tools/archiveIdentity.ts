import { z } from "zod";
import { getClient } from "../admina-api.js";

export const ArchiveIdentitySchema = z.object({
  identityId: z.string().describe("The ID of the identity to toggle the archive flag for"),
});

export type ArchiveIdentityParams = z.infer<typeof ArchiveIdentitySchema>;

export async function archiveIdentity(params: ArchiveIdentityParams) {
  const client = getClient();
  return client.makePutApiCall(`/identity/${params.identityId}/archive`, {});
}
