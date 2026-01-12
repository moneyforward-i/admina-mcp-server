import { z } from "zod";
import { getClient } from "../admina-api.js";

// Dropdown value schema
const DropdownValueSchema = z.object({
  id: z.string().describe("Stable identifier for the option"),
  value: z.string().describe("Display name for the option"),
  group: z.string().optional().describe("Optional group for the option"),
});

// Dropdown configuration schema
const DropdownConfigurationSchema = z.object({
  values: z.array(DropdownValueSchema).describe("Dropdown items with id (stable identifier) and value (display name)"),
});

export const UpdateDeviceCustomFieldSchema = z.object({
  customFieldId: z.number().describe("The ID of the custom field to update"),
  visibleForType: z
    .array(z.enum(["pc", "phone", "other"]))
    .optional()
    .describe("List of device types this field is visible for"),
  configuration: DropdownConfigurationSchema.nullable()
    .optional()
    .describe(
      "Dropdown configuration (values can be added, removed, reordered, or modified). Only for dropdown type fields.",
    ),
  attributeName: z.string().optional().describe("Display label for the custom field"),
  attributeCode: z
    .string()
    .optional()
    .describe("Unique identifier for the custom field. Must contain only lowercase letters, numbers, and underscores."),
});

export type UpdateDeviceCustomFieldParams = z.infer<typeof UpdateDeviceCustomFieldSchema>;

export async function updateDeviceCustomField(params: UpdateDeviceCustomFieldParams) {
  const client = getClient();

  const body: Record<string, unknown> = {};

  if (params.visibleForType !== undefined) body.visibleForType = params.visibleForType;
  if (params.configuration !== undefined) body.configuration = params.configuration;
  if (params.attributeName !== undefined) body.attributeName = params.attributeName;
  if (params.attributeCode !== undefined) body.attributeCode = params.attributeCode;

  return client.makePatchApiCall(`/fields/custom/${params.customFieldId}`, body);
}
