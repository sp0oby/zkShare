# zkShare

Privacy-oriented context API for users, AI agents, and back-office systems. A single HTTP entrypoint
(`POST /api/v1/context`) handles **encrypted fact storage**, **commitment-based proof envelopes**,
**semantic search over encrypted data**, **end-to-end-encrypted (client-sealed) facts**, and a
**isolated sandbox execution** for sensitive computations. The implementation is a Next.js
(App Router) application backed by PostgreSQL with `pgvector`.

This document is for developers integrating against the API and operators self-hosting the service.
It is **not** a marketing brochure — pricing tiers, dashboards, and billing are optional layers
defined separately in the application code.

---

## Privacy and security model

The platform is designed around three trust boundaries:

| Boundary | What the operator can see | What stays private |
|----------|---------------------------|--------------------|
| **Server-sealed store** | Ciphertext, IV, auth tag, commitment, embedding vector. The server holds the AES-256-GCM key (`ZKSHARE_ENCRYPTION_SECRET`) and decrypts in memory only when the caller invokes `prove`, `share`, or `search` summaries. | Database operators (without the encryption secret) and direct table readers (RLS denies `anon` and `authenticated`) cannot read plaintext. |
| **Client-sealed (E2EE) store** | Opaque ciphertext blobs, IV, auth tag, commitment, and a caller-supplied embedding vector. The server **never** receives or derives plaintext, and never calls an embedding model on the fact. | The platform operator. Decryption requires the caller's own key, which never leaves the caller. |
| **Proof envelopes** | A versioned, HMAC-signed JSON envelope (commitment + query + yes/no answer + nonce). Verifiable by anyone holding `ZKSHARE_PROOF_SECRET`. | The fact plaintext used to derive the answer is never included in the envelope. |

### What this means in practice

- **Users** can prove a property of a personal fact (for example, "the user prefers beach trips") to
  a third party without exposing the underlying value. The third party verifies the envelope
  through `verify_proof`.
- **Agents** can hold and exchange context across sessions or tool boundaries without surfacing the
  raw values to downstream systems. Sharing produces a single-use, time-bound `share_token`
  bound to a recipient agent identifier.
- **Businesses** integrating the API can offer privacy guarantees that are technical, not
  contractual — RLS denies direct table access, the encryption key is server-only, the proof
  HMAC secret is server-only, and the client-sealed path lets sensitive data stay outside the
  operator's reach entirely.

[`SECURITY.md`](./SECURITY.md) is the canonical reference for the threat model, the trust
model summary, vulnerability disclosure, the operator checklist, and third-party LLM exposure
controls.

---

## API contract

| Operation | Behavior |
|-----------|----------|
| `store` | **Server-sealed:** caller sends `value`. Server encrypts with AES-256-GCM, computes a salted commitment, generates an embedding (or accepts a 1536-dim `embedding`), and persists with `client_encrypted = false`. **Client-sealed:** caller sends `ciphertext`, `iv`, `auth_tag`, `commitment`, and the **required** `embedding`. Server stores blobs and the vector, sets `client_encrypted = true`, and never derives anything from the plaintext or label. |
| `prove` | Loads a server-sealed fact, decrypts in memory, derives a yes/no answer for the supplied query (LLM with `temperature: 0`, or a heuristic when external LLMs are disabled), and returns an HMAC-signed proof envelope. Returns `422 / CLIENT_ENCRYPTED` if the fact is client-sealed. |
| `share` | Same as `prove`, plus inserts a row into `share_tokens` (recipient_agent_id, expiry, proof) and returns a `share_token`. The token is a 24-byte base64url string, valid for seven days. |
| `search` | Embeds the query, calls `match_facts` (a `security definer` SQL function with cosine distance over `pgvector`), and returns ranked summaries for **server-sealed rows only**. Client-sealed rows are excluded at the SQL level **and** the application level. |
| `verify_proof` | Validates an envelope without loading any fact. Malformed envelope returns `400 / VALIDATION_ERROR`; well-formed envelope with a bad HMAC returns `200` with `data.valid: false`. |
| `sandbox` | Executes a small allow-listed function inside an isolated `node:vm` sandbox (no host I/O, 50 ms timeout) and returns the result with attestation metadata and a short-lived HS256 JWT (`proof_of_execution`). Every response advertises `provider: "vm-sandbox"` — this is software isolation, not hardware attestation. |

Authoritative request and response shapes live in [`types/index.ts`](./types/index.ts) and
[`openapi.json`](./openapi.json).

### Error codes

| Code | HTTP | Meaning |
|------|------|---------|
| `INVALID_API_KEY` | `401` | Missing, malformed, or revoked key. |
| `RATE_LIMITED` | `429` | Per-key sliding-window limit exceeded. `Retry-After` header included. |
| `VALIDATION_ERROR` | `400` | Body fails the Zod schema or a malformed proof was passed to `verify_proof`. |
| `FACT_NOT_FOUND` | `404` | No row matches `(api_key_id, logical_user_id, fact_key)`. |
| `PROOF_FAILED` | `400` | Decryption failed or no definite yes/no answer could be derived. |
| `CLIENT_ENCRYPTED` | `422` | `prove` or `share` was called against a client-sealed fact. |
| `INTERNAL_ERROR` | `500` | Caught exception. The original message is logged via `lib/logger.ts`; clients see a generic message. |

---

## Architecture

- **Runtime:** `/api/v1/context` is a Node.js route handler (not Edge) so AES-256-GCM, scrypt key
  derivation, and the Supabase service-role client behave deterministically.
- **Persistence:** PostgreSQL with extensions and tables managed by versioned migrations under
  `supabase/migrations/`. Tables: `api_keys`, `facts`, `audit_logs`, `share_tokens`. The `facts`
  table stores ciphertext, IV, auth tag, commitment, a `vector(1536)` embedding, and a
  `client_encrypted` flag.
- **Search:** `match_facts(api_key_id, logical_user_id, query_embedding, match_count)` is a
  `security definer` function with an IVFFlat index. It returns server-sealed rows only.
  Updating the function's row type requires `DROP FUNCTION ... CASCADE`-style replacement (a
  PostgreSQL constraint) — the migrations handle this explicitly.
- **Authentication and authorization:**
  - End-user dashboard: Supabase Auth magic-link sign-in. `middleware.ts` redirects unauthenticated
    visitors away from `/dashboard`.
  - HTTP API: `x-api-key` header. Keys are stored as SHA-256 hashes; only the prefix is shown in
    the dashboard. Rotating a key requires generating a new one — plaintext is never persisted.
  - Database access: RLS denies all direct access from `anon` and `authenticated` roles. The
    application uses the Supabase **service role** server-side only.
- **Rate limiting:** Upstash Redis (sliding window) when configured; an in-process fallback is
  used in local development.
- **Encryption keys:**
  - `ZKSHARE_ENCRYPTION_SECRET` — server-side AES-256-GCM master secret (scrypt-derived; minimum
    32 characters).
  - `ZKSHARE_PROOF_SECRET` — HMAC secret for commitments and proof envelopes (minimum 16
    characters).
  - `ZKSHARE_ENCLAVE_JWT_SECRET` — HS256 secret for sandbox attestations (minimum 32 characters).
  - All three are required for the relevant code paths. The application throws on startup if any
    are missing or too short.

---

## Repository layout

| Path | Purpose |
|------|---------|
| `app/` | Next.js App Router routes — public site, dashboard, API endpoints (`api/v1/context`, `api/keys`, `api/billing`, `api/webhooks/stripe`, `api/health`, `api/health/ready`, `api/audit/export`, `auth/callback`). |
| `lib/` | Server-only modules: `encryption.ts`, `zk.ts`, `embeddings.ts`, `search.ts`, `sandbox.ts`, `api-key.ts`, `rate-limit.ts`, `audit.ts`, `llm-client.ts`, `supabase-server.ts`, `supabase-browser.ts`. |
| `components/` | UI components built on shadcn/ui primitives. |
| `types/index.ts` | Zod request schema, operation enum, error codes, and shared row types. |
| `supabase/migrations/` | Ordered SQL migrations. |
| `circuits/` | Notes and placeholders for future Groth16 wiring. `snarkjs` is a runtime dependency but is not on the default trust path. |
| `openapi.json` | OpenAPI 3.1 description of the public surface. |
| `SECURITY.md` | Threat model, operational checklist, and the encryption / LLM matrix. |

---

## Local development

```bash
pnpm install
cp .env.local.example .env.local
# Fill the Supabase, ZKSHARE_*, and (optionally) LLM, Upstash, and Stripe values.
# Defaults for LLM model slugs live in lib/llm-client.ts.
pnpm dev
```

Apply migrations against your Supabase database before exercising the API. See
[`supabase/README.md`](./supabase/README.md).

### Smoke tests

Server-sealed store followed by a proof:

```bash
curl -sS -X POST http://localhost:3000/api/v1/context \
  -H "x-api-key: zk_live_..." \
  -H "Content-Type: application/json" \
  -d '{"operation":"store","user_id":"user_123","fact_key":"example","value":"hello"}'

curl -sS -X POST http://localhost:3000/api/v1/context \
  -H "x-api-key: zk_live_..." \
  -H "Content-Type: application/json" \
  -d '{"operation":"prove","user_id":"user_123","fact_key":"example","query":"does the fact say hello?"}'
```

Verifying a proof string:

```bash
curl -sS -X POST http://localhost:3000/api/v1/context \
  -H "x-api-key: zk_live_..." \
  -H "Content-Type: application/json" \
  -d '{"operation":"verify_proof","proof":"<base64url envelope from the prove response>"}'
```

Health probes:

- Liveness: `GET /api/health`
- Readiness (database): `GET /api/health/ready`

### Self-audit (privacy-critical paths)

```bash
pnpm run verify:crypto
```

This runs `scripts/verify-crypto.ts` directly under Node's built-in TypeScript support and
asserts encryption round-trip, tamper detection, deterministic commitments, and all three
`verify_proof` outcomes (`valid`, `invalid`, `malformed`).

---

## Production readiness

The full operator checklist lives in [`SECURITY.md → Operator checklist`](./SECURITY.md#operator-checklist).
At a minimum, before exposing the API to the public internet:

- All three `ZKSHARE_*` secrets are set with high-entropy values; the application throws on startup otherwise.
- `ZKSHARE_CORS_ORIGIN` is an explicit comma-separated allow list of origins. `*` is for unauthenticated demos only.
- Migrations under `supabase/migrations/` have been applied in timestamp order on the target environment.
- Upstash Redis is configured (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`); the in-process rate-limit fallback is for local development only.
- `GET /api/health/ready` returns `200` with no `missing` entries and acknowledged `warnings`.

---

## Status of the "zero-knowledge" claim

The `proof` field returned today is a **versioned JSON envelope signed with HMAC-SHA256**, binding
the commitment, the query, and the yes/no answer. `snarkjs` is included as a dependency, and
`circuits/` documents the intended Groth16 path for future work. **Groth16 verification is not on
the default response path.** Treat any external claim of full SNARK-on-every-call as aspirational
unless the verifier and circuit artifacts have been shipped and audited.

---

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the local-development checklist, the
verification commands required before opening a pull request, and how to flag changes that
touch the data plane or cryptographic paths.

## Reporting a vulnerability

Please **do not** open a public issue for security vulnerabilities. The disclosure process
and contact channels are documented in [`SECURITY.md`](./SECURITY.md).

## License

Released under the [MIT License](./LICENSE).
