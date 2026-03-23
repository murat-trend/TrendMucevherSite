/**
 * Dashboard pazarlama / ciro gösterim verileri — tek kaynak.
 * Gerçek üründe analitik + reklam + sipariş / mali API’den beslenir.
 */

export const MARKETING_SNAPSHOT = {
  periodLabel: "Son 30 gün",
  adSpendTry: 26_400,
  /** Reklam kanallarına bağlı (attribüte) brüt satış */
  attributedSalesTry: 118_800,
  newCustomers: 58,
} as const;

export const LTV_SNAPSHOT = {
  periodLabel: "Son 24 ay (projeksiyon)",
  avgLtvTry: 42_800,
} as const;

/** ERP / mali API’den gelebilecek gövde ile uyumlu (reklam hariç). */
export type FinancialReportPayload = {
  periodStartIso: string;
  periodEndIso: string;
  netSalesRevenueTry: number;
  productCostTry: number;
  returnsLossTry: number;
};

/**
 * Mali rapor — tek nesne (ERP / Excel export ile aynı dönem).
 * API: `FinancialReportPayload` ile aynı alanlar; reklam `MARKETING_SNAPSHOT.adSpendTry` ile ayrı kaynakta tutulur.
 */
export const FINANCIAL_REPORT: FinancialReportPayload = {
  /** Rapor başlangıç (dahil), ISO 8601 */
  periodStartIso: "2026-02-12",
  /** Rapor bitiş (dahil), ISO 8601 */
  periodEndIso: "2026-03-11",
  /** Aynı dönem net satış geliri (KDV hariç özet) — KPI “Toplam Satış” */
  netSalesRevenueTry: 124_500,
  /** Satılan malın maliyeti (COGS) */
  productCostTry: 62_000,
  /** İade / iptal kaynaklı brüt kayıp */
  returnsLossTry: 7_650,
} as const;

/** Dashboard KPI “Toplam Satış” — `FINANCIAL_REPORT.netSalesRevenueTry` ile aynı */
export const DASHBOARD_TOTAL_REVENUE_TRY = FINANCIAL_REPORT.netSalesRevenueTry;

/**
 * Net kar = ciro − COGS − reklam − iade kaybı.
 * Reklam tutarı `MARKETING_SNAPSHOT` ile tek kaynak; API bağlandığında aynı alan güncellenir.
 */
export function getFinancialReportNetProfitTry(): number {
  return (
    FINANCIAL_REPORT.netSalesRevenueTry -
    FINANCIAL_REPORT.productCostTry -
    FINANCIAL_REPORT.returnsLossTry -
    MARKETING_SNAPSHOT.adSpendTry
  );
}

/** Net kar marjı = net kar ÷ aynı dönem net satış geliri */
export function getNetProfitMargin(revenueTry: number, netProfitTry: number): number {
  return revenueTry > 0 ? netProfitTry / revenueTry : 0;
}

/** Rapor ekranı + export için: "12.02.2026 – 11.03.2026" */
export function formatReportDateRangeTr(startIso: string, endIso: string): string {
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(y, m - 1, d));
  };
  return `${fmt(startIso)} – ${fmt(endIso)}`;
}

/**
 * Reklam performansı paneli — `FINANCIAL_REPORT` + pazarlama reklam harcaması.
 * Formül: Ciro − (ürün maliyeti + reklam + iade kaybı) = `getFinancialReportNetProfitTry()`.
 */
export function getEstimatedNetProfitBreakdown() {
  const revenueTry = FINANCIAL_REPORT.netSalesRevenueTry;
  const productCostTry = FINANCIAL_REPORT.productCostTry;
  const returnsLossTry = FINANCIAL_REPORT.returnsLossTry;
  const adSpendTry = MARKETING_SNAPSHOT.adSpendTry;
  const netProfitTry = getFinancialReportNetProfitTry();
  const periodRangeLabel = formatReportDateRangeTr(FINANCIAL_REPORT.periodStartIso, FINANCIAL_REPORT.periodEndIso);
  return {
    revenueTry,
    productCostTry,
    adSpendTry,
    returnsLossTry,
    netProfitTry,
    periodRangeLabel,
  };
}

export type TrafficSourceRow = {
  id: string;
  label: string;
  detail: string;
  /** Oturum / tıklama kaynağı dağılımı (%) */
  trafficPct: number;
  /** Tamamlanan satışın attribüte dağılımı (%) */
  salesPct: number;
  barClass: string;
};

/** Trafik ve satış kırılımı — örnek; UTM / GA4 / Ads ile doğrulanır. */
export const TRAFFIC_SOURCES: readonly TrafficSourceRow[] = [
  {
    id: "social",
    label: "Sosyal medya",
    detail: "Instagram, Meta",
    trafficPct: 40,
    salesPct: 38,
    barClass: "bg-fuchsia-500/80",
  },
  {
    id: "direct",
    label: "Doğrudan",
    detail: "Yer imi, marka araması",
    trafficPct: 30,
    salesPct: 28,
    barClass: "bg-zinc-500/75",
  },
  {
    id: "google",
    label: "Google Ads",
    detail: "Arama, Performance Max",
    trafficPct: 30,
    salesPct: 34,
    barClass: "bg-sky-500/80",
  },
];

export function getCacTry() {
  const { adSpendTry, newCustomers } = MARKETING_SNAPSHOT;
  return newCustomers > 0 ? adSpendTry / newCustomers : 0;
}

export function getRoasRatio() {
  const { adSpendTry, attributedSalesTry } = MARKETING_SNAPSHOT;
  return adSpendTry > 0 ? attributedSalesTry / adSpendTry : 0;
}
