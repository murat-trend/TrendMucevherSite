import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug") ?? "";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  let name = "Nextaura";
  let themeColor = "#b76e79";
  let startUrl = "/";

  if (slug && url && serviceKey) {
    const supabase = createServiceClient(url, serviceKey);
    const { data: firm } = await supabase
      .from("nextaura_firms")
      .select("name, theme_color, slug")
      .eq("slug", slug)
      .eq("active", true)
      .maybeSingle();

    if (firm) {
      name = firm.name as string;
      themeColor = (firm.theme_color as string) || "#b76e79";
      startUrl = `/nextaura/${firm.slug}`;
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://trendmucevher.com";

  const manifest = {
    name,
    short_name: name,
    description: "Hayalinizdeki mücevheri tasarlayın",
    start_url: startUrl,
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: themeColor,
    lang: "tr",
    icons: [
      {
        src: `${baseUrl}/nextaura-icon-192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: `${baseUrl}/nextaura-icon-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
    screenshots: [],
    categories: ["shopping", "lifestyle"],
  };

  return new NextResponse(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
