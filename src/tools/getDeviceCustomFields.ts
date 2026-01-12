import { z } from "zod";
import { getClient } from "../admina-api.js";

// No input parameters needed
export const DeviceCustomFieldsSchema = z.object({});

export type DeviceCustomFieldsParams = z.infer<typeof DeviceCustomFieldsSchema>;

export async function getDeviceCustomFields() {
  const client = getClient();
  return client.makeApiCall("/fields/custom", new URLSearchParams());
}
