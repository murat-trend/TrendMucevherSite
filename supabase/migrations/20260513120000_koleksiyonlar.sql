-- Remaura: koleksiyon görsel kayıtları (super_admin araç sayfası)
create table if not exists public.koleksiyonlar (
  id          uuid        primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  koleksiyon_adi text,
  gorsel_url  text        not null,
  tip         text,
  tema        text,
  metal       text,
  user_id     uuid        references auth.users(id) on delete set null
);

create index if not exists koleksiyonlar_created_at_idx
  on public.koleksiyonlar (created_at desc);

create index if not exists koleksiyonlar_user_id_idx
  on public.koleksiyonlar (user_id);

alter table public.koleksiyonlar enable row level security;

-- Authenticated users can insert their own rows
create policy "koleksiyonlar_insert_own"
  on public.koleksiyonlar
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Users can read their own rows
create policy "koleksiyonlar_select_own"
  on public.koleksiyonlar
  for select
  to authenticated
  using (user_id = auth.uid());
