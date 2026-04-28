-- ZKshare production schema — apply in order (Supabase CLI: `supabase db push` or SQL Editor).
-- 1) Extensions

create extension if not exists vector;
