import { z } from "zod";
import { getClient } from "../admina-api.js";

export const UpdateIdentityCustomFieldSchema = z.object({
  customFieldId: z.number().describe("The ID of the custom field to update"),
  attributeName: z.string().optional().describe("Display label for the custom field"),
  attributeCode: z
    .string()
    .optional()
    .describe("Unique identifier for the custom field. Must contain only lowercase letters, numbers, and underscores."),
});

export type UpdateIdentityCustomFieldParams = z.infer<typeof UpdateIdentityCustomFieldSchema>;

export async function updateIdentityCustomField(params: UpdateIdentityCustomFieldParams) {
  const client = getClient();

  const body: Record<string, unknown> = {};

  if (params.attributeName !== undefined) body.attributeName = params.attributeName;
  if (params.attributeCode !== undefined) body.attributeCode = params.attributeCode;

  return client.makePatchApiCall(`/identity/fields/custom/${params.customFieldId}`, body);
}
