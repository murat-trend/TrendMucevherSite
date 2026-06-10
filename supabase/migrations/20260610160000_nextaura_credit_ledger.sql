-- ─────────────────────────────────────────────────────────────────────────────
-- Nextaura Kredi Defteri
-- Her kredi hareketi (yükleme, harcama, iade) buraya kayıt edilir.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS nextaura_credit_ledger (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id      uuid        NOT NULL REFERENCES nextaura_firms(id) ON DELETE CASCADE,
  amount       integer     NOT NULL,                        -- pozitif = yükleme, negatif = harcama
  type         text        NOT NULL CHECK (type IN ('load','spend','refund','adjust')),
  description  text,                                        -- "Admin yüklemesi", "Tasarım üretimi", vb.
  balance_after integer    NOT NULL,                        -- işlem sonrası bakiye
  actor        text,                                        -- admin user_id veya 'system'
  session_id   uuid        REFERENCES nextaura_sessions(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nextaura_credit_ledger_firm_idx ON nextaura_credit_ledger (firm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS nextaura_credit_ledger_type_idx ON nextaura_credit_ledger (type);

ALTER TABLE nextaura_credit_ledger ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE nextaura_credit_ledger IS
  'Nextaura firma kredi hareketleri. amount > 0 yükleme, amount < 0 harcama.';
