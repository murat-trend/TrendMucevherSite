export type PostRow = {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  cover_image_url: string | null;
  category: string | null;
  tags: string[] | null;
  is_published: boolean;
  author_id: string | null;
  seo_title: string | null;
  seo_description: string | null;
  read_time_minutes: number | null;
  created_at: string;
  published_at: string | null;
  updated_at: string | null;
  // i18n
  title_en: string | null;
  content_en: string | null;
  excerpt_en: string | null;
  title_de: string | null;
  content_de: string | null;
  excerpt_de: string | null;
  title_ru: string | null;
  content_ru: string | null;
  excerpt_ru: string | null;
  translations: Record<string, { title?: string; content?: string; excerpt?: string }> | null;
};
