-- cache_analiz tablosuna RLS etkinleştir
-- Hiçbir public politika eklenmez — sadece service_role erişebilir
-- anon ve authenticated roller tamamen engellenir

ALTER TABLE cache_analiz ENABLE ROW LEVEL SECURITY;
