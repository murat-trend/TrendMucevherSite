import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { createClient } from "@/utils/supabase/server";
import { DEFAULT_PLATFORM_COMMISSION_RATE } from "@/lib/admin/finance-constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHUNK = 1000;
const MAX_PAID_PAGES = 40;

function monthKeyUtc(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export type FinanceIncomeMonthlyRow = { month: string; totalTry: number; orderCount: number };

export type FinanceIncomeSellerRow = {
  id: string;
  seller: string;
  period: string;
  asOfDate: string;
  earnings: number;
  commission: number;
  net: number;
  status: "Hesaplanan";
  orderCount: number;
};

export type FinanceLedgerRow = {
  id: string;
  created_at: string;
  user_id: string;
  amount: number;
  type: string;
  description: string | null;
};

export async function GET(req: Request) {
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
  const sp = new URL(req.url).searchParams;
  const fromIso = sp.get("from")?.trim() || "";
  const toIso = sp.get("to")?.trim() || "";

  const now = new Date();
  const defaultTo = now.toISOString().slice(0, 10);
  const defaultFromDate = new Date(now.getTime() - 90 * 86400000);
  const defaultFrom = defaultFromDate.toISOString().slice(0, 10);

  const rangeStart = fromIso || defaultFrom;
  const rangeEnd = toIso || defaultTo;
  const rangeStartTs = `${rangeStart}T00:00:00.000Z`;
  const rangeEndTs = `${rangeEnd}T23:59:59.999Z`;

  try {
    type PaidOrder = { amount: number | null; created_at: string; seller_id: string | null };
    const paidOrders: PaidOrder[] = [];
    let from = 0;
    let pages = 0;
    for (;;) {
      if (pages >= MAX_PAID_PAGES) break;
      const { data, error } = await supabase
        .from("orders")
        .select("amount, created_at, seller_id")
        .eq("payment_status", "paid")
        .gte("created_at", rangeStartTs)
        .lte("created_at", rangeEndTs)
        .order("created_at", { ascending: true })
        .range(from, from + CHUNK - 1);

      if (error) throw new Error(error.message);
      const rows = (data ?? []) as PaidOrder[];
      paidOrders.push(...rows);
      pages += 1;
      if (rows.length < CHUNK) break;
      from += CHUNK;
    }

    const monthlyMap = new Map<string, { totalTry: number; orderCount: number }>();
    const sellerMap = new Map<
      string,
      { gross: number; orderCount: number; lastAt: string }
    >();

    for (const o of paidOrders) {
      const mk = monthKeyUtc(o.created_at);
      const amt = Number(o.amount ?? 0);
      const add = Number.isFinite(amt) ? amt : 0;
      const m = monthlyMap.get(mk) ?? { totalTry: 0, orderCount: 0 };
      m.totalTry += add;
      m.orderCount += 1;
      monthlyMap.set(mk, m);

      const sid = o.seller_id;
      if (!sid) continue;
      const s = sellerMap.get(sid) ?? { gross: 0, orderCount: 0, lastAt: o.created_at };
      s.gross += add;
      s.orderCount += 1;
      if (o.created_at > s.lastAt) s.lastAt = o.created_at;
      sellerMap.set(sid, s);
    }

    const monthKeys = [...monthlyMap.keys()].sort();
    const monthly: FinanceIncomeMonthlyRow[] = monthKeys.map((month) => {
      const agg = monthlyMap.get(month)!;
      return { month, totalTry: agg.totalTry, orderCount: agg.orderCount };
    });

    const sellerIds = [...sellerMap.keys()];
    let profiles: { id: string; store_name: string | null }[] = [];
    if (sellerIds.length > 0) {
      const { data: profRows, error: pErr } = await supabase.from("profiles").select("id, store_name").in("id", sellerIds);
      if (pErr) throw new Error(pErr.message);
      profiles = profRows ?? [];
    }
    const nameById = Object.fromEntries(
      profiles.map((p) => [p.id, (typeof p.store_name === "string" ? p.store_name : "").trim()]),
    ) as Record<string, string>;

    const rate = DEFAULT_PLATFORM_COMMISSION_RATE;
    const sellers: FinanceIncomeSellerRow[] = sellerIds
      .map((id) => {
        const agg = sellerMap.get(id)!;
        const commission = Math.round(agg.gross * rate * 100) / 100;
        const net = Math.round((agg.gross - commission) * 100) / 100;
        const label = nameById[id] || `${id.slice(0, 8)}…`;
        return {
          id,
          seller: label,
          period: `${rangeStart} — ${rangeEnd}`,
          asOfDate: agg.lastAt.slice(0, 10),
          earnings: agg.gross,
          commission,
          net,
          status: "Hesaplanan" as const,
          orderCount: agg.orderCount,
        };
      })
      .sort((a, b) => b.earnings - a.earnings);

    const { data: ledgerRaw, error: lErr } = await supabase
      .from("billing_ledger")
      .select("id, created_at, user_id, amount, type, description")
      .order("created_at", { ascending: false })
      .limit(200);

    if (lErr) throw new Error(lErr.message);

    const ledger: FinanceLedgerRow[] = (ledgerRaw ?? []).map(
      (r: {
        id: string;
        created_at: string;
        user_id: string;
        amount: number | string;
        type: string;
        description: string | null;
      }) => ({
        id: r.id,
        created_at: r.created_at,
        user_id: r.user_id,
        amount: Number(r.amount ?? 0),
        type: r.type,
        description: r.description,
      }),
    );

    const ledgerUserIds = [...new Set(ledger.map((l) => l.user_id))];
    let ledgerProfiles: { id: string; store_name: string | null }[] = [];
    if (ledgerUserIds.length > 0) {
      const { data: lp, error: lpErr } = await supabase.from("profiles").select("id, store_name").in("id", ledgerUserIds);
      if (!lpErr) ledgerProfiles = lp ?? [];
    }
    const ledgerNameById = Object.fromEntries(
      ledgerProfiles.map((p) => [p.id, (typeof p.store_name === "string" ? p.store_name : "").trim()]),
    ) as Record<string, string>;

    return NextResponse.json({
      range: { from: rangeStart, to: rangeEnd },
      commissionRate: rate,
      monthly,
      sellers,
      ledger,
      ledgerDisplayNames: ledgerNameById,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Veri alınamadı";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
