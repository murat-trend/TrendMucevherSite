-- remaura_warnings: süper-admin uyarı akışı.
-- Bir remaura aracı (buton) bir dış sağlayıcı hatasıyla patladığında (kredi bitti,
-- anahtar geçersiz, kota…) buraya kaydedilir. YALNIZCA süper-admin görür; veri
-- servis-rol anahtarıyla yazılır/okunur (ticari sır: gerçek sağlayıcı adları burada).
create table if not exists public.remaura_warnings (
  id         uuid        default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  tool       text        not null,               -- araç slug, ör. "koleksiyon-edit"
  action     text,                                -- buton adı, ör. "Koleksiyon Üret"
  provider   text        not null,               -- fal | stability | gemini | openai | anthropic | tripo | meshy
  kind       text        not null,               -- payment | auth | config | rate_limit | timeout | server | unknown
  status     integer,                             -- HTTP durum kodu
  reason     text,                                -- ham sebep (süper-admin görür)
  source     text        not null default 'live', -- live | health
  resolved   boolean     not null default false
);

alter table public.remaura_warnings enable row level security;

-- Bilinçli olarak permissive policy YOK: erişim yalnız servis-rol anahtarıyla
-- (RLS'i baypas eder) ve API'de süper-admin geçidiyle olur. Anon/auth erişimi kapalı.

create index if not exists remaura_warnings_open
  on public.remaura_warnings(resolved, created_at desc);

create index if not exists remaura_warnings_provider
  on public.remaura_warnings(provider, resolved);
