import { z } from "zod";

export const ServiceFiltersSchema = z.object({
  limit: z.number().optional(),
  cursor: z.string().optional(),
  keyword: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.string().optional(),
});

export type ServiceFilters = z.infer<typeof ServiceFiltersSchema>;
