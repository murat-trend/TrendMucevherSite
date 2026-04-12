import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { createClient } from "@/utils/supabase/server";
import type { Seller, SellerStatus } from "@/components/admin/sellers/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProfileRow = {
  id: string;
  store_name: string | null;
  role: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  avatar_url?: string | null;
  iban?: string | null;
  bank_name?: string | null;
  account_holder?: string | null;
  whatsapp_number?: string | null;
};

type OrderRow = {
  seller_id: string | null;
  amount: number | string | null;
  payment_status: string | null;
};

function mapRoleToStatus(role: string | null): SellerStatus {
  if (role === "seller") return "active";
  if (role === "pending_seller") return "pending";
  if (role === "suspended" || role === "blocked") return "suspended";
  return "pending";
}

function isSellerListRole(role: string | null): boolean {
  if (role == null) return true;
  if (role === "buyer" || role === "admin") return false;
  return true;
}

function profileToSeller(profile: ProfileRow, stats: { orderCount: number; totalSales: number; returnCount: number }): Seller {
  const returnRate = stats.orderCount > 0 ? (stats.returnCount / stats.orderCount) * 100 : 0;
  const registeredAt =
    (profile.created_at && profile.created_at.slice(0, 10)) ||
    (profile.updated_at && profile.updated_at.slice(0, 10)) ||
    new Date().toISOString().slice(0, 10);

  return {
    id: profile.id,
    storeName: profile.store_name?.trim() || "İsimsiz Mağaza",
    ownerName: profile.account_holder?.trim() || "—",
    ownerEmail: "—",
    phone: profile.whatsapp_number?.trim() || "—",
    status: mapRoleToStatus(profile.role),
    totalSales: stats.totalSales,
    orderCount: stats.orderCount,
    returnCount: stats.returnCount,
    returnRate,
    rating: 0,
    registeredAt,
  };
}

function aggregateOrdersBySeller(orders: OrderRow[]): Map<string, { orderCount: number; totalSales: number; returnCount: number }> {
  const map = new Map<string, { orderCount: number; totalSales: number; returnCount: number }>();
  for (const o of orders) {
    const sid = o.seller_id;
    if (!sid) continue;
    if (!map.has(sid)) {
      map.set(sid, { orderCount: 0, totalSales: 0, returnCount: 0 });
    }
    const s = map.get(sid)!;
    s.orderCount += 1;
    const amt = typeof o.amount === "number" ? o.amount : Number(o.amount ?? 0);
    if (o.payment_status === "paid" && Number.isFinite(amt)) s.totalSales += amt;
    if (o.payment_status === "refunded") s.returnCount += 1;
  }
  return map;
}

async function fetchAllOrders(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
): Promise<OrderRow[]> {
  const pageSize = 1000;
  let from = 0;
  const all: OrderRow[] = [];
  for (;;) {
    const { data, error } = await admin
      .from("orders")
      .select("seller_id, amount, payment_status")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const chunk = (data ?? []) as OrderRow[];
    all.push(...chunk);
    if (chunk.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function requireServiceAndAdmin(): Promise<
  NextResponse | { supabase: ReturnType<typeof createServiceClient> }
> {
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
  const role = profile?.role;
  if (!isRemauraSuperAdminUserId(user.id) && role !== "admin") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  return { supabase: createServiceClient(url, serviceKey) };
}

export async function GET(req: NextRequest) {
  const gate = await requireServiceAndAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const singleId = req.nextUrl.searchParams.get("id")?.trim();

  try {
    const { data: profilesRaw, error: pErr } = await supabase
      .from("profiles")
      .select("id, store_name, role, created_at, updated_at, avatar_url, iban, bank_name, account_holder, whatsapp_number")
      .order("id", { ascending: false });

    if (pErr) {
      return NextResponse.json({ error: pErr.message }, { status: 500 });
    }

    const profiles = (profilesRaw ?? []) as ProfileRow[];
    const sellerProfiles = profiles.filter((p) => isSellerListRole(p.role));

    const orders = await fetchAllOrders(supabase);
    const agg = aggregateOrdersBySeller(orders);

    const buildSeller = (profile: ProfileRow): Seller => {
      const st = agg.get(profile.id) ?? { orderCount: 0, totalSales: 0, returnCount: 0 };
      return profileToSeller(profile, st);
    };

    if (singleId) {
      const profile = sellerProfiles.find((p) => p.id === singleId);
      if (!profile) {
        return NextResponse.json({ error: "Satıcı bulunamadı" }, { status: 404 });
      }
      return NextResponse.json({ seller: buildSeller(profile) });
    }

    const sellers: Seller[] = sellerProfiles.map(buildSeller);
    return NextResponse.json({ sellers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const gate = await requireServiceAndAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  let body: { sellerId?: string; action?: string };
  try {
    body = (await req.json()) as { sellerId?: string; action?: string };
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const sellerId = body.sellerId?.trim();
  const action = body.action?.trim();
  if (!sellerId || !action) {
    return NextResponse.json({ error: "sellerId ve action gerekli" }, { status: 400 });
  }

  const roleMap: Record<string, string> = {
    approve: "seller",
    suspend: "suspended",
    block: "blocked",
  };

  const newRole = roleMap[action];
  if (!newRole) {
    return NextResponse.json({ error: "Geçersiz aksiyon" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- profiles şeması jenerikte yok
  const { error } = await (supabase as any).from("profiles").update({ role: newRole }).eq("id", sellerId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const gate = await requireServiceAndAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  let body: { sellerId?: string };
  try {
    body = (await req.json()) as { sellerId?: string };
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const sellerId = body.sellerId?.trim();
  if (!sellerId) {
    return NextResponse.json({ error: "sellerId gerekli" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("profiles").delete().eq("id", sellerId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
