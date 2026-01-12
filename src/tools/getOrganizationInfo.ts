import { z } from "zod";
import { getClient } from "../admina-api.js";

// No input parameters needed - organizationId is handled by the client
export const OrganizationInfoSchema = z.object({});

export type OrganizationInfoParams = z.infer<typeof OrganizationInfoSchema>;

export async function getOrganizationInfo() {
  const client = getClient();
  // The endpoint is just empty string since the base URL already includes /organizations/{organizationId}
  return client.makeApiCall("", new URLSearchParams());
}
