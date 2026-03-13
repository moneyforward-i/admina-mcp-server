import { z } from "zod";
import { getClient } from "../admina-api.js";

export const UnmergeIdentitiesSchema = z.object({
  peopleIds: z
    .array(z.number().int().positive())
    .min(1)
    .max(50)
    .optional()
    .describe("List of people IDs to unmerge (1-50 items)."),
  identityIds: z.array(z.string()).min(1).max(50).optional().describe("List of identity IDs to unmerge (1-50 items)."),
});

export type UnmergeIdentitiesParams = z.infer<typeof UnmergeIdentitiesSchema>;

export async function unmergeIdentities(params: UnmergeIdentitiesParams) {
  const client = getClient();

  const body: Record<string, unknown> = {};
  if (params.peopleIds !== undefined) body.peopleIds = params.peopleIds;
  if (params.identityIds !== undefined) body.identityIds = params.identityIds;

  return client.makePostApiCall("/identity/unmerge", new URLSearchParams(), body);
}
