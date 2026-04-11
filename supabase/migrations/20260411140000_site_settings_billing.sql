-- Site ayarları (tek satır) ve Remaura billing (Vercel: dosya yerine Supabase)
create table if not exists public.site_settings (
  id text primary key,
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.billing_wallets (
  user_id text primary key,
  credits numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  amount numeric not null,
  type text not null,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists billing_ledger_user_created_idx on public.billing_ledger (user_id, created_at desc);

create table if not exists public.billing_payment_sessions (
  id text primary key,
  user_id text not null,
  data jsonb not null,
  paid boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists billing_payment_sessions_user_created_idx on public.billing_payment_sessions (user_id, created_at desc);
