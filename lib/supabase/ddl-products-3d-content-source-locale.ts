/**
 * products_3d.content_source_locale şeması (idempotent).
 * @sync supabase/migrations/20260413204500_products_3d_content_source_locale.sql — içerik aynı kalmalı.
 */
export const PRODUCTS_3D_CONTENT_SOURCE_LOCALE_DDL = `
-- Satıcının ürün adı/hikaye metnini yazdığı dil (çeviri kaynağı)
alter table public.products_3d
  add column if not exists content_source_locale text;

update public.products_3d
set content_source_locale = 'tr'
where content_source_locale is null
   or trim(content_source_locale) not in ('tr', 'en', 'de', 'ru');

alter table public.products_3d
  alter column content_source_locale set default 'tr';

alter table public.products_3d
  alter column content_source_locale set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_3d_content_source_locale_check'
  ) then
    alter table public.products_3d
      add constraint products_3d_content_source_locale_check
      check (content_source_locale in ('tr', 'en', 'de', 'ru'));
  end if;
end $$;

comment on column public.products_3d.content_source_locale is
  'Seller text language used as translation source: tr | en | de | ru';

comment on column public.products_3d.translations is
  'JSON: { "tr"|"en"|"de"|"ru": { "name", "story" } } — vitrin dilleri; name/story kolonları satıcı kaynağı';
`.trim();
