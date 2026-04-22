#!/usr/bin/env tsx
// scripts/generate-tools.ts
//
// Usage: VULCAN_OPENAPI_URL=https://... yarn generate:tools
//
// Reads vulcan's OpenAPI 3.0 spec, filters out incompatible endpoints,
// and writes src/generated/tools.json used by the remote MCP server.

import axios from "axios";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ToolDefinition, ToolParameter, ToolRegistry } from "../src/remote/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, "../src/generated/tools.json");

// ── OpenAPI 3.0 minimal shape ──────────────────────────────────────────────

interface OpenApiSpec {
  paths: Record<string, Record<string, OpenApiOperation>>;
  components?: { schemas?: Record<string, unknown> };
}

interface OpenApiOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  deprecated?: boolean;
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses?: Record<string, OpenApiResponse>;
}

interface OpenApiParameter {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  schema?: unknown;
  $ref?: string;
}

interface OpenApiRequestBody {
  content?: Record<string, { schema?: unknown }>;
  required?: boolean;
}

interface OpenApiResponse {
  content?: Record<string, unknown>;
}

// ── $ref resolution ────────────────────────────────────────────────────────

function resolveRef(ref: string, spec: OpenApiSpec): unknown {
  // Supports only local #/components/schemas/... refs
  const parts = ref.replace("#/", "").split("/");
  // biome-ignore lint/suspicious/noExplicitAny: navigating generic JSON
  let current: any = spec;
  for (const part of parts) {
    current = current?.[part];
  }
  return current;
}

function mergeAllOf(value: unknown[], spec: OpenApiSpec, depth: number): Record<string, unknown> {
  const merged: Record<string, unknown> = { type: "object", properties: {}, required: [] };
  for (const sub of value) {
    const r = resolveSchema(sub, spec, depth + 1) as Record<string, unknown>;
    Object.assign(merged.properties as Record<string, unknown>, r.properties ?? {});
    if (Array.isArray(r.required)) {
      (merged.required as string[]).push(...(r.required as string[]));
    }
  }
  if ((merged.required as string[]).length === 0) delete merged.required;
  return merged;
}

function resolveSchema(schema: unknown, spec: OpenApiSpec, depth = 0): unknown {
  if (depth > 10 || schema == null || typeof schema !== "object") return schema;
  const s = schema as Record<string, unknown>;

  if (s["$ref"] && typeof s["$ref"] === "string") {
    return resolveSchema(resolveRef(s["$ref"], spec), spec, depth + 1);
  }

  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(s)) {
    if (key === "allOf" && Array.isArray(value)) {
      return mergeAllOf(value, spec, depth);
    }
    if (key === "properties" && typeof value === "object" && value !== null) {
      resolved[key] = Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, resolveSchema(v, spec, depth + 1)]),
      );
    } else if (key === "items") {
      resolved[key] = resolveSchema(value, spec, depth + 1);
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}

// ── Filtering helpers ──────────────────────────────────────────────────────

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

function hasBinaryResponse(op: OpenApiOperation): boolean {
  for (const response of Object.values(op.responses ?? {})) {
    const content = response.content ?? {};
    if (content["application/octet-stream"] || content["text/csv"]) return true;
  }
  return false;
}

function isAuthPath(urlPath: string): boolean {
  return /\/(auth|login|logout|token|oauth)\b/i.test(urlPath);
}

function toSnakeCase(str: string): string {
  return str
    .replaceAll(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .replaceAll(/([a-z\d])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/^_/, "");
}

// ── Input schema builder ───────────────────────────────────────────────────

function addBodyProperties(
  requestBody: OpenApiRequestBody | undefined,
  spec: OpenApiSpec,
  properties: Record<string, unknown>,
  required: string[],
): void {
  const schema = requestBody?.content?.["application/json"]?.schema;
  if (!schema) return;
  const bodySchema = resolveSchema(schema, spec) as Record<string, unknown>;
  if (bodySchema.type !== "object" || !bodySchema.properties) return;
  for (const [name, propSchema] of Object.entries(bodySchema.properties as Record<string, unknown>)) {
    properties[name] = propSchema;
  }
  if (Array.isArray(bodySchema.required)) {
    required.push(...(bodySchema.required as string[]));
  }
}

function buildInputSchema(
  parameters: OpenApiParameter[],
  requestBody: OpenApiRequestBody | undefined,
  spec: OpenApiSpec,
): ToolDefinition["inputSchema"] {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const param of parameters) {
    if (param.in === "header") continue; // skip header params
    if (param.name === "organizationId") continue; // injected from X-Organization-ID
    const schema = resolveSchema(param.schema ?? { type: "string" }, spec);
    properties[param.name] = { ...(schema as Record<string, unknown>), description: param.description };
    if (param.required) required.push(param.name);
  }

  addBodyProperties(requestBody, spec, properties, required);

  return {
    type: "object",
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

// ── Operation processor ────────────────────────────────────────────────────

type SkipReason = "deprecated" | "binary" | "noOperationId";

function processOperation(
  urlPath: string,
  method: HttpMethod,
  op: OpenApiOperation,
  spec: OpenApiSpec,
  tools: ToolDefinition[],
): SkipReason | null {
  if (op.deprecated) return "deprecated";
  if (hasBinaryResponse(op)) return "binary";
  if (!op.operationId) {
    console.warn(`Warning: operation ${method.toUpperCase()} ${urlPath} has no operationId — skipping`);
    return "noOperationId";
  }

  const rawParams = op.parameters ?? [];
  const resolvedParams: ToolParameter[] = rawParams.map((p) => {
    const resolved = p["$ref"] ? (resolveRef(p["$ref"], spec) as OpenApiParameter) : p;
    return {
      name: resolved.name,
      in: resolved.in,
      required: resolved.required ?? false,
      description: resolved.description,
      schema: resolveSchema(resolved.schema, spec) as Record<string, unknown> | undefined,
    };
  });

  const hasBody = Boolean(op.requestBody?.content?.["application/json"]);
  const toolPath = urlPath.replace(/^\/api\/v1/, "") || "/";

  tools.push({
    name: toSnakeCase(op.operationId),
    description: op.summary ?? op.description ?? op.operationId,
    method: method.toUpperCase(),
    path: toolPath,
    parameters: resolvedParams,
    hasBody,
    inputSchema: buildInputSchema(resolvedParams, op.requestBody, spec),
  });

  return null;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const specUrl = process.env.VULCAN_OPENAPI_URL;
  if (!specUrl) {
    console.error("Error: VULCAN_OPENAPI_URL environment variable is required");
    console.error("Example: VULCAN_OPENAPI_URL=https://api.itmc.i.moneyforward.com/api/v1/openapi.json yarn generate:tools");
    process.exit(1);
  }

  console.log(`Fetching OpenAPI spec from ${specUrl}...`);
  const { data: spec } = await axios.get<OpenApiSpec>(specUrl);

  const tools: ToolDefinition[] = [];
  let skippedDeprecated = 0;
  let skippedBinary = 0;
  let skippedAuth = 0;
  let skippedNoOperationId = 0;

  for (const [urlPath, pathItem] of Object.entries(spec.paths ?? {})) {
    if (isAuthPath(urlPath)) {
      skippedAuth++;
      continue;
    }
    for (const method of HTTP_METHODS) {
      const op = pathItem[method] as OpenApiOperation | undefined;
      if (!op) continue;
      const skipReason = processOperation(urlPath, method, op, spec, tools);
      if (skipReason === "deprecated") skippedDeprecated++;
      else if (skipReason === "binary") skippedBinary++;
      else if (skipReason === "noOperationId") skippedNoOperationId++;
    }
  }

  const registry: ToolRegistry = {
    generatedAt: new Date().toISOString(),
    tools,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(registry, null, 2));

  console.log(`\nGenerated ${tools.length} tools → ${OUTPUT_PATH}`);
  console.log(`Skipped: ${skippedDeprecated} deprecated, ${skippedBinary} binary/CSV, ${skippedAuth} auth, ${skippedNoOperationId} no-operationId`);
}

try {
  await main();
} catch (err) {
  console.error("Fatal:", err);
  process.exit(1);
}
