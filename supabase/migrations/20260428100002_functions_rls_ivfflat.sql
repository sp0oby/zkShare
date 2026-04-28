-- Atomic usage counter (avoids lost updates under concurrency)
create or replace function public.increment_api_key_usage(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.api_keys
  set calls_this_month = coalesce(calls_this_month, 0) + 1
  where id = p_id
    and revoked_at is null;
end;
$$;

-- Semantic search (pgvector cosine distance)
create or replace function public.match_facts(
  p_api_key_id uuid,
  p_logical_user_id text,
  query_embedding vector(1536),
  match_count int default 12
)
returns table (
  id uuid,
  fact_key text,
  commitment text,
  ciphertext text,
  iv text,
  auth_tag text,
  embedding vector(1536),
  similarity double precision
)
language sql
stable
security definer
set search_path = public
as $$
  select
    f.id,
    f.fact_key,
    f.commitment,
    f.ciphertext,
    f.iv,
    f.auth_tag,
    f.embedding,
    (1 - (f.embedding <=> query_embedding))::double precision as similarity
  from public.facts f
  where f.api_key_id = p_api_key_id
    and f.logical_user_id = p_logical_user_id
    and f.embedding is not null
  order by f.embedding <=> query_embedding
  limit greatest(1, least(match_count, 100));
$$;

-- IVFFlat index (create after you have representative data for best recall; safe on empty table)
create index if not exists facts_embedding_ivfflat
  on public.facts using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- PostgREST / service role
grant usage on schema public to postgres, anon, authenticated, service_role;

grant select, insert, update, delete on public.api_keys to service_role;
grant select, insert, update, delete on public.facts to service_role;
grant select, insert on public.audit_logs to service_role;
grant select, insert, delete on public.share_tokens to service_role;

grant execute on function public.increment_api_key_usage(uuid) to service_role;
grant execute on function public.match_facts(uuid, text, vector, int) to service_role;

-- RLS: block direct anon/authenticated access; app uses service_role on the server only
alter table public.api_keys enable row level security;
alter table public.facts enable row level security;
alter table public.audit_logs enable row level security;
alter table public.share_tokens enable row level security;

drop policy if exists "deny_anon_api_keys" on public.api_keys;
create policy "deny_anon_api_keys"
  on public.api_keys for all to anon
  using (false) with check (false);

drop policy if exists "deny_authenticated_api_keys" on public.api_keys;
create policy "deny_authenticated_api_keys"
  on public.api_keys for all to authenticated
  using (false) with check (false);

drop policy if exists "deny_anon_facts" on public.facts;
create policy "deny_anon_facts"
  on public.facts for all to anon
  using (false) with check (false);

drop policy if exists "deny_authenticated_facts" on public.facts;
create policy "deny_authenticated_facts"
  on public.facts for all to authenticated
  using (false) with check (false);

drop policy if exists "deny_anon_audit_logs" on public.audit_logs;
create policy "deny_anon_audit_logs"
  on public.audit_logs for all to anon
  using (false) with check (false);

drop policy if exists "deny_authenticated_audit_logs" on public.audit_logs;
create policy "deny_authenticated_audit_logs"
  on public.audit_logs for all to authenticated
  using (false) with check (false);

drop policy if exists "deny_anon_share_tokens" on public.share_tokens;
create policy "deny_anon_share_tokens"
  on public.share_tokens for all to anon
  using (false) with check (false);

drop policy if exists "deny_authenticated_share_tokens" on public.share_tokens;
create policy "deny_authenticated_share_tokens"
  on public.share_tokens for all to authenticated
  using (false) with check (false);
