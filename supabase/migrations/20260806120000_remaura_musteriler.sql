-- Müşteri Atölyesi: müşteri kayıtları + tasarımların müşteriye bağlanması.
--
-- Tasarımcı bir müşteri adı açar, o müşteri için ürettiği görseller mevcut
-- `koleksiyonlar` tablosuna `musteri_id` ile bağlanır — böylece galeri müşteri
-- müşteri ayrılır. Erişim YALNIZCA süper-admin (servis-rol anahtarı + API geçidi).

create table if not exists public.remaura_musteriler (
  id         uuid        primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  ad         text        not null,
  telefon    text,
  notlar     text,
  user_id    uuid        references auth.users(id) on delete set null
);

-- Aynı müşteri iki kez açılmasın: "Ayşe" / "ayşe" / " Ayşe " tek kayıt.
create unique index if not exists remaura_musteriler_ad_uniq
  on public.remaura_musteriler (lower(btrim(ad)));

create index if not exists remaura_musteriler_created_at_idx
  on public.remaura_musteriler (created_at desc);

alter table public.remaura_musteriler enable row level security;

-- Bilinçli olarak permissive policy YOK — remaura_warnings ile aynı desen:
-- erişim servis-rol anahtarıyla (RLS baypas) + route'taki süper-admin geçidiyle.

-- ── koleksiyonlar → müşteri bağı ────────────────────────────────────────────
-- Mevcut kayıtlar musteri_id = null kalır (müşterisiz genel havuz), bozulmaz.

alter table public.koleksiyonlar
  add column if not exists musteri_id uuid
  references public.remaura_musteriler(id) on delete set null;

create index if not exists koleksiyonlar_musteri_id_idx
  on public.koleksiyonlar (musteri_id, created_at desc);
