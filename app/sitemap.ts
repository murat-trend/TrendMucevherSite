import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://trendmucevher.com").replace(/\/$/, "");

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, priority: 1, changeFrequency: "daily" },
    { url: `${BASE_URL}/modeller`, priority: 0.9, changeFrequency: "daily" },
    { url: `${BASE_URL}/remaura`, priority: 0.9, changeFrequency: "weekly" },
    { url: `${BASE_URL}/remaura/nedir`, priority: 0.8, changeFrequency: "monthly" },
    { url: `${BASE_URL}/remaura/arka-plan-kaldir`, priority: 0.7, changeFrequency: "monthly" },
    { url: `${BASE_URL}/remaura/foto-edit`, priority: 0.7, changeFrequency: "monthly" },
    { url: `${BASE_URL}/remaura/nesne-kaldir`, priority: 0.7, changeFrequency: "monthly" },
    { url: `${BASE_URL}/convert`, priority: 0.7, changeFrequency: "monthly" },
    { url: `${BASE_URL}/ozel-siparis`, priority: 0.8, changeFrequency: "monthly" },
    { url: `${BASE_URL}/fiyatlandirma`, priority: 0.8, changeFrequency: "weekly" },
    { url: `${BASE_URL}/gunluk`, priority: 0.7, changeFrequency: "weekly" },
    { url: `${BASE_URL}/hakkimizda`, priority: 0.6, changeFrequency: "monthly" },
    { url: `${BASE_URL}/iletisim`, priority: 0.6, changeFrequency: "monthly" },
    { url: `${BASE_URL}/nasil-calisir`, priority: 0.6, changeFrequency: "monthly" },
    { url: `${BASE_URL}/satici-ol`, priority: 0.7, changeFrequency: "monthly" },
  ];

  const supabase = getSupabase();
  if (!supabase) {
    return staticPages;
  }

  const { data: products, error: productsError } = await supabase
    .from("products_3d")
    .select("slug, updated_at, created_at")
    .eq("is_published", true);

  const productPages: MetadataRoute.Sitemap =
    productsError || !products
      ? []
      : products
          .filter((p) => typeof p.slug === "string" && p.slug.length > 0)
          .map((p) => {
            const row = p as { slug: string; updated_at?: string | null; created_at?: string | null };
            const raw = row.updated_at || row.created_at;
            return {
              url: `${BASE_URL}/modeller/${row.slug}`,
              lastModified: raw ? new Date(raw) : new Date(),
              priority: 0.8,
              changeFrequency: "weekly" as const,
            };
          });

  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("slug, updated_at, published_at, created_at")
    .eq("is_published", true);

  const postPages: MetadataRoute.Sitemap =
    postsError || !posts
      ? []
      : posts
          .filter((p) => typeof p.slug === "string" && p.slug.length > 0)
          .map((p) => {
            const row = p as {
              slug: string;
              updated_at?: string | null;
              published_at?: string | null;
              created_at?: string | null;
            };
            const raw = row.updated_at || row.published_at || row.created_at;
            return {
              url: `${BASE_URL}/gunluk/${row.slug}`,
              lastModified: raw ? new Date(raw) : new Date(),
              priority: 0.7,
              changeFrequency: "monthly" as const,
            };
          });

  return [...staticPages, ...productPages, ...postPages];
}
