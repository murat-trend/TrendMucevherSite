-- Çok dilli ürün adı/hikaye (Claude ile doldurulur)
alter table public.products_3d
  add column if not exists translations jsonb;

comment on column public.products_3d.translations is
  'JSON: { "en": { "name", "story" }, "de": {...}, "ru": {...} } — Türkçe name/story ana kolonlarda';
