import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function sumNumericColumn(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- service client şema jeneriği farklı
  admin: any,
  table: string,
  column: string,
  filter?: { eq: [string, string] },
): Promise<number> {
  const pageSize = 1000;
  let from = 0;
  let sum = 0;
  for (;;) {
    let q = admin.from(table).select(column).range(from, from + pageSize - 1);
    if (filter) q = q.eq(filter.eq[0], filter.eq[1]);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    for (const row of rows as Record<string, unknown>[]) {
      const v = row[column];
      const n = typeof v === "number" ? v : Number(v);
      if (Number.isFinite(n)) sum += n;
    }
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return sum;
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
  const role = profile?.role;
  if (!isRemauraSuperAdminUserId(user.id) && role !== "admin") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const supabase = createServiceClient(url, serviceKey);

  const [
    usersRes,
    sellersRes,
    productsRes,
    ordersRes,
    recentOrdersRes,
    recentJobsRes,
    productsForTopRes,
    walletsRes,
    ledgerRes,
  ] = await Promise.all([
    // Tüm profil satırları: kolon filtreleri yok (store_name / role vb. ile daraltma yok); NULL alanlı satırlar dahil
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    // Satıcı sayısı: yalnızca role eşlemesi; store_name veya diğer kolonlarda filtre yok (role NULL → bu sayıma dahil değil)
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "seller"),
    supabase.from("products_3d").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase
      .from("orders")
      .select("id, created_at, payment_status, amount, buyer_id, product_name, customer_name")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("remaura_jobs").select("type, status, created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("products_3d").select("id, name, personal_price, created_at").limit(500),
    supabase.from("billing_wallets").select("credits").limit(1000),
    supabase.from("billing_ledger").select("amount, type, created_at").order("created_at", { ascending: false }).limit(100),
  ]);

  const pageViewsRes = await supabase.from("page_views").select("product_id").limit(20_000);

  const errors = [
    usersRes.error,
    sellersRes.error,
    productsRes.error,
    ordersRes.error,
    recentOrdersRes.error,
    recentJobsRes.error,
    productsForTopRes.error,
    walletsRes.error,
    ledgerRes.error,
  ].filter(Boolean);
  if (errors.length > 0) {
    const msg = errors.map((e) => e!.message).join("; ");
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  let totalRevenueTry = 0;
  try {
    totalRevenueTry = await sumNumericColumn(supabase, "orders", "amount", {
      eq: ["payment_status", "paid"],
    });
  } catch (e) {
    console.error("[dashboard-stats] revenue sum", e);
  }

  const wallets = walletsRes.data ?? [];
  const totalCreditsInSystem = wallets.reduce((sum, w) => {
    const c = w.credits;
    const n = typeof c === "number" ? c : Number(c);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

  const ledger = ledgerRes.data ?? [];
  const totalBillingCreditsCredited = ledger
    .filter((l) => l.type === "credit")
    .reduce((sum, l) => {
      const n = typeof l.amount === "number" ? l.amount : Number(l.amount);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);

  const recentJobs = recentJobsRes.data ?? [];
  const jobStats = recentJobs.reduce<Record<string, number>>((acc, job) => {
    const t = job.type ?? "unknown";
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});

  const jobStatusStats = recentJobs.reduce<Record<string, number>>((acc, job) => {
    const s = job.status ?? "unknown";
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  const viewCounts = new Map<string, number>();
  if (pageViewsRes.error) {
    console.warn("[dashboard-stats] page_views:", pageViewsRes.error.message);
  }
  for (const row of pageViewsRes.data ?? []) {
    const pid = row.product_id;
    if (typeof pid === "string" && pid) {
      viewCounts.set(pid, (viewCounts.get(pid) ?? 0) + 1);
    }
  }

  const products = productsForTopRes.data ?? [];
  const topByViews = [...viewCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([productId, viewCount]) => {
      const p = products.find((x) => x.id === productId);
      return {
        id: productId,
        name: p?.name ?? productId,
        price: typeof p?.personal_price === "number" ? p.personal_price : Number(p?.personal_price ?? 0),
        viewCount,
      };
    });

  const topProducts =
    topByViews.length > 0
      ? topByViews
      : products
          .slice()
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
          .map((p) => ({
            id: p.id,
            name: p.name,
            price: typeof p.personal_price === "number" ? p.personal_price : Number(p.personal_price ?? 0),
            viewCount: 0,
          }));

  return NextResponse.json({
    totalUsers: usersRes.count ?? 0,
    totalSellers: sellersRes.count ?? 0,
    totalProducts: productsRes.count ?? 0,
    totalOrders: ordersRes.count ?? 0,
    totalCreditsInSystem,
    totalRevenueTry,
    totalBillingCreditsCredited,
    recentOrders: recentOrdersRes.data ?? [],
    topProducts,
    jobStats,
    jobStatusStats,
    ledger,
  });
}
