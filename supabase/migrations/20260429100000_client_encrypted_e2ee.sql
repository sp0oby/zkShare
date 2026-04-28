-- Client-side sealed facts (operator cannot decrypt). Server stores blobs + commitment only.

alter table public.facts
  add column if not exists client_encrypted boolean not null default false;

-- Return type (OUT columns) changed — Postgres requires drop before replace.
drop function if exists public.match_facts(uuid, text, vector, int);

-- match_facts: expose flag for API hydration; server-sealed rows only (client_encrypted = false)
create function public.match_facts(
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
  client_encrypted boolean,
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
    f.client_encrypted,
    (1 - (f.embedding <=> query_embedding))::double precision as similarity
  from public.facts f
  where f.api_key_id = p_api_key_id
    and f.logical_user_id = p_logical_user_id
    and f.embedding is not null
    and f.client_encrypted is false
  order by f.embedding <=> query_embedding
  limit greatest(1, least(match_count, 100));
$$;

grant execute on function public.match_facts(uuid, text, vector, int) to service_role;
