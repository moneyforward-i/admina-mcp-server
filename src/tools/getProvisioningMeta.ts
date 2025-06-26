import { z } from "zod";
import { getClient } from "../admina-api.js";

export const ProvisioningMetaFiltersSchema = z.object({
  organizationId: z.number().describe("Organization ID where the workspace belongs"),
  workspaceId: z.number().describe("Workspace ID to get provisioning metadata for"),
  lang: z.enum(["ja", "en"]).default("ja").describe("Language for field descriptions"),
});

export type ProvisioningMetaFilters = z.infer<typeof ProvisioningMetaFiltersSchema>;

export async function getProvisioningMeta(filters: ProvisioningMetaFilters) {
  const client = getClient();
  const { organizationId, workspaceId, lang } = filters;
  
  return client.makeApiCall(
    `/organizations/${organizationId}/workspaces/${workspaceId}/provisioning-meta`,
    { lang }
  );
}