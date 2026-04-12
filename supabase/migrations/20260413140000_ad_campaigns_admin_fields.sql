-- Admin kampanya paneli: tarih ve tür alanları (tablo satıcı panelinde zaten kullanılıyor).
ALTER TABLE public.ad_campaigns
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS campaign_type text;

COMMENT ON COLUMN public.ad_campaigns.campaign_type IS 'discount | featured | banner';
