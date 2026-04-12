import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReviewBase = {
  id: string;
  created_at: string;
  rating: number | null;
  comment: string | null;
  buyer_id: string | null;
  product_id: string | null;
};

export type AdminReviewRow = ReviewBase & {
  buyer_display: string;
  product_title: string;
};

async function requireAdminService():
  Promise<NextResponse | { supabase: ReturnType<typeof createServiceClient> }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Sunucu yapılandırması eksik" }, { status: 500 });
  }

  const cookieStore = await cookies();
  const auth = createClient(cookieStore);
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
  }

  const { data: profile } = await auth.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!isRemauraSuperAdminUserId(user.id) && profile?.role !== "admin") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  return { supabase: createServiceClient(url, serviceKey) };
}

export async function GET() {
  const gate = await requireAdminService();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("id, created_at, rating, comment, buyer_id, product_id")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = (reviews ?? []) as ReviewBase[];

  const buyerIds = [...new Set(list.map((r) => r.buyer_id).filter((id): id is string => Boolean(id)))];
  const productIds = [...new Set(list.map((r) => r.product_id).filter((id): id is string => Boolean(id)))];

  let profiles: { id: string; store_name: string | null }[] = [];
  if (buyerIds.length > 0) {
    const { data: profRows, error: pErr } = await supabase.from("profiles").select("id, store_name").in("id", buyerIds);
    if (pErr) {
      return NextResponse.json({ error: pErr.message }, { status: 500 });
    }
    profiles = profRows ?? [];
  }

  let products: { id: string; name: string | null }[] = [];
  if (productIds.length > 0) {
    const { data: prodRows, error: prErr } = await supabase.from("products_3d").select("id, name").in("id", productIds);
    if (prErr) {
      return NextResponse.json({ error: prErr.message }, { status: 500 });
    }
    products = prodRows ?? [];
  }

  const profileMap = Object.fromEntries(
    profiles.map((p) => [p.id, typeof p.store_name === "string" ? p.store_name.trim() : ""]),
  ) as Record<string, string>;

  const productMap = Object.fromEntries(
    products.map((p) => [p.id, typeof p.name === "string" ? p.name.trim() : ""]),
  ) as Record<string, string>;

  const enriched: AdminReviewRow[] = list.map((r) => {
    const store = r.buyer_id ? profileMap[r.buyer_id] ?? "" : "";
    const buyer_display = store || (r.buyer_id ? `${r.buyer_id.slice(0, 8)}…` : "—");
    const title = r.product_id ? productMap[r.product_id] ?? "" : "";
    const product_title = title || "—";
    return {
      ...r,
      buyer_display,
      product_title,
    };
  });

  return NextResponse.json({ reviews: enriched });
}

export async function DELETE(req: Request) {
  const gate = await requireAdminService();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const id = new URL(req.url).searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return NextResponse.json({ error: "id parametresi gerekli" }, { status: 400 });
  }

  const { error } = await supabase.from("reviews").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
