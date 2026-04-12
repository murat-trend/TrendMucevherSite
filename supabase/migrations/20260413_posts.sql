-- Blog / günlük yazıları (anon: yalnızca yayınlananları okur; yazma service_role ile API üzerinden)
create table if not exists public.posts (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  slug text unique not null,
  content text,
  excerpt text,
  cover_image_url text,
  category text default 'genel',
  tags text[],
  is_published boolean default false,
  author_id uuid references auth.users (id),
  seo_title text,
  seo_description text,
  read_time_minutes integer default 5,
  created_at timestamptz default now(),
  published_at timestamptz,
  updated_at timestamptz default now()
);

alter table public.posts enable row level security;

drop policy if exists posts_select_published on public.posts;
drop policy if exists posts_admin_all on public.posts;
drop policy if exists "public can read published" on public.posts;
drop policy if exists "service role full access" on public.posts;

create policy "public can read published" on public.posts for select using (is_published = true);
create policy "service role full access" on public.posts for all using (false);

create index if not exists posts_slug_idx on public.posts (slug);
create index if not exists posts_published_idx on public.posts (is_published, published_at desc);
