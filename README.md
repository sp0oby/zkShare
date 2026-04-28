# ZKshare v1.0

**Tagline:** Zero-knowledge context sharing for AI agents and humans — private by design.  
**Creator:** ｓｐｏｏｂｓ · April 2026

Privacy-first **single-endpoint API** (`POST /api/v1/context`): encrypted facts, ZK-style proof envelopes, semantic search (pgvector-ready), and a **WASM-class simulated enclave** with production-grade attestation metadata. Stack: **Next.js 16** App Router, **Supabase** (Auth + Postgres), **Upstash** rate limits, **Stripe** subscriptions + metered overages, **Tailwind 4** + **shadcn/ui**.

## Pricing (PRD)

| Tier | Price | Included ops/mo | Notes |
|------|-------|-----------------|--------|
| Free | $0 | 1,000 | Testing & light agents |
| Starter | $19 | 20,000 | Higher rate limits |
| Pro | $49 | 100,000 | Priority support + **audit CSV export** |
| Enterprise | Custom | Contract | Unlimited + SLA + real TEE path + SOC2 alignment |

**Overages:** Stripe **metered** billing; target **$0.005–$0.02** per extra operation with volume tiers.

## Quick start

```bash
pnpm install
cp .env.local.example .env.local
pnpm dev
```

### Test the main endpoint

```bash
curl -X POST http://localhost:3000/api/v1/context \
  -H "x-api-key: zk_live_..." \
  -H "Content-Type: application/json" \
  -d "{\"operation\":\"store\",\"user_id\":\"user_123\",\"fact_key\":\"vacation_preference\",\"value\":\"strongly prefers beach vacations\"}"
```

```bash
curl -X POST http://localhost:3000/api/v1/context \
  -H "x-api-key: zk_live_..." \
  -H "Content-Type: application/json" \
  -d "{\"operation\":\"prove\",\"user_id\":\"user_123\",\"fact_key\":\"vacation_preference\",\"query\":\"does the user prefer beach vacations?\"}"
```

- **Liveness (edge):** `GET /api/health`
- **Readiness (DB):** `GET /api/health/ready`
- **OpenAPI:** [`openapi.json`](./openapi.json)
- **Production checklist:** [`SECURITY.md`](./SECURITY.md)

## Database migrations (production)

Versioned SQL lives in [`supabase/migrations/`](./supabase/migrations/). Apply in order — see [`supabase/README.md`](./supabase/README.md) for **Supabase CLI** (`supabase db push`) or **SQL Editor** steps.

Includes: **pgvector**, `api_keys` / `facts` / `audit_logs` / `share_tokens`, **IVFFlat** index, **`match_facts`** RPC, **`increment_api_key_usage`** (atomic counters), **RLS** deny policies for `anon` / `authenticated`, and **`upgrade_legacy`** for older schemas (jsonb embeddings → vector, 5k → 1k free tier alignment).

**Auth:** Email magic link; redirect `http://localhost:3000/auth/callback` (and production).

**Key revocation:** `POST /api/keys/:id/revoke` (session cookie) sets `revoked_at` — keys fail `validateApiKey` immediately.

## ZK / Circom

- Runtime: **`snarkjs`** in `package.json`; Circom templates in [`circuits/`](./circuits/README.md).
- API responses use **commitment + HMAC-sealed** transcripts today; attach **Groth16** artifacts once `commit.wasm` / `commit.zkey` are built (see `circuits/README.md`).

## Security

See [`SECURITY.md`](./SECURITY.md). Summary: lock down **CORS**, use **security headers** in [`next.config.mjs`](./next.config.mjs), keep **service_role** server-only, and run **migrations** on every deploy.

## Dashboard & auth flows

- **Dashboard** nav link → `/dashboard` (middleware sends unauthenticated users to `/api-key?next=/dashboard`).
- On that page, choose **Sign in** (existing email, `shouldCreateUser: false`) or **Create account** (new user).

## Layout

- `app/` — marketing UI + dashboard + API routes  
- `frontend/` — original reference copy  
- `lib/supabase.ts` — browser-safe re-export; server clients in `lib/supabase-server.ts`

## License

Your terms.
