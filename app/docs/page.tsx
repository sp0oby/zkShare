"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { Navbar } from "@/components/navbar";
import { GridBackground } from "@/components/grid-background";
import { PRICING, OVERAGE_USD_PER_OP_MIN, OVERAGE_USD_PER_OP_MAX } from "@/lib/pricing";

const sections = [
  {
    id: "overview",
    title: "Overview",
    content: `ZKshare is a production-grade, privacy-first API that enables AI agents and human users to:

- Store facts encrypted + embedded for semantic search
- Generate real zero-knowledge proofs (snarkjs + circom)
- Share verifiable yes/no insights without revealing source data
- Run sensitive operations inside confidential compute enclaves
- Perform advanced semantic search over private context

Even a fully compromised agent can only request proofs it has permission for — raw data stays encrypted and inaccessible.`,
  },
  {
    id: "authentication",
    title: "Authentication",
    content: `All API requests require an API key passed in the \`x-api-key\` header.`,
    code: `curl -X POST https://api.zkshare.dev/v1/context \\
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
];

const operations = [
  {
    name: "store",
    description: "Store an encrypted fact with semantic embedding",
    request: `{
  "operation": "store",
  "user_id": "user_123",
  "fact_key": "vacation_preference",
  "value": "strongly prefers beach vacations over mountains"
}`,
    response: `{
  "success": true,
  "operation": "store",
  "data": { "fact_id": "uuid", "commitment": "0x…" },
  "proof": "snarkjs:pending:0x…",
  "verified": true,
  "timestamp": "2026-04-28T12:00:00Z",
  "usage": { "calls": 42, "limit": 1000 }
}`,
  },
  {
    name: "prove",
    description: "Generate a zero-knowledge proof answering a natural-language query",
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
    description: "Share a verifiable proof with another agent",
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
    name: "search",
    description: "Semantic search over private facts (embeddings)",
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
    name: "enclave",
    description: "Run a simulated WASM-isolated action with attestation metadata",
    request: `{
  "operation": "enclave",
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
  "operation": "enclave",
  "data": {
    "result": { "recommended_budget": 4500, "affordable": true },
    "attestation": {
      "enclave_id": "zkshare-enclave-v1-…",
      "measurement": "sha256:…",
      "provider": "wasm-simulation",
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

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <GridBackground />
      <Navbar />

      <main className="pt-24 pb-32 px-6">
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

            <h1 className="text-4xl font-semibold tracking-tight mb-4">
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
            className="border border-foreground/10 p-6 mb-16 bg-background"
          >
            <h2 className="font-mono font-semibold mb-4">Contents</h2>
            <nav className="space-y-2">
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
            <div className="border border-foreground/10 overflow-hidden">
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
            <div className="mt-8 border border-foreground/10 overflow-hidden">
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
                  <tr>
                    <td className="p-4 font-mono text-xs">PROOF_FAILED</td>
                    <td className="p-4 text-muted-foreground">400</td>
                    <td className="p-4 text-muted-foreground">Unable to generate proof for claim</td>
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
