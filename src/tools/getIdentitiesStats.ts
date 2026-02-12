import { z } from "zod";
import { getClient } from "../admina-api.js";

export const GetIdentitiesStatsSchema = z.object({});

export type GetIdentitiesStatsParams = z.infer<typeof GetIdentitiesStatsSchema>;

export async function getIdentitiesStats(_params: GetIdentitiesStatsParams) {
  const client = getClient();
  return client.makeApiCall("/identity/stats", new URLSearchParams());
}
