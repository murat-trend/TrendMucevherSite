import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHUNK = 1000;
const MAX_PAGES = 60;

export type ApiUsageJobRow = {
  id: string;
  type: string;
  status: string;
  created_at: string;
  duration_ms: number | null;
  user_id: string | null;
  estimated_cost_usd: number | string | null;
};

export type ApiUsageLedgerRow = {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
};

function clampDays(raw: string | null): number {
  const n = raw ? Number(raw) : 30;
  if (!Number.isFinite(n)) return 30;
  return Math.min(365, Math.max(1, Math.floor(n)));
}

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

  const days = clampDays(new URL(req.url).searchParams.get("days"));
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();

  const supabase = createServiceClient(url, serviceKey);

  const jobs: ApiUsageJobRow[] = [];
  let jobPages = 0;
  let jobsError: string | null = null;
  try {
    let from = 0;
    for (;;) {
      if (jobPages >= MAX_PAGES) break;
      const { data, error } = await supabase
        .from("remaura_jobs")
        .select("id, type, status, created_at, duration_ms, user_id, estimated_cost_usd")
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .range(from, from + CHUNK - 1);
      if (error) {
        jobsError = error.message;
        break;
      }
      const rows = (data ?? []) as ApiUsageJobRow[];
      jobs.push(...rows);
      jobPages += 1;
      if (rows.length < CHUNK) break;
      from += CHUNK;
    }
  } catch (e) {
    jobsError = e instanceof Error ? e.message : "remaura_jobs okunamadı";
  }

  const ledgerRows: ApiUsageLedgerRow[] = [];
  let ledgerPages = 0;
  let ledgerError: string | null = null;
  try {
    let from = 0;
    for (;;) {
      if (ledgerPages >= MAX_PAGES) break;
      const { data, error } = await supabase
        .from("billing_ledger")
        .select("id, user_id, amount, type, description, created_at")
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .range(from, from + CHUNK - 1);
      if (error) {
        ledgerError = error.message;
        break;
      }
      const rows = (data ?? []) as Record<string, unknown>[];
      for (const r of rows) {
        const amt = r.amount;
        const n = typeof amt === "number" ? amt : Number(amt);
        ledgerRows.push({
          id: String(r.id ?? ""),
          user_id: String(r.user_id ?? ""),
          amount: Number.isFinite(n) ? n : 0,
          type: String(r.type ?? ""),
          description: typeof r.description === "string" ? r.description : null,
          created_at: String(r.created_at ?? ""),
        });
      }
      ledgerPages += 1;
      if (rows.length < CHUNK) break;
      from += CHUNK;
    }
  } catch (e) {
    ledgerError = e instanceof Error ? e.message : "billing_ledger okunamadı";
  }

  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  let durationSum = 0;
  let durationCount = 0;
  let estUsdSum = 0;
  for (const j of jobs) {
    const t = j.type || "unknown";
    byType[t] = (byType[t] ?? 0) + 1;
    const s = j.status || "unknown";
    byStatus[s] = (byStatus[s] ?? 0) + 1;
    const dm = j.duration_ms;
    if (dm != null && Number.isFinite(Number(dm))) {
      durationSum += Number(dm);
      durationCount += 1;
    }
    const est = j.estimated_cost_usd;
    if (est != null) {
      const u = typeof est === "number" ? est : Number(String(est).trim());
      if (Number.isFinite(u)) estUsdSum += u;
    }
  }

  let debitsCredits = 0;
  let debitsCount = 0;
  let creditsCredits = 0;
  let creditsCount = 0;
  for (const l of ledgerRows) {
    if (l.type === "debit") {
      debitsCredits += l.amount;
      debitsCount += 1;
    } else if (l.type === "credit") {
      creditsCredits += l.amount;
      creditsCount += 1;
    }
  }

  const recentJobs = jobs.slice(0, 40);
  const recentLedger = ledgerRows.slice(0, 40);

  return NextResponse.json({
    range: {
      days,
      fromIso: cutoff,
      toIso: new Date().toISOString(),
    },
    remauraJobs: {
      total: jobs.length,
      byType,
      byStatus,
      avgDurationMs: durationCount > 0 ? Math.round(durationSum / durationCount) : 0,
      estimatedCostUsdSum: Math.round(estUsdSum * 10_000) / 10_000,
      recent: recentJobs,
      error: jobsError,
    },
    billingLedger: {
      debitsCount,
      creditsDebited: debitsCredits,
      creditsCount,
      creditsCredited: creditsCredits,
      recent: recentLedger,
      error: ledgerError,
    },
  });
}
