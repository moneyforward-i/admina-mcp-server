#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { formatAdminaError, isAdminaError } from "./common/errors.js";
import {
  DeviceFiltersSchema,
  IdentityFiltersSchema,
  ServiceAccountFiltersSchema,
  ServiceFiltersSchema,
  ProvisioningMetaFiltersSchema,
  CreateServiceAccountSchema,
  getDevices,
  getIdentities,
  getServiceAccounts,
  getServices,
  getProvisioningMeta,
  createServiceAccount,
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
        name: "get_devices",
        description:
          "Return a list of devices. Can be filtered by the status, asset number, serial number, or identityId which can be obtained from the get_identities tool.",
        inputSchema: zodToJsonSchema(DeviceFiltersSchema),
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
        name: "get_provisioning_meta",
        description:
          "Step 1 of provisioning: Get provisioning metadata for a workspace. Returns required fields and constraints for creating service accounts. Use organizationId and workspaceId to specify the target workspace.",
        inputSchema: zodToJsonSchema(ProvisioningMetaFiltersSchema),
      },
      {
        name: "create_service_account",
        description:
          "Step 2 of provisioning: Create a service account in a workspace. First call get_provisioning_meta to get required fields, then use this tool with the constructed data object based on the metadata response.",
        inputSchema: zodToJsonSchema(CreateServiceAccountSchema),
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const input = request.params.arguments || {};
  try {
    if (toolName === "get_devices") {
      const args = DeviceFiltersSchema.parse(input);
      const response = await getDevices(args);
      return {
        content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        isError: false,
      };
    }

    if (toolName === "get_identities") {
      const args = IdentityFiltersSchema.parse(input);
      const response = await getIdentities(args);
      return {
        content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        isError: false,
      };
    }

    if (toolName === "get_services") {
      const args = ServiceFiltersSchema.parse(input);
      const response = await getServices(args);
      return {
        content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        isError: false,
      };
    }

    if (toolName === "get_service_accounts") {
      const args = ServiceAccountFiltersSchema.parse(input);
      const response = await getServiceAccounts(args);
      return {
        content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        isError: false,
      };
    }

    if (toolName === "get_provisioning_meta") {
      const args = ProvisioningMetaFiltersSchema.parse(input);
      const response = await getProvisioningMeta(args);
      return {
        content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        isError: false,
      };
    }

    if (toolName === "create_service_account") {
      const args = CreateServiceAccountSchema.parse(input);
      const response = await createServiceAccount(args);
      return {
        content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        isError: false,
      };
    }

    return {
      content: [{ type: "text", text: `Unknown tool: ${toolName}` }],
      isError: true,
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
