import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAYMENT_ALLOWED = new Set(["pending", "paid", "refunded", "cancelled"]);

type OrderBase = {
  id: string;
  created_at: string;
  amount: number | null;
  payment_status: string | null;
  buyer_id: string | null;
  seller_id: string | null;
  product_id: string | null;
  customer_name: string | null;
  product_name: string | null;
};

export type AdminOrderRow = OrderBase & {
  buyer_name: string;
  seller_name: string;
  product_title: string;
};

export async function GET() {
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

  const supabase = createServiceClient(url, serviceKey);

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, created_at, amount, payment_status, buyer_id, seller_id, product_id, customer_name, product_name")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = (orders ?? []) as OrderBase[];

  const buyerIds = [...new Set(list.map((o) => o.buyer_id).filter((id): id is string => Boolean(id)))];
  const sellerIds = [...new Set(list.map((o) => o.seller_id).filter((id): id is string => Boolean(id)))];
  const productIds = [...new Set(list.map((o) => o.product_id).filter((id): id is string => Boolean(id)))];
  const profileIds = [...new Set([...buyerIds, ...sellerIds])];

  let profiles: { id: string; store_name: string | null }[] = [];
  if (profileIds.length > 0) {
    const { data: profileRows, error: profileError } = await supabase
      .from("profiles")
      .select("id, store_name")
      .in("id", profileIds);
    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }
    profiles = profileRows ?? [];
  }

  let products: { id: string; name: string | null }[] = [];
  if (productIds.length > 0) {
    const { data: productRows, error: productError } = await supabase
      .from("products_3d")
      .select("id, name")
      .in("id", productIds);
    if (productError) {
      return NextResponse.json({ error: productError.message }, { status: 500 });
    }
    products = productRows ?? [];
  }

  const profileMap = Object.fromEntries(
    profiles.map((p) => [p.id, typeof p.store_name === "string" ? p.store_name.trim() : ""]),
  ) as Record<string, string>;

  const productMap = Object.fromEntries(
    products.map((p) => [p.id, typeof p.name === "string" ? p.name.trim() : ""]),
  ) as Record<string, string>;

  const enrichedOrders: AdminOrderRow[] = list.map((o) => {
    const customerName = typeof o.customer_name === "string" ? o.customer_name.trim() : "";
    const buyerStore = o.buyer_id ? profileMap[o.buyer_id] ?? "" : "";
    const buyer_name = customerName || buyerStore || (o.buyer_id ? `${o.buyer_id.slice(0, 8)}…` : "—");

    const sellerStore = o.seller_id ? profileMap[o.seller_id] ?? "" : "";
    const seller_name = sellerStore || (o.seller_id ? `${o.seller_id.slice(0, 8)}…` : "—");

    const fromTable = o.product_id ? productMap[o.product_id] ?? "" : "";
    const snapshot = typeof o.product_name === "string" ? o.product_name.trim() : "";
    const product_title = fromTable || snapshot || "—";

    return {
      ...o,
      buyer_name,
      seller_name,
      product_title,
    };
  });

  return NextResponse.json({ orders: enrichedOrders });
}

export async function PATCH(req: Request) {
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

  let body: { orderId?: string; status?: string };
  try {
    body = (await req.json()) as { orderId?: string; status?: string };
  } catch {
    return NextResponse.json({ error: "Geçersiz gövde" }, { status: 400 });
  }

  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  const status = typeof body.status === "string" ? body.status.trim().toLowerCase() : "";
  if (!orderId || !PAYMENT_ALLOWED.has(status)) {
    return NextResponse.json({ error: "orderId ve geçerli status gerekli (pending|paid|refunded|cancelled)." }, { status: 400 });
  }

  const supabase = createServiceClient(url, serviceKey);
  const { error } = await supabase.from("orders").update({ payment_status: status }).eq("id", orderId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
