-- mesh_jobs: kullanıcının 3D üretimlerini 24 saat saklar
create table if not exists public.mesh_jobs (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references auth.users(id) on delete cascade not null,
  task_id     text        not null,
  image_path  text,                          -- supabase storage: mesh-inputs/{user_id}/{filename}
  created_at  timestamptz default now()      not null,
  expires_at  timestamptz default (now() + interval '24 hours') not null
);

alter table public.mesh_jobs enable row level security;

create policy "Kullanıcı kendi kayıtlarını görebilir"
  on public.mesh_jobs for select
  using (auth.uid() = user_id);

create policy "Kullanıcı kendi kaydını ekleyebilir"
  on public.mesh_jobs for insert
  with check (auth.uid() = user_id);

create policy "Kullanıcı kendi kaydını silebilir"
  on public.mesh_jobs for delete
  using (auth.uid() = user_id);

create index if not exists mesh_jobs_user_expires
  on public.mesh_jobs(user_id, expires_at desc);
