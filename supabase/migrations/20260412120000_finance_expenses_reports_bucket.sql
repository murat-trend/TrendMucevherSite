-- Gider satırları (Vercel: data/finance/expenses.json yerine)
create table if not exists public.finance_expenses (
  id text primary key,
  date_iso text not null,
  description text not null default '',
  category text not null default '',
  amount_try numeric not null default 0,
  invoices jsonb not null default '[]'::jsonb,
  sort_index int not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists finance_expenses_sort_idx on public.finance_expenses (sort_index);

alter table public.finance_expenses enable row level security;

-- Dashboard PDF + gider yedekleri (service role ile yükleme; RLS anon’a kapalı)
insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do nothing;
