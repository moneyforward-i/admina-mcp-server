// src/remote/types.ts

export interface ToolParameter {
  name: string;
  /** "path" | "query" | "header" | "cookie" */
  in: string;
  required: boolean;
  description?: string;
  schema?: Record<string, unknown>;
}

export interface ToolDefinition {
  /** MCP tool name — operationId from OpenAPI spec */
  name: string;
  description: string;
  /** HTTP method: GET, POST, PUT, PATCH, DELETE */
  method: string;
  /** Path template, e.g. /organizations/{organizationId}/identities/{identityId} */
  path: string;
  parameters: ToolParameter[];
  /** True when the operation has a JSON requestBody */
  hasBody: boolean;
  /** JSON Schema (object) for MCP tool inputSchema — excludes organizationId */
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ToolRegistry {
  generatedAt: string;
  tools: ToolDefinition[];
}
