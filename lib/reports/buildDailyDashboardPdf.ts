import { PDFDocument, rgb } from "pdf-lib";
import type { DailyDashboardReportPayload } from "./daily-report-data";
import { REPORT_LOW_STOCK_THRESHOLD } from "./daily-report-data";

const NOTO_SANS_TTF =
  "https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Regular.ttf";

const margin = 48;
const contentWidth = 500;
const fontSize = 10;
const titleSize = 15;
const sectionSize = 12;
const lineHeight = 14;
const sectionGap = 20;

function tryFmt(n: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(n);
}

function numFmt(n: number) {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(n);
}

/** drawText + maxWidth sonrası yaklaşık yeni Y (pdf-lib çok satır çizer) */
function drawBlock(
  page: import("pdf-lib").PDFPage,
  text: string,
  x: number,
  y: number,
  font: import("pdf-lib").PDFFont,
  size: number,
  color = rgb(0.12, 0.12, 0.14),
): number {
  page.drawText(text, {
    x,
    y,
    size,
    font,
    color,
    maxWidth: contentWidth,
    lineHeight,
  });
  const approxLines = Math.max(1, Math.ceil(text.length / 85));
  return y - approxLines * lineHeight - 4;
}

export async function buildDailyDashboardPdfBuffer(payload: DailyDashboardReportPayload): Promise<Uint8Array> {
  const fontRes = await fetch(NOTO_SANS_TTF);
  if (!fontRes.ok) {
    throw new Error(`Noto font yüklenemedi: ${fontRes.status}`);
  }
  const fontBytes = await fontRes.arrayBuffer();

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(fontBytes);
  const pageW = 595.28;
  const pageH = 841.89;

  let page = pdfDoc.addPage([pageW, pageH]);
  let y = pageH - margin;

  const ensureSpace = (needed: number) => {
    if (y - needed < margin + 40) {
      page = pdfDoc.addPage([pageW, pageH]);
      y = pageH - margin;
    }
  };

  y = drawBlock(
    page,
    "Günlük Dashboard Raporu",
    margin,
    y,
    font,
    titleSize,
    rgb(0.05, 0.05, 0.08),
  );
  y -= 6;
  y = drawBlock(page, `Tarih: ${payload.reportDateLabelTr} (${payload.reportDateIso})`, margin, y, font, fontSize, rgb(0.35, 0.35, 0.4));
  y = drawBlock(
    page,
    `Mali özet dönemi (ERP ile aynı): ${payload.financialPeriodLabel}`,
    margin,
    y,
    font,
    9,
    rgb(0.4, 0.4, 0.45),
  );
  y -= sectionGap;

  /* —— En üst öncelik: kritik stok —— */
  ensureSpace(120);
  y = drawBlock(
    page,
    `1. Kritik stok — yarın sabah ilk iş (eşik < ${REPORT_LOW_STOCK_THRESHOLD} adet, en düşük stok üstte)`,
    margin,
    y,
    font,
    sectionSize,
    rgb(0.55, 0.2, 0.15),
  );
  y -= 4;
  if (payload.criticalStockOrdered.length === 0) {
    y = drawBlock(page, "Kritik stokta ürün yok (eşik altı).", margin, y, font, fontSize);
  } else {
    for (const row of payload.criticalStockOrdered) {
      ensureSpace(40);
      const line = `• ${row.name} — Stok: ${numFmt(row.stock)} adet (${row.id})`;
      y = drawBlock(page, line, margin, y, font, fontSize);
    }
    y -= 4;
    y = drawBlock(
      page,
      "Not: Sipariş önerisi SKU / tedarik sistemine göre netleştirilir.",
      margin,
      y,
      font,
      9,
      rgb(0.4, 0.4, 0.45),
    );
  }
  y -= sectionGap;

  /* —— Net kâr —— */
  ensureSpace(160);
  y = drawBlock(page, "2. Günün net kârı (masraflar sonrası)", margin, y, font, sectionSize, rgb(0.1, 0.35, 0.22));
  y -= 4;
  const { breakdown } = payload;
  y = drawBlock(page, `Net satış geliri: ${tryFmt(breakdown.netSalesRevenueTry)}`, margin, y, font, fontSize);
  y = drawBlock(page, `− Ürün maliyeti (COGS): ${tryFmt(breakdown.productCostTry)}`, margin, y, font, fontSize);
  y = drawBlock(page, `− Reklam harcaması: ${tryFmt(breakdown.adSpendTry)}`, margin, y, font, fontSize);
  y = drawBlock(page, `− İade / iptal kaybı (tutar): ${tryFmt(breakdown.returnsLossTry)}`, margin, y, font, fontSize);
  y -= 4;
  y = drawBlock(
    page,
    `= Net kâr: ${tryFmt(payload.netProfitTry)} (marj ~%${numFmt(payload.netProfitMarginPct)})`,
    margin,
    y,
    font,
    11,
    rgb(0.05, 0.35, 0.2),
  );
  y -= 4;
  y = drawBlock(
    page,
    "Formül: Ciro − COGS − reklam − iade kaybı. Gösterim verisi ERP dönemi ile hizalıdır; günlük kesit API ile değiştirilebilir.",
    margin,
    y,
    font,
    9,
    rgb(0.4, 0.4, 0.45),
  );
  y -= sectionGap;

  /* —— İade analizi —— */
  ensureSpace(200);
  y = drawBlock(page, "3. İptal / iade analizi", margin, y, font, sectionSize, rgb(0.45, 0.2, 0.15));
  y -= 4;
  y = drawBlock(
    page,
    `Bugünkü iade talebi sayısı: ${numFmt(payload.returnOrdersCount)} (operasyon). Aşağıda dağılım — hangi satıcıya müdahale edileceğini hızlıca görmek için.`,
    margin,
    y,
    font,
    fontSize,
  );
  y -= 6;
  for (const r of payload.returnReasons) {
    ensureSpace(36);
    const line = `• ${r.reason}: ${numFmt(r.count)} adet`;
    y = drawBlock(page, line, margin, y, font, fontSize);
  }
  y -= sectionGap;

  y = drawBlock(
    page,
    "Alt notlar: Sebepler iade kodları / müşteri notlarından üretilir; en yüksek kalemler için satıcı ve ürün incelemesi önerilir.",
    margin,
    y,
    font,
    9,
    rgb(0.35, 0.35, 0.4),
  );
  y -= 12;
  drawBlock(
    page,
    `Otomatik oluşturuldu — trendmucevher admin`,
    margin,
    y,
    font,
    8,
    rgb(0.55, 0.55, 0.58),
  );

  return pdfDoc.save();
}
