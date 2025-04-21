import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  AdminaApiClient,
  DeviceFiltersSchema,
  IdentityFiltersSchema,
  ServiceAccountFiltersSchema,
  ServiceFiltersSchema,
} from "./admina-api.js";
import { formatAdminaError, isAdminaError } from "./errors.js";

if (!process.env.ADMINA_API_KEY || !process.env.ADMINA_ORGANIZATION_ID) {
  throw new Error("ADMINA_API_KEY and ADMINA_ORGANIZATION_ID must be set");
}

const adminaApi = new AdminaApiClient(process.env.ADMINA_API_KEY, process.env.ADMINA_ORGANIZATION_ID);

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
          "Return a list of devices with localized values filterable by status, asset number, serial number, and uid (or peopleId)",
        inputSchema: zodToJsonSchema(DeviceFiltersSchema),
      },
      {
        name: "get_identities",
        description: "Return a list of identities with localized values",
        inputSchema: zodToJsonSchema(IdentityFiltersSchema),
      },
      {
        name: "get_services",
        description: "Return a list of services with optional filters",
        inputSchema: zodToJsonSchema(ServiceFiltersSchema),
      },
      {
        name: "get_service_accounts",
        description: "Return a list of service accounts with optional filters",
        inputSchema: zodToJsonSchema(ServiceAccountFiltersSchema),
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
      const response = await adminaApi.getDevices(args);
      return {
        content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        isError: false,
      };
    }

    if (toolName === "get_identities") {
      const args = IdentityFiltersSchema.parse(input);
      const response = await adminaApi.getIdentities(args);
      return {
        content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        isError: false,
      };
    }

    if (toolName === "get_services") {
      const args = ServiceFiltersSchema.parse(input);
      const response = await adminaApi.getServices(args);
      return {
        content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        isError: false,
      };
    }

    if (toolName === "get_service_accounts") {
      const args = ServiceAccountFiltersSchema.parse(input);
      const response = await adminaApi.getServiceAccounts(args);
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
