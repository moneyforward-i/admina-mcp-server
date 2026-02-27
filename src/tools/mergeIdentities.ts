import { z } from "zod";
import { getClient } from "../admina-api.js";

// Schema for merging people entities
const MergePeopleSchema = z.object({
  fromPeopleId: z.number().positive().describe("Source people ID to merge from"),
  toPeopleId: z.number().positive().describe("Target people ID to merge into"),
});

// Schema for merging identity entities
const MergeIdentitySchema = z.object({
  fromIdentityId: z.string().describe("Source identity ID to merge from"),
  toIdentityId: z.string().describe("Target identity ID to merge into"),
});

export const MergeIdentitiesSchema = z.object({
  merges: z
    .array(MergePeopleSchema)
    .min(1)
    .max(50)
    .optional()
    .describe("Array of people merge operations (1-50 items)"),
  identityMerges: z
    .array(MergeIdentitySchema)
    .min(1)
    .max(50)
    .optional()
    .describe("Array of identity merge operations (1-50 items)"),
});

export type MergeIdentitiesParams = z.infer<typeof MergeIdentitiesSchema>;

export async function mergeIdentities(params: MergeIdentitiesParams) {
  const client = getClient();

  const body: Record<string, unknown> = {};

  if (params.merges !== undefined) {
    body.merges = params.merges;
  }

  if (params.identityMerges !== undefined) {
    body.identityMerges = params.identityMerges;
  }

  return client.makePostApiCall("/identity/merge", new URLSearchParams(), body);
}
