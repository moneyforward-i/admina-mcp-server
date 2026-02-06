#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { formatAdminaError, isAdminaError } from "./common/errors.js";
import { IdentityConfigFiltersSchema, getIdentityConfig } from "./tools/getIdentityConfig.js";
import { IdentityCustomFieldsFiltersSchema, getIdentityCustomFields } from "./tools/getIdentityCustomField.js";
import {
  CreateDeviceCustomFieldSchema,
  CreateDeviceSchema,
  DeleteDeviceCustomFieldSchema,
  DeviceCustomFieldsSchema,
  DeviceFiltersSchema,
  IdentityFiltersSchema,
  OrganizationInfoSchema,
  PeopleAccountsFiltersSchema,
  ServiceAccountFiltersSchema,
  ServiceFiltersSchema,
  UpdateDeviceCustomFieldSchema,
  UpdateDeviceMetaSchema,
  UpdateDeviceSchema,
  createDevice,
  createDeviceCustomField,
  deleteDeviceCustomField,
  getDeviceCustomFields,
  getDevices,
  getIdentities,
  getOrganizationInfo,
  getPeopleAccounts,
  getServiceAccounts,
  getServices,
  updateDevice,
  updateDeviceCustomField,
  updateDeviceMeta,
} from "./tools/index.js";

const server = new Server(
  {
    name: "admina-mpc",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_organization_info",
        description:
          "Get information about the organization including name, unique name, status, system language, etc.",
        inputSchema: zodToJsonSchema(OrganizationInfoSchema),
      },
      {
        name: "get_devices",
        description: `Get a list of devices for an organization using advanced search and filtering.

## Key Features
- Combine query parameters (pagination, sorting) with body parameters (filtering)
- Support for text search, field-specific filters, and complex queries
- Pagination with cursor-based navigation

## Example Usage
**Find first 5 devices for user with email "someone@gmail.com":**
- Query: limit=5
- Body: {"searchTerm": "someone@gmail.com", "searchFields": ["people.primaryEmail"]}

## Pro Tips
- **1**: Always make sure understand the definition of the fields (preset and custom fields) before using them.
- **2**: If user search devices by category: pc, phone or other, please use body.type to filter devices by category.
- **3**: Always to understand what are current sub types of the devices. If the user search information relate to sub types, Please use body.filters.["preset.subtype"] to filter devices by sub types.
- **4**: We don't really need to use searchFields parameter to the search results in all fields, only use it when the user search information relate to specific fields.
- **5**: If user want to filter devices by status, please use body.filters.["preset.status"].eq to filter devices by status.
- **5.1**: Unassigned devices status should be "in_stock" or "decommissioned".
- **6**: If user want to filter devices by preset fields or custom fields, please check the field.kind first, we only support date, number, dropdown kind of fields.
- **6.1**: If the field.kind is date, please use body.filters.["preset.field_name"].minDate or body.filters.["custom.attributeCode"].minDate and body.filters.["preset.field_name"].maxDate or body.filters.["custom.attributeCode"].maxDate to filter devices by date range.
- **6.2**: If the field.kind is number, please use body.filters.["preset.field_name"].minNumber or body.filters.["custom.attributeCode"].minNumber and body.filters.["preset.field_name"].maxNumber or body.filters.["custom.attributeCode"].maxNumber to filter devices by number range.
- **6.3**: If the preset field field.kind is dropdown, please use body.filters.["preset.field_name"].eq or body.filters.["custom.attributeCode"].eq to filter devices by dropdown value.
- **7**: Combine multiple filters examples: {"preset.status":{"eq":"active"},"preset.subtype":{"eq":"desktop_pc"},"custom.custom_xxx":{"eq":"1"},"custom.dt_13":{"minDate":"2025-12-23","maxDate":"2025-12-25"},"custom.drp_4":{"eq":"1"}}`,
        inputSchema: zodToJsonSchema(DeviceFiltersSchema),
      },
      {
        name: "create_device",
        description:
          "Create a new device for an organization. Requires device type (subtype), asset number, and model name. Can include optional preset fields and custom fields.",
        inputSchema: zodToJsonSchema(CreateDeviceSchema),
      },
      {
        name: "update_device",
        description:
          "Update an existing device's information. Can update preset fields, custom fields, and device properties. Note: fields.preset.asset_number, fields.preset.subtype, fields.preset.model_name are always required.",
        inputSchema: zodToJsonSchema(UpdateDeviceSchema),
      },
      {
        name: "update_device_meta",
        description:
          "Update device's meta information including assignment info (peopleId, status, dates) and location. Use this to assign/unassign devices to people. When unassigned, status should be 'in_stock' or 'decommissioned'. When assigned without status, defaults to 'active'.",
        inputSchema: zodToJsonSchema(UpdateDeviceMetaSchema),
      },
      {
        name: "get_device_custom_fields",
        description:
          "Get all custom fields configured for an organization's devices. Returns field definitions, types (text, date, number, dropdown), and configurations.",
        inputSchema: zodToJsonSchema(DeviceCustomFieldsSchema),
      },
      {
        name: "create_device_custom_field",
        description:
          "Create a new custom field for organization devices. Defines a new field that can be used across all devices in the organization.",
        inputSchema: zodToJsonSchema(CreateDeviceCustomFieldSchema),
      },
      {
        name: "update_device_custom_field",
        description:
          "Update an existing device custom field configuration. Can modify field name, code, visibility for device types, and dropdown configuration.",
        inputSchema: zodToJsonSchema(UpdateDeviceCustomFieldSchema),
      },
      {
        name: "delete_device_custom_field",
        description:
          "Delete a device custom field configuration. Removes a custom field definition from the organization.",
        inputSchema: zodToJsonSchema(DeleteDeviceCustomFieldSchema),
      },
      {
        name: "get_identities",
        description:
          "Return a list of identities. Can be filtered by the status, department and type. Can also search by the email or name by keyword",
        inputSchema: zodToJsonSchema(IdentityFiltersSchema),
      },
      {
        name: "get_services",
        description:
          "Return a list of services, along with the preview of the accounts. Can be searched by the service name by keyword",
        inputSchema: zodToJsonSchema(ServiceFiltersSchema),
      },
      {
        name: "get_service_accounts",
        description:
          "Return a list of accounts for a specific service. The serviceId can be obtained from the get_services tool. Can be searched by email/name of the account by keyword",
        inputSchema: zodToJsonSchema(ServiceAccountFiltersSchema),
      },
      {
        name: "get_people_accounts",
        description:
          "Return a list of SaaS accounts belonging to a person. The peopleId can be obtained from the get_identities tool. Can be filtered by role, two-factor authentication, and searched by service name or workspace name",
        inputSchema: zodToJsonSchema(PeopleAccountsFiltersSchema),
      },
      {
        name: "get_identity_config",
        description:
          "Get configuration for identity fields of a specific identity. Required to filter by a specific identityId to see the effective configuration for that identity.",
        inputSchema: zodToJsonSchema(IdentityConfigFiltersSchema),
      },
      {
        name: "get_identity_custom_fields",
        description:
          "Get all identity custom fields configured for an organization. Returns field definitions, types (text, date, number, dropdown), and configurations.",
        inputSchema: zodToJsonSchema(IdentityCustomFieldsFiltersSchema),
      },
    ],
  };
});

// Tool handler type definition
type ToolHandler = (input: Record<string, unknown>) => Promise<unknown>;

// Tool handlers map to reduce cognitive complexity
const toolHandlers: Record<string, ToolHandler> = {
  get_organization_info: async () => getOrganizationInfo(),
  get_devices: async (input) => getDevices(DeviceFiltersSchema.parse(input)),
  create_device: async (input) => createDevice(CreateDeviceSchema.parse(input)),
  update_device: async (input) => updateDevice(UpdateDeviceSchema.parse(input)),
  update_device_meta: async (input) => updateDeviceMeta(UpdateDeviceMetaSchema.parse(input)),
  get_device_custom_fields: async () => getDeviceCustomFields(),
  create_device_custom_field: async (input) => createDeviceCustomField(CreateDeviceCustomFieldSchema.parse(input)),
  update_device_custom_field: async (input) => updateDeviceCustomField(UpdateDeviceCustomFieldSchema.parse(input)),
  delete_device_custom_field: async (input) => deleteDeviceCustomField(DeleteDeviceCustomFieldSchema.parse(input)),
  get_identities: async (input) => getIdentities(IdentityFiltersSchema.parse(input)),
  get_services: async (input) => getServices(ServiceFiltersSchema.parse(input)),
  get_service_accounts: async (input) => getServiceAccounts(ServiceAccountFiltersSchema.parse(input)),
  get_people_accounts: async (input) => getPeopleAccounts(PeopleAccountsFiltersSchema.parse(input)),
  get_identity_config: async (input) => getIdentityConfig(IdentityConfigFiltersSchema.parse(input)),
  get_identity_custom_fields: async () => getIdentityCustomFields(),
};

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const input = request.params.arguments || {};
  try {
    const handler = toolHandlers[toolName];
    if (!handler) {
      return {
        content: [{ type: "text", text: `Unknown tool: ${toolName}` }],
        isError: true,
      };
    }

    const response = await handler(input);
    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
      isError: false,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorDetails = error.errors
        .map((err) => {
          return `${err.path.join(".")}: ${err.message}`;
        })
        .join("\n");

      return {
        content: [
          {
            type: "text",
            text: `Invalid input:\n${errorDetails}`,
          },
        ],
        isError: true,
      };
    }

    if (isAdminaError(error)) {
      return {
        content: [{ type: "text", text: formatAdminaError(error) }],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
const serverTransport = new StdioServerTransport();
server.connect(serverTransport);
