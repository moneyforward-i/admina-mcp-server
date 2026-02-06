import { z } from "zod";
import { getClient } from "../admina-api.js";
import { DropdownConfigurationSchema } from "../common/dropdown-schema.js";

export const CreateIdentityCustomFieldSchema = z.object({
  kind: z.enum(["text", "number", "date", "dropdown"]).describe("The type of the custom field (REQUIRED)"),
  configuration: DropdownConfigurationSchema.describe(
    "Dropdown items with id (stable identifier) and value (display name) (REQUIRED)",
  )
    .optional()
    .describe(
      "Dropdown configuration (values can be added, removed, reordered, or modified). Only required for dropdown type fields.",
    ),
  attributeName: z.string().describe("Display label for the custom field (REQUIRED)"),
  attributeCode: z
    .string()
    .describe(
      "Unique identifier for the custom field. Must contain only lowercase letters, numbers, and underscores. If not provided, will be auto-generated.",
    ),
  serviceSource: z.object({
    serviceFieldId: z
      .string()
      .describe(
        "Display label for the custom field (REQUIRED). This can be obtained as workspaceId of workspace of service field from get_services tool and user should pick a service then pick a workspace from the list of workspaces for that service and use that workspaceId for this field",
      ),
    workspaceId: z
      .number()
      .describe("Workspace ID number for the service source. This can be obtained from the get_services tool."),
  }),
});

export type CreateIdentityCustomFieldParams = z.infer<typeof CreateIdentityCustomFieldSchema>;

export async function createIdentityCustomField(params: CreateIdentityCustomFieldParams) {
  const client = getClient();

  const body: Record<string, unknown> = {
    kind: params.kind,
    serviceSource: {
      serviceFieldId: params.serviceSource.serviceFieldId,
      workspaceId: params.serviceSource.workspaceId,
    },
    attributeName: params.attributeName,
    attributeCode: params.attributeCode,
    configuration: params.kind === "dropdown" ? params.configuration : null,
  };

  return client.makePostApiCall("/identity/fields/custom", new URLSearchParams(), body);
}
