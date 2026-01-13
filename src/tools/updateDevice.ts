import { z } from "zod";
import { getClient } from "../admina-api.js";

// Device fields schema for update - all fields optional but fields object required
const UpdateDeviceFieldsSchema = z
  .object({
    // Required preset fields (must always be provided in update)
    "preset.asset_number": z.string().describe("Asset number (REQUIRED for update)"),
    "preset.subtype": z
      .enum(["desktop_pc", "laptop_pc", "tablet_pc", "phone", "monitor", "server", "peripheral_device", "other"])
      .describe("Device subtype (REQUIRED for update)"),
    "preset.model_name": z.string().describe("Model name (REQUIRED for update)"),

    // Optional preset fields
    "preset.serial_number": z.string().optional().describe("Serial number"),
    "preset.model_number": z.string().optional().describe("Model number"),
    "preset.memory": z.string().optional().describe("Memory specification"),
    "preset.hdd_ssd": z.string().optional().describe("Storage specification"),
    "preset.cpu": z.string().optional().describe("CPU specification"),
    "preset.os": z.string().optional().describe("Operating system"),
    "preset.size": z.string().optional().describe("Size/dimensions"),
    "preset.manufacturer": z.string().optional().describe("Manufacturer name"),
    "preset.supplier": z.string().optional().describe("Supplier name"),
    "preset.procurement_method": z
      .enum(["purchase", "lease", "rental", "other"])
      .optional()
      .describe("Procurement method"),
    "preset.purchase_date": z.string().optional().describe("Purchase date (YYYY-MM-DD format)"),
    "preset.purchase_cost": z.number().optional().describe("Purchase cost"),
    "preset.warranty_period": z.string().optional().describe("Warranty period"),
    "preset.decommission_date": z.string().optional().describe("Decommission date (YYYY-MM-DD format)"),
    "preset.scheduled_return_date": z.string().optional().describe("Scheduled return date (YYYY-MM-DD format)"),
    "preset.fixed_asset": z.enum(["yes", "no"]).optional().describe("Fixed asset status"),
    "preset.phone_number": z.string().optional().describe("Phone number (for phone devices)"),
    "preset.sim_number": z.string().optional().describe("SIM number (for phone devices)"),
    "preset.mobile_plan": z.string().optional().describe("Mobile plan (for phone devices)"),
    "preset.hostname": z.string().optional().describe("Hostname"),
    "preset.version": z.string().optional().describe("Version"),
    "preset.keyboard_layout": z.enum(["us", "uk", "jis", "other"]).optional().describe("Keyboard layout"),
    "preset.usage_start_date": z.string().optional().describe("Usage start date (YYYY-MM-DD format)"),
    "preset.usage_end_date": z.string().optional().describe("Usage end date (YYYY-MM-DD format)"),
  })
  .catchall(z.union([z.string(), z.number()]).optional()); // Allow custom fields like "custom.xxx"

export const UpdateDeviceSchema = z.object({
  deviceId: z.number().describe("The ID of the device to update"),
  memo: z.string().optional().describe("Additional notes or memo about the device"),
  fields: UpdateDeviceFieldsSchema.describe(
    "Device field values. Note: preset.asset_number, preset.subtype, and preset.model_name are always required",
  ),
});

export type UpdateDeviceParams = z.infer<typeof UpdateDeviceSchema>;

export async function updateDevice(params: UpdateDeviceParams) {
  const client = getClient();

  const body: Record<string, unknown> = {
    fields: params.fields,
  };

  if (params.memo !== undefined) {
    body.memo = params.memo;
  }

  return client.makePatchApiCall(`/devices/${params.deviceId}`, body);
}
