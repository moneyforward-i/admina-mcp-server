// src/remote/proxy.ts

import axios, { AxiosError } from "axios";
import type { ToolDefinition } from "./types.js";

const ADMINA_API_BASE = "https://api.itmc.i.moneyforward.com/api/v1";

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
  // 1. Substitute path parameters
  let resolvedPath = tool.path;
  const pathParamNames = new Set<string>();
  for (const param of tool.parameters.filter((p) => p.in === "path")) {
    pathParamNames.add(param.name);
    if (param.name === "organizationId") {
      resolvedPath = resolvedPath.replace(`{${param.name}}`, encodeURIComponent(orgId));
    } else if (args[param.name] !== undefined) {
      resolvedPath = resolvedPath.replace(`{${param.name}}`, encodeURIComponent(String(args[param.name])));
    }
  }

  // 2. Build query params from "query" parameters
  const queryParamNames = new Set<string>();
  const queryString = new URLSearchParams();
  for (const param of tool.parameters.filter((p) => p.in === "query")) {
    queryParamNames.add(param.name);
    const value = args[param.name];
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) queryString.append(param.name, String(item));
    } else {
      queryString.set(param.name, String(value));
    }
  }

  // 3. Build request body from remaining args (those not consumed as path/query params)
  const usedAsParam = new Set([...pathParamNames, ...queryParamNames]);
  const body: Record<string, unknown> = {};
  if (tool.hasBody) {
    for (const [key, value] of Object.entries(args)) {
      if (!usedAsParam.has(key)) {
        body[key] = value;
      }
    }
  }

  // 4. Build full URL
  const qs = queryString.toString();
  const url = `${ADMINA_API_BASE}${resolvedPath}${qs ? `?${qs}` : ""}`;

  // 5. Execute request
  try {
    const response = await axios({
      method: tool.method,
      url,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Request-Source": "mcp",
      },
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
