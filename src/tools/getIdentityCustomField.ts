import { z } from "zod";
import { getClient } from "../admina-api.js";

// No input parameters needed
export const IdentityCustomFieldsFiltersSchema = z.object({});

export type IdentityCustomFieldsFilters = z.infer<typeof IdentityCustomFieldsFiltersSchema>;

export async function getIdentityCustomFields() {
  const client = getClient();
  return client.makeApiCall("/identity/fields/custom", new URLSearchParams());
}
