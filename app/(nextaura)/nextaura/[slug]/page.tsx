import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { NextauraTablet } from "./NextauraTablet";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ embed?: string }> };

export default async function NextauraPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { embed } = await searchParams;
  const isEmbed = embed === "1";
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: firm } = await supabase
    .from("nextaura_firms")
    .select("id, slug, name, logo_url, theme_color, plan, extra_languages")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (!firm) notFound();

  return <NextauraTablet firm={firm} isEmbed={isEmbed} />;
}
