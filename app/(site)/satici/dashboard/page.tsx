"use client";

import { createClient } from "@/utils/supabase/client";
import type React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";
import {
  TrendingUp, ShoppingCart, Star, Package, Plus, Clock, LogOut,
  CheckCircle, Truck, AlertCircle, ShoppingBag, ArrowUpRight,
  ArrowDownRight, Megaphone, Users, RotateCcw, Target, Bell,
  Wallet, Calendar, ChevronRight, ThumbsUp, ThumbsDown, Minus,
  AlertTriangle, TrendingDown, Award,
} from "lucide-react";

// ── Tip tanımları ─────────────────────────────────────────────────────────
type OrderStatus = "pending" | "shipped" | "completed" | "cancelled";

// ── Mock veri ─────────────────────────────────────────────────────────────
const STATS = {
  totalSales: 28450,      netEarnings: 26031,
  monthlySales: 6200,     monthlyNet: 5673,
  monthlyTarget: 10000,
  weeklySales: 1840,      dailySales: 420,
  orderCount: 34,         pendingOrders: 6,
  shippedOrders: 8,       completedOrders: 18,   cancelledOrders: 2,
  productCount: 12,       rating: 4.7,           reviewCount: 89,
  commission: 8.5,        returnRate: 2.4,
  repeatCustomers: 34,    conversionRate: 3.2,
  aov: 1247,              ltv: 3840,
  adSpend: 1200,          adRevenue: 4800,       roas: 4.0,
  platformAvgConversion: 2.8,
  platformAvgRating: 4.3,
  platformAvgReturnRate: 4.1,
  nextPayoutAmount: 5673,
  nextPayoutDate: "10 Nisan 2026",
  lastPayoutAmount: 4890,
  lastPayoutDate: "26 Mart 2026",
};

const SALES_DATA = [
  { gun: "Pzt", satis: 320, hedef: 400 },
  { gun: "Sal", satis: 580, hedef: 400 },
  { gun: "Çar", satis: 420, hedef: 400 },
  { gun: "Per", satis: 890, hedef: 400 },
  { gun: "Cum", satis: 1200, hedef: 400 },
  { gun: "Cmt", satis: 740, hedef: 400 },
  { gun: "Paz", satis: 420, hedef: 400 },
];

const MONTHLY_DATA = [
  { ay: "Eki", satis: 18200 }, { ay: "Kas", satis: 22400 },
  { ay: "Ara", satis: 31800 }, { ay: "Oca", satis: 19600 },
  { ay: "Şub", satis: 24100 }, { ay: "Mar", satis: 21300 },
  { ay: "Nis", satis: 6200 },
];

const HOURLY_DATA = [
  { saat: "09", satis: 2 }, { saat: "10", satis: 4 }, { saat: "11", satis: 3 },
  { saat: "12", satis: 6 }, { saat: "13", satis: 5 }, { saat: "14", satis: 4 },
  { saat: "15", satis: 7 }, { saat: "16", satis: 9 }, { saat: "17", satis: 12 },
  { saat: "18", satis: 18 }, { saat: "19", satis: 22 }, { saat: "20", satis: 16 },
  { saat: "21", satis: 11 }, { saat: "22", satis: 6 },
];

const CATEGORY_DATA = [
  { name: "Yüzük",   value: 58, color: "#c9a84c" },
  { name: "Kolye",   value: 24, color: "#a07840" },
  { name: "Bilezik", value: 12, color: "#7a6030" },
  { name: "Küpe",    value: 6,  color: "#504020" },
];

const TOP_PRODUCTS = [
  { name: "Melek Yüzüğü",    views: 1240, cart: 89, sales: 42, stock: 8,  conversion: 3.4 },
  { name: "Kurt Başı Yüzük", views: 980,  cart: 67, sales: 31, stock: 2,  conversion: 3.2 },
  { name: "Ejderha Kolye",   views: 756,  cart: 43, sales: 18, stock: 15, conversion: 2.4 },
  { name: "Aslan Yüzüğü",   views: 534,  cart: 28, sales: 12, stock: 0,  conversion: 2.2 },
];

const CART_ABANDONED = [
  { name: "Melek Yüzüğü",    count: 47, amount: 56400 },
  { name: "Ejderha Kolye",   count: 25, amount: 37500 },
  { name: "Kurt Başı Yüzük", count: 19, amount: 18050 },
];

const TRAFFIC_SOURCES = [
  { kaynak: "Organik Arama", ziyaret: 1840, satis: 58, oran: 3.2 },
  { kaynak: "Sosyal Medya",  ziyaret: 920,  satis: 24, oran: 2.6 },
  { kaynak: "Doğrudan",      ziyaret: 640,  satis: 18, oran: 2.8 },
  { kaynak: "Reklam",        ziyaret: 480,  satis: 19, oran: 4.0 },
];

const RECENT_ORDERS: { id: string; product: string; customer: string; amount: number; status: OrderStatus; date: string }[] = [
  { id: "SP-001", product: "Melek Yüzüğü",    customer: "Ayşe K.",  amount: 1200, status: "pending",   date: "02 Nis" },
  { id: "SP-002", product: "Kurt Başı Yüzük", customer: "Mehmet Y.", amount: 950,  status: "shipped",   date: "01 Nis" },
  { id: "SP-003", product: "Ejderha Kolye",   customer: "Fatma D.",  amount: 1500, status: "completed", date: "31 Mar" },
  { id: "SP-004", product: "Melek Yüzüğü",   customer: "Zeynep A.", amount: 1200, status: "completed", date: "30 Mar" },
  { id: "SP-005", product: "Aslan Yüzüğü",   customer: "Ali R.",    amount: 1100, status: "cancelled", date: "29 Mar" },
];

const REVIEWS = [
  { id: 1, author: "Ayşe K.", product: "Melek Yüzüğü",    rating: 5, comment: "Harika kalite, çok şık. Kesinlikle tavsiye ederim!", date: "2 Nis", replied: false },
  { id: 2, author: "Mehmet Y.", product: "Kurt Başı Yüzük", rating: 4, comment: "Güzel ürün, kargo biraz geç geldi ama ürün mükemmel.", date: "1 Nis", replied: true },
  { id: 3, author: "Fatma D.", product: "Ejderha Kolye",   rating: 5, comment: "Eşime aldım, çok beğendi. Teşekkürler!", date: "31 Mar", replied: false },
];

const STATUS_MAP = {
  pending:   { label: "Bekliyor",   color: "text-amber-500",   bg: "bg-amber-500/10 border-amber-500/20",    icon: Clock },
  shipped:   { label: "Kargoda",    color: "text-blue-500",    bg: "bg-blue-500/10 border-blue-500/20",      icon: Truck },
  completed: { label: "Tamamlandı", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle },
  cancelled: { label: "İptal",      color: "text-red-500",     bg: "bg-red-500/10 border-red-500/20",        icon: AlertCircle },
};

const tryFmt = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);
const numFmt = (n: number) => new Intl.NumberFormat("tr-TR").format(n);

// ── Küçük bileşenler ──────────────────────────────────────────────────────

export function SaticiNav({ active }: { active: string }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="border-b border-border/60 bg-card">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div>
          <h1 className="font-display text-xl font-medium tracking-[-0.02em] text-foreground">Satıcı Paneli</h1>
          <p className="mt-0.5 text-[13px] text-muted">Hoş geldiniz — Nisan 2026</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className="flex items-center gap-2 rounded-full border border-border/80 bg-transparent px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:border-red-500/30 hover:bg-red-500/[0.06] hover:text-red-400 disabled:opacity-50"
          >
            <LogOut size={14} strokeWidth={2} />
            {loggingOut ? "Çıkılıyor..." : "Çıkış Yap"}
          </button>
          <Link
            href="/satici/urunlerim"
            className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-[13px] font-medium text-accent-foreground hover:opacity-90"
          >
            <Plus size={14} strokeWidth={2} /> Ürün Ekle
          </Link>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <nav className="flex gap-6 overflow-x-auto">
          {[
            { href: "/satici/dashboard", label: "Dashboard" },
            { href: "/satici/urunlerim", label: "Ürünlerim" },
            { href: "/satici/kampanyalarim", label: "Kampanyalarım" },
            { href: "/satici/siparislerim", label: "Siparişlerim" },
            { href: "/satici/hesabim", label: "Hesabım" },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className={`shrink-0 border-b-2 pb-3 pt-1 text-[13px] font-medium transition-colors ${
                active === item.label ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"}`}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, accent = false, trend, trendUp, vs }: {
  label: string; value: string; sub?: string; icon: React.ElementType;
  accent?: boolean; trend?: string; trendUp?: boolean; vs?: string;
}) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? "border-accent/30 bg-accent/[0.05]" : "border-border/80 bg-card"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{label}</p>
          <p className={`mt-2 font-display text-2xl font-medium tracking-[-0.02em] ${accent ? "text-accent" : "text-foreground"}`}>{value}</p>
          {sub && <p className="mt-1 text-[12px] text-muted">{sub}</p>}
          {trend && (
            <div className={`mt-2 flex items-center gap-1 text-[12px] font-medium ${trendUp ? "text-emerald-500" : "text-red-500"}`}>
              {trendUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{trend}
            </div>
          )}
          {vs && <p className="mt-1 text-[11px] text-muted">{vs}</p>}
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
          accent ? "border-accent/20 bg-accent/10 text-accent" : "border-border/60 bg-surface-alt text-muted"}`}>
          <Icon size={16} strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card">
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
        <h3 className="font-display text-[15px] font-medium text-foreground">{title}</h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/80 bg-card px-3 py-2 text-[12px] shadow-xl">
      <p className="font-medium text-foreground">{label}</p>
      {payload.map(p => <p key={p.name} style={{ color: p.color }}>{p.name}: {tryFmt(p.value)}</p>)}
    </div>
  );
};

// ── Ana bileşen ───────────────────────────────────────────────────────────
export default function SaticiDashboardPage() {
  const [dashboardData, setDashboardData] = useState({
    totalRevenue: 0,
    pendingOrders: 0,
    totalOrders: 0,
    recentOrders: [] as Array<{
      id: string;
      product_name: string | null;
      customer_name: string | null;
      amount: number;
      payment_status: string;
      created_at: string;
    }>,
  });
  const [notifications, setNotifications] = useState<
    Array<{ id: string; message: string; created_at: string; is_read: boolean }>
  >([]);
  const [productPerformance, setProductPerformance] = useState<any[]>([]);
  const [categoryDistribution, setCategoryDistribution] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [adCampaigns, setAdCampaigns] = useState<any[]>([]);
  const [trafficSources, setTrafficSources] = useState<any[]>([]);
  const [weeklySales, setWeeklySales] = useState<Array<{ amount: number; created_at: string }>>([]);
  const [monthlySales, setMonthlySales] = useState<Array<{ amount: number; created_at: string }>>([]);
  const [hourlySales, setHourlySales] = useState<Array<{ created_at: string; amount: number }>>([]);
  const [abandonedCart, setAbandonedCart] = useState<Array<{ name: string; count: number }>>([]);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: orders } = await supabase
        .from("orders")
        .select("id, product_name, customer_name, amount, payment_status, created_at")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      const { data: msgs } = await supabase
        .from("messages")
        .select("id, message, created_at, is_read")
        .eq("receiver_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      setNotifications((msgs ?? []) as Array<{ id: string; message: string; created_at: string; is_read: boolean }>);

      // Haftalık satış — son 7 gün
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);
      const { data: weeklyData } = await supabase
        .from("orders")
        .select("amount, created_at")
        .eq("seller_id", user.id)
        .eq("payment_status", "paid")
        .gte("created_at", last7Days.toISOString());

      // Aylık satış — son 7 ay
      const last7Months = new Date();
      last7Months.setMonth(last7Months.getMonth() - 6);
      const { data: monthlyData } = await supabase
        .from("orders")
        .select("amount, created_at")
        .eq("seller_id", user.id)
        .eq("payment_status", "paid")
        .gte("created_at", last7Months.toISOString());

      setWeeklySales((weeklyData ?? []) as Array<{ amount: number; created_at: string }>);
      setMonthlySales((monthlyData ?? []) as Array<{ amount: number; created_at: string }>);

      // Satış saatleri — tüm ödenmiş siparişler
      const { data: hourlyData } = await supabase
        .from("orders")
        .select("created_at, amount")
        .eq("seller_id", user.id)
        .eq("payment_status", "paid");

      setHourlySales((hourlyData ?? []) as Array<{ created_at: string; amount: number }>);

      // Ürün performansı — orders tablosundan
      const { data: productPerf } = await supabase
        .from("orders")
        .select("product_name, amount, product_id")
        .eq("seller_id", user.id)
        .eq("payment_status", "paid");

      // Sepete eklenen ama satın alınmayan ürünler
      const sellerProductIds =
        (await supabase.from("products_3d").select("id, name").eq("seller_id", user.id)).data ?? [];

      const productIdList = sellerProductIds.map((p) => p.id);

      const { data: cartData } = await supabase
        .from("cart_events")
        .select("product_id, created_at")
        .in("product_id", productIdList.length > 0 ? productIdList : ["00000000-0000-0000-0000-000000000000"])
        .eq("event_type", "add");

      const paidProductIds = (productPerf ?? []).map((o: any) => o.product_id);

      const abandonedData = (cartData ?? [])
        .filter((c) => !paidProductIds.includes(c.product_id))
        .map((c) => ({
          name: sellerProductIds.find((p) => p.id === c.product_id)?.name ?? "Bilinmeyen",
          count: 1,
        }))
        .reduce((acc: any[], item) => {
          const existing = acc.find((a) => a.name === item.name);
          if (existing) existing.count++;
          else acc.push({ ...item });
          return acc;
        }, [])
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 3);

      setAbandonedCart(abandonedData);

      // Kategori dağılımı — products_3d tablosundan
      const { data: categoryData } = await supabase
        .from("products_3d")
        .select("jewelry_type")
        .eq("seller_id", user.id)
        .eq("is_published", true);

      // Yorumlar
      const { data: reviewData } = await supabase
        .from("reviews")
        .select("rating, comment, created_at, product_id")
        .in(
          "product_id",
          (await supabase.from("products_3d").select("id").eq("seller_id", user.id)).data?.map((p) => p.id) ?? [],
        )
        .order("created_at", { ascending: false })
        .limit(5);

      // Reklam kampanyaları
      const { data: adData } = await supabase
        .from("ad_campaigns")
        .select("name, budget, spent, clicks, impressions, revenue, status")
        .eq("seller_id", user.id);

      // Trafik kaynakları
      const { data: trafficData } = await supabase
        .from("page_views")
        .select("source")
        .in(
          "product_id",
          (await supabase.from("products_3d").select("id").eq("seller_id", user.id)).data?.map((p) => p.id) ?? [],
        );

      // State'leri güncelle
      setProductPerformance(productPerf ?? []);
      setCategoryDistribution(categoryData ?? []);
      setReviews(reviewData ?? []);
      setAdCampaigns(adData ?? []);
      setTrafficSources(trafficData ?? []);

      const all = (orders ?? []) as Array<{
        id: string;
        product_name: string | null;
        customer_name: string | null;
        amount: number | null;
        payment_status: string | null;
        created_at: string;
      }>;
      const totalRevenue = all.filter((o) => o.payment_status === "paid").reduce((s, o) => s + (o.amount ?? 0), 0);
      const pendingOrders = all.filter((o) => o.payment_status === "pending").length;

      setDashboardData({
        totalRevenue,
        pendingOrders,
        totalOrders: all.length,
        recentOrders: all.slice(0, 5).map((o) => ({
          id: o.id,
          product_name: o.product_name,
          customer_name: o.customer_name,
          amount: o.amount ?? 0,
          payment_status: o.payment_status ?? "",
          created_at: o.created_at,
        })),
      });
    };
    void load();

    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const ch = supabase
        .channel(`dashboard-messages-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `receiver_id=eq.${user.id}`,
          },
          (payload) => {
            const newMsg = payload.new as { id: string; message: string; created_at: string; is_read: boolean };
            setNotifications((prev) => [newMsg, ...prev].slice(0, 5));
          },
        );

      channel = ch;

      if (cancelled) {
        void supabase.removeChannel(ch);
        channel = null;
        return;
      }

      ch.subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }
    };
  }, []);

  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const monthlyProgress = Math.round((STATS.monthlySales / STATS.monthlyTarget) * 100);

  const categoryChartData: { name: string; value: number }[] = categoryDistribution.reduce(
    (acc, item) => {
      const label = item.jewelry_type ?? "Diğer";
      const existing = acc.find((a: { name: string; value: number }) => a.name === label);
      if (existing) existing.value++;
      else acc.push({ name: label, value: 1 });
      return acc;
    },
    [] as { name: string; value: number }[],
  );
  const categoryTotal = categoryChartData.reduce((s, c) => s + c.value, 0);
  const categoryPieColors = ["#c9a84c", "#a07840", "#7a6030", "#504020", "#6b6b6b"];

  const topProductsData = (
    Object.values(
      productPerformance.reduce((acc, order) => {
        const key = order.product_name ?? "Bilinmeyen";
        if (!acc[key]) acc[key] = { name: key, revenue: 0, orderCount: 0 };
        acc[key].revenue += order.amount ?? 0;
        acc[key].orderCount++;
        return acc;
      }, {} as Record<string, { name: string; revenue: number; orderCount: number }>),
    ) as { name: string; revenue: number; orderCount: number }[]
  ).slice(0, 4);

  const totalAdSpend = adCampaigns.reduce((s, c) => s + (c.spent ?? 0), 0);
  const totalAdRevenue = adCampaigns.reduce((s, c) => s + (c.revenue ?? 0), 0);
  const roas = totalAdSpend > 0 ? (totalAdRevenue / totalAdSpend).toFixed(1) : "0";

  const trafficChartData: { name: string; value: number }[] = trafficSources.reduce(
    (acc, item) => {
      const key = item.source ?? "Doğrudan";
      const existing = acc.find((a: { name: string; value: number }) => a.name === key);
      if (existing) existing.value++;
      else acc.push({ name: key, value: 1 });
      return acc;
    },
    [] as { name: string; value: number }[],
  );
  const trafficTotal = trafficChartData.reduce((s, t) => s + t.value, 0);

  const weekDays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
  const weeklyChartData = weekDays.map((day, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayOrders = weeklySales.filter((o) => {
      const d = new Date(o.created_at);
      return d.toDateString() === date.toDateString();
    });
    return { day, total: dayOrders.reduce((s, o) => s + (o.amount ?? 0), 0) };
  });

  const monthNames = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
  const monthlyChartData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (6 - i));
    const monthOrders = monthlySales.filter((o) => {
      const d = new Date(o.created_at);
      return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
    });
    return { month: monthNames[date.getMonth()], total: monthOrders.reduce((s, o) => s + (o.amount ?? 0), 0) };
  });

  const hourlyChartData = Array.from({ length: 24 }, (_, hour) => {
    const hourOrders = hourlySales.filter((o) => new Date(o.created_at).getHours() === hour);
    return {
      hour: `${String(hour).padStart(2, "0")}:00`,
      total: hourOrders.reduce((s, o) => s + (o.amount ?? 0), 0),
      count: hourOrders.length,
    };
  });
  const bestHour = hourlyChartData.reduce(
    (best, h) => (h.total > best.total ? h : best),
    hourlyChartData[0],
  );

  return (
    <div className="min-h-screen bg-background">
      <SaticiNav active="Dashboard" />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">

        {/* ── Üst alan: Ödeme + Bildirim + Hedef ── */}
        <div className="mb-6 grid gap-4 lg:grid-cols-3">

          {/* Gelecek Ödeme */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Gelecek Ödeme</p>
                <p className="mt-2 font-display text-2xl font-medium text-emerald-500">{tryFmt(STATS.nextPayoutAmount)}</p>
                <div className="mt-2 flex items-center gap-1.5 text-[12px] text-muted">
                  <Calendar size={12} /> {STATS.nextPayoutDate}
                </div>
              </div>
              <Wallet size={18} className="text-emerald-500/60" strokeWidth={1.75} />
            </div>
            <div className="mt-4 border-t border-border/40 pt-3 text-[12px] text-muted">
              Son ödeme: <span className="text-foreground">{tryFmt(STATS.lastPayoutAmount)}</span> — {STATS.lastPayoutDate}
            </div>
          </div>

          {/* Aylık Hedef */}
          <div className="rounded-2xl border border-border/80 bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Aylık Hedef</p>
                <p className="mt-2 font-display text-2xl font-medium text-foreground">{tryFmt(STATS.monthlySales)}</p>
                <p className="mt-1 text-[12px] text-muted">Hedef: {tryFmt(STATS.monthlyTarget)}</p>
              </div>
              <Target size={18} className="text-muted" strokeWidth={1.75} />
            </div>
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-[11px]">
                <span className="text-muted">İlerleme</span>
                <span className={`font-medium ${monthlyProgress >= 80 ? "text-emerald-500" : monthlyProgress >= 50 ? "text-amber-500" : "text-red-500"}`}>
                  %{monthlyProgress}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-alt">
                <div className={`h-full rounded-full transition-all ${
                  monthlyProgress >= 80 ? "bg-emerald-500" : monthlyProgress >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${Math.min(monthlyProgress, 100)}%` }} />
              </div>
              <p className="mt-2 text-[11px] text-muted">
                Hedefe ulaşmak için <span className="font-medium text-foreground">{tryFmt(STATS.monthlyTarget - STATS.monthlySales)}</span> daha
              </p>
            </div>
          </div>

          {/* Bildirimler */}
          <div className="relative rounded-2xl border border-border/80 bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-muted" strokeWidth={1.75} />
                <span className="font-display text-[15px] font-medium text-foreground">Bildirimler</span>
                {unreadCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              <button onClick={() => setNotifOpen(!notifOpen)}
                className="text-[12px] text-accent hover:text-accent/80">
                {notifOpen ? "Gizle" : "Tümü"}
              </button>
            </div>
            <div className="space-y-2.5">
              {notifications.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted">Bildirim yok</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className="flex cursor-pointer items-start gap-3 border-b border-border/20 py-2 last:border-0"
                    onClick={async () => {
                      if (n.is_read) return;
                      const supabase = createClient();
                      await supabase.from("messages").update({ is_read: true }).eq("id", n.id);
                      setNotifications((prev) =>
                        prev.map((m) => (m.id === n.id ? { ...m, is_read: true } : m)),
                      );
                    }}
                  >
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.is_read ? "bg-transparent" : "bg-red-500"}`} />
                    <div>
                      <p className="text-xs text-foreground">{n.message}</p>
                      <p className="mt-0.5 text-[10px] text-muted">{new Date(n.created_at).toLocaleString("tr-TR")}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── KPI Satırı 1 ── */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Net Kazanç (Toplam)" value={tryFmt(dashboardData.totalRevenue)}
            sub={`Komisyon sonrası (%12)`} icon={TrendingUp} accent
            trend="Geçen aya +%12" trendUp />
          <KpiCard label="Ortalama Sipariş (AOV)" value={tryFmt(STATS.aov)}
            sub="Sipariş başına ortalama" icon={ShoppingBag}
            vs={`Platform ort: ${tryFmt(1050)}`} />
          <KpiCard label="Müşteri LTV" value={tryFmt(STATS.ltv)}
            sub="Müşteri başına ömür boyu" icon={Users} />
          <KpiCard label="Dönüşüm Oranı" value={`%${STATS.conversionRate}`}
            sub="Ziyaret → Satış" icon={Target}
            trend="Platform ort: %2.8 ✓" trendUp />
        </div>

        {/* ── KPI Satırı 2 ── */}
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Bekleyen Sipariş" value={String(dashboardData.pendingOrders)}
            sub={`${dashboardData.totalOrders} toplam`} icon={Clock} />
          <KpiCard label="Müşteri Puanı" value={String(STATS.rating)}
            sub={`${STATS.reviewCount} değerlendirme`} icon={Star}
            trend={`Platform ort: ${STATS.platformAvgRating} ✓`} trendUp />
          <KpiCard label="İade Oranı" value={`%${STATS.returnRate}`}
            sub="Son 30 gün" icon={RotateCcw}
            trend={`Platform ort: %${STATS.platformAvgReturnRate} ✓`} trendUp />
          <KpiCard label="Tekrar Alışveriş" value={`%${STATS.repeatCustomers}`}
            sub="Sadık müşteri oranı" icon={Award} />
        </div>

        {/* ── Grafik Satırı ── */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card title="Haftalık Satış Trendi" action={<span className="text-[12px] text-muted">Son 7 gün</span>}>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={weeklyChartData}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.5} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} tickFormatter={v => `₺${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="total" name="Satış" stroke="var(--color-accent)" strokeWidth={2} fill="url(#g1)" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </div>
          <Card title="Kategori Dağılımı" action={<span className="text-[12px] text-muted">Satış %</span>}>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={categoryChartData} cx="50%" cy="50%" outerRadius={60} dataKey="value">
                  {categoryChartData.map((entry, i) => (
                    <Cell key={`${entry.name}-${i}`} fill={categoryPieColors[i % categoryPieColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => {
                    const n = typeof v === "number" ? v : 0
                    return categoryTotal ? `%${Math.round((n / categoryTotal) * 100)}` : `%${n}`
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {categoryChartData.map((c, i) => (
                <div key={c.name} className="flex items-center gap-2 text-[12px]">
                  <div
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: categoryPieColors[i % categoryPieColors.length] }}
                  />
                  <span className="text-muted">{c.name}</span>
                  <span className="ml-auto font-medium text-foreground">
                    %{categoryTotal ? Math.round((c.value / categoryTotal) * 100) : 0}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── En İyi Satış Saatleri + Aylık ── */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card title="En İyi Satış Saatleri" action={<span className="text-[12px] text-muted">Bugün</span>}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={hourlyChartData} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.4} />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="total" name="Sipariş" fill="var(--color-accent)" radius={[3, 3, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-2 text-[12px] text-muted">
              🔥 En yoğun saat: <span className="font-medium text-foreground">{bestHour?.hour ?? "-"}</span> — Kampanyalarınızı bu saate planlayın
            </p>
          </Card>

          <Card title="Aylık Satış" action={<span className="text-[12px] text-muted">Son 7 ay</span>}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={monthlyChartData} barSize={22}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.4} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false}
                  tickFormatter={v => `₺${(v/1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" name="Satış" fill="var(--color-accent)" radius={[4, 4, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* ── Ürün Performansı + Stok ── */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card title="Ürün Performansı" action={<Link href="/satici/urunlerim" className="text-[12px] text-accent">Tümü →</Link>}>
            <div className="space-y-1">
              <div className="grid grid-cols-3 pb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
                <span>Ürün</span>
                <span className="text-center">Gelir</span>
                <span className="text-center">Sipariş</span>
              </div>
              {topProductsData.map((p, i) => (
                <div key={i} className="grid grid-cols-3 items-center rounded-xl px-2 py-3 transition-colors hover:bg-surface-alt/50">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-[10px] font-bold text-muted">{i + 1}</span>
                    <span className="truncate text-[12px] font-medium text-foreground">{p.name}</span>
                  </div>
                  <div className="text-center text-[12px] font-medium text-foreground">{tryFmt(p.revenue)}</div>
                  <div className="text-center text-[12px] text-muted">{p.orderCount}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Son Değerlendirmeler */}
          <Card title="Son Değerlendirmeler" action={<span className="text-[12px] text-muted">{STATS.rating} ⭐ ort.</span>}>
            <div className="space-y-3">
              {reviews.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted">Henüz değerlendirme yok</p>
              ) : (
                reviews.map((r, i) => (
                  <div key={i} className="border-b border-border/20 pb-3 last:border-0">
                    <div className="mb-1 flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <span key={j} style={{ color: j < (r.rating ?? 0) ? "#c9a84c" : "#444" }}>★</span>
                      ))}
                    </div>
                    <p className="text-xs text-foreground">{r.comment}</p>
                    <p className="mt-1 text-[10px] text-muted">{new Date(r.created_at).toLocaleDateString("tr-TR")}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* ── Sepet Terk + Reklam ── */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card title="Sepette Terk Edilen"
            action={<span className="flex items-center gap-1 text-[12px] text-amber-500"><AlertCircle size={12} /> Fırsat</span>}>
            <p className="mb-4 text-[12px] text-muted">Kampanya ile geri kazanabilirsiniz.</p>
            <div>
              {abandonedCart.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted">Henüz terk edilen sepet yok</p>
              ) : (
                abandonedCart.map((item, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-border/20 py-2 last:border-0">
                    <span className="text-xs text-foreground">{item.name}</span>
                    <span className="text-xs text-muted">{item.count} kez</span>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card title="Reklam Performansı">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-surface-alt/50 px-4 py-3">
                <div><p className="text-[11px] text-muted">Harcama</p>
                  <p className="font-display text-lg font-medium text-foreground">{tryFmt(totalAdSpend)}</p></div>
                <Megaphone size={16} className="text-muted" strokeWidth={1.5} />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-surface-alt/50 px-4 py-3">
                <div><p className="text-[11px] text-muted">Gelir</p>
                  <p className="font-display text-lg font-medium text-emerald-500">{tryFmt(totalAdRevenue)}</p></div>
                <TrendingUp size={16} className="text-emerald-500" strokeWidth={1.5} />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-accent/20 bg-accent/[0.05] px-4 py-3">
                <div><p className="text-[11px] text-muted">ROAS</p>
                  <p className="font-display text-lg font-medium text-accent">{roas}x</p>
                  <p className="text-[11px] text-muted">₺1 → ₺{roas}</p></div>
                <Target size={16} className="text-accent" strokeWidth={1.5} />
              </div>
            </div>
          </Card>

          <Card title="Trafik Kaynakları">
            <div className="space-y-2">
              {trafficChartData.map((s, i) => {
                const sharePct = trafficTotal > 0 ? (s.value / trafficTotal) * 100 : 0;
                return (
                  <div key={i} className="flex items-center justify-between rounded-xl px-2 py-2.5 hover:bg-surface-alt/50">
                    <span className="text-[13px] text-foreground">{s.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[12px] text-muted">{numFmt(s.value)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        sharePct >= 35 ? "bg-emerald-500/10 text-emerald-500" :
                        sharePct >= 20 ? "bg-amber-500/10 text-amber-500" :
                        "bg-red-500/10 text-red-500"}`}>%{sharePct.toFixed(1)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* ── Platform Karşılaştırması ── */}
        <div className="mt-6">
          <Card title="Platform Ortalamasıyla Karşılaştırma"
            action={<span className="flex items-center gap-1 text-[12px] text-emerald-500"><Award size={12} /> Performansın</span>}>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "Dönüşüm Oranı", yours: STATS.conversionRate, platform: STATS.platformAvgConversion, unit: "%", higherBetter: true },
                { label: "Müşteri Puanı",  yours: STATS.rating,         platform: STATS.platformAvgRating,      unit: "",  higherBetter: true },
                { label: "İade Oranı",     yours: STATS.returnRate,     platform: STATS.platformAvgReturnRate,  unit: "%", higherBetter: false },
              ].map(item => {
                const better = item.higherBetter ? item.yours > item.platform : item.yours < item.platform;
                return (
                  <div key={item.label} className={`rounded-xl border p-4 ${better ? "border-emerald-500/20 bg-emerald-500/[0.04]" : "border-amber-500/20 bg-amber-500/[0.04]"}`}>
                    <p className="text-[11px] font-medium text-muted">{item.label}</p>
                    <div className="mt-2 flex items-end justify-between">
                      <div>
                        <p className={`font-display text-xl font-medium ${better ? "text-emerald-500" : "text-amber-500"}`}>
                          {item.unit}{item.yours}
                        </p>
                        <p className="text-[11px] text-muted">Senin değerin</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-xl font-medium text-muted">{item.unit}{item.platform}</p>
                        <p className="text-[11px] text-muted">Platform ort.</p>
                      </div>
                    </div>
                    <div className={`mt-3 flex items-center gap-1 text-[12px] font-medium ${better ? "text-emerald-500" : "text-amber-500"}`}>
                      {better ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                      {better ? "Platformun üzerinde ✓" : "Geliştirme fırsatı"}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* ── Son Siparişler ── */}
        <div className="mt-6">
          <Card title="Son Siparişler" action={<Link href="/satici/siparislerim" className="text-[12px] text-accent">Tümünü gör →</Link>}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-border/60">
                    {["No", "Ürün", "Müşteri", "Tutar", "Durum", "Tarih"].map(h => (
                      <th key={h} className="pb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {dashboardData.recentOrders.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-sm text-muted">Henüz sipariş yok</td></tr>
                  ) : dashboardData.recentOrders.map(order => (
                    <tr key={order.id} className="transition-colors hover:bg-white/[0.02]">
                      <td className="py-3.5 pr-4 font-medium text-foreground">{order.id.slice(0, 8)}</td>
                      <td className="py-3.5 pr-4 text-foreground">{order.product_name ?? "-"}</td>
                      <td className="py-3.5 pr-4 text-foreground">{order.customer_name ?? "-"}</td>
                      <td className="py-3.5 pr-4 text-foreground">{tryFmt(order.amount)}</td>
                      <td className="py-3.5 pr-4">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${order.payment_status === "paid" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                          {order.payment_status === "paid" ? "Tamamlandı" : "Bekliyor"}
                        </span>
                      </td>
                      <td className="py-3.5 text-muted">{new Date(order.created_at).toLocaleDateString("tr-TR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* ── Sipariş Özeti ── */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Bekliyor",   value: dashboardData.pendingOrders,   color: "text-amber-500",   bg: "bg-amber-500/10 border-amber-500/20",    icon: Clock },
            { label: "Kargoda",    value: STATS.shippedOrders,   color: "text-blue-500",    bg: "bg-blue-500/10 border-blue-500/20",      icon: Truck },
            { label: "Tamamlanan", value: dashboardData.recentOrders.filter(o => o.payment_status === "paid").length, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle },
            { label: "İptal",      value: STATS.cancelledOrders, color: "text-red-500",     bg: "bg-red-500/10 border-red-500/20",        icon: AlertCircle },
          ].map(item => (
            <div key={item.label} className={`flex items-center gap-4 rounded-2xl border px-5 py-4 ${item.bg}`}>
              <item.icon size={20} className={item.color} strokeWidth={1.75} />
              <div>
                <p className={`font-display text-2xl font-medium ${item.color}`}>{item.value}</p>
                <p className="text-[12px] text-muted">{item.label}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
