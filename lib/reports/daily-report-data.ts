/**
 * Günlük dashboard PDF raporu — veri katmanı.
 * Üretimde ERP / sipariş / stok / iade API’lerinden beslenir.
 */

import {
  FINANCIAL_REPORT,
  MARKETING_SNAPSHOT,
  formatReportDateRangeTr,
  getEstimatedNetProfitBreakdown,
  getFinancialReportNetProfitTry,
} from "@/components/admin/dashboard/marketing-dashboard-constants";

/** Dashboard ile uyumlu — kritik stok eşiği */
export const REPORT_LOW_STOCK_THRESHOLD = 10;

export type CriticalStockRow = {
  id: string;
  name: string;
  stock: number;
};

export type ReturnReasonRow = {
  reason: string;
  count: number;
};

export type DailyDashboardReportPayload = {
  /** Rapor tarihi (yerel gün) */
  reportDateIso: string;
  reportDateLabelTr: string;
  /** Dönem etiketi (ERP ile aynı gösterim) */
  financialPeriodLabel: string;
  /** Net kar (masraflar sonrası) */
  netProfitTry: number;
  netProfitMarginPct: number;
  breakdown: {
    netSalesRevenueTry: number;
    productCostTry: number;
    adSpendTry: number;
    returnsLossTry: number;
  };
  /** Günlük iade toplamı (operasyon) */
  returnOrdersCount: number;
  returnReasons: ReturnReasonRow[];
  /** Yarın sabah öncelik: düşük stoklu ürünler (en kritik üstte) */
  criticalStockOrdered: CriticalStockRow[];
};

/** Örnek ürün listesi — dashboard TOP_PRODUCTS ile aynı mantık */
const SAMPLE_PRODUCTS: CriticalStockRow[] = [
  { id: "sku-aurora-ring", name: "Elmas Yüzük — Aurora", stock: 0 },
  { id: "sku-linea-bracelet", name: "Altın Bilezik — Linea", stock: 8 },
  { id: "sku-luna-pearl", name: "İnci Kolye — Luna", stock: 14 },
  { id: "sku-solstice-ear", name: "Pırlanta Küpe — Solstice", stock: 3 },
  { id: "sku-nova-sapphire", name: "Safir Yüzük — Nova", stock: 22 },
  { id: "sku-eclat-set", name: "Rose Altın Set — Éclat", stock: 9 },
  { id: "sku-verdant-neck", name: "Zümrüt Kolye — Verdant", stock: 11 },
  { id: "sku-prism-baguette", name: "Baget Pırlanta — Prism", stock: 6 },
  { id: "sku-halo-minimal", name: "Minimal Altın Yüzük — Halo", stock: 15 },
  { id: "sku-heritage-brooch", name: "Vintage Broş — Heritage", stock: 4 },
];

/**
 * 18 iade — sebep dağılımı (gösterim; gerçekte ticket / iade kodlarından).
 * Toplam = returnOrdersCount ile eşleşmeli.
 */
const DEFAULT_RETURN_REASONS: ReturnReasonRow[] = [
  { reason: "Beden / ölçü uyumsuzluğu (ürün açıklaması yetersiz)", count: 5 },
  { reason: "Kargo kaynaklı hasar / eksik parça", count: 4 },
  { reason: "Ürün görseli ile renk / taş farkı", count: 3 },
  { reason: "Müşteri pişmanlığı / cayma (yasal süre)", count: 3 },
  { reason: "Geciken teslimat (SLA aşımı)", count: 2 },
  { reason: "Kalite şikâyeti (imalat / ayar)", count: 1 },
];

export function buildDailyDashboardReportPayload(now = new Date()): DailyDashboardReportPayload {
  const reportDateIso = now.toISOString().slice(0, 10);
  const reportDateLabelTr = new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(now);

  const bd = getEstimatedNetProfitBreakdown();
  const netProfitTry = getFinancialReportNetProfitTry();
  const netProfitMarginPct =
    bd.revenueTry > 0 ? Math.round((netProfitTry / bd.revenueTry) * 1000) / 10 : 0;

  const returnOrdersCount = 18;
  const returnReasons = DEFAULT_RETURN_REASONS;

  const criticalStockOrdered = [...SAMPLE_PRODUCTS]
    .filter((p) => p.stock < REPORT_LOW_STOCK_THRESHOLD)
    .sort((a, b) => a.stock - b.stock);

  return {
    reportDateIso,
    reportDateLabelTr,
    financialPeriodLabel: formatReportDateRangeTr(FINANCIAL_REPORT.periodStartIso, FINANCIAL_REPORT.periodEndIso),
    netProfitTry,
    netProfitMarginPct,
    breakdown: {
      netSalesRevenueTry: bd.revenueTry,
      productCostTry: bd.productCostTry,
      adSpendTry: bd.adSpendTry,
      returnsLossTry: bd.returnsLossTry,
    },
    returnOrdersCount,
    returnReasons,
    criticalStockOrdered,
  };
}
