import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ExpenseRow } from "@/lib/finance/expense-row";
import { toPdfSafeText } from "@/lib/finance/pdf-safe-text";

const PAGE_W = 595;
const PAGE_H = 842;
const M = 50;
const LINE = 12;
const MAX_LINE_LEN = 95;

function chunkLines(s: string, max: number): string[] {
  const t = toPdfSafeText(s);
  if (t.length <= max) return [t];
  const out: string[] = [];
  for (let i = 0; i < t.length; i += max) {
    out.push(t.slice(i, i + max));
  }
  return out;
}

export async function generateExpenseBackupPdf(rows: ExpenseRow[], generatedAt: Date): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - M;

  const title = "Trend Mucevher - Gider ve fatura yedek raporu";
  page.drawText(toPdfSafeText(title), {
    x: M,
    y,
    size: 14,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.12),
  });
  y -= LINE * 2;

  const stamp = new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "medium",
    timeZone: "Europe/Istanbul",
  }).format(generatedAt);
  page.drawText(toPdfSafeText(`Olusturulma: ${stamp}`), { x: M, y, size: 9, font, color: rgb(0.35, 0.35, 0.38) });
  y -= LINE * 2;

  const tryFmt = (n: number) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(n);

  let total = 0;
  for (const r of rows) {
    if (Number.isFinite(r.amountTry)) total += r.amountTry;
  }
  page.drawText(toPdfSafeText(`Satir sayisi: ${rows.length}  |  Tutar toplami (yaklasik): ${tryFmt(total)}`), {
    x: M,
    y,
    size: 10,
    font: fontBold,
    color: rgb(0.15, 0.15, 0.18),
  });
  y -= LINE * 2;

  page.drawText(toPdfSafeText("--- Satirlar ---"), { x: M, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.22) });
  y -= LINE * 1.5;

  const ensureSpace = (linesNeeded: number) => {
    if (y - linesNeeded * LINE < M) {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - M;
    }
  };

  rows.forEach((r, idx) => {
    const block = [
      `${idx + 1}. [${r.dateIso}] ${tryFmt(r.amountTry)}`,
      `    Kategori: ${r.category || "-"}`,
      `    Aciklama: ${r.description || "-"}`,
    ];
    for (const inv of r.invoices) {
      block.push(`    Fatura: ${inv.originalName} -> ${inv.url}`);
    }
    if (r.invoices.length === 0) block.push("    Fatura: (yok)");

    for (const rawLine of block) {
      for (const line of chunkLines(rawLine, MAX_LINE_LEN)) {
        ensureSpace(1);
        page.drawText(line, { x: M, y, size: 9, font, color: rgb(0.12, 0.12, 0.14) });
        y -= LINE;
      }
    }
    ensureSpace(1);
    y -= 4;
  });

  const bytes = await pdf.save();
  return bytes;
}
