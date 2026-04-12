import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { createClient } from "@/utils/supabase/server";
import { DEFAULT_PLATFORM_COMMISSION_RATE } from "@/lib/admin/finance-constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHUNK = 1000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sumNumericColumn(supabase: any, table: string, column: string): Promise<number> {
  let sum = 0;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase.from(table).select(column).range(from, from + CHUNK - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Record<string, unknown>[];
    for (const row of rows) {
      const n = Number(row[column] ?? 0);
      if (Number.isFinite(n)) sum += n;
    }
    if (rows.length < CHUNK) break;
    from += CHUNK;
  }
  return sum;
}

function monthKeyUtc(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export type FinanceMonthlyPoint = { month: string; totalTry: number; orderCount: number };

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

  try {
    let revenueTry = 0;
    let paidOrderCount = 0;
    {
      let from = 0;
      for (;;) {
        const { data, error } = await supabase
          .from("orders")
          .select("amount")
          .eq("payment_status", "paid")
          .range(from, from + CHUNK - 1);
        if (error) throw new Error(error.message);
        const rows = (data ?? []) as { amount: number | null }[];
        paidOrderCount += rows.length;
        for (const row of rows) {
          const n = Number(row.amount ?? 0);
          if (Number.isFinite(n)) revenueTry += n;
        }
        if (rows.length < CHUNK) break;
        from += CHUNK;
      }
    }

    const expensesTry = await sumNumericColumn(supabase, "finance_expenses", "amount_try");

    const netProfitTry = revenueTry - expensesTry;

    const now = new Date();
    const start12 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1, 0, 0, 0, 0));
    const iso12 = start12.toISOString();

    const monthlyMap = new Map<string, { totalTry: number; orderCount: number }>();
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("orders")
        .select("amount, created_at")
        .eq("payment_status", "paid")
        .gte("created_at", iso12)
        .order("created_at", { ascending: true })
        .range(from, from + CHUNK - 1);

      if (error) throw new Error(error.message);
      const rows = (data ?? []) as { amount: number | null; created_at: string }[];
      for (const row of rows) {
        const key = monthKeyUtc(row.created_at);
        const amt = Number(row.amount ?? 0);
        const add = Number.isFinite(amt) ? amt : 0;
        const cur = monthlyMap.get(key) ?? { totalTry: 0, orderCount: 0 };
        cur.totalTry += add;
        cur.orderCount += 1;
        monthlyMap.set(key, cur);
      }
      if (rows.length < CHUNK) break;
      from += CHUNK;
    }

    const months: FinanceMonthlyPoint[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (11 - i), 1));
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      const agg = monthlyMap.get(key) ?? { totalTry: 0, orderCount: 0 };
      months.push({ month: key, totalTry: agg.totalTry, orderCount: agg.orderCount });
    }

    const thirtyAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
    let pendingCount = 0;
    let pendingAmountTry = 0;
    from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("orders")
        .select("amount")
        .eq("payment_status", "pending")
        .range(from, from + CHUNK - 1);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as { amount: number | null }[];
      for (const row of rows) {
        pendingCount += 1;
        const amt = Number(row.amount ?? 0);
        if (Number.isFinite(amt)) pendingAmountTry += amt;
      }
      if (rows.length < CHUNK) break;
      from += CHUNK;
    }

    let refundedCount = 0;
    let refundedAmountTry = 0;
    from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("orders")
        .select("amount")
        .eq("payment_status", "refunded")
        .range(from, from + CHUNK - 1);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as { amount: number | null }[];
      for (const row of rows) {
        refundedCount += 1;
        const amt = Number(row.amount ?? 0);
        if (Number.isFinite(amt)) refundedAmountTry += amt;
      }
      if (rows.length < CHUNK) break;
      from += CHUNK;
    }

    const revenueLast30DaysTry = await (async () => {
      let s = 0;
      let f = 0;
      for (;;) {
        const { data, error } = await supabase
          .from("orders")
          .select("amount")
          .eq("payment_status", "paid")
          .gte("created_at", thirtyAgo)
          .range(f, f + CHUNK - 1);
        if (error) throw new Error(error.message);
        const rows = (data ?? []) as { amount: number | null }[];
        for (const row of rows) {
          const amt = Number(row.amount ?? 0);
          if (Number.isFinite(amt)) s += amt;
        }
        if (rows.length < CHUNK) break;
        f += CHUNK;
      }
      return s;
    })();

    const estimatedCommissionTry = Math.round(revenueTry * DEFAULT_PLATFORM_COMMISSION_RATE * 100) / 100;

    return NextResponse.json({
      revenueTry,
      expensesTry,
      netProfitTry,
      monthlyRevenue: months,
      pendingOrdersCount: pendingCount,
      pendingOrdersAmountTry: pendingAmountTry,
      refundedOrdersCount: refundedCount,
      refundedAmountTry,
      revenueLast30DaysTry,
      paidOrderCount,
      estimatedCommissionTry,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Özet alınamadı";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
