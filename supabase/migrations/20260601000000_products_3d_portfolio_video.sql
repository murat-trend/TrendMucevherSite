-- products_3d: portfolyo + video alanları
ALTER TABLE products_3d
  ADD COLUMN IF NOT EXISTS is_free        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_on_portfolio boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS video_url      text    NULL;
