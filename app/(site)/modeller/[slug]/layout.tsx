import type { Metadata } from "next";

const SITE_URL = "https://trendmucevher.com";
const SITE_NAME = "Trend Mücevher";

type ProductRow = {
  name: string | null;
  story: string | null;
  thumbnail_url: string | null;
};

async function fetchProductMeta(slug: string): Promise<ProductRow | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const endpoint = `${url}/rest/v1/products_3d?slug=eq.${encodeURIComponent(slug)}&select=name,story,thumbnail_url&limit=1`;

  const res = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) return null;
  const rows: ProductRow[] = await res.json();
  return rows[0] ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchProductMeta(slug);

  if (!data) return { title: SITE_NAME };

  const title = data.name ? `${data.name} | ${SITE_NAME}` : SITE_NAME;
  const description =
    typeof data.story === "string" && data.story.trim()
      ? data.story.trim().slice(0, 160)
      : undefined;
  const canonical = `${SITE_URL}/modeller/${slug}`;
  const thumbnail =
    typeof data.thumbnail_url === "string" && data.thumbnail_url.trim()
      ? data.thumbnail_url.trim()
      : null;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      ...(description ? { description } : {}),
      url: canonical,
      siteName: SITE_NAME,
      ...(thumbnail
        ? { images: [{ url: thumbnail, width: 800, height: 800, alt: data.name ?? "" }] }
        : {}),
    },
  };
}

export default function ModellerSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
