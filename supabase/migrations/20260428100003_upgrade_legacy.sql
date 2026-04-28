-- Upgrade path for older ZKshare databases (jsonb embeddings, 5000 default limits, missing columns).
-- Run after 20260428100001–100002. Safe to re-run where clauses are idempotent.

alter table public.api_keys add column if not exists plan_tier text default 'free';
alter table public.api_keys add column if not exists stripe_subscription_id text;
alter table public.api_keys add column if not exists created_at timestamptz default now();

update public.api_keys set plan_tier = 'free' where plan_tier is null;
alter table public.api_keys alter column plan_tier set default 'free';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'api_keys_plan_tier_check'
  ) then
    alter table public.api_keys add constraint api_keys_plan_tier_check
      check (plan_tier in ('free', 'starter', 'pro', 'enterprise'));
  end if;
exception
  when duplicate_object then null;
end $$;

update public.api_keys
set monthly_limit = 1000
where coalesce(plan_tier, 'free') = 'free'
  and monthly_limit = 5000;

alter table public.api_keys alter column monthly_limit set default 1000;

-- facts.embedding: jsonb[] -> vector(1536) when column is still jsonb
do $$
declare
  col_type text;
begin
  select c.data_type into col_type
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name = 'facts' and c.column_name = 'embedding';

  if col_type = 'jsonb' then
    alter table public.facts add column if not exists embedding_vec vector(1536);

    update public.facts f
    set embedding_vec = sq.converted
    from (
      select
        f2.id,
        ('[' || string_agg(elem::text, ',' order by ord) || ']')::vector as converted
      from public.facts f2,
      lateral jsonb_array_elements_text(f2.embedding) with ordinality as t(elem, ord)
      where f2.embedding is not null
        and jsonb_typeof(f2.embedding) = 'array'
      group by f2.id
    ) sq
    where f.id = sq.id;

    alter table public.facts drop column embedding;
    alter table public.facts rename column embedding_vec to embedding;
  end if;
end $$;

create index if not exists facts_embedding_ivfflat
  on public.facts using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
