-- 1. Yeni kolonları ekle
alter table public.products_3d
  add column if not exists tags text[] default '{}',
  add column if not exists image_alts text[] default '{}';

-- 2. images jsonb → text[] dönüşümü
alter table public.products_3d
  add column if not exists images_new text[] default '{}';

update public.products_3d
set images_new = array_remove(array[
  images ->> 'on',
  images ->> 'arka',
  images ->> 'kenar',
  images ->> 'ust'
]::text[], null)
where images is not null
  and jsonb_typeof(images) = 'object';

alter table public.products_3d drop column if exists images;
alter table public.products_3d rename column images_new to images;

-- 3. GIN index
create index if not exists idx_products_3d_tags
  on public.products_3d using gin (tags);

-- 4. Commentler
comment on column public.products_3d.tags is
  'SEO ve filtreleme için ürün etiketleri (lowercase, max 10)';
comment on column public.products_3d.images is
  'Ürün görselleri URL dizisi, max 4. Sıra: satıcının yüklediği sıra';
comment on column public.products_3d.image_alts is
  'images ile aynı index sırasında alt metinler (SEO için)';
