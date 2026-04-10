-- Ödenmiş siparişlerde ürün silinse bile indirme devam etsin diye dosya URL kopyası.
alter table public.orders
  add column if not exists download_glb_url text,
  add column if not exists download_stl_url text;
