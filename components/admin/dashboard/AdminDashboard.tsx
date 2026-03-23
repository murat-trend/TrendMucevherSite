import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calculator,
  CreditCard,
  Gem,
  HeartHandshake,
  Layers,
  Megaphone,
  MessageSquareWarning,
  Package,
  Percent,
  RefreshCw,
  Search,
  ShieldAlert,
  Target,
  Timer,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminDataScroll, ADMIN_TABLE_TH_STICKY } from "@/components/admin/ui/AdminDataScroll";
import { AdminKpiCard, type AdminKpiTone } from "@/components/admin/ui/AdminKpiCard";
import { AdPerformancePanel } from "./AdPerformancePanel";
import { ConversionFunnelPanel } from "./ConversionFunnelPanel";
import { CriticalSellersPanel, type SellerHealthRow } from "./CriticalSellersPanel";
import { ZeroResultSearchesPanel } from "./ZeroResultSearchesPanel";
import {
  DASHBOARD_TOTAL_REVENUE_TRY,
  FINANCIAL_REPORT,
  LTV_SNAPSHOT,
  MARKETING_SNAPSHOT,
  formatReportDateRangeTr,
  getCacTry,
  getEstimatedNetProfitBreakdown,
  getFinancialReportNetProfitTry,
  getNetProfitMargin,
  getRoasRatio,
} from "./marketing-dashboard-constants";
import { SalesTrendChart } from "./SalesTrendChart";
import { DEMO_ZERO_RESULT_SEARCHES } from "@/lib/search/zero-result-searches";

const tryFmt = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);

const numFmt = (n: number) => new Intl.NumberFormat("tr-TR").format(n);

type Kpi = {
  id: string;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  change?: { value: string; up: boolean; neutral?: boolean };
  icon: LucideIcon;
  tone?: AdminKpiTone;
  /** Stratejik satır — öne çıkan kart (ör. Toplam Satış). */
  primary?: boolean;
  /** Stratejik satır — birincil olmayan büyük kartlar. */
  heroRow?: boolean;
  /** Dashboard kısayolu — tüm kart tıklanabilir. */
  href?: string;
};

/** Set to true to preview empty states (chart, table, applications). */
const EMPTY_PREVIEW = false;

/** Örnek veri — 0 ise risk kartı yeşil (positive), &gt;0 ise critical (kırmızı). */
const RISKY_OPERATIONS_COUNT = 2;

const roasFmt = (r: number) =>
  `${new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(r)}×`;

const cacTry = getCacTry();
const roasRatio = getRoasRatio();

/** Depo eşik altı — bu değerin altındaki stok kırmızı ve KPI’da kritik sayılır */
const LOW_STOCK_THRESHOLD = 10;

type ProductRow = { id: string; name: string; sales: number; revenue: number; stock: number };

const TOP_PRODUCTS: ProductRow[] = EMPTY_PREVIEW
  ? []
  : [
      { id: "sku-aurora-ring", name: "Elmas Yüzük — Aurora", sales: 42, revenue: 186_400, stock: 0 },
      { id: "sku-linea-bracelet", name: "Altın Bilezik — Linea", sales: 38, revenue: 124_200, stock: 8 },
      { id: "sku-luna-pearl", name: "İnci Kolye — Luna", sales: 31, revenue: 68_900, stock: 14 },
      { id: "sku-solstice-ear", name: "Pırlanta Küpe — Solstice", sales: 27, revenue: 92_150, stock: 3 },
      { id: "sku-nova-sapphire", name: "Safir Yüzük — Nova", sales: 24, revenue: 78_400, stock: 22 },
      { id: "sku-eclat-set", name: "Rose Altın Set — Éclat", sales: 22, revenue: 56_200, stock: 9 },
      { id: "sku-verdant-neck", name: "Zümrüt Kolye — Verdant", sales: 19, revenue: 112_800, stock: 11 },
      { id: "sku-prism-baguette", name: "Baget Pırlanta — Prism", sales: 18, revenue: 95_600, stock: 6 },
      { id: "sku-halo-minimal", name: "Minimal Altın Yüzük — Halo", sales: 16, revenue: 28_900, stock: 15 },
      { id: "sku-heritage-brooch", name: "Vintage Broş — Heritage", sales: 14, revenue: 44_300, stock: 4 },
    ];

const CRITICAL_STOCK_SKU_COUNT = TOP_PRODUCTS.filter((p) => p.stock < LOW_STOCK_THRESHOLD).length;

/** Elde tutma — tekrar müşteri & churn (gösterim; CRM / sipariş geçmişi ile üretilir) */
const RETENTION_SNAPSHOT = {
  periodLabel: "Son 90 gün",
  /** 2+ sipariş veren müşteri ÷ tüm müşteriler */
  repeatCustomerRate: 0.412,
  /** Dönem içi “tek seferlik” veya kayıp müşteri oranı (basitleştirilmiş müşteri churn) */
  customerChurnRate: 0.082,
  /** Aktif satıcı havuzundan düşen oran (satıcı churn) */
  sellerChurnRate: 0.031,
} as const;

const pctFmtKpi = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);

const FINANCIAL_PERIOD_LABEL = formatReportDateRangeTr(
  FINANCIAL_REPORT.periodStartIso,
  FINANCIAL_REPORT.periodEndIso,
);

const NET_PROFIT_TRY = getFinancialReportNetProfitTry();
const NET_PROFIT_MARGIN = getNetProfitMargin(DASHBOARD_TOTAL_REVENUE_TRY, NET_PROFIT_TRY);
const NET_PROFIT_BREAKDOWN = getEstimatedNetProfitBreakdown();

/** Dönüşüm hunisi ile aynı payda: satın alma oturumu ÷ toplam oturum (ConversionFunnelPanel). */
const FUNNEL_TOTAL_SESSIONS = 182_400;
const FUNNEL_PURCHASE_SESSIONS = 5_837;
const CONVERSION_RATE_OVERALL = FUNNEL_PURCHASE_SESSIONS / FUNNEL_TOTAL_SESSIONS;

function buildKpiRows(): {
  strategic: Kpi[];
  marketing: Kpi[];
  operational: Kpi[];
} {
  if (EMPTY_PREVIEW) return { strategic: [], marketing: [], operational: [] };

  const hasRisk = RISKY_OPERATIONS_COUNT > 0;
  const riskTone: AdminKpiTone = hasRisk ? "critical" : "positive";
  const riskItem: Kpi = {
    id: "risk",
    label: "Riskli İşlemler",
    value: numFmt(RISKY_OPERATIONS_COUNT),
    change: hasRisk
      ? { value: "Değişim yok", up: true, neutral: true }
      : { value: "Risk yok", up: true, neutral: true },
    icon: ShieldAlert,
    tone: riskTone,
  };

  const topSearch = DEMO_ZERO_RESULT_SEARCHES[0];
  const topSearchSub = topSearch
    ? `En sık: “${topSearch.query.length > 72 ? `${topSearch.query.slice(0, 72)}…` : topSearch.query}” · Toplam sonuçsuz arama (demo)`
    : "Arama verisi yok";

  const strategic: Kpi[] = [
    {
      id: "total-sales",
      label: "Toplam Satış",
      value: tryFmt(DASHBOARD_TOTAL_REVENUE_TRY),
      sub: `Rapor dönemi: ${FINANCIAL_PERIOD_LABEL} · Net satış geliri (KDV hariç özet)`,
      change: { value: "+12,4%", up: true },
      icon: CreditCard,
      tone: "revenue",
      primary: true,
    },
    {
      id: "conversion-rate",
      label: "Dönüşüm Oranı",
      value: pctFmtKpi(CONVERSION_RATE_OVERALL),
      sub: `Son 30 gün · oturumda satın alma (visit → purchase) · payda: ${numFmt(FUNNEL_TOTAL_SESSIONS)} oturum`,
      change: { value: "+0,3 puan", up: true, neutral: true },
      icon: Percent,
      tone: "info",
      heroRow: true,
    },
    {
      id: "ltv",
      label: "Yaşam Boyu Değer (LTV)",
      value: tryFmt(LTV_SNAPSHOT.avgLtvTry),
      sub: `${LTV_SNAPSHOT.periodLabel} • müşteri başına beklenen brüt ciro — sadakat & tekrar satış (lüks segment)`,
      change: { value: "+5,2%", up: true },
      icon: Gem,
      tone: "revenue",
      heroRow: true,
    },
    {
      id: "site-health-performance",
      label: "SİTE SAĞLIK & PERFORMANS",
      value: "94/100",
      sub: "Özet skor · LCP / CLS / INP (gösterim) · uptime %99,9+ — RUM / CrUX ile senkronize edilir",
      change: { value: "+3 puan", up: true, neutral: true },
      icon: Activity,
      tone: "info",
      heroRow: true,
    },
  ];

  const marketing: Kpi[] = [
    {
      id: "roas",
      label: "ROAS",
      value: roasFmt(roasRatio),
      sub: `${MARKETING_SNAPSHOT.periodLabel} • her 1 ₺ reklam için üretilen satış (çarpan)`,
      change: { value: "+0,4×", up: true },
      icon: Megaphone,
      tone: "positive",
    },
    {
      id: "cac",
      label: "Müşteri Edinme Maliyeti (CAC)",
      value: tryFmt(Math.round(cacTry)),
      sub: `${MARKETING_SNAPSHOT.periodLabel} • yeni müşteri başına (pazarlama harcaması)`,
      change: { value: "Önceki döneme göre −8,2%", up: true, neutral: true },
      icon: Target,
      tone: "neutral",
    },
    {
      id: "retention",
      label: "Tekrar Eden Müşteri",
      value: pctFmtKpi(RETENTION_SNAPSHOT.repeatCustomerRate),
      sub: `Churn: ${pctFmtKpi(RETENTION_SNAPSHOT.customerChurnRate)} · Satıcı churn: ${pctFmtKpi(RETENTION_SNAPSHOT.sellerChurnRate)} · ${RETENTION_SNAPSHOT.periodLabel}`,
      change: { value: "Churn önceki döneme göre −0,4 puan", up: true, neutral: true },
      icon: HeartHandshake,
      tone: "positive",
    },
    {
      id: "top-searches",
      label: "En Çok Arananlar",
      value: topSearch ? numFmt(topSearch.count) : "—",
      sub: topSearchSub,
      change: topSearch ? { value: "Sonuçsuz arama sayısı (demo)", up: true, neutral: true } : undefined,
      icon: Search,
      tone: "neutral",
    },
  ];

  const operational: Kpi[] = [
    {
      id: "pending",
      label: "Bekleyen Siparişler",
      value: numFmt(142),
      sub: "Onay / işlem bekleyen (SLA gecikmesi yok — gösterim)",
      change: { value: "Önceki döneme göre −2,0%", up: true, neutral: true },
      icon: Timer,
      tone: "info",
      href: "/admin/orders?status=pending",
    },
    {
      id: "critical-stock",
      label: "Kritik Stok",
      value: numFmt(CRITICAL_STOCK_SKU_COUNT),
      sub: `En çok satanlarda < ${LOW_STOCK_THRESHOLD} adet (SKU)`,
      change:
        CRITICAL_STOCK_SKU_COUNT > 0
          ? { value: "Tedarik aksiyonu önerilir", up: true, neutral: true }
          : { value: "Eşik altı yok", up: true, neutral: true },
      icon: Package,
      tone: CRITICAL_STOCK_SKU_COUNT > 0 ? "critical" : "positive",
      href: "/admin/products?filter=low-stock",
    },
    {
      id: "applications",
      label: "Yeni Satıcılar",
      value: numFmt(7),
      change: { value: "+2 başvuru", up: true, neutral: true },
      icon: Layers,
      tone: "neutral",
      href: "/admin/sellers/applications",
    },
    riskItem,
  ];

  return { strategic, marketing, operational };
}

const KPI_ROWS = buildKpiRows();

function KpiChangeBlock({ item }: { item: Kpi }) {
  if (!item.change) return null;
  return (
    <div className={`mt-2 flex items-start gap-2.5 ${item.change.neutral ? "" : "min-h-[2.5rem]"}`}>
      {!item.change.neutral && (
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${
            item.change.up
              ? "border-emerald-500/45 bg-emerald-500/[0.14] text-emerald-300"
              : "border-rose-500/45 bg-rose-500/[0.14] text-rose-300"
          }`}
          aria-label={item.change.up ? "Yükseliş" : "Düşüş"}
          role="img"
        >
          {item.change.up ? (
            <ArrowUpRight className="h-7 w-7" strokeWidth={2.5} aria-hidden />
          ) : (
            <ArrowDownRight className="h-7 w-7" strokeWidth={2.5} aria-hidden />
          )}
        </span>
      )}
      <p
        className={`min-w-0 flex-1 leading-snug ${
          item.change.neutral
            ? item.tone === "info"
              ? "text-xs font-medium text-sky-400/85"
              : "text-xs font-medium text-zinc-500/90"
            : ""
        }`}
      >
        {item.change.neutral ? (
          item.change.value
        ) : (
          <>
            <span
              className={`block text-sm font-semibold tabular-nums tracking-tight ${
                item.change.up ? "text-emerald-400/95" : "text-rose-400/90"
              }`}
            >
              {item.change.value}
            </span>
            <span className="mt-0.5 block text-[11px] font-normal leading-tight text-zinc-600/90">
              önceki döneme göre
            </span>
          </>
        )}
      </p>
    </div>
  );
}

function KpiRowSection({ items }: { items: Kpi[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <AdminKpiCard
          key={item.id}
          label={item.label}
          value={item.value}
          sub={item.sub}
          icon={item.icon}
          tone={item.tone ?? "neutral"}
          primary={item.primary}
          heroRow={item.heroRow}
          href={item.href}
        >
          <KpiChangeBlock item={item} />
        </AdminKpiCard>
      ))}
    </div>
  );
}

const SALES_TREND = EMPTY_PREVIEW
  ? []
  : [
      { day: "Pzt", value: 118 },
      { day: "Sal", value: 132 },
      { day: "Çar", value: 126 },
      { day: "Per", value: 148 },
      { day: "Cum", value: 141 },
      { day: "Cmt", value: 162 },
      { day: "Paz", value: 155 },
    ];

const ORDER_STATUS = EMPTY_PREVIEW
  ? []
  : [
      { label: "Bekleyen", count: 45, tone: "bg-[#c69575]/80" },
      { label: "Hazırlanıyor", count: 32, tone: "bg-[#a89b8c]/90" },
      { label: "Kargoda", count: 28, tone: "bg-[#7d8a9e]/85" },
      { label: "Tamamlandı", count: 1240, tone: "bg-emerald-500/70" },
      { label: "İptal", count: 12, tone: "bg-rose-500/55" },
      { label: "İade", count: 18, tone: "bg-orange-500/55" },
      { label: "Bekleyen ödeme", count: 22, tone: "bg-amber-500/50" },
      { label: "İncelemede", count: 9, tone: "bg-sky-500/50" },
    ];

type AppRow = { store: string; date: string; id: string };

const SELLER_APPLICATIONS: AppRow[] = EMPTY_PREVIEW
  ? []
  : [
      { id: "1", store: "Atölye Mara", date: "14.03.2025" },
      { id: "2", store: "Gümüş İşleri Co.", date: "13.03.2025" },
      { id: "3", store: "Vintage Koleksiyon", date: "12.03.2025" },
      { id: "4", store: "Pırlanta Loft", date: "11.03.2025" },
      { id: "5", store: "Elmas Evi İstanbul", date: "10.03.2025" },
      { id: "6", store: "Luna İnci Atölyesi", date: "09.03.2025" },
      { id: "7", store: "Osmanlı Hat Sanatı", date: "08.03.2025" },
      { id: "8", store: "Kuyumcu Sokak Atölye", date: "07.03.2025" },
    ];

type RiskItem = { id: string; title: string; detail: string };

/** Örnek uyarılar — boş bırakıldığında sadece özet satırları gösterilir. */
const RISK_ITEMS: RiskItem[] = [];

const RISK_SUMMARY = [
  { id: "fraud", label: "Fraud uyarısı", count: 0 },
  { id: "chargeback", label: "Chargeback uyarısı", count: 0 },
  { id: "abnormal", label: "Anormal sipariş", count: 0 },
] as const;

/**
 * Satıcı sağlığı (gösterim) — `CriticalSellersPanel` içinde
 * iade &gt; %20 veya ort. puan &lt; 3 ile otomatik filtrelenir.
 */
/** `INITIAL_SELLERS` id’leri ile uyumlu — detay sayfası `/admin/sellers/[id]` */
const SELLER_HEALTH_SNAPSHOT: SellerHealthRow[] = EMPTY_PREVIEW
  ? []
  : [
      {
        id: "s1",
        name: "Atölye Mara",
        complaintCount: 1,
        lastThreeOrderScores: [5, 5, 5],
        returnRatePct: 4,
        avgCustomerRating: 4.8,
        status: "aktif",
      },
      {
        id: "s3",
        name: "Vintage Koleksiyon",
        complaintCount: 6,
        lastThreeOrderScores: [3, 3, 2],
        returnRatePct: 9,
        avgCustomerRating: 2.9,
        status: "aktif",
      },
      {
        id: "s4",
        name: "Elmas Evi İstanbul",
        complaintCount: 34,
        lastThreeOrderScores: [1, 2, 2],
        returnRatePct: 28,
        avgCustomerRating: 2.2,
        status: "askida",
      },
      {
        id: "s7",
        name: "Osmanlı Hat Sanatı",
        complaintCount: 8,
        lastThreeOrderScores: [2, 2, 5],
        returnRatePct: 11,
        avgCustomerRating: 2.8,
        status: "incelemede",
      },
      {
        id: "s8",
        name: "Pırlanta Loft",
        complaintCount: 12,
        lastThreeOrderScores: [4, 3, 4],
        returnRatePct: 22,
        avgCustomerRating: 4.1,
        status: "incelemede",
      },
    ];

/** Müşteri şikâyetleri — admin onayı bekleyen kayıtlar (CRM / ticket API ile beslenir) */
type PendingComplaintRow = {
  id: string;
  sellerId: string;
  sellerName: string;
  summary: string;
  openedAtLabel: string;
};

const PENDING_COMPLAINTS: PendingComplaintRow[] = EMPTY_PREVIEW
  ? []
  : [
      {
        id: "sh-101",
        sellerId: "s4",
        sellerName: "Elmas Evi İstanbul",
        summary: "Hasarlı kutu / teslimat",
        openedAtLabel: "14.03.2025",
      },
      {
        id: "sh-102",
        sellerId: "s8",
        sellerName: "Pırlanta Loft",
        summary: "Ürün fotoğrafla uyumsuz",
        openedAtLabel: "13.03.2025",
      },
      {
        id: "sh-103",
        sellerId: "s7",
        sellerName: "Osmanlı Hat Sanatı",
        summary: "Geciken kargo — SLA aşımı",
        openedAtLabel: "12.03.2025",
      },
      {
        id: "sh-104",
        sellerId: "s3",
        sellerName: "Vintage Koleksiyon",
        summary: "Yanlış beden / değişim talebi",
        openedAtLabel: "11.03.2025",
      },
      {
        id: "sh-105",
        sellerId: "s1",
        sellerName: "Atölye Mara",
        summary: "İade onayı gecikmesi",
        openedAtLabel: "10.03.2025",
      },
    ];

function CardShell({
  title,
  children,
  className = "",
  action,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#12141a]/95 via-[#0c0d11] to-[#08090c] p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] sm:p-6 ${className}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight text-zinc-100">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function OrderStatusBars() {
  const max = Math.max(...ORDER_STATUS.map((o) => o.count), 1);
  if (ORDER_STATUS.length === 0) {
    return (
      <AdminEmptyState
        message="Sipariş durumu verisi bulunmuyor."
        hint="Veri akışı başladığında dağılım burada görünecek."
        variant="shield"
        size="compact"
        className="rounded-xl"
      />
    );
  }
  return (
    <div
      className="admin-scrollbar max-h-[280px] min-h-0 overflow-y-auto overscroll-contain pr-1"
      role="region"
      aria-label="Sipariş durumu listesi"
    >
      <ul className="space-y-3">
        {ORDER_STATUS.map((row) => {
          const pct = Math.round((row.count / max) * 100);
          return (
            <li key={row.label}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-400">{row.label}</span>
                <span className="tabular-nums text-zinc-300">{numFmt(row.count)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={`h-full rounded-full transition-all ${row.tone}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AdminDashboard() {
  return (
    <div className="space-y-6 lg:space-y-8">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-zinc-50">Dashboard</h1>
        <p className="text-sm text-zinc-500">Genel sistem performansı ve özet</p>
      </header>

      {/* Net kar — rapor dönemi; ciro − COGS − reklam − iade (tek ana gösterim; stratejik satırda tekrarlanmaz) */}
      {!EMPTY_PREVIEW && (
        <section
          aria-label="Net kar hesaplama özeti"
          className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-950/35 via-[#0c1012] to-[#08090c] p-4 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] sm:p-5"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:justify-between lg:gap-6">
            <div className="flex min-w-0 flex-1 gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                <Calculator className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200/90">Net kar (hesaplanan)</p>
                <p className="mt-1 font-display text-2xl font-semibold tabular-nums tracking-tight text-emerald-50 sm:text-3xl">
                  {tryFmt(NET_PROFIT_TRY)}
                </p>
                <p className="mt-1 text-xs text-emerald-200/75">
                  Net kar marjı <span className="font-medium tabular-nums text-emerald-100/95">{pctFmtKpi(NET_PROFIT_MARGIN)}</span>
                  <span className="text-emerald-200/50"> · </span>
                  <span className="text-zinc-500">{FINANCIAL_PERIOD_LABEL}</span>
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                  Stratejik KPI satırındaki özetlerle uyumlu formül; reklam harcaması pazarlama özetiyle eşlenir.
                </p>
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center rounded-xl border border-white/[0.08] bg-black/25 px-3 py-2.5 sm:px-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Hesaplama</p>
              <p className="mt-1.5 break-words font-mono text-[11px] leading-relaxed text-zinc-400">
                {tryFmt(NET_PROFIT_BREAKDOWN.revenueTry)} − {tryFmt(NET_PROFIT_BREAKDOWN.productCostTry)} (COGS) −{" "}
                {tryFmt(NET_PROFIT_BREAKDOWN.adSpendTry)} (reklam) − {tryFmt(NET_PROFIT_BREAKDOWN.returnsLossTry)} (iade) ={" "}
                <span className="font-semibold text-emerald-400/95">{tryFmt(NET_PROFIT_BREAKDOWN.netProfitTry)}</span>
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Link
                  href="/admin/finance"
                  className="text-[11px] font-medium text-[#c9a88a] underline-offset-2 transition-colors hover:text-[#e8d4c4] hover:underline"
                >
                  Finans raporu →
                </Link>
                <span className="text-zinc-600">·</span>
                <span className="text-[11px] text-zinc-600">Reklam performansı panelinde aynı tutar özetlenir.</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* KPI — 3 satır: Stratejik / Pazarlama / Operasyon */}
      <section aria-label="Özet göstergeler: stratejik, pazarlama ve operasyon KPI’ları">
        {KPI_ROWS.strategic.length === 0 ? (
          <AdminEmptyState
            message="KPI verileri yüklenemedi."
            hint="Lütfen daha sonra tekrar deneyin."
            variant="warning"
            size="compact"
          />
        ) : (
          <div className="space-y-8">
            <div className="rounded-2xl border border-[#c69575]/18 bg-gradient-to-b from-[#c69575]/[0.07] via-[#0c0d11]/80 to-[#08090c] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-5">
              <KpiRowSection items={KPI_ROWS.strategic} />
            </div>
            <KpiRowSection items={KPI_ROWS.marketing} />
            <KpiRowSection items={KPI_ROWS.operational} />
          </div>
        )}
        {!EMPTY_PREVIEW && <AdPerformancePanel />}
        {!EMPTY_PREVIEW && <ConversionFunnelPanel />}
        {KPI_ROWS.strategic.length > 0 && !EMPTY_PREVIEW && (
          <p className="mt-3 max-w-3xl text-[11px] leading-relaxed text-zinc-600/90">
            <span className="font-medium text-zinc-500">Pazarlama özeti (gösterim):</span>{" "}
            {tryFmt(MARKETING_SNAPSHOT.adSpendTry)} reklam harcaması,{" "}
            {numFmt(MARKETING_SNAPSHOT.newCustomers)} yeni müşteri,{" "}
            {tryFmt(MARKETING_SNAPSHOT.attributedSalesTry)} attribüte satış — CAC ve ROAS bu girdilerle hesaplanır.{" "}
            <span className="text-zinc-600/80">
              LTV ({tryFmt(LTV_SNAPSHOT.avgLtvTry)}) mevcut müşteri ömür boyu değeri; LTV ÷ CAC ≈{" "}
              {numFmt(Math.round(LTV_SNAPSHOT.avgLtvTry / Math.max(cacTry, 1)))}× (lüks segmentte yinelenen satış ve sadakat
              önceliklidir).
            </span>
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:gap-6">
        <div className="xl:col-span-8">
          <CardShell title="Satış Trendi">
            <SalesTrendChart data={SALES_TREND} />
            <p className="mt-3 text-xs text-zinc-600">Son 7 gün — gösterim (bin ₺)</p>
          </CardShell>
        </div>
        <div className="min-h-0 xl:col-span-4">
          <CardShell title="Sipariş Durumu" className="min-h-0 overflow-hidden">
            <OrderStatusBars />
          </CardShell>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:gap-6">
        <CardShell title="En Çok Satan Ürünler" className="min-h-0 overflow-hidden">
          {TOP_PRODUCTS.length === 0 ? (
            <AdminEmptyState message="Henüz satış verisi yok." variant="shield" size="compact" className="rounded-xl" />
          ) : (
            <AdminDataScroll className="!rounded-lg" maxHeightClass="max-h-[280px]" fadeBottom={false}>
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    <th className={`px-4 py-3 font-medium ${ADMIN_TABLE_TH_STICKY}`}>Ürün adı</th>
                    <th className={`px-4 py-3 font-medium tabular-nums ${ADMIN_TABLE_TH_STICKY}`}>Satış</th>
                    <th className={`px-4 py-3 font-medium tabular-nums ${ADMIN_TABLE_TH_STICKY}`}>Stok durumu</th>
                    <th className={`px-4 py-3 font-medium tabular-nums ${ADMIN_TABLE_TH_STICKY}`}>Ciro</th>
                    <th className={`px-4 py-3 text-right font-medium ${ADMIN_TABLE_TH_STICKY}`}>Eylem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {TOP_PRODUCTS.map((row) => {
                    const low = row.stock < LOW_STOCK_THRESHOLD;
                    return (
                      <tr key={row.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-medium text-zinc-200">{row.name}</td>
                        <td className="px-4 py-3 tabular-nums text-zinc-400">{numFmt(row.sales)}</td>
                        <td
                          className={`px-4 py-3 ${low ? "font-semibold text-rose-400" : "text-emerald-400/85"}`}
                          title={
                            low
                              ? `Kritik: stok ${LOW_STOCK_THRESHOLD} adetin altında`
                              : `Stok eşiğin üstünde (≥${LOW_STOCK_THRESHOLD})`
                          }
                        >
                          <div className="inline-flex items-center gap-1.5 tabular-nums">
                            <span>{numFmt(row.stock)}</span>
                            {row.stock < 1 && (
                              <Link
                                href={`/admin/product-moderation?search=${encodeURIComponent(row.name)}&lowStock=1`}
                                className="inline-flex shrink-0 rounded-md p-0.5 text-sky-400/95 transition-colors hover:bg-sky-500/15 hover:text-sky-300"
                                title="Stok Yenile"
                                aria-label="Stok Yenile"
                              >
                                <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                              </Link>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-zinc-300">{tryFmt(row.revenue)}</td>
                        <td className="px-4 py-2 text-right align-middle">
                          {low ? (
                            <div className="flex flex-col items-stretch justify-end gap-1.5 sm:flex-row sm:flex-wrap sm:justify-end">
                              <Link
                                href={`/admin/product-moderation?search=${encodeURIComponent(row.name)}&lowStock=1`}
                                className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-rose-500/45 bg-rose-500/[0.14] px-2.5 py-1.5 text-[11px] font-semibold text-rose-100 transition-colors hover:bg-rose-500/28"
                              >
                                Tedarik Et
                              </Link>
                              <Link
                                href={`/admin/sellers?notifyStock=${encodeURIComponent(row.id)}`}
                                className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-white/[0.1] bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 transition-colors hover:border-[#c69575]/35 hover:bg-[#c69575]/10 hover:text-[#f0dcc8]"
                              >
                                Satıcıya Bildir
                              </Link>
                            </div>
                          ) : (
                            <span className="text-zinc-600" title="Kritik stok yok">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-2 border-t border-white/[0.06] pt-2 text-[11px] text-zinc-600">
                Stok &lt; {LOW_STOCK_THRESHOLD} adet{" "}
                <span className="font-medium text-rose-400/90">kırmızı</span> ile gösterilir; KPI’daki kritik sayı bu
                eşikle aynıdır. Stok &lt; 1 adette yanında{" "}
                <span className="font-medium text-sky-400/90">Stok Yenile</span> ikonu (ürün moderasyonuna gider).
                Kırmızı satırlarda{" "}
                <span className="font-medium text-zinc-500">Tedarik Et</span> /{" "}
                <span className="font-medium text-zinc-500">Satıcıya Bildir</span> ile hızlı aksiyon (ürün moderasyonu /
                satıcı ekranına gider).
              </p>
            </AdminDataScroll>
          )}
        </CardShell>

        <CardShell
          title="Yeni Satıcı Başvuruları"
          className="min-h-0 overflow-hidden"
          action={
            <Link
              href="/admin/sellers/applications"
              className="shrink-0 text-xs font-medium text-[#c9a88a] transition-colors hover:text-[#e8d4c4]"
            >
              Başvurular →
            </Link>
          }
        >
          {SELLER_APPLICATIONS.length === 0 ? (
            <AdminEmptyState message="Bekleyen başvuru bulunmuyor." variant="shield" size="compact" className="rounded-xl" />
          ) : (
            <div
              className="admin-scrollbar max-h-[280px] min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain rounded-lg border border-white/[0.06] pr-1"
              role="region"
              aria-label="Satıcı başvuru listesi"
            >
              <ul className="divide-y divide-white/[0.06]">
                {SELLER_APPLICATIONS.map((row) => (
                  <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-zinc-200">{row.store}</p>
                      <p className="text-xs text-zinc-500">{row.date}</p>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 rounded-lg border border-[#c69575]/35 bg-[#c69575]/10 px-3 py-1.5 text-xs font-medium text-[#eecdb8] transition-colors hover:bg-[#c69575]/18"
                    >
                      İncele
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardShell>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:items-start xl:gap-6">
        <div className="flex min-h-0 flex-col xl:col-span-7">
          <CriticalSellersPanel className="min-h-0 w-full" allSellers={SELLER_HEALTH_SNAPSHOT} />
        </div>

        <div className="min-h-0 xl:col-span-5">
          <CardShell title="Risk & Uyarılar">
            <ul className="space-y-2">
              {RISK_SUMMARY.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-sm"
                >
                  <span className="text-zinc-400">{row.label}</span>
                  <span className="tabular-nums font-medium text-zinc-300">{numFmt(row.count)}</span>
                </li>
              ))}
            </ul>
            {RISK_ITEMS.length > 0 ? (
              <ul className="mt-4 space-y-3 border-t border-white/[0.06] pt-4">
                {RISK_ITEMS.map((r) => (
                  <li
                    key={r.id}
                    className="flex gap-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] p-3 text-sm"
                  >
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/90" strokeWidth={1.5} />
                    <div>
                      <p className="font-medium text-zinc-200">{r.title}</p>
                      <p className="text-xs text-zinc-500">{r.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4">
                <AdminEmptyState
                  message="Şu an riskli işlem bulunmuyor"
                  hint="Fraud, chargeback veya anormal sipariş için yeni kayıt yok."
                  variant="shield"
                  size="compact"
                  className="rounded-xl"
                />
              </div>
            )}
          </CardShell>
        </div>

        <div className="xl:col-span-12">
          <CardShell title="Hızlı İşlemler">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Link
                href="/admin/sellers"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-[#c69575]/30 hover:bg-[#c69575]/10 hover:text-[#f0dcc8]"
              >
                <Zap className="h-4 w-4 text-[#c9a88a]" strokeWidth={1.5} />
                Satıcı Onayla
              </Link>
              <Link
                href="/admin/products"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-[#c69575]/30 hover:bg-[#c69575]/10 hover:text-[#f0dcc8]"
              >
                <Package className="h-4 w-4 text-[#c9a88a]" strokeWidth={1.5} />
                Ürün İncele
              </Link>
              <Link
                href="/admin/orders"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-[#c69575]/30 hover:bg-[#c69575]/10 hover:text-[#f0dcc8]"
              >
                <BarChart3 className="h-4 w-4 text-[#c9a88a]" strokeWidth={1.5} />
                Sipariş Yönet
              </Link>
              <Link
                href="/admin/campaigns"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-[#c69575]/30 hover:bg-[#c69575]/10 hover:text-[#f0dcc8]"
              >
                <Megaphone className="h-4 w-4 text-[#c9a88a]" strokeWidth={1.5} />
                Kampanya Oluştur
              </Link>
            </div>
          </CardShell>
        </div>
      </div>

      {/* En alt — onay bekleyen şikâyetler + sonuç vermeyen aramalar (yan yana) */}
      {!EMPTY_PREVIEW && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:items-start xl:gap-6">
          <section
            aria-labelledby="pending-complaints-heading"
            className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-950/25 via-[#0c0d11] to-[#08090c] p-4 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] sm:p-5"
          >
            <div className="mb-3 flex shrink-0 flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <MessageSquareWarning className="h-4 w-4 shrink-0 text-amber-400/90" strokeWidth={1.75} aria-hidden />
                <h2
                  id="pending-complaints-heading"
                  className="font-display text-sm font-semibold tracking-tight text-zinc-100 sm:text-base"
                >
                  Onay bekleyen şikâyetler
                </h2>
                <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-amber-200/90">
                  {PENDING_COMPLAINTS.length}
                </span>
              </div>
              <Link
                href="/admin/sellers"
                className="text-[11px] font-medium text-[#c9a88a] transition-colors hover:text-[#e8d4c4] sm:text-xs"
              >
                Satıcılar →
              </Link>
            </div>
            <p className="mb-3 shrink-0 text-[11px] leading-relaxed text-zinc-500">
              Sorun çıkaran satıcıları hızlıca görün; kayıtlar ticket / CRM ile senkronize edilir (gösterim).
            </p>
            {PENDING_COMPLAINTS.length === 0 ? (
              <AdminEmptyState
                message="Onay bekleyen şikâyet yok"
                hint="Yeni müşteri şikâyeti geldiğinde burada listelenir."
                variant="shield"
                size="compact"
                className="rounded-lg border border-white/[0.06] bg-white/[0.02]"
              />
            ) : (
              <div className="min-h-0 w-full max-w-full overflow-hidden rounded-xl border border-white/[0.06]">
                <div
                  role="region"
                  aria-label="Onay bekleyen şikâyetler listesi"
                  className="admin-scrollbar max-h-[220px] min-h-0 overflow-y-scroll overflow-x-hidden overscroll-contain pr-1 [scrollbar-gutter:stable]"
                >
                  <ul className="divide-y divide-white/[0.06] bg-black/20">
                    {PENDING_COMPLAINTS.map((c) => (
                      <li key={c.id} className="flex flex-wrap items-start justify-between gap-2 px-3 py-2.5 sm:px-3.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-zinc-300 sm:text-sm">
                            <Link
                              href={`/admin/sellers/${c.sellerId}`}
                              className="text-[#e8d4c4] transition-colors hover:text-[#f5e6d8] hover:underline"
                            >
                              {c.sellerName}
                            </Link>
                            <span className="text-zinc-600"> · </span>
                            <span className="text-zinc-400">{c.summary}</span>
                          </p>
                          <p className="mt-0.5 text-[10px] text-zinc-600 sm:text-[11px]">Açılış: {c.openedAtLabel}</p>
                        </div>
                        <button
                          type="button"
                          className="shrink-0 rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-100 transition-colors hover:bg-amber-500/20 sm:text-xs"
                        >
                          İncele
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>
          <div className="min-h-0">
            <ZeroResultSearchesPanel />
          </div>
        </div>
      )}
    </div>
  );
}
