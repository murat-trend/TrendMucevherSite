-- ─────────────────────────────────────────────────────────────────────────────
-- Nextaura B2B Firma Tablosu
-- Her kuyumcu firmasının marka, kredi ve paket bilgilerini tutar
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS nextaura_firms (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  slug            text        NOT NULL UNIQUE,           -- URL: nextaura.trendmucevher.com/[slug]
  name            text        NOT NULL,                  -- Firma adı (ekranda görünür)
  logo_url        text,                                  -- Kuyumcunun logosu
  theme_color     text        NOT NULL DEFAULT '#b76e79',-- Marka rengi (hex)
  plan            text        NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter','pro','plus')),
  credits         integer     NOT NULL DEFAULT 0,
  extra_languages text[]      NOT NULL DEFAULT '{}',     -- Plus pakette ek diller
  active          boolean     NOT NULL DEFAULT true,
  owner_user_id   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Hızlı slug arama
CREATE INDEX IF NOT EXISTS nextaura_firms_slug_idx ON nextaura_firms (slug);
CREATE INDEX IF NOT EXISTS nextaura_firms_active_idx ON nextaura_firms (active);

-- Güncelleme tarihi otomatik güncellensin
CREATE OR REPLACE FUNCTION nextaura_firms_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER nextaura_firms_updated_at
  BEFORE UPDATE ON nextaura_firms
  FOR EACH ROW EXECUTE FUNCTION nextaura_firms_set_updated_at();

-- RLS — sadece service_role yönetir
ALTER TABLE nextaura_firms ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE nextaura_firms IS
  'Nextaura B2B kuyumcu firmaları. Her firma kendi slug ile tablet arayüzüne erişir.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Nextaura Müşteri Oturumları
-- Her satış görüşmesi bir oturum — tasarımlar, müşteri bilgisi, sipariş durumu
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS nextaura_sessions (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id         uuid        NOT NULL REFERENCES nextaura_firms(id) ON DELETE CASCADE,
  customer_name   text,
  customer_phone  text,
  designs         jsonb       NOT NULL DEFAULT '[]',     -- üretilen görseller + meta
  selected_design jsonb,                                 -- müşterinin seçtiği
  status          text        NOT NULL DEFAULT 'active' CHECK (status IN ('active','ordered','cancelled')),
  notes           text,
  deposit_amount  numeric(10,2),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nextaura_sessions_firm_idx ON nextaura_sessions (firm_id);
CREATE INDEX IF NOT EXISTS nextaura_sessions_status_idx ON nextaura_sessions (status);

CREATE TRIGGER nextaura_sessions_updated_at
  BEFORE UPDATE ON nextaura_sessions
  FOR EACH ROW EXECUTE FUNCTION nextaura_firms_set_updated_at();

ALTER TABLE nextaura_sessions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE nextaura_sessions IS
  'Nextaura müşteri görüşme oturumları. Tasarımlar, seçim ve sipariş bilgisi.';
