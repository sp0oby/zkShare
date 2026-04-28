# Security Policy

zkShare is open source and also intended to be operated as a privacy-oriented service.
This document is a single source of truth for both audiences:

- **Operators** running the API in production
- **Integrators** evaluating whether their sensitive data is appropriate for the platform
- **Security researchers** reporting vulnerabilities

If you only have time for one section, read [Vulnerability disclosure](#vulnerability-disclosure)
and [What zkShare protects against](#what-zkshare-protects-against).

---

## Vulnerability disclosure

Please report security issues privately and responsibly. **Do not** open a public GitHub issue.

- Preferred: GitHub Security Advisory ("Report a vulnerability") on this repository.
- Alternative: contact the repository owner via the GitHub profile linked from the project page.

When reporting, include:

1. A precise description of the impact and the conditions under which it triggers.
2. Steps to reproduce, ideally a minimal proof of concept.
3. Affected commit, deployment URL (if testing a hosted environment), and any relevant logs.
4. Whether you would like public credit on disclosure.

We aim to acknowledge reports within **3 business days**, provide a triage outcome within **10
business days**, and ship a fix or mitigation in line with the severity. Coordinated disclosure
timelines are agreed with the reporter.

Please do not exfiltrate user data, run denial-of-service tests against shared infrastructure, or
test against accounts you do not own.

---

## What zkShare protects against

### In scope

- A direct database reader without the application's encryption secret cannot recover fact
  plaintext. Facts are encrypted with AES-256-GCM and the master secret never leaves the
  application process.
- A row-level-security misconfiguration in `anon` or `authenticated` JWT contexts cannot read
  any project table. The default migrations install deny-all policies; the API uses the
  service role only on the server.
- A caller without a valid, non-revoked API key cannot reach the data plane.
- Proof envelopes (`prove`, `share`, `verify_proof`) are signed with HMAC-SHA256 and bound to
  the commitment, the query, and the answer; an attacker cannot forge a `verified: true`
  envelope without `ZKSHARE_PROOF_SECRET`.
- Client-sealed (E2EE) facts are stored as opaque ciphertext bundles. The server never derives
  embeddings from them, never returns plaintext for them, and never includes them in
  server-side `search`, `prove`, or `share` results. Decryption requires the caller's key.

### Out of scope today

- Practical search over ciphertext. zkShare uses pgvector with embeddings derived from
  plaintext for **server-sealed** facts only; client-sealed rows are not searchable on the
  server. Encrypted search (FHE, structured encryption) is an active research area and is
  not promised here.
- Hardware-attested confidential compute. The `sandbox` operation runs inside an isolated
  `node:vm` sandbox and produces signed attestation metadata (`provider: "vm-sandbox"`).
  This is software isolation — not hardware attestation.
- Groth16 / SNARK verification on every response. `snarkjs` is a dependency and `circuits/`
  documents the intended path; the default trust path today is the HMAC envelope.

Any external messaging that conflicts with the above should be treated as a defect and reported.

---

## Operator checklist

The minimum bar for exposing zkShare to the public internet:

| Area | Requirement |
|------|-------------|
| Secrets | `ZKSHARE_ENCRYPTION_SECRET` (≥ 32 chars), `ZKSHARE_PROOF_SECRET` (≥ 16 chars), and `ZKSHARE_ENCLAVE_JWT_SECRET` (≥ 32 chars, used for sandbox attestation JWTs) are set with high-entropy values. The application throws on startup if any are missing or too short. |
| Secret management | Secrets live in your platform's secret manager (Vercel env, AWS Secrets Manager, GCP Secret Manager, or equivalent). Preview and production environments use different values. |
| Rotation | Rotate every secret on a documented cadence (180 days minimum) and immediately on suspected compromise. Rotating `ZKSHARE_ENCRYPTION_SECRET` requires a key-migration plan because existing ciphertext was sealed under the previous key. |
| Network | `ZKSHARE_CORS_ORIGIN` is an explicit comma-separated allow list of origins (e.g. `https://app.example.com,https://docs.example.com`). `*` is allowed only for unauthenticated demos. |
| Transport | TLS terminates at your edge / platform. The application sets `Strict-Transport-Security` in production builds. |
| Database | RLS deny-all policies are in place on `api_keys`, `facts`, `audit_logs`, `share_tokens`. The service role key is never shipped to the browser. |
| Migrations | Run `supabase/migrations/` in timestamp order on every environment. Your CI should fail the deploy if migrations are pending. |
| Index health | After loading representative data, run `REINDEX INDEX facts_embedding_ivfflat;` to rebuild the IVFFlat index for recall. |
| Rate limiting | Configure Upstash Redis (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) for any environment exposed to the public internet. The in-memory fallback is for local development only. |
| Body size | `POST /api/v1/context` rejects requests above 512 KiB via `Content-Length`. Review proxy timeouts and body limits at your edge. |
| Logging | `request_id` (header `x-request-id`) is echoed on every response and recorded in `audit_logs`. Configure your log aggregator to capture it. |
| Backups | Supabase point-in-time recovery (or equivalent) is enabled. Test restores periodically. |

---

## Privacy and third-party LLM exposure

Several operations may invoke external LLMs unless explicitly disabled:

- `prove` and `share` derive a yes/no answer from decrypted plaintext using a chat completion
  call (or a built-in heuristic when no provider is configured).
- `search` calls an embedding provider for the **query**, and (for server-sealed facts) calls
  a chat completion to summarize each match.
- `store` (server-sealed) calls an embedding provider for the fact text unless the caller
  supplies an `embedding` array.
- `store` (client-sealed) calls an embedding provider for the **fact_key** only when the
  caller does not supply `embedding`. We require `embedding` for client-sealed stores so the
  server never derives vectors from caller-controlled metadata.

### Routing

- `OPENROUTER_API_KEY` set → OpenRouter (OpenAI-compatible API).
- `OPENROUTER_API_KEY` unset, `OPENAI_API_KEY` set → OpenAI directly.
- Neither set → embeddings fall back to a deterministic local pseudo-embedding; chat
  completions fall back to a heuristic yes/no in `lib/zk.ts`.

### Strict modes for sensitive deployments

- `ZKSHARE_DISABLE_EXTERNAL_LLM=true` disables all chat completions for `prove`, `share`, and
  search summaries. The server still decrypts server-sealed facts in process. Combine with
  client-supplied `embedding` to remove plaintext exposure to embedding providers as well.
- `ZKSHARE_OPENROUTER_DENY_DATA_COLLECTION` (default `true`) attaches
  `provider.data_collection: deny` to OpenRouter calls. This is a request to the provider, not
  a cryptographic guarantee — read the upstream provider's terms.
- For maximum privacy, route to a self-hosted embedding model and disable external chat.

### Free-tier providers

Free OpenRouter routes (and similar) often log prompts for model improvement. Do not point a
free model at confidential production data. Use paid routes, self-hosted models, or strict
mode with client-supplied embeddings.

---

## Trust model summary

| Tier | Implemented | Description |
|------|-------------|-------------|
| 1. Encrypted at rest | Yes | Facts encrypted in Postgres; RLS denies direct table access; service role server-only. |
| 2. Strict LLM mode | Yes | No fact text is sent to any external chat model. Embedding calls can be removed by supplying `embedding`. |
| 3. End-to-end encryption (client-sealed `store`) | Yes | Server never sees plaintext or labels. Excluded from `prove`, `share`, and server-side `search`. |
| 4. Verify-only API (Groth16 / SNARK) | No | Tracked under `circuits/`. Intended path: clients produce SNARKs locally; server verifies without the witness. |
| 5. Hardware-attested TEE | No | Current `sandbox` is a `node:vm` sandbox (`provider: "vm-sandbox"`). Software isolation only. |
| 6. Search on ciphertext | No | Active research area; not implemented. |

Operators should advertise only the tiers they have configured and audited.

---

## Compliance considerations

GDPR, EU AI Act, HIPAA, and SOC 2 are organizational regimes, not properties of a code base.
zkShare provides several technical controls that make compliance easier:

- Encryption at rest with platform-managed keys.
- Tenant scoping via `api_key_id` and `logical_user_id` on every row.
- Audit logging of every data-plane operation, with a CSV export endpoint.
- Per-user key revocation (`POST /api/keys/:id/revoke`) and instant downstream rejection.
- Optional client-sealed (E2EE) storage where the operator never sees the data.

You are still responsible for: the data-processing agreements you sign with users, the
identity of your sub-processors (Supabase, your LLM provider, your edge platform), the
retention of your `audit_logs` and database backups, and any region-specific routing
requirements. None of these are decided by this code.

---

## Dependency hygiene

- Run `pnpm audit` in CI.
- Review Stripe webhook signatures (`STRIPE_WEBHOOK_SECRET`) before trusting subscription
  events. The webhook handler returns a generic error message and logs detail server-side.
- Pin major versions of cryptography- and auth-related dependencies (`@supabase/ssr`,
  `@supabase/supabase-js`, `jose`, `snarkjs`) and review changelogs before upgrading.

---

## Self-audit script

`pnpm run verify:crypto` exercises the encryption round trip and the proof envelope build /
verify path against a temporary in-process secret, asserting that:

- Server-sealed plaintext is recoverable only with the right key and rejects tampered ciphertext.
- A signed proof envelope verifies as `valid`, an envelope with a flipped bit verifies as
  `invalid`, and a non-base64url string verifies as `malformed`.

This is not a substitute for an external audit; it is a fast guard against accidental
regressions in the privacy-critical paths.
