import { z } from "zod";
import { getClient } from "../admina-api.js";

export const DeleteIdentityCustomFieldSchema = z.object({
  customFieldId: z
    .number()
    .describe(
      "The ID of the custom field to delete. Make sure user wants to delete an identity custom field and not a device custom field",
    ),
});

export type DeleteIdentityCustomFieldParams = z.infer<typeof DeleteIdentityCustomFieldSchema>;

export async function deleteIdentityCustomField(params: DeleteIdentityCustomFieldParams) {
  const client = getClient();
  return client.makeDeleteApiCall(`/identity/fields/custom/${params.customFieldId}`);
}
