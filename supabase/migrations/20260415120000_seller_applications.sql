-- seller_applications: satıcı başvuru tablosu
create table public.seller_applications (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users(id) on delete cascade,
  email          text        not null,
  full_name      text        not null check (length(full_name)   between 2 and 150),
  store_name     text        not null check (length(store_name)  between 2 and 150),
  phone          text        not null check (length(phone)       between 7 and 20),
  tax_number     text        not null check (length(tax_number)  between 10 and 11),
  description    text        not null check (length(description) between 10 and 2000),
  status         text        not null default 'pending'
                             check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_at    timestamptz,
  reviewed_by    uuid        references auth.users(id),
  created_at     timestamptz not null default now()
);

-- Her kullanıcı en fazla 1 aktif başvuru yapabilir
create unique index seller_applications_one_pending_per_user
  on public.seller_applications (user_id)
  where status = 'pending';

create index seller_applications_user_id_idx  on public.seller_applications (user_id);
create index seller_applications_status_idx   on public.seller_applications (status);

-- RLS
alter table public.seller_applications enable row level security;

create policy "Kullanıcı kendi başvurusunu ekleyebilir"
  on public.seller_applications for insert
  with check (auth.uid() = user_id);

create policy "Kullanıcı kendi başvurusunu görebilir"
  on public.seller_applications for select
  using (auth.uid() = user_id);
