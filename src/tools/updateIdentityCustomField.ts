import { z } from "zod";
import { getClient } from "../admina-api.js";

// Device fields schema for update - all fields optional but fields object required
export const UpdateIdentityCustomFieldSchema = z
  .object({
    // Required preset fields (must always be provided in update)
  })
  .catchall(z.union([z.string(), z.number()]).optional()); // Allow custom fields like "custom.xxx"

export type UpdateIdentityCustomFieldParams = z.infer<typeof UpdateIdentityCustomFieldSchema>;

export async function updateIdentityCustomField(params: UpdateIdentityCustomFieldParams) {
  const client = getClient();

  const body: Record<string, unknown> = {
    fields: params.fields,
  };

  return client.makePatchApiCall(`/identity/fields/custom/${params.customFieldId}`, body);
}
