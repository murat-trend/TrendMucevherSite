import * as XLSX from "xlsx";
import type { ExpenseRow } from "@/lib/finance/expense-row";

const LINK_LABEL = "Görüntüle";

/** Satırlardaki en fazla fatura sayısına göre dinamik sütunlar; hücrede [Görüntüle] hyperlink */
export function exportExpenseRowsToXlsx(rows: ExpenseRow[], origin: string): void {
  const maxInv = Math.max(1, ...rows.map((r) => r.invoices.length));
  const headers = ["Tarih", "Açıklama", "Kategori", "Tutar (TRY)"];
  for (let i = 1; i <= maxInv; i++) {
    headers.push(`Fatura ${i}`);
  }

  const aoa: (string | number)[][] = [headers];
  for (const r of rows) {
    const row: (string | number)[] = [r.dateIso, r.description, r.category, r.amountTry];
    for (let i = 0; i < maxInv; i++) {
      row.push(r.invoices[i] ? LINK_LABEL : "");
    }
    aoa.push(row);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Giderler");

  // Hyperlink: metin "Görüntüle", tıklanınca tam URL (satır 0 = başlık, veri satır 1+)
  for (let r = 0; r < rows.length; r++) {
    const sheetRow = r + 1; // 0-based SheetJS satırı (0 = başlık)
    const exp = rows[r];
    for (let c = 0; c < maxInv; c++) {
      const inv = exp.invoices[c];
      if (!inv) continue;
      const colIdx = 4 + c; // A–D: tarih… tutar; E+: faturalar
      const cell = XLSX.utils.encode_cell({ r: sheetRow, c: colIdx });
      const fullUrl = inv.url.startsWith("http") ? inv.url : `${origin}${inv.url}`;
      ws[cell] = {
        v: LINK_LABEL,
        t: "s",
        l: { Target: fullUrl, Tooltip: inv.originalName || "Faturayı görüntüle" },
      };
    }
  }

  // !ref güncelle (aoa_to_sheet zaten ayarlar; hyperlink ekleyince sorun olmaz)
  const name = `muhasebeci-paketi_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, name);
}
