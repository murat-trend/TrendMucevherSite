alter table public.products_3d
  add column if not exists seller_note text;

comment on column public.products_3d.seller_note is
  'Satıcının teknik notu (üretilebilirlik, 3D printer / CNC uyumluluğu, waterlight vb.)';
