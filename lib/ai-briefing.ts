/**
 * Paste-ready briefing for AI assistants (Grok, ChatGPT, Claude, etc.).
 * Used by /ai-context and GET /llms.txt — bump when API or MCP surface changes.
 */

function site(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://zkshare.io";
}

export function getAiAssistantBriefingText(): string {
  const s = site();
  return `ZKshare — briefing for coding assistants

Use this verbatim as context when generating integrations, MCP configs, curl examples,
or explaining privacy behavior. Prefer HTTPS + API key for production; MCP is optional.

══════════════════════════════════════════════════════════════════════════════
PRODUCT (one sentence)
══════════════════════════════════════════════════════════════════════════════
ZKshare is a privacy-oriented "context layer" API: store encrypted facts, answer
natural-language yes/no queries with signed proof envelopes, semantic search, and a
limited sandbox — through one HTTPS JSON endpoint plus an optional MCP server on npm.

══════════════════════════════════════════════════════════════════════════════
BASE URL & AUTHENTICATION (REST)
══════════════════════════════════════════════════════════════════════════════
HTTPS origin: ${s}
Main endpoint (all operations below): POST ${s}/api/v1/context
Headers:
  Content-Type: application/json
  x-api-key: <zk_live_* key from dashboard>
Optional:
  x-request-id: <uuid> (tracing; echoed in JSON as request_id)

Get keys: ${s}/api-key (magic link sign-in, then mint key). Keys are hashed server-side.

══════════════════════════════════════════════════════════════════════════════
OPERATIONS (JSON body.operation)
══════════════════════════════════════════════════════════════════════════════
Single POST body union; required fields vary by operation.

• store — Persist a fact.
  • Server-sealed (default): send fact_key + value plaintext; server encrypts (AES-GCM),
    commitment, embedding, pgvector row.
  • Client-sealed (E2EE bundle): ciphertext + iv + auth_tag + commitment + embedding[]
    (1536 floats). Server never sees plaintext.

• prove — fact_key + query. Returns yes/no answer + proof envelope bound to commitment.
  Not for client-sealed facts (422 CLIENT_ENCRYPTED).

• share — like prove plus recipient_agent_id; also returns share_token + expiry (~7 days).

• search — query only (+ optional user_id). Semantic search server-sealed rows (pgvector).
  Client-sealed excluded from ranking.

• verify_proof — proof string only. Validates HMAC envelope without loading plaintext.

• sandbox — action + optional parameters (+ optional user_id). Isolated VM, attestation JWT.

══════════════════════════════════════════════════════════════════════════════
MODEL CONTEXT PROTOCOL (MCP) — OPTIONAL
══════════════════════════════════════════════════════════════════════════════
npm package: zkshare-mcp (stdio MCP; proxies same POST endpoint with env.)
Install/use: npx -y zkshare-mcp
Official MCP Registry ID (discovery): io.github.sp0oby/zkshare
  Lookup: https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.sp0oby/zkshare

Env passed by host:
  ZKSHARE_API_KEY=<required>
  ZKSHARE_API_URL=${s} (optional; omit for prod)

Cursor: merge MCP entry into ~/.cursor/mcp.json — see Docs → Model Context Protocol.
Full JSON example: ${s}/docs#mcp

══════════════════════════════════════════════════════════════════════════════
TRUST MODEL (SHORT)
══════════════════════════════════════════════════════════════════════════════
• Server holds encryption + proof_hmac secrets only on the backend (not in NEXT_PUBLIC_*).
• Proof field today is versioned JSON + HMAC (verify_proof verifies without plaintext).
• Groth16 / SNARK roadmap for structured predicates; NLP predicates stay HMAC-envelope tier.
• Abuse (enumeration probing) → integrators should rate-limit/filter queries in THEIR app —
  API provides per-key rate limits, not UX policy.

══════════════════════════════════════════════════════════════════════════════
OTHER HTTPS SURFACES
══════════════════════════════════════════════════════════════════════════════
GET ${s}/api/health        — liveness (edge)
GET ${s}/api/health/ready  — readiness + DB
OpenAPI 3.1 (machine-readable contract):
  https://raw.githubusercontent.com/sp0oby/zkShare/master/openapi.json

══════════════════════════════════════════════════════════════════════════════
PRICING (SUMMARY)
══════════════════════════════════════════════════════════════════════════════
Free 1k ops/mo; Starter ~20k (~$19); Pro ~100k (~$49) includes audit CSV export tiers;
Stripe metered overages. Exact numbers → ${s}/docs (pricing tables).

══════════════════════════════════════════════════════════════════════════════
SOURCES
══════════════════════════════════════════════════════════════════════════════
Human docs (examples, trust model): ${s}/docs
Repository: https://github.com/sp0oby/zkShare
npm MCP: https://www.npmjs.com/package/zkshare-mcp
MCP Registry (canonical ID): io.github.sp0oby/zkshare — https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.sp0oby/zkshare

— END —
`;
}
