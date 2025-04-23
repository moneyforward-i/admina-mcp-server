import { z } from "zod";
import { getClient } from "../admina-api.js";
import { filtersToParams } from "../common/helper.js";

export const ServiceAccountFiltersSchema = z.object({
  serviceId: z.number(),
  limit: z.number().optional(),
  cursor: z.string().optional(),
  keyword: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.string().optional(),
  workspaceIds: z.array(z.number()).optional(),
  twoFa: z.boolean().optional(),
  roles: z
    .array(z.enum(["admin", "guest", "other"]))
    .length(1, "roles must be an array with exactly one element")
    .optional(),
  serviceRoles: z.array(z.string()).optional(),
  types: z.array(z.enum(["employee", "guest", "system", "unknown"])).optional(),
  employeeTypes: z
    .array(
      z.enum([
        "board_member",
        "full_time_employee",
        "fixed_time_employee",
        "temporary_employee",
        "part_time_employee",
        "secondment_employee",
        "contract_employee",
        "collaborator",
        "group_address",
        "shared_address",
        "test_address",
        "other",
        "unknown",
        "unregistered",
      ]),
    )
    .length(1, "employeeTypes must be an array with exactly one element")
    .optional(),
  employeeStatuses: z
    .array(z.enum(["active", "on_leave", "draft", "preactive", "retired", "untracked"]))
    .length(1, "employeeStatuses must be an array with exactly one element")
    .optional(),
  statuses: z
    .array(z.enum(["active", "on_leave", "draft", "preactive", "retired", "untracked"]))
    .length(1, "employeeStatuses must be an array with exactly one element")
    .optional(),
  includeDeleted: z.boolean().optional(),
  expandIdentities: z.boolean().optional(),
  onlyInactive: z.boolean().optional(),
  licenses: z.array(z.string()).optional(),
  alertType: z
    .enum(["retired_account", "inactive_account", "on_leave_account", "unknown_account", "public_files"])
    .optional(),
  alertStatus: z.enum(["muted", "unmuted"]).optional(),
});

export type ServiceAccountFilters = z.infer<typeof ServiceAccountFiltersSchema>;

export async function getServiceAccounts(filters: ServiceAccountFilters) {
  const client = getClient();
  const { serviceId, ...rest } = filters;
  const queryParams = filtersToParams(rest);

  return client.makeApiCall(`/services/${serviceId}/accounts`, queryParams);
}
