# Supabase migrations (ZKshare)

Apply these SQL files **in timestamp order** on your Supabase project.

## Option A — Supabase CLI (recommended)

```bash
# one-time: https://supabase.com/docs/guides/cli
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

If you keep migrations only in Git and use hosted Supabase, `db push` applies anything under `migrations/` that is not yet recorded in `supabase_migrations.schema_migrations`.

## Option B — SQL Editor

1. Open **SQL** → **New query** in the Supabase dashboard.
2. Paste and run each file in order:
   - `20260428100000_enable_vector.sql`
   - `20260428100001_core_tables.sql`
   - `20260428100002_functions_rls_ivfflat.sql`
   - `20260428100003_upgrade_legacy.sql` (only if you already had older tables; safe for greenfield too)

## After migrating

- Rebuild the **IVFFlat** index after you have enough rows for recall (optional): `REINDEX INDEX facts_embedding_ivfflat;`
- Configure **Auth** redirect URLs for `/auth/callback`.
- Never expose **service_role** in the browser.
