import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { createClient } from "@/utils/supabase/server";
import { DEFAULT_PLATFORM_COMMISSION_RATE } from "@/lib/admin/finance-constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHUNK = 1000;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function maybeParseJsonField(v: unknown): unknown {
  if (typeof v === "string") {
    const t = v.trim();
    if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
      try {
        return JSON.parse(t) as unknown;
      } catch {
        return v;
      }
    }
  }
  return v;
}

/** jsonb / nested obje içinden tutar alanları (proje ve eski şemalar için). */
function amountFromJsonBlob(rawBlob: unknown): number | null {
  const parsed = maybeParseJsonField(rawBlob);
  if (!isPlainObject(parsed)) return null;
  const obj = parsed;
  for (const k of ["amount_try", "amountTry", "amount", "value", "total_try", "totalTry"] as const) {
    if (!(k in obj)) continue;
    const raw = obj[k];
    if (raw === null || raw === undefined || raw === "") continue;
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/**
 * `finance_expenses` satırından TRY tutarı.
 * Repo migration: `amount_try` numeric + `invoices` jsonb.
 * Bazı projelerde tutar yalnızca `data` / `payload` / `jsonb` gibi jsonb kolonlarda olabilir.
 */
function extractExpenseAmountTry(row: Record<string, unknown>): number {
  if ("amount_try" in row && row.amount_try !== null && row.amount_try !== undefined && row.amount_try !== "") {
    const n = Number(row.amount_try);
    if (Number.isFinite(n)) return n;
  }
  for (const key of ["data", "payload", "jsonb", "json", "meta", "body", "record"] as const) {
    const fromBlob = amountFromJsonBlob(row[key]);
    if (fromBlob != null) return fromBlob;
  }
  const inv = maybeParseJsonField(row.invoices);
  if (Array.isArray(inv)) {
    let invSum = 0;
    let any = false;
    for (const item of inv) {
      if (!isPlainObject(item)) continue;
      const a = amountFromJsonBlob(item);
      if (a != null) {
        invSum += a;
        any = true;
      }
    }
    if (any) return invSum;
  }
  return 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sumFinanceExpensesTry(supabase: any): Promise<number> {
  let sum = 0;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase.from("finance_expenses").select("*").range(from, from + CHUNK - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Record<string, unknown>[];
    for (const row of rows) {
      sum += extractExpenseAmountTry(row);
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

export type FinanceMonthlyExpensePoint = { month: string; totalTry: number; rowCount: number };

function expenseMonthFromRow(row: Record<string, unknown>): string | null {
  const iso = row.date_iso;
  if (typeof iso === "string" && /^\d{4}-\d{2}-\d{2}/.test(iso)) {
    return iso.slice(0, 7);
  }
  const u = row.updated_at;
  if (typeof u === "string") return monthKeyUtc(u);
  return null;
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

    const expensesTry = await sumFinanceExpensesTry(supabase);

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

    const validMonthKeys = new Set(months.map((m) => m.month));
    const expenseMonthMap = new Map<string, { totalTry: number; rowCount: number }>();
    {
      let exFrom = 0;
      for (;;) {
        const { data, error } = await supabase.from("finance_expenses").select("*").range(exFrom, exFrom + CHUNK - 1);
        if (error) throw new Error(error.message);
        const rows = (data ?? []) as Record<string, unknown>[];
        for (const row of rows) {
          const mk = expenseMonthFromRow(row);
          if (!mk || !validMonthKeys.has(mk)) continue;
          const amt = extractExpenseAmountTry(row);
          const cur = expenseMonthMap.get(mk) ?? { totalTry: 0, rowCount: 0 };
          cur.totalTry += amt;
          cur.rowCount += 1;
          expenseMonthMap.set(mk, cur);
        }
        if (rows.length < CHUNK) break;
        exFrom += CHUNK;
      }
    }

    const monthlyExpenses: FinanceMonthlyExpensePoint[] = months.map((m) => {
      const agg = expenseMonthMap.get(m.month) ?? { totalTry: 0, rowCount: 0 };
      return { month: m.month, totalTry: agg.totalTry, rowCount: agg.rowCount };
    });

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
      monthlyExpenses,
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
