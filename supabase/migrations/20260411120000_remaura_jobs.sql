-- Remaura API job logları (Vercel serverless: dosya sistemi yerine Supabase)
create table if not exists public.remaura_jobs (
  id uuid default gen_random_uuid() primary key,
  type text not null,
  status text not null,
  user_id text,
  platform text,
  estimated_cost_usd numeric,
  message text,
  duration_ms integer,
  created_at timestamptz default now()
);

create index if not exists remaura_jobs_created_at_idx on public.remaura_jobs (created_at desc);
