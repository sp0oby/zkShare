#!/usr/bin/env node
/**
 * ZKshare MCP server (stdio): tools call POST /api/v1/context on zkshare.io.
 *
 * Published as npm package `zkshare-mcp`; run via `npx -y zkshare-mcp`.
 *
 * Env: ZKSHARE_API_KEY (required), ZKSHARE_API_URL (optional, default https://zkshare.io)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { VERSION } from "./version.js";

function apiBase(): string {
  const raw = process.env.ZKSHARE_API_URL?.trim() ?? "https://zkshare.io";
  return raw.replace(/\/$/, "");
}

function requireKey(): string {
  const k = process.env.ZKSHARE_API_KEY?.trim();
  if (!k) {
    console.error(
      "ZKshare MCP: set ZKSHARE_API_KEY (Cursor MCP env, or shell). Dashboard: https://zkshare.io/api-key",
    );
    process.exit(1);
  }
  return k;
}

async function postContext(body: Record<string, unknown>): Promise<{
  status: number;
  json?: unknown;
  text: string;
}> {
  const key = requireKey();
  const url = `${apiBase()}/api/v1/context`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { status: 0, text: `Network error calling ${url}: ${msg}` };
  }

  const text = await res.text();
  try {
    return { status: res.status, json: JSON.parse(text) as unknown, text };
  } catch {
    return { status: res.status, text };
  }
}

function toolJsonResult(status: number, payload: unknown) {
  const pretty =
    typeof payload === "object" && payload !== null
      ? JSON.stringify(payload, null, 2)
      : String(payload);

  const ok = status >= 200 && status < 400;
  const text = ok ? pretty : `HTTP ${status}\n${pretty}`;

  return {
    content: [{ type: "text" as const, text }],
    ...(ok ? {} : { isError: true as const }),
  };
}

const optionalUserId = z
  .string()
  .min(1)
  .max(256)
  .optional()
  .describe(
    'Logical scope (same string you use when calling HTTPS). Omit for "".',
  );

const server = new McpServer(
  {
    name: "zkshare",
    version: VERSION,
  },
  {
    instructions: [
      "ZKshare privacy context API.",
      `Calls ${apiBase()}/api/v1/context with your ZKSHARE_API_KEY.`,
      "Tools map 1:1 to API operations store, prove, share, search, sandbox, verify_proof.",
      "Client-sealed ciphertext store is supported only via the REST/OpenAPI endpoint (embedding + ciphertext bundle required).",
    ].join("\n"),
  },
);

server.registerTool(
  "zkshare_store",
  {
    description:
      "Encrypt and store a fact (server-sealed). Same as REST operation store with value.",
    inputSchema: {
      user_id: optionalUserId,
      fact_key: z.string().min(1).max(512),
      value: z.string().min(1).max(100_000),
    },
  },
  async (args) => {
    const body: Record<string, unknown> = {
      operation: "store",
      fact_key: args.fact_key,
      value: args.value,
    };
    if (args.user_id) body.user_id = args.user_id;
    const { status, json, text } = await postContext(body);
    return toolJsonResult(status, json ?? text);
  },
);

server.registerTool(
  "zkshare_prove",
  {
    description:
      "Produce a yes/no answer and signed proof envelope for a stored server-sealed fact.",
    inputSchema: {
      user_id: optionalUserId,
      fact_key: z.string().min(1),
      query: z.string().min(1).max(8_000),
    },
  },
  async (args) => {
    const body: Record<string, unknown> = {
      operation: "prove",
      fact_key: args.fact_key,
      query: args.query,
    };
    if (args.user_id) body.user_id = args.user_id;
    const { status, json, text } = await postContext(body);
    return toolJsonResult(status, json ?? text);
  },
);

server.registerTool(
  "zkshare_share",
  {
    description:
      "Like prove, plus issue a time-bound share token for a recipient agent id.",
    inputSchema: {
      user_id: optionalUserId,
      fact_key: z.string().min(1),
      query: z.string().min(1).max(8_000),
      recipient_agent_id: z.string().min(1).max(512),
    },
  },
  async (args) => {
    const body: Record<string, unknown> = {
      operation: "share",
      fact_key: args.fact_key,
      query: args.query,
      recipient_agent_id: args.recipient_agent_id,
    };
    if (args.user_id) body.user_id = args.user_id;
    const { status, json, text } = await postContext(body);
    return toolJsonResult(status, json ?? text);
  },
);

server.registerTool(
  "zkshare_search",
  {
    description: "Semantic search over stored server-sealed facts for this API key.",
    inputSchema: {
      user_id: optionalUserId,
      query: z.string().min(1).max(8_000),
    },
  },
  async (args) => {
    const body: Record<string, unknown> = {
      operation: "search",
      query: args.query,
    };
    if (args.user_id) body.user_id = args.user_id;
    const { status, json, text } = await postContext(body);
    return toolJsonResult(status, json ?? text);
  },
);

server.registerTool(
  "zkshare_sandbox",
  {
    description:
      "Run an allow-listed sandbox action (e.g. calculate_travel_budget, calculate_budget, analyze_spending).",
    inputSchema: {
      user_id: optionalUserId,
      action: z.string().min(1).max(256),
      parameters: z.record(z.string(), z.unknown()).optional(),
    },
  },
  async (args) => {
    const body: Record<string, unknown> = {
      operation: "sandbox",
      action: args.action,
      parameters: args.parameters ?? {},
    };
    if (args.user_id) body.user_id = args.user_id;
    const { status, json, text } = await postContext(body);
    return toolJsonResult(status, json ?? text);
  },
);

server.registerTool(
  "zkshare_verify_proof",
  {
    description:
      "Verify a zkshare proof envelope (from prove/share) without reading fact plaintext.",
    inputSchema: {
      proof: z.string().min(24),
    },
  },
  async (args) => {
    const body: Record<string, unknown> = {
      operation: "verify_proof",
      proof: args.proof.trim(),
    };
    const { status, json, text } = await postContext(body);
    return toolJsonResult(status, json ?? text);
  },
);

async function main() {
  requireKey();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`ZKshare MCP listening on stdio → ${apiBase()}/api/v1/context`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
