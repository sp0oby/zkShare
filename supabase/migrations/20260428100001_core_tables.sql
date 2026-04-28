-- Core tables (fresh install)

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  key_hash text not null unique,
  key_prefix text not null,
  revoked_at timestamptz,
  plan_tier text not null default 'free',
  monthly_limit int not null default 1000,
  calls_this_month int not null default 0,
  billing_period_start date not null default (timezone('utc', now()))::date,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.facts (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid not null references public.api_keys (id) on delete cascade,
  logical_user_id text not null default '',
  fact_key text not null,
  ciphertext text not null,
  iv text not null,
  auth_tag text not null,
  commitment text not null,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  unique (api_key_id, logical_user_id, fact_key)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid references public.api_keys (id) on delete set null,
  user_id text,
  operation text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.share_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  fact_id uuid not null references public.facts (id) on delete cascade,
  recipient_agent_id text not null,
  proof text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists facts_api_user_idx on public.facts (api_key_id, logical_user_id);
create index if not exists audit_logs_api_key_created_idx on public.audit_logs (api_key_id, created_at desc);
