import z from "zod";

// Dropdown value schema
export const DropdownValueSchema = z.object({
  id: z.string().describe("Stable identifier for the option"),
  value: z.string().describe("Display name for the option"),
  group: z.string().optional().describe("Optional group for the option"),
});

// Dropdown configuration schema
export const DropdownConfigurationSchema = z.object({
  values: z.array(DropdownValueSchema).describe("Dropdown items with id (stable identifier) and value (display name)"),
});
