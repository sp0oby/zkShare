"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { Navbar } from "@/components/navbar";
import { GridBackground } from "@/components/grid-background";
import { PRICING, OVERAGE_USD_PER_OP_MIN, OVERAGE_USD_PER_OP_MAX } from "@/lib/pricing";

/* ─── Quick-start snippets ─── */

const QUICK_START_CURL = `# 1. Store a fact
curl -X POST https://zkshare.io/api/v1/context \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "operation": "store",
    "user_id": "user_123",
    "fact_key": "vacation_preference",
    "value": "strongly prefers beach vacations"
  }'

# 2. Prove a property without revealing the fact
curl -X POST https://zkshare.io/api/v1/context \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "operation": "prove",
    "user_id": "user_123",
    "fact_key": "vacation_preference",
    "query": "does the user prefer beach vacations?"
  }'

# 3. Verify the proof (anyone can do this — no plaintext needed)
curl -X POST https://zkshare.io/api/v1/context \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "operation": "verify_proof",
    "proof": "PROOF_STRING_FROM_STEP_2"
  }'`;

const QUICK_START_JS = `const API = "https://zkshare.io/api/v1/context";
const KEY = "YOUR_API_KEY";

async function zkshare(body) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "x-api-key": KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

// 1. Store a fact
const stored = await zkshare({
  operation: "store",
  user_id: "user_123",
  fact_key: "vacation_preference",
  value: "strongly prefers beach vacations",
});
console.log("Commitment:", stored.data.commitment);

// 2. Prove a property (server answers yes/no, signs it)
const proved = await zkshare({
  operation: "prove",
  user_id: "user_123",
  fact_key: "vacation_preference",
  query: "does the user prefer beach vacations?",
});
console.log("Answer:", proved.data.answer); // "yes"
console.log("Proof:", proved.proof);

// 3. Verify the proof (no plaintext involved)
const verified = await zkshare({
  operation: "verify_proof",
  proof: proved.proof,
});
console.log("Valid:", verified.data.valid); // true`;

const QUICK_START_PYTHON = `import requests

API = "https://zkshare.io/api/v1/context"
HEADERS = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json",
}

def zkshare(body):
    return requests.post(API, json=body, headers=HEADERS).json()

# 1. Store a fact
stored = zkshare({
    "operation": "store",
    "user_id": "user_123",
    "fact_key": "vacation_preference",
    "value": "strongly prefers beach vacations",
})
print("Commitment:", stored["data"]["commitment"])

# 2. Prove a property (server answers yes/no, signs it)
proved = zkshare({
    "operation": "prove",
    "user_id": "user_123",
    "fact_key": "vacation_preference",
    "query": "does the user prefer beach vacations?",
})
print("Answer:", proved["data"]["answer"])  # "yes"

# 3. Verify the proof (no plaintext involved)
verified = zkshare({
    "operation": "verify_proof",
    "proof": proved["proof"],
})
print("Valid:", verified["data"]["valid"])  # True`;

const QUICK_START_AGENT = `// OpenAI function-calling — give your agent a "zkshare" tool
import OpenAI from "openai";

const openai = new OpenAI();
const ZK_API = "https://zkshare.io/api/v1/context";
const ZK_KEY = "YOUR_API_KEY";

// Define ZKshare as a tool the agent can call
const tools = [
  {
    type: "function",
    function: {
      name: "zkshare",
      description:
        "Privacy API. Store encrypted facts, prove properties " +
        "without revealing data, share answers, or search.",
      parameters: {
        type: "object",
        properties: {
          operation: {
            type: "string",
            enum: ["store", "prove", "share", "search", "verify_proof", "sandbox"],
          },
          user_id:  { type: "string" },
          fact_key: { type: "string" },
          value:    { type: "string" },
          query:    { type: "string" },
        },
        required: ["operation"],
      },
    },
  },
];

// When the model calls the tool, forward to ZKshare
async function handleToolCall(call) {
  const args = JSON.parse(call.function.arguments);
  const res = await fetch(ZK_API, {
    method: "POST",
    headers: { "x-api-key": ZK_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  return res.json();
}

// Run the agent
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  tools,
  messages: [
    { role: "system", content: "You have access to a privacy API via zkshare." },
    { role: "user", content: "Store that I prefer beach vacations, then prove it." },
  ],
});

// The agent will call zkshare("store") then zkshare("prove") automatically`;

type QuickStartLang = "curl" | "javascript" | "python";

const quickStartSnippets: Record<QuickStartLang, string> = {
  curl: QUICK_START_CURL,
  javascript: QUICK_START_JS,
  python: QUICK_START_PYTHON,
};

const sections = [
  {
    id: "overview",
    title: "Overview",
    content: `ZKshare is a privacy-oriented context API for users, agents, and back-office systems.
A single HTTP entrypoint exposes six operations:

- store      — server-sealed (AES-GCM) or client-sealed (E2EE) facts
- prove      — return a signed yes/no envelope bound to a commitment
- share      — same as prove, plus a single-use, time-bound share token
- search     — semantic search over server-sealed facts (pgvector)
- verify_proof — validate a previously issued envelope without loading plaintext
- sandbox    — execute a small allow-listed action inside an isolated VM

Server-sealed facts: the server holds the AES-256-GCM key (\`ZKSHARE_ENCRYPTION_SECRET\`) and decrypts in memory only when you call prove, share, or generate a search summary. Client-sealed facts: the server only sees ciphertext, IV, auth tag, commitment, and your supplied 1536-dim embedding. Client-sealed rows are excluded from server-side search, prove, and share — use local crypto plus verify_proof.

Today\u2019s proof field is a versioned JSON envelope signed with HMAC-SHA256 (commitment, query, answer, nonce). \`snarkjs\` is included for future Groth16 wiring; that path is not on the default response trust model yet.`,
  },
  {
    id: "authentication",
    title: "Authentication",
    content: `All API requests require an API key passed in the \`x-api-key\` header. End users and agents only need this key — no LLM provider account, no Supabase login, no sandbox keys. Those are operator-side concerns (see "What you bring vs. what we run" below).`,
    code: `curl -X POST https://zkshare.io/api/v1/context \\
  -H "x-api-key: zk_live_abc123" \\
  -H "Content-Type: application/json"`,
  },
  {
    id: "endpoint",
    title: "Main Endpoint",
    content: `All operations go through a single endpoint:

\`POST /api/v1/context\`

The \`operation\` field in the request body determines the action.`,
  },
  {
    id: "mcp",
    title: "Model Context Protocol (MCP)",
    content: `**Install from npm — no zkShare repo required** once [\`zkshare-mcp\`](https://www.npmjs.com/package/zkshare-mcp) is published. The package speaks **stdio MCP** and proxies to **\`POST /api/v1/context\`** with **\`ZKSHARE_API_KEY\`**.

Requirements: Node.js 18+. Get a key from [/api-key](/api-key).

Optional **\`ZKSHARE_API_URL\`** defaults to \`https://zkshare.io\`; set \`http://localhost:3000\` only when your Next app runs locally.

**Until npm publish:** clone this repo, \`pnpm install\`, **\`pnpm mcp\`**, source \`packages/zkshare-mcp/\`.

Advanced **client-sealed** ciphertext \`store\` (embedding bundle) stays on HTTPS/OpenAPI.`,
    code: `# End users — run via npx (IDE starts this process; omit cwd)
npx -y zkshare-mcp

# Cursor ~/.cursor/mcp.json
{
  "mcpServers": {
    "zkshare": {
      "command": "npx",
      "args": ["-y", "zkshare-mcp"],
      "env": {
        "ZKSHARE_API_KEY": "zk_live_REPLACE_ME",
        "ZKSHARE_API_URL": "https://zkshare.io"
      }
    }
  }
}`,
  },
  {
    id: "responsibilities",
    title: "What you bring vs. what we run",
    content: `End user / agent — only needs the ZKshare API key (\`x-api-key: zk_live_…\`). No other credentials, no LLM account, no extra SDK.

Operator (the team running this API) — configures cryptographic secrets, the database, and optionally an LLM provider used internally for two things:
- generating 1536-dim embeddings for semantic search
- deciding yes/no answers to natural-language predicates inside prove and share

The end user never sees an LLM key, never sends one, and never needs one. If the operator sets \`ZKSHARE_DISABLE_EXTERNAL_LLM=true\`, no third-party LLM is contacted at all; prove/share answers fall back to a deterministic heuristic and search summaries are static. This is the most private mode but also the least intelligent.

For client-sealed (E2EE) stores, no LLM ever touches your data: the server only stores the ciphertext, IV, auth tag, commitment, and the embedding you supply. Use this mode when you do not want any third party to see plaintext.`,
  },
  {
    id: "trust-model",
    title: "Trust model and the ZK claim",
    content: `Be exact about what is verifiable today vs. what is on the roadmap.

Today (v1.0):
- AES-256-GCM encryption at rest. The operator holds the key for server-sealed rows; the client holds the key for client-sealed rows.
- HMAC-SHA256 proof envelopes binding (commitment, query, answer, nonce, expires_at). \`verify_proof\` checks the signature without loading plaintext.
- Deterministic salted SHA-256 commitments per (user_id, fact_key, value).
- Sandboxed action execution via \`node:vm\` with a signed HS256 JWT attestation. Every response advertises \`provider: "vm-sandbox"\` so callers know this is software isolation, not hardware.

Roadmap:
- Groth16 SNARKs for structured predicates (equality, range, set membership, commitment-knowledge). Natural-language predicates cannot be SNARK-proven and will continue to use HMAC envelopes — the response will gain a \`proof_type\` field so callers can require \`groth16\` when they need it.
- Real TEE provider (AWS Nitro Enclaves or equivalent) replacing the vm-sandbox. The response shape (\`attestation.provider\`, \`proof_of_execution\`) is stable across that swap.

Treat any external claim of "full SNARK-on-every-call" or "hardware-attested enclave" as aspirational unless the verifier and circuit artifacts have been published and audited. The current implementation is honestly described in every response.`,
  },
];

const operations = [
  {
    name: "store",
    description:
      "Store an encrypted fact. Server-sealed: send value. Client-sealed: send ciphertext + iv + auth_tag + commitment + required 1536-dim embedding (no plaintext on the wire).",
    request: `{
  "operation": "store",
  "user_id": "user_123",
  "fact_key": "vacation_preference",
  "value": "strongly prefers beach vacations over mountains"
}`,
    response: `{
  "success": true,
  "operation": "store",
  "data": { "fact_id": "uuid", "commitment": "0x…", "client_encrypted": false },
  "proof": "zkshare:v1+hmac;…",
  "verified": true,
  "timestamp": "2026-04-28T12:00:00Z",
  "usage": { "calls": 42, "limit": 1000 }
}`,
  },
  {
    name: "prove",
    description:
      "Return a signed yes/no envelope bound to the fact commitment and the query. Today the envelope is HMAC-SHA256; SNARK verification is on the roadmap.",
    request: `{
  "operation": "prove",
  "user_id": "user_123",
  "fact_key": "vacation_preference",
  "query": "does the user prefer beach vacations?"
}`,
    response: `{
  "success": true,
  "operation": "prove",
  "data": { "answer": "yes", "commitment": "0x…" },
  "proof": "base64url-proof-payload…",
  "verified": true,
  "timestamp": "2026-04-28T12:00:00Z",
  "usage": { "calls": 43, "limit": 1000 }
}`,
  },
  {
    name: "share",
    description:
      "Issue a time-bound, single-use share token bound to a recipient agent id and a signed proof envelope.",
    request: `{
  "operation": "share",
  "user_id": "user_123",
  "fact_key": "vacation_preference",
  "query": "does the user prefer beach vacations?",
  "recipient_agent_id": "agent_booking_456"
}`,
    response: `{
  "success": true,
  "operation": "share",
  "data": {
    "share_token": "…",
    "expires_at": "2026-05-05T12:00:00Z",
    "recipient_agent_id": "agent_booking_456"
  },
  "proof": "base64url-proof-payload…",
  "verified": true,
  "timestamp": "2026-04-28T12:00:00Z",
  "usage": { "calls": 44, "limit": 1000 }
}`,
  },
  {
    name: "verify_proof",
    description:
      "Verify an HMAC-sealed proof from prove/share without loading fact plaintext. Malformed proof strings return 400; valid envelope with bad signature returns 200 with data.valid false.",
    request: `{
  "operation": "verify_proof",
  "proof": "base64url-envelope-from-prove-or-share…"
}`,
    response: `{
  "success": true,
  "operation": "verify_proof",
  "data": { "valid": true },
  "proof": "…same proof echoed…",
  "verified": true,
  "timestamp": "2026-04-28T12:00:00Z",
  "usage": { "calls": 47, "limit": 1000 }
}`,
  },
  {
    name: "search",
    description:
      "Semantic search over server-sealed facts only. Client-sealed rows are not ranked or summarized on the server.",
    request: `{
  "operation": "search",
  "user_id": "user_123",
  "query": "what does the user like for holidays?"
}`,
    response: `{
  "success": true,
  "operation": "search",
  "data": {
    "results": [
      { "fact_key": "vacation_preference", "relevance": 0.92, "answer": "…" }
    ]
  },
  "proof": null,
  "verified": true,
  "timestamp": "2026-04-28T12:00:00Z",
  "usage": { "calls": 45, "limit": 1000 }
}`,
  },
  {
    name: "sandbox",
    description:
      "Run a small allow-listed action inside an isolated node:vm sandbox (no host I/O, 50 ms timeout). Returns the result with attestation metadata and a short-lived HS256 JWT. Every response advertises provider: vm-sandbox — this is software isolation, not hardware attestation.",
    request: `{
  "operation": "sandbox",
  "user_id": "user_123",
  "action": "calculate_travel_budget",
  "parameters": {
    "monthly_income": 6500,
    "current_savings": 12000,
    "preferred_destination": "beach"
  }
}`,
    response: `{
  "success": true,
  "operation": "sandbox",
  "data": {
    "result": { "recommended_budget": 4500, "affordable": true },
    "attestation": {
      "sandbox_id": "zkshare-sandbox-v1-…",
      "measurement": "sha256:…",
      "provider": "vm-sandbox",
      "verified": true
    }
  },
  "proof": "jwt-proof-of-execution…",
  "verified": true,
  "timestamp": "2026-04-28T12:00:00Z",
  "usage": { "calls": 46, "limit": 1000 }
}`,
  },
];

function QuickStartSection() {
  const [lang, setLang] = useState<QuickStartLang>("javascript");
  const langs: { key: QuickStartLang; label: string }[] = [
    { key: "javascript", label: "JavaScript" },
    { key: "python", label: "Python" },
    { key: "curl", label: "curl" },
  ];

  return (
    <motion.section
      id="quick-start"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
      className="mb-16"
    >
      <h2 className="text-2xl font-semibold tracking-tight mb-2 border-b border-foreground/10 pb-4">
        Quick Start — working in 30 seconds
      </h2>
      <p className="text-muted-foreground text-sm mb-6">
        Three calls: <strong className="text-foreground">store</strong> a fact,{" "}
        <strong className="text-foreground">prove</strong> a property about it
        without revealing the fact, and{" "}
        <strong className="text-foreground">verify</strong> the proof. Replace{" "}
        <code className="text-foreground">YOUR_API_KEY</code> with your key from
        the{" "}
        <Link
          href="/api-key"
          className="text-foreground underline underline-offset-2"
        >
          dashboard
        </Link>
        .
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        {langs.map((l) => (
          <button
            key={l.key}
            type="button"
            onClick={() => setLang(l.key)}
            className={`flex-1 min-[400px]:flex-none px-3 sm:px-4 py-2 text-xs font-mono text-center transition-colors border ${
              lang === l.key
                ? "bg-foreground text-background border-foreground"
                : "bg-transparent text-muted-foreground border-foreground/10 hover:border-foreground/30"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
      <CodeBlock
        code={quickStartSnippets[lang]}
        language={lang}
        title={`${langs.find((l) => l.key === lang)!.label} — store → prove → verify`}
      />
    </motion.section>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <GridBackground />
      <Navbar />

      <main className="pt-24 pb-24 sm:pb-32 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>

            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4 text-balance">
              Documentation
            </h1>
            <p className="text-lg text-muted-foreground mb-12">
              Everything you need to integrate ZKshare into your application.
            </p>
          </motion.div>

          {/* Table of Contents */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="border border-foreground/10 p-4 sm:p-6 mb-16 bg-background"
          >
            <h2 className="font-mono font-semibold mb-4">Contents</h2>
            <nav className="space-y-2">
              <a
                href="#quick-start"
                className="block text-sm text-foreground font-semibold hover:text-foreground transition-colors font-mono"
              >
                Quick Start — working in 30 seconds
              </a>
              <a
                href="#agent-integration"
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors font-mono"
              >
                Agent Integration
              </a>
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="block text-sm text-muted-foreground hover:text-foreground transition-colors font-mono"
                >
                  {section.title}
                </a>
              ))}
              <a
                href="#operations"
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors font-mono"
              >
                Operations
              </a>
              {operations.map((op) => (
                <a
                  key={op.name}
                  href={`#op-${op.name}`}
                  className="block text-sm text-muted-foreground hover:text-foreground transition-colors font-mono pl-4"
                >
                  {op.name}
                </a>
              ))}
              <a
                href="#rate-limits"
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors font-mono"
              >
                Rate Limits
              </a>
              <a
                href="#errors"
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors font-mono"
              >
                Error Handling
              </a>
            </nav>
          </motion.div>

          {/* Quick Start */}
          <QuickStartSection />

          {/* Agent Integration */}
          <motion.section
            id="agent-integration"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 className="text-2xl font-semibold tracking-tight mb-4 border-b border-foreground/10 pb-4">
              Agent Integration
            </h2>
            <div className="prose prose-neutral max-w-none mb-6">
              <pre className="whitespace-pre-wrap text-muted-foreground leading-relaxed font-sans text-base">
{`ZKshare works as a tool for any AI agent framework. Register it as a function the agent can call — the agent decides when to store, prove, or search based on user intent.

The example below uses OpenAI function-calling, but the pattern is the same for LangChain, CrewAI, Vercel AI SDK, or any framework that supports tool/function definitions: describe the operations as a JSON schema, and forward calls to the single POST endpoint.

Your agent only needs the API key. No SDKs, no extra dependencies.`}
              </pre>
            </div>
            <CodeBlock code={QUICK_START_AGENT} language="javascript" title="OpenAI Function-Calling Example" />
          </motion.section>

          {/* Sections */}
          {sections.map((section, index) => (
            <motion.section
              key={section.id}
              id={section.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="mb-16"
            >
              <h2 className="text-2xl font-semibold tracking-tight mb-4 border-b border-foreground/10 pb-4">
                {section.title}
              </h2>
              <div className="prose prose-neutral max-w-none">
                <pre className="whitespace-pre-wrap text-muted-foreground leading-relaxed font-sans text-base">
                  {section.content}
                </pre>
              </div>
              {section.code && (
                <div className="mt-6">
                  <CodeBlock code={section.code} language="bash" />
                </div>
              )}
            </motion.section>
          ))}

          {/* Operations */}
          <motion.section
            id="operations"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 className="text-2xl font-semibold tracking-tight mb-8 border-b border-foreground/10 pb-4">
              Operations
            </h2>

            {operations.map((op, index) => (
              <div
                key={op.name}
                id={`op-${op.name}`}
                className="mb-12 last:mb-0"
              >
                <div className="flex items-center gap-4 mb-4">
                  <code className="px-3 py-1 bg-foreground text-background text-sm font-mono">
                    {op.name}
                  </code>
                  <span className="text-muted-foreground text-sm">
                    {op.description}
                  </span>
                </div>
                <div className="grid lg:grid-cols-2 gap-4">
                  <CodeBlock code={op.request} language="json" title="Request" />
                  <CodeBlock code={op.response} language="json" title="Response" />
                </div>
              </div>
            ))}
          </motion.section>

          {/* Rate Limits */}
          <motion.section
            id="rate-limits"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 className="text-2xl font-semibold tracking-tight mb-4 border-b border-foreground/10 pb-4">
              Rate Limits
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Beyond included monthly operations, bill overages via Stripe metered usage (typically $
              {OVERAGE_USD_PER_OP_MIN}–${OVERAGE_USD_PER_OP_MAX} per call with volume discounts).
            </p>
            <div className="border border-foreground/10 overflow-x-auto -mx-px">
              <table className="w-full text-sm">
                <thead className="bg-foreground/[0.02] border-b border-foreground/10">
                  <tr>
                    <th className="text-left p-4 font-mono font-semibold">Tier</th>
                    <th className="text-left p-4 font-mono font-semibold">Operations/mo</th>
                    <th className="text-left p-4 font-mono font-semibold">Burst (req/s)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-foreground/10">
                    <td className="p-4 font-mono">Free</td>
                    <td className="p-4 text-muted-foreground">{PRICING.free.operationsPerMonth.toLocaleString()}</td>
                    <td className="p-4 text-muted-foreground">{PRICING.free.requestsPerSecond}</td>
                  </tr>
                  <tr className="border-b border-foreground/10">
                    <td className="p-4 font-mono">Starter ($19)</td>
                    <td className="p-4 text-muted-foreground">{PRICING.starter.operationsPerMonth.toLocaleString()}</td>
                    <td className="p-4 text-muted-foreground">{PRICING.starter.requestsPerSecond}</td>
                  </tr>
                  <tr className="border-b border-foreground/10">
                    <td className="p-4 font-mono">Pro ($49)</td>
                    <td className="p-4 text-muted-foreground">{PRICING.pro.operationsPerMonth.toLocaleString()}</td>
                    <td className="p-4 text-muted-foreground">{PRICING.pro.requestsPerSecond}</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-mono">Enterprise</td>
                    <td className="p-4 text-muted-foreground">Custom / unlimited</td>
                    <td className="p-4 text-muted-foreground">SLA</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </motion.section>

          {/* Errors */}
          <motion.section
            id="errors"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 className="text-2xl font-semibold tracking-tight mb-4 border-b border-foreground/10 pb-4">
              Error Handling
            </h2>
            <p className="text-muted-foreground mb-6">
              All errors follow a consistent format:
            </p>
            <CodeBlock
              code={`{
  "success": false,
  "error": "INVALID_API_KEY",
  "message": "API key is revoked or invalid"
}`}
              language="json"
            />
            <div className="mt-8 border border-foreground/10 overflow-x-auto -mx-px">
              <table className="w-full text-sm">
                <thead className="bg-foreground/[0.02] border-b border-foreground/10">
                  <tr>
                    <th className="text-left p-4 font-mono font-semibold">Code</th>
                    <th className="text-left p-4 font-mono font-semibold">Status</th>
                    <th className="text-left p-4 font-mono font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-foreground/10">
                    <td className="p-4 font-mono text-xs">INVALID_API_KEY</td>
                    <td className="p-4 text-muted-foreground">401</td>
                    <td className="p-4 text-muted-foreground">API key missing or invalid</td>
                  </tr>
                  <tr className="border-b border-foreground/10">
                    <td className="p-4 font-mono text-xs">RATE_LIMITED</td>
                    <td className="p-4 text-muted-foreground">429</td>
                    <td className="p-4 text-muted-foreground">Too many requests</td>
                  </tr>
                  <tr className="border-b border-foreground/10">
                    <td className="p-4 font-mono text-xs">FACT_NOT_FOUND</td>
                    <td className="p-4 text-muted-foreground">404</td>
                    <td className="p-4 text-muted-foreground">Referenced fact does not exist</td>
                  </tr>
                  <tr className="border-b border-foreground/10">
                    <td className="p-4 font-mono text-xs">PROOF_FAILED</td>
                    <td className="p-4 text-muted-foreground">400</td>
                    <td className="p-4 text-muted-foreground">Unable to generate proof for claim</td>
                  </tr>
                  <tr className="border-b border-foreground/10">
                    <td className="p-4 font-mono text-xs">CLIENT_ENCRYPTED</td>
                    <td className="p-4 text-muted-foreground">422</td>
                    <td className="p-4 text-muted-foreground">Fact is client-sealed; prove/share need local decryption</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-mono text-xs">VALIDATION_ERROR</td>
                    <td className="p-4 text-muted-foreground">400</td>
                    <td className="p-4 text-muted-foreground">Invalid request (schema, missing fields, malformed proof string, …)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </motion.section>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="border border-foreground/10 p-8 text-center bg-background"
          >
            <h3 className="text-xl font-semibold mb-4">Ready to get started?</h3>
            <p className="text-muted-foreground mb-6">
              Generate your API key and start building privacy-preserving applications.
            </p>
            <Link
              href="/api-key"
              className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-mono text-sm hover:bg-foreground/90 transition-colors"
            >
              Get API Key
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
