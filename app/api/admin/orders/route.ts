import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAYMENT_ALLOWED = new Set(["pending", "paid", "refunded", "cancelled"]);

type ProfileEmbed = { store_name: string | null };

/** PostgREST may return a single object or an array for embedded FK rows. */
export type AdminOrderRow = {
  id: string;
  created_at: string;
  amount: number | null;
  payment_status: string | null;
  buyer_id: string | null;
  seller_id: string | null;
  product_id: string | null;
  customer_name: string | null;
  product_name: string | null;
  products_3d: { name: string } | { name: string }[] | null;
  buyer_pf: ProfileEmbed | ProfileEmbed[] | null;
  seller_pf: ProfileEmbed | ProfileEmbed[] | null;
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
    .select(
      `
      id,
      created_at,
      amount,
      payment_status,
      buyer_id,
      seller_id,
      product_id,
      customer_name,
      product_name,
      products_3d(name),
      buyer_pf:profiles!orders_buyer_id_fkey(store_name),
      seller_pf:profiles!orders_seller_id_fkey(store_name)
    `,
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ orders: (orders ?? []) as AdminOrderRow[] });
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
