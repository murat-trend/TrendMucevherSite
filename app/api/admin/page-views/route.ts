import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHUNK = 1000;
const MAX_PAGES = 120;

type PageViewRow = {
  created_at: string | null;
  page_path: string | null;
  source: string | null;
  country: string | null;
  ip_address: string | null;
  product_id: string | null;
};

function clampDays(raw: string | null): 7 | 30 | 90 {
  const n = raw === "7" || raw === "30" || raw === "90" ? Number(raw) : 30;
  return n as 7 | 30 | 90;
}

function dayKeyUtc(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function displayPath(row: PageViewRow): string {
  if (row.page_path && row.page_path.trim()) return row.page_path.trim();
  if (row.product_id) return "(ürün sayfası)";
  return "(bilinmeyen)";
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
  const now = Date.now();
  const statsCutoff = new Date(now - days * 86400000).toISOString();
  const chartCutoff = new Date(now - 30 * 86400000).toISOString();
  const fetchCutoff = new Date(now - Math.max(days, 30) * 86400000).toISOString();

  const supabase = createServiceClient(url, serviceKey);

  const rows: PageViewRow[] = [];
  let tableError: string | null = null;
  try {
    let from = 0;
    let pages = 0;
    for (;;) {
      if (pages >= MAX_PAGES) break;
      const { data, error } = await supabase
        .from("page_views")
        .select("created_at, page_path, source, country, ip_address, product_id")
        .gte("created_at", fetchCutoff)
        .order("created_at", { ascending: true })
        .range(from, from + CHUNK - 1);

      if (error) {
        tableError = error.message;
        break;
      }
      const batch = (data ?? []) as PageViewRow[];
      rows.push(...batch);
      pages += 1;
      if (batch.length < CHUNK) break;
      from += CHUNK;
    }
  } catch (e) {
    tableError = e instanceof Error ? e.message : "page_views okunamadı";
  }

  const statsRows = rows.filter((r) => r.created_at && r.created_at >= statsCutoff);
  const chartRows = rows.filter((r) => r.created_at && r.created_at >= chartCutoff);

  const totalVisits = statsRows.length;
  const uniqueIps = new Set(statsRows.map((r) => r.ip_address).filter((x): x is string => Boolean(x && x.trim()))).size;

  const pageCounts = new Map<string, number>();
  for (const r of statsRows) {
    const k = displayPath(r);
    pageCounts.set(k, (pageCounts.get(k) ?? 0) + 1);
  }
  const topPages = [...pageCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([page_path, count]) => ({ page_path, count }));

  const sourceCounts = new Map<string, number>();
  for (const r of statsRows) {
    const s = (r.source && r.source.trim()) || "direct";
    sourceCounts.set(s, (sourceCounts.get(s) ?? 0) + 1);
  }
  const sources = [...sourceCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([source, count]) => ({ source, count }));

  const countryCounts = new Map<string, number>();
  for (const r of statsRows) {
    const c = (r.country && r.country.trim()) || "—";
    countryCounts.set(c, (countryCounts.get(c) ?? 0) + 1);
  }
  const countries = [...countryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([country, count]) => ({ country, count }));

  const dailyMap = new Map<string, number>();
  const endUtc = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.UTC(endUtc.getUTCFullYear(), endUtc.getUTCMonth(), endUtc.getUTCDate() - i));
    const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    dailyMap.set(k, 0);
  }
  for (const r of chartRows) {
    if (!r.created_at) continue;
    const k = dayKeyUtc(r.created_at);
    if (dailyMap.has(k)) dailyMap.set(k, (dailyMap.get(k) ?? 0) + 1);
  }
  const dailyVisits = [...dailyMap.entries()].map(([day, count]) => ({ day, count }));

  const sortedStats = [...statsRows].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  const recentVisits = sortedStats.slice(0, 50).map((r) => ({
    ip_address: r.ip_address,
    page_path: displayPath(r),
    source: (r.source && r.source.trim()) || "direct",
    country: r.country && r.country.trim() ? r.country.trim() : null,
    created_at: r.created_at ?? "",
  }));

  const topPage = topPages[0] ?? null;
  const topSourceEntry = sources[0] ?? null;

  return NextResponse.json({
    range: { days, statsFromIso: statsCutoff, chartFromIso: chartCutoff },
    totalVisits,
    uniqueIps,
    topPages,
    sources,
    countries,
    dailyVisits,
    recentVisits,
    topPageLabel: topPage?.page_path ?? null,
    topPageCount: topPage?.count ?? 0,
    topSourceLabel: topSourceEntry?.source ?? null,
    topSourceCount: topSourceEntry?.count ?? 0,
    error: tableError,
  });
}
