-- Satıcı kampanya API: ürün listesi, indirim, kredi, banner görseli
ALTER TABLE public.ad_campaigns
  ADD COLUMN IF NOT EXISTS product_ids jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS discount_rate numeric,
  ADD COLUMN IF NOT EXISTS discount_type text,
  ADD COLUMN IF NOT EXISTS credit_cost integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS banner_image_url text;

COMMENT ON COLUMN public.ad_campaigns.product_ids IS 'Seçilen products_3d id listesi (json array)';
COMMENT ON COLUMN public.ad_campaigns.discount_type IS 'percent | try';
COMMENT ON COLUMN public.ad_campaigns.credit_cost IS 'Oluştururken düşülen toplam kredi';
