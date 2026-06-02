export const dynamic = 'force-dynamic';

import { type Metadata } from "next";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { type DbProduct3D, mapDbProductToUi } from "@/lib/modeller/supabase";
import { PortfolyoPageClient } from "@/components/portfolyo/PortfolyoPageClient";

export const metadata: Metadata = {
  title: { absolute: "3D Mücevher Portföyü | Trend Mücevher" },
  description:
    "Döküme hazır 3D mücevher modelleri — STL ve GLB formatında. Yüzük, kolye, küpe ve bilezik. Anında indir, atölyende kullan.",
  alternates: {
    canonical: "https://trendmucevher.com/portfolyo/",
  },
  openGraph: {
    title: "3D Mücevher Portföyü | Trend Mücevher",
    description: "Döküme hazır 3D mücevher modelleri — STL ve GLB formatında.",
    url: "https://trendmucevher.com/portfolyo/",
  },
};

export default async function PortfolyoPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase
    .from("products_3d")
    .select("*")
    .eq("is_published", true)
    .eq("show_on_portfolio", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[portfolyo:list] supabase error", error);
  }

  const models = ((data ?? []) as DbProduct3D[]).map(mapDbProductToUi);

  return <PortfolyoPageClient models={models} />;
}
