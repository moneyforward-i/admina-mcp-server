// src/remote/proxy.ts

import axios, { AxiosError } from "axios";
import type { ToolDefinition } from "./types.js";

// VULCAN_API_BASE_URL overrides the default public URL.
// Set to an internal Cloud Map DNS name (e.g. http://vulcan.internal/api/v1)
// when running in the same VPC as vulcan to avoid the public internet hop.
const DEFAULT_API_BASE = "https://api.itmc.i.moneyforward.com/api/v1";

function buildResolvedPath(
  tool: ToolDefinition,
  args: Record<string, unknown>,
  orgId: string,
): { resolvedPath: string; pathParamNames: Set<string> } {
  let resolvedPath = tool.path;
  const pathParamNames = new Set<string>();
  for (const param of tool.parameters.filter((p) => p.in === "path")) {
    pathParamNames.add(param.name);
    const raw = args[param.name] ?? "";
    const replacement =
      param.name === "organizationId" ? orgId : typeof raw === "object" ? JSON.stringify(raw) : String(raw);
    if (param.name === "organizationId" || args[param.name] !== undefined) {
      resolvedPath = resolvedPath.replace(`{${param.name}}`, encodeURIComponent(replacement));
    }
  }
  return { resolvedPath, pathParamNames };
}

function buildQueryString(
  tool: ToolDefinition,
  args: Record<string, unknown>,
): { queryString: URLSearchParams; queryParamNames: Set<string> } {
  const queryParamNames = new Set<string>();
  const queryString = new URLSearchParams();
  for (const param of tool.parameters.filter((p) => p.in === "query")) {
    queryParamNames.add(param.name);
    const value = args[param.name];
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value)
        queryString.append(param.name, typeof item === "object" && item !== null ? JSON.stringify(item) : String(item));
    } else {
      const strValue = typeof value === "object" ? JSON.stringify(value) : String(value);
      queryString.set(param.name, strValue);
    }
  }
  return { queryString, queryParamNames };
}

function buildRequestBody(
  tool: ToolDefinition,
  args: Record<string, unknown>,
  usedParams: Set<string>,
): Record<string, unknown> {
  if (!tool.hasBody) return {};
  const body: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (!usedParams.has(key)) body[key] = value;
  }
  return body;
}

/**
 * Proxy a single MCP tool call to the vulcan API.
 *
 * @param tool       Tool definition from tools.json
 * @param args       Raw arguments from the MCP tool call
 * @param apiKey     Caller's API key (from Authorization: Bearer header)
 * @param orgId      Caller's organization ID (from X-Organization-ID header)
 */
export async function proxyToolCall(
  tool: ToolDefinition,
  args: Record<string, unknown>,
  apiKey: string,
  orgId: string,
): Promise<unknown> {
  const { resolvedPath, pathParamNames } = buildResolvedPath(tool, args, orgId);

  const unresolvedPlaceholders = resolvedPath.match(/\{[^}]+\}/g);
  if (unresolvedPlaceholders) {
    throw new Error(`Missing required path parameters: ${unresolvedPlaceholders.join(", ")}`);
  }

  const { queryString, queryParamNames } = buildQueryString(tool, args);
  const usedParams = new Set([...pathParamNames, ...queryParamNames]);
  const body = buildRequestBody(tool, args, usedParams);

  const apiBase = process.env.VULCAN_API_BASE_URL ?? DEFAULT_API_BASE;
  const qs = queryString.toString();
  const querySuffix = qs ? `?${qs}` : "";
  const url = `${apiBase}${resolvedPath}${querySuffix}`;

  try {
    const response = await axios({
      method: tool.method,
      url,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Request-Source": "mcp",
      },
      timeout: 30000,
      ...(tool.hasBody ? { data: body } : {}),
    });
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      const status = error.response?.status ?? 500;
      const data = error.response?.data;
      throw new Error(`Upstream error ${status}: ${JSON.stringify(data)}`);
    }
    throw error;
  }
}
