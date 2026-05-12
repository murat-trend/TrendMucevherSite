import { type Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { type DbProduct3D, mapDbProductToUi } from "@/lib/modeller/supabase";
import { ModelDetayClient } from "@/components/modeller/ModelDetayClient";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase
    .from("products_3d")
    .select("name, name_en, story_en, thumbnail_url, tags")
    .eq("slug", slug)
    .maybeSingle();

  if (!data) return { title: "Model Not Found" };

  const name = (data.name_en as string | null)?.trim() || (data.name as string);
  const rawStory = (data.story_en as string | null)?.trim() || "";
  const description =
    rawStory.slice(0, 155) ||
    `${name} — Casting-ready gothic and luxury 3D jewelry STL file by Murat Kaynaroğlu. Instant digital download.`;
  const canonical = `https://trendmucevher.com/modeller/${slug}/`;
  const image = data.thumbnail_url as string | null;
  const tags = Array.isArray(data.tags) ? (data.tags as string[]) : [];
  const keywords = [name, "STL file", "3D jewelry model", "casting ready", ...tags].filter(Boolean);

  return {
    title: { absolute: `${name} | Cast-Ready 3D Jewelry STL | Murat Kaynaroğlu` },
    description,
    keywords,
    alternates: { canonical },
    openGraph: {
      title: `${name} | Cast-Ready 3D Jewelry STL | Murat Kaynaroğlu`,
      description,
      url: canonical,
      images: image ? [{ url: image, alt: name }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: `${name} | Cast-Ready 3D Jewelry STL | Murat Kaynaroğlu`,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ModelDetayPage({ params }: Props) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase
    .from("products_3d")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!data) notFound();

  const product = mapDbProductToUi(data as DbProduct3D);
  const sellerId = (data as { seller_id?: string | null }).seller_id ?? null;
  const sellerEmail =
    (data as { seller_email?: string | null }).seller_email?.trim() ?? null;

  const d = data as Record<string, unknown>;
  const nameEn = (d.name_en as string | null)?.trim() || (d.name as string);
  const storyEn = (d.story_en as string | null)?.trim() || "";
  const thumbnailUrl = d.thumbnail_url as string | null;
  const personalPrice = d.personal_price as number | null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: nameEn,
    ...(storyEn && { description: storyEn.slice(0, 500) }),
    ...(thumbnailUrl && { image: thumbnailUrl }),
    brand: {
      "@type": "Brand",
      name: "Murat Kaynaroğlu",
    },
    author: {
      "@type": "Person",
      name: "Murat Kaynaroğlu",
      url: "https://trendmucevher.com",
    },
    offers: {
      "@type": "Offer",
      ...(personalPrice != null && { price: personalPrice }),
      priceCurrency: "TRY",
      availability: "https://schema.org/InStock",
      url: `https://trendmucevher.com/modeller/${slug}/`,
      seller: {
        "@type": "Person",
        name: "Murat Kaynaroğlu",
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ModelDetayClient
        product={product}
        sellerId={sellerId}
        sellerEmail={sellerEmail}
      />
    </>
  );
}
