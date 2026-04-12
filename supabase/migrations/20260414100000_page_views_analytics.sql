-- Site geneli sayfa görüntüleme analitiği (mevcut product_id + source kolonları korunur)
alter table public.page_views add column if not exists page_path text;
alter table public.page_views add column if not exists ip_address text;
alter table public.page_views add column if not exists user_agent text;
alter table public.page_views add column if not exists country text;
alter table public.page_views add column if not exists user_id text;
alter table public.page_views add column if not exists session_id text;

-- created_at yoksa ekle (çoğu projede zaten vardır)
alter table public.page_views add column if not exists created_at timestamptz default now();

create index if not exists page_views_created_at_idx on public.page_views (created_at desc);
create index if not exists page_views_page_path_idx on public.page_views (page_path) where page_path is not null;
