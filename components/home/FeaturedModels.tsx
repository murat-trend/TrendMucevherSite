import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { FeaturedModelsClient } from "./FeaturedModelsClient";

export async function FeaturedModels() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase
    .from("products_3d")
    .select("id, name, slug, thumbnail_url, personal_price, jewelry_type")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(6);

  return <FeaturedModelsClient models={data ?? []} />;
}
