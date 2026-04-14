import type { Metadata } from "next";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const SITE_URL = "https://trendmucevher.com";
const SITE_NAME = "Trend Mücevher";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return { title: SITE_NAME };

  const supabase = createServiceClient(url, key);
  const { data } = await supabase
    .from("products_3d")
    .select("name, story, thumbnail_url")
    .eq("slug", slug)
    .maybeSingle();

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
