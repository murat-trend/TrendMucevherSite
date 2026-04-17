alter table public.orders
  add column if not exists discount_code    text,
  add column if not exists discount_amount  numeric not null default 0;
