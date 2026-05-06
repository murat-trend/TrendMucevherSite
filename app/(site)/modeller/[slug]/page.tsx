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
    .select("name, name_en, story_en, thumbnail_url")
    .eq("slug", slug)
    .maybeSingle();

  if (!data) return { title: "Model Not Found" };

  const name = (data.name_en as string | null)?.trim() || (data.name as string);
  const rawStory = (data.story_en as string | null)?.trim() || "";
  const description =
    rawStory.slice(0, 155) ||
    `${name} — Cast-ready 3D jewelry model in GLB and STL format.`;
  const canonical = `https://trendmucevher.com/modeller/${slug}/`;
  const image = data.thumbnail_url as string | null;

  return {
    title: `${name} | Cast-Ready 3D Jewelry Model`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${name} | Cast-Ready 3D Jewelry Model`,
      description,
      url: canonical,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: `${name} | Cast-Ready 3D Jewelry Model`,
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

  return (
    <ModelDetayClient
      product={product}
      sellerId={sellerId}
      sellerEmail={sellerEmail}
    />
  );
}
