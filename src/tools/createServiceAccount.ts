import { z } from "zod";
import { getClient } from "../admina-api.js";

export const CreateServiceAccountSchema = z.object({
  organizationId: z.number().describe("Organization ID where the workspace belongs"),
  workspaceId: z.number().describe("Workspace ID to create account in"),
  data: z.record(z.union([z.string(), z.array(z.string())])).describe("Account data based on provisioning metadata from get_provisioning_meta"),
  workflowRunId: z.string().uuid().optional().describe("Optional workflow run ID for tracking"),
  lang: z.enum(["ja", "en"]).default("ja").describe("Language for responses"),
});

export type CreateServiceAccountRequest = z.infer<typeof CreateServiceAccountSchema>;

export async function createServiceAccount(request: CreateServiceAccountRequest) {
  const client = getClient();
  const { organizationId, workspaceId, lang, ...body } = request;
  
  return client.makeApiCall(
    `/organizations/${organizationId}/workspaces/${workspaceId}/accounts`,
    { lang },
    "POST",
    body
  );
}