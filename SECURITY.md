# Security — ZKshare production checklist

## Secrets

- Never commit `.env.local` or service-role keys.
- Rotate `ZKSHARE_ENCRYPTION_SECRET`, `ZKSHARE_PROOF_SECRET`, and `ZKSHARE_ENCLAVE_JWT_SECRET` if leaked.
- Use **Vercel / platform env** or a secrets manager in production; separate preview vs production values.

## Network

- Set **`ZKSHARE_CORS_ORIGIN`** to your real web origin(s), not `*`, when the API is exposed cross-origin.
- Prefer **HTTPS** only; security headers are set in `next.config.mjs`.

## Database

- **RLS** policies deny `anon` / `authenticated` direct access to `api_keys`, `facts`, `audit_logs`, `share_tokens`; the app uses **service_role** only on the server.
- **Revoke** compromised keys via `POST /api/keys/:id/revoke` or `revoked_at` in SQL.
- Run **`supabase/migrations`** on every environment (staging → production).

## API abuse

- **Rate limits**: Upstash Redis in production; per-key burst scales with plan (`lib/rate-limit.ts`).
- **Body size**: `POST /api/v1/context` rejects bodies larger than **512 KiB** (`content-length`).
- Pass **`x-request-id`** from clients for traceability; responses echo it in JSON and headers.

## Compliance

- **Audit logs** capture operations (not raw fact plaintext). Pro/Enterprise can export CSV via `GET /api/audit/export`.
- Data processing agreements and SOC2 are **your** organizational controls; this codebase provides technical hooks (encryption, audit trail, key revocation).

## Dependency & supply chain

- Run `pnpm audit` and keep Next.js / Supabase clients updated.
- Review **Stripe webhook** signatures (`STRIPE_WEBHOOK_SECRET`) before trusting subscription events.

## Privacy & third-party LLMs

- **Routing:** If `OPENROUTER_API_KEY` is set, chat + embeddings use [OpenRouter](https://openrouter.ai/) (OpenAI-compatible API). Otherwise `OPENAI_API_KEY` is used. If neither is set, embeddings fall back to a deterministic local pseudo-embedding and NL uses heuristics only.
- **Free-tier models (examples):** override with `OPENROUTER_CHAT_MODEL` / `OPENROUTER_EMBEDDING_MODEL`. Defaults favor `:free` chat and `nvidia/llama-nemotron-embed-vl-1b-v2:free` for embeddings. **Free inference tiers often come with provider logging / trial terms** (e.g. NVIDIA’s OpenRouter page warns prompts may be logged for model improvement). **Do not use `:free` models for confidential production data** — use paid routes, self-hosted models, `ZKSHARE_DISABLE_EXTERNAL_LLM=true`, and/or client-supplied `embedding` so fact text never hits an embedder.
- **Data collection:** For OpenRouter embeddings, requests include `provider.data_collection: deny` when `ZKSHARE_OPENROUTER_DENY_DATA_COLLECTION` is not set to `false`. This asks providers not to retain prompts where supported — it is **not** a cryptographic guarantee; read OpenRouter and upstream provider terms.
- **Strict mode:** Set `ZKSHARE_DISABLE_EXTERNAL_LLM=true` so **no** fact text is sent to any external chat model (`prove` / `share` / search summaries use heuristics only). The API server can still decrypt facts in process for those operations.
- **Client-supplied embeddings:** `store` may include `embedding` (exactly **1536** numbers). For **server-sealed** facts, the server skips its embed call when `embedding` is set (it still encrypts `value` server-side). For **client-sealed** facts, `embedding` is **required** so the server never calls an embedder on metadata. Use the same model/projection policy as search queries for meaningful similarity.

## Zero-knowledge / confidentiality tiers (honest roadmap)

What “ZK” means depends on architecture. This repo can be operated at increasing strength:

1. **Encrypted at rest + strict LLM off (today):** Facts encrypted in Postgres; no direct table access via anon JWT; optional no third-party NL/embedding. *Trust:* platform operator still runs app code and can change behavior; server still decrypts for `prove` / search / share.
2. **Client-computed vectors + strict LLM:** Reduces exposure of fact text to embedding providers; does not remove server-side decryption for ciphertext currently produced by the server.
3. **Client-side encryption (E2EE store):** Alternate `store` body: `ciphertext` + `iv` + `auth_tag` + `commitment` + **required** `embedding` (1536). Server never derives embeddings for that path; those rows are excluded from server-side `search`, `prove`, and `share`. Client key handling and crypto are your SDK responsibility; this repo defines the HTTP contract and persistence only.
4. **Verify-only API:** Clients (or user agents) decrypt locally and produce proofs; server verifies Groth16 (or similar) without the witness. Requires circuit artifacts and client tooling.
5. **TEE / confidential compute:** Attested enclave processes decrypt inside hardware; operator sees ciphertext only on the host. Roadmap item beyond WASM simulation.
6. **Search on ciphertext:** Practical semantic search without decryption is an active research area (FHE, structured encryption, etc.) — not claimed here.

Ship honest messaging: only tiers you have implemented and audited.
