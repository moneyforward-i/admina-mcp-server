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

export const CreateDeviceCustomFieldSchema = z.object({
  attributeName: z.string().describe("Display label for the custom field (REQUIRED)"),
  attributeCode: z
    .string()
    .describe(
      "Unique identifier for the custom field. Must contain only lowercase letters, numbers, and underscores (REQUIRED)",
    ),
  kind: z.enum(["text", "number", "date", "dropdown"]).describe("The type of the custom field (REQUIRED)"),
  configuration: DropdownConfigurationSchema.optional().describe(
    "Dropdown configuration with values. Only required for 'dropdown' kind fields.",
  ),
});

export type CreateDeviceCustomFieldParams = z.infer<typeof CreateDeviceCustomFieldSchema>;

export async function createDeviceCustomField(params: CreateDeviceCustomFieldParams) {
  const client = getClient();

  const body: Record<string, unknown> = {
    attributeName: params.attributeName,
    attributeCode: params.attributeCode,
    kind: params.kind,
  };

  if (params.configuration !== undefined) body.configuration = params.configuration;

  return client.makePostApiCall("/fields/custom", new URLSearchParams(), body);
}
