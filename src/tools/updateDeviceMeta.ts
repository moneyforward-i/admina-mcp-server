import { z } from "zod";
import { getClient } from "../admina-api.js";

export const UpdateDeviceMetaSchema = z.object({
  deviceId: z.number().describe("The ID of the device to update"),
  status: z
    .enum(["in_stock", "pre_use", "active", "missing", "malfunction", "decommissioned", "on_order"])
    .optional()
    .describe(
      "Device status. If 'in_stock' or 'decommissioned', device will be unassigned and assignment dates cleared",
    ),
  peopleId: z
    .number()
    .nullable()
    .optional()
    .describe(
      "People ID to assign device to. Set to null to unassign. Cannot assign if status is 'in_stock' or 'decommissioned'",
    ),
  assignmentStartDate: z
    .string()
    .nullable()
    .optional()
    .describe("Assignment start date (YYYY-MM-DD). Cannot set if status is 'in_stock' or 'decommissioned'"),
  assignmentEndDate: z
    .string()
    .nullable()
    .optional()
    .describe("Assignment end date (YYYY-MM-DD). Cannot set if status is 'in_stock' or 'decommissioned'"),
  location1: z.string().optional().describe("Primary location information"),
  location2: z.string().optional().describe("Secondary location information"),
});

export type UpdateDeviceMetaParams = z.infer<typeof UpdateDeviceMetaSchema>;

export async function updateDeviceMeta(params: UpdateDeviceMetaParams) {
  const client = getClient();

  const body: Record<string, unknown> = {};

  if (params.status !== undefined) body.status = params.status;
  if (params.peopleId !== undefined) body.peopleId = params.peopleId;
  if (params.assignmentStartDate !== undefined) body.assignmentStartDate = params.assignmentStartDate;
  if (params.assignmentEndDate !== undefined) body.assignmentEndDate = params.assignmentEndDate;
  if (params.location1 !== undefined) body.location1 = params.location1;
  if (params.location2 !== undefined) body.location2 = params.location2;

  return client.makePatchApiCall(`/devices/${params.deviceId}/meta`, body);
}
