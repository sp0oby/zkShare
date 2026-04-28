# zkShare

Monorepo for a **single HTTP entrypoint** (`POST /api/v1/context`) that stores **encrypted facts**, runs **semantic search** (pgvector), issues **HMAC-sealed proof envelopes** for yes/no answers, and supports an **optional client-sealed (E2EE) store** where the server never sees plaintext. The app is a **Next.js** (App Router) deployment with **Supabase** (Postgres + Auth); rate limits and billing integrations are optional operational layers.

This README is written for **operators and integrators** (self-host or audit), not as product marketing.

---

## Behavior (API contract)

| Operation | Role |
|-----------|------|
| `store` | **Server-sealed:** `value` is encrypted server-side; embedding from model or client-supplied `embedding` (1536 dims). **Client-sealed:** caller sends `ciphertext`, `iv`, `auth_tag`, `commitment`, and **required** `embedding`; server persists blobs only (`client_encrypted = true`). |
| `prove` / `share` | Load a **server-sealable** fact, decrypt in process, derive yes/no (LLM or heuristics — see `SECURITY.md`), return signed proof. **Client-sealed facts** return `422` / `CLIENT_ENCRYPTED`. |
| `search` | Embeds the query server-side, calls `match_facts` RPC. **Only** rows with `client_encrypted = false` participate (no server-side ranking of E2EE ciphertext). |
| `verify_proof` | Validates a proof string **without** reading fact plaintext. Malformed envelope → `400`; wrong HMAC → `200` with `data.valid: false`. |
| `enclave` | Simulated WASM “enclave” path with JWT-style execution attestation (see `lib/enclave.ts`). |

Authoritative request/response shapes: [`types/index.ts`](./types/index.ts), [`openapi.json`](./openapi.json).

---

## Architecture

- **Runtime:** Node.js route handlers for `/api/v1/context` (not Edge) so crypto and Supabase service role behave predictably.
- **Data:** `facts` (ciphertext, iv, auth_tag, commitment, `vector(1536)` embedding, `client_encrypted`), `api_keys`, `audit_logs`, `share_tokens`. RLS denies direct `anon` / `authenticated` access; the server uses **service_role** only.
- **Search:** `match_facts(api_key_id, logical_user_id, query_embedding, match_count)` — security definer, returns server-sealed rows only. Replacing this function with a different `RETURNS TABLE` shape requires **`DROP FUNCTION …` first** (Postgres limitation); see migrations.
- **Secrets:** `ZKSHARE_ENCRYPTION_SECRET` (AES-GCM for server-sealed payloads), `ZKSHARE_PROOF_SECRET` (commitments + proof HMACs). See [`SECURITY.md`](./SECURITY.md) for LLM routing, CORS, and operational checklist.

---

## Repository layout

| Path | Purpose |
|------|---------|
| `app/` | Routes: marketing pages, dashboard, `api/v1/context`, auth callback, webhooks, health. |
| `lib/` | Encryption, embeddings, ZK/proof helpers, rate limit, Supabase server/browser clients, search hydration. |
| `components/` | UI (shadcn-style). |
| `supabase/migrations/` | Ordered SQL: extension, tables, RPCs, RLS, upgrades, `client_encrypted` + `match_facts` updates. |
| `circuits/` | Circom-oriented assets / notes for future Groth16 wiring (`snarkjs` is a dependency). |

There is **no** separate `frontend/` tree; the Next.js app under `app/` is the only web surface in this repo.

---

## Prerequisites

- Node 20+ (project uses `pnpm`; `npm` / `yarn` work if you adjust lockfile usage).
- Supabase project with Postgres + Auth.
- Optional: Upstash Redis (rate limits), Stripe (plans — see env template), OpenRouter or OpenAI for embeddings/chat.

---

## Local development

```bash
pnpm install
cp .env.local.example .env.local
# Fill Supabase keys and ZKSHARE_* secrets (min length per .env.local.example)
pnpm dev
```

Apply migrations before exercising the API (see [`supabase/README.md`](./supabase/README.md)).

### Smoke requests

```bash
curl -sS -X POST http://localhost:3000/api/v1/context \
  -H "x-api-key: zk_live_..." \
  -H "Content-Type: application/json" \
  -d "{\"operation\":\"store\",\"user_id\":\"user_123\",\"fact_key\":\"example\",\"value\":\"hello\"}"
```

```bash
curl -sS -X POST http://localhost:3000/api/v1/context \
  -H "x-api-key: zk_live_..." \
  -H "Content-Type: application/json" \
  -d "{\"operation\":\"prove\",\"user_id\":\"user_123\",\"fact_key\":\"example\",\"query\":\"does the fact say hello?\"}"
```

- **Liveness:** `GET /api/health`
- **Readiness:** `GET /api/health/ready`

---

## Migrations and production

- Run SQL in **timestamp order** (CLI `supabase db push` or paste per file in the Supabase SQL editor).
- Auth redirect URLs must include your deployment’s `/auth/callback`.
- Key revocation: `POST /api/keys/:id/revoke` (session-authenticated) or set `revoked_at` via SQL.

---

## Zero-knowledge / proofs (precise wording)

Today’s **proof** field is a **versioned JSON object + HMAC** (`lib/zk.ts`), binding commitment, query, and yes/no answer. **snarkjs** is included for pipeline experiments; Groth16 verification is **not** wired as the default trust path in API responses yet. Treat marketing copy that implies full SNARK verification on every response as **aspirational** unless you ship the circuit artifacts and verifier path.

---

## GitHub “About” (sidebar metadata)

GitHub does not read this file automatically. Set **Repository description** and **Topics** in the repo **Settings → General**, or use `gh repo edit` locally.

**Suggested short description (≤350 chars):**

> Single-endpoint context API: encrypted facts, pgvector search, HMAC proof envelopes, optional client-sealed storage. Next.js, Supabase, TypeScript.

**Suggested topics:** `nextjs` `supabase` `postgresql` `pgvector` `typescript` `privacy` `encryption` `api` `zero-knowledge` `semantic-search`

---

## License

Specify your license in this section (repository default is not set by the maintainers here).
