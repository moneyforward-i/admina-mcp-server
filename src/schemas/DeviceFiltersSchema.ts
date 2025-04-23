import { z } from "zod";

export const DeviceFiltersSchema = z.object({
  status: z.enum(["in_stock", "pre_use", "active", "missing", "malfunction", "decommissioned"]).optional(),
  asset_number: z.string().optional(),
  serial_number: z.string().optional(),
  identityId: z.string().optional(),
  peopleId: z.number().optional(),
  locale: z.enum(["ja", "en"]).default("ja"),
  limit: z.number().optional(),
  cursor: z.string().optional(),
  type: z.string().optional(),
});

export type DeviceFilters = z.infer<typeof DeviceFiltersSchema>;
