import { z } from "zod";
import { getClient } from "../admina-api.js";

export const DeleteDeviceCustomFieldSchema = z.object({
  customFieldId: z
    .number()
    .describe(
      "The ID of the custom field to delete. Make sure user wants to delete a device custom field and not an identity custom field",
    ),
});

export type DeleteDeviceCustomFieldParams = z.infer<typeof DeleteDeviceCustomFieldSchema>;

export async function deleteDeviceCustomField(params: DeleteDeviceCustomFieldParams) {
  const client = getClient();
  return client.makeDeleteApiCall(`/fields/custom/${params.customFieldId}`);
}
