import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE = 1000;
const MAX_PAGES = 8;

type OrderScan = {
  buyer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  amount: number | null;
  payment_status: string | null;
  created_at: string;
};

type Agg = {
  order_count: number;
  paid_count: number;
  paid_total: number;
  last_at: string;
  latest_name: string;
  latest_email: string;
};

export type AdminCustomerRow = {
  buyer_id: string;
  display_name: string;
  email: string;
  order_count: number;
  paid_order_count: number;
  paid_total_try: number;
  last_order_at: string;
  profile_store_name: string | null;
};

function trimStr(v: string | null | undefined): string {
  return typeof v === "string" ? v.trim() : "";
}

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

  const all: OrderScan[] = [];
  for (let p = 0; p < MAX_PAGES; p++) {
    const from = p * PAGE;
    const { data, error } = await supabase
      .from("orders")
      .select("buyer_id, customer_name, customer_email, amount, payment_status, created_at")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const chunk = (data ?? []) as OrderScan[];
    all.push(...chunk);
    if (chunk.length < PAGE) break;
  }

  const byBuyer = new Map<string, Agg>();
  for (const o of all) {
    const bid = o.buyer_id;
    if (!bid) continue;
    const amt = Number(o.amount ?? 0);
    const paidAmt = Number.isFinite(amt) ? amt : 0;
    const isPaid = (o.payment_status ?? "").toLowerCase() === "paid";
    const name = trimStr(o.customer_name);
    const email = trimStr(o.customer_email);

    const existing = byBuyer.get(bid);
    if (!existing) {
      byBuyer.set(bid, {
        order_count: 1,
        paid_count: isPaid ? 1 : 0,
        paid_total: isPaid ? paidAmt : 0,
        last_at: o.created_at,
        latest_name: name,
        latest_email: email,
      });
      continue;
    }
    existing.order_count += 1;
    if (isPaid) {
      existing.paid_count += 1;
      existing.paid_total += paidAmt;
    }
  }

  const buyerIds = [...byBuyer.keys()];
  let storeById: Record<string, string> = {};
  if (buyerIds.length > 0) {
    const { data: profs, error: pErr } = await supabase.from("profiles").select("id, store_name").in("id", buyerIds);
    if (pErr) {
      return NextResponse.json({ error: pErr.message }, { status: 500 });
    }
    storeById = Object.fromEntries(
      (profs ?? []).map((r: { id: string; store_name: string | null }) => [
        r.id,
        typeof r.store_name === "string" ? r.store_name.trim() : "",
      ]),
    );
  }

  const customers: AdminCustomerRow[] = buyerIds.map((buyer_id) => {
    const a = byBuyer.get(buyer_id)!;
    const store = storeById[buyer_id] ?? "";
    const display_name = a.latest_name || store || `${buyer_id.slice(0, 8)}…`;
    const email = a.latest_email || "—";
    return {
      buyer_id,
      display_name,
      email,
      order_count: a.order_count,
      paid_order_count: a.paid_count,
      paid_total_try: a.paid_total,
      last_order_at: a.last_at,
      profile_store_name: store || null,
    };
  });

  customers.sort((x, y) => y.last_order_at.localeCompare(x.last_order_at));

  return NextResponse.json({
    customers,
    scanned_orders: all.length,
  });
}
