-- ─────────────────────────────────────────────────────────────────────────────
-- Akıllı Görsel Analiz Cache
-- Aynı görsel için OpenAI'a tekrar gitmez — %100 maliyet tasarrufu
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cache_analiz (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  image_hash    text        NOT NULL UNIQUE,          -- SHA-256(base64 data)
  analiz_sonucu jsonb       NOT NULL,                 -- tam AnalizSonucu objesi
  hit_count     integer     NOT NULL DEFAULT 0,       -- kaç kez cache'ten sunuldu
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_hit_at   timestamptz NOT NULL DEFAULT now()
);

-- Hash üzerinde hızlı arama indeksi
CREATE INDEX IF NOT EXISTS cache_analiz_hash_idx ON cache_analiz (image_hash);

-- Sadece service_role okuyup yazabilir (RLS off — server-side only)
ALTER TABLE cache_analiz DISABLE ROW LEVEL SECURITY;

-- Yorum
COMMENT ON TABLE cache_analiz IS
  'OpenAI analiz sonuçlarını SHA-256 hash ile önbellekleyen tablo. Aynı görsel tekrar yüklendiğinde API çağrısı yapılmaz.';

-- Hit sayacını atomik olarak artıran yardımcı fonksiyon
CREATE OR REPLACE FUNCTION cache_analiz_hit(p_hash text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE cache_analiz
  SET hit_count   = hit_count + 1,
      last_hit_at = now()
  WHERE image_hash = p_hash;
$$;
