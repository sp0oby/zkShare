# Contributing to zkShare

Thanks for your interest. This is a security-sensitive code base; please read this short guide
before opening a pull request.

## Reporting security issues

Do not open a public issue for vulnerabilities. See [`SECURITY.md`](./SECURITY.md) for the
private disclosure process.

## Development setup

```bash
pnpm install
cp .env.local.example .env.local
# Fill the Supabase, ZKSHARE_*, and (optionally) LLM, Upstash, and Stripe values.
pnpm dev
```

Apply the migrations under `supabase/migrations/` against your Supabase database before
exercising the API.

## Verifications before opening a pull request

- `pnpm run lint` — TypeScript type check, must pass.
- `pnpm run verify:crypto` — encryption round trip and proof envelope build / verify.
- If you change a `RETURNS TABLE` signature on a SQL function, include a `DROP FUNCTION` in
  the migration; PostgreSQL will not accept `CREATE OR REPLACE` for that case.
- If you change a wire format (`types/index.ts`, response shape, error code), update
  `openapi.json` and `app/docs/page.tsx` in the same pull request.
- If you change anything in `lib/encryption.ts`, `lib/zk.ts`, `lib/api-key.ts`, or the data
  plane in `app/api/v1/context/route.ts`, call it out in the pull request description so a
  reviewer can audit it carefully.

## Style

- Strict TypeScript. The project does not silence type errors at build time.
- Prefer small, composable modules under `lib/`. Server-only modules import `"server-only"`.
- Avoid logging fact plaintext, ciphertext content, or secrets. Use `lib/logger.ts` and pass
  identifiers and request ids only.
- Keep route handlers under `app/` thin; the cryptographic logic belongs in `lib/zk.ts` or
  `lib/encryption.ts` so it can be unit-tested.

## Commit messages

Conventional-commits style is preferred but not required. The important thing is that the
subject line names the area touched (`feat:`, `fix:`, `docs:`, `chore:`, …) and the body
explains the trade-offs for any change to the data plane or the privacy guarantees.
