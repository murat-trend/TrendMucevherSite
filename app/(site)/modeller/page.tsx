import { type Metadata } from "next";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { type DbProduct3D, mapDbProductToUi } from "@/lib/modeller/supabase";
import { ModellerPageClient } from "@/components/modeller/ModellerPageClient";

export const metadata: Metadata = {
  title: "3D Jewelry Models | Trend Mücevher",
  description:
    "Cast-ready 3D jewelry models in STL and GLB format. Rings, necklaces, earrings and bracelets. Instant download, ready for your workshop.",
  alternates: {
    canonical: "https://trendmucevher.com/modeller",
  },
  openGraph: {
    title: "3D Jewelry Models | Trend Mücevher",
    description: "Cast-ready 3D jewelry models in STL and GLB format.",
    url: "https://trendmucevher.com/modeller",
  },
};

export default async function ModellerPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase
    .from("products_3d")
    .select("*")
    .eq("is_published", true)
    .eq("show_on_modeller", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[modeller:list] supabase error", error);
  }

  const models = ((data ?? []) as DbProduct3D[]).map(mapDbProductToUi);

  return <ModellerPageClient models={models} />;
}
