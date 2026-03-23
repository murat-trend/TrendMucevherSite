"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Cloud, FileText, ImageIcon, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import {
  createEmptyExpenseRow,
  normalizeExpenseRow,
  type ExpenseRow,
} from "@/lib/finance/expense-row";
import { exportExpenseRowsToXlsx } from "@/lib/finance/export-expense-excel";
import { loadExpenseRowsFromServer, saveExpenseRowsToServer } from "@/lib/finance/expense-actions";

const STORAGE_KEY = "admin-finance-expense-rows-v2";

function loadRows(): ExpenseRow[] {
  if (typeof window === "undefined") return [createEmptyExpenseRow()];
  try {
    const rawV2 = localStorage.getItem(STORAGE_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as unknown[];
      if (!Array.isArray(parsed) || parsed.length === 0) return [createEmptyExpenseRow()];
      return parsed.map(normalizeExpenseRow);
    }
    const rawV1 = localStorage.getItem("admin-finance-expense-rows-v1");
    if (rawV1) {
      const parsed = JSON.parse(rawV1) as unknown[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(normalizeExpenseRow);
      }
    }
    return [createEmptyExpenseRow()];
  } catch {
    return [createEmptyExpenseRow()];
  }
}

function isPdfUrl(url: string) {
  return url.toLowerCase().endsWith(".pdf");
}

function startOfMonthIso(d = new Date()) {
  const y = d.getFullYear();
  const m = d.getMonth();
  return `${y}-${String(m + 1).padStart(2, "0")}-01`;
}

function endOfMonthIso(d = new Date()) {
  const y = d.getFullYear();
  const m = d.getMonth();
  const last = new Date(y, m + 1, 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
}

function prevMonthRef(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() - 1, 15);
}

function rowMatchesDateFilter(row: ExpenseRow, from: string, to: string): boolean {
  if (!from && !to) return true;
  const iso = row.dateIso;
  if (from && iso < from) return false;
  if (to && iso > to) return false;
  return true;
}

function InvoiceThumb({ url }: { url: string }) {
  const pdf = isPdfUrl(url);
  return (
    <div className="group/prev relative flex shrink-0">
      <div className="flex h-9 w-9 cursor-default items-center justify-center overflow-hidden rounded-lg border border-white/[0.1] bg-white/[0.04]">
        {pdf ? (
          <FileText className="h-4 w-4 text-rose-300/90" strokeWidth={1.75} aria-hidden />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <div
        className="pointer-events-none absolute left-0 top-full z-[60] mt-1 hidden w-[220px] rounded-xl border border-white/[0.12] bg-[#0c0d11] p-2 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.65)] group-hover/prev:block"
        role="tooltip"
      >
        {pdf ? (
          <div className="space-y-1 p-1">
            <div className="flex items-center gap-2 text-[11px] text-zinc-300">
              <FileText className="h-8 w-8 shrink-0 text-rose-400/80" />
              <span>PDF fatura — tam görünüm için satırdaki bağlantıya tıklayın.</span>
            </div>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Fatura önizleme" className="max-h-44 w-full rounded-lg object-contain" />
        )}
      </div>
    </div>
  );
}

type SyncState = "idle" | "loading" | "saving" | "saved" | "error";

export function GiderTanimlamaClient() {
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [mounted, setMounted] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const skipServerSaveRef = useRef(true);

  useEffect(() => {
    const local = loadRows();
    setRows(local);
    setMounted(true);
    setSyncState("loading");
    void (async () => {
      try {
        const server = await loadExpenseRowsFromServer();
        if (server && server.length > 0) {
          setRows(server);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(server));
          } catch {
            /* quota */
          }
          setSyncMessage("Sunucudaki gider kaydı yüklendi.");
        } else if (local.length > 0) {
          setSyncMessage("Tarayıcı kaydı sunucuya aktarılıyor…");
          const res = await saveExpenseRowsToServer(local);
          if (res.ok) {
            setSyncMessage("Yerel giderler sunucuya kaydedildi; gece PDF yedeği bu veriyi kullanır.");
          } else {
            setSyncMessage(res.error ?? "Sunucuya ilk yazma başarısız; düzenleyince tekrar denenecek.");
          }
        } else {
          setSyncMessage("Yeni gider satırı ekleyebilir veya fatura yükleyebilirsiniz.");
        }
      } catch {
        setSyncMessage("Sunucu okunamadı; çevrimdışı kayıt kullanılıyor.");
      } finally {
        setSyncState("idle");
        window.setTimeout(() => {
          skipServerSaveRef.current = false;
        }, 600);
      }
    })();
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    } catch {
      /* quota */
    }
  }, [rows, mounted]);

  useEffect(() => {
    if (!mounted || skipServerSaveRef.current) return;
    setSyncState("saving");
    setSyncMessage(null);
    const t = window.setTimeout(() => {
      void (async () => {
        const res = await saveExpenseRowsToServer(rows);
        if (res.ok) {
          setSyncState("saved");
          setSyncMessage("Giderler ve fatura bağlantıları sunucuya kaydedildi. Gece yarısı (TR) PDF yedek üretilir.");
        } else {
          setSyncState("error");
          setSyncMessage(res.error ?? "Sunucuya yazılamadı.");
        }
      })();
    }, 1600);
    return () => window.clearTimeout(t);
  }, [rows, mounted]);

  const baseUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);

  const filteredRows = useMemo(
    () => rows.filter((r) => rowMatchesDateFilter(r, filterFrom, filterTo)),
    [rows, filterFrom, filterTo],
  );

  const updateRow = useCallback((id: string, patch: Partial<ExpenseRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, createEmptyExpenseRow()]);
  }, []);

  const removeRow = useCallback((id: string) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  }, []);

  const removeInvoice = useCallback((rowId: string, index: number) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId ? { ...r, invoices: r.invoices.filter((_, i) => i !== index) } : r,
      ),
    );
  }, []);

  const onFilePick = useCallback(async (rowId: string, fileList: FileList | null) => {
    const files = fileList ? Array.from(fileList) : [];
    if (files.length === 0) return;

    const added: { url: string; originalName: string }[] = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/admin/finance/invoices/upload", {
          method: "POST",
          body: fd,
        });
        const data = (await res.json()) as { url?: string; originalName?: string; error?: string };
        if (!res.ok) {
          alert(data.error ?? "Yükleme başarısız.");
          return;
        }
        if (data.url) {
          added.push({ url: data.url, originalName: data.originalName ?? file.name });
        }
      } catch {
        alert("Yükleme sırasında hata oluştu.");
        return;
      }
    }

    if (added.length === 0) return;
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, invoices: [...r.invoices, ...added] } : r)),
    );
  }, []);

  const exportExcel = useCallback(() => {
    if (filteredRows.length === 0) {
      alert("Seçilen tarih aralığında indirilecek satır yok. Filtreyi kontrol edin.");
      return;
    }
    const origin = baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
    exportExpenseRowsToXlsx(filteredRows, origin);
  }, [filteredRows, baseUrl]);

  const setPresetThisMonth = () => {
    const now = new Date();
    setFilterFrom(startOfMonthIso(now));
    setFilterTo(endOfMonthIso(now));
  };

  const setPresetLastMonth = () => {
    const ref = prevMonthRef();
    setFilterFrom(startOfMonthIso(ref));
    setFilterTo(endOfMonthIso(ref));
  };

  const clearDateFilter = () => {
    setFilterFrom("");
    setFilterTo("");
  };

  if (!mounted) {
    return (
      <div className="rounded-2xl border border-white/[0.14] bg-[#0c0d11]/80 p-10 text-sm text-zinc-500">Yükleniyor…</div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
          syncState === "error"
            ? "border-rose-500/35 bg-rose-500/10 text-rose-100/95"
            : "border-emerald-500/25 bg-emerald-950/30 text-emerald-100/90"
        }`}
        role="status"
      >
        {syncState === "saving" ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#c9a88a]" aria-hidden />
        ) : syncState === "error" ? (
          <Cloud className="h-4 w-4 shrink-0 text-rose-300/90" aria-hidden />
        ) : (
          <Cloud className="h-4 w-4 shrink-0 text-emerald-400/90" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-zinc-100">Fatura yükleme ve sunucu yedek</p>
          <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
            Dosya yükleme <strong className="text-zinc-300">aktif</strong> (PDF / PNG / JPEG, en fazla 10 MB). Gider tablosu{" "}
            <code className="rounded bg-white/[0.06] px-1 text-[11px] text-zinc-500">data/finance/expenses.json</code>{" "}
            dosyasına senkronlanır; her gece Türkiye saatiyle yaklaşık{" "}
            <strong className="text-zinc-300">00:00</strong> otomatik PDF raporu{" "}
            <code className="rounded bg-white/[0.06] px-1 text-[11px] text-zinc-500">data/finance/backups/</code>{" "}
            altına yazılır (Vercel Cron: UTC 21:00).
          </p>
          {syncMessage ? <p className="mt-1.5 text-xs text-zinc-500">{syncMessage}</p> : null}
          {syncState === "saved" ? (
            <p className="mt-1 flex items-center gap-1 text-xs text-emerald-400/90">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              Senkron tamam
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm text-zinc-500">
          Her gider satırına bir veya birden fazla fatura (PDF / PNG / JPEG) ekleyin. Aynı ödeme için 2–3 fatura varsa tek
          satırda toplayın. Tarih filtresiyle (ör. sadece Şubat) muhasebeci paketini hazırlayın; Excel’de fatura sütunları{" "}
          <strong className="text-zinc-400">Görüntüle</strong> olarak tıklanabilir bağlantı çıkar.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportExcel}
            className="rounded-lg border border-[#c69575]/35 bg-[#c69575]/12 px-4 py-2 text-sm font-medium text-[#eecdb8] transition-colors hover:bg-[#c69575]/20"
          >
            Muhasebeci paketi indir (Excel)
          </button>
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.05] px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/[0.08]"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Gider satırı ekle
          </button>
        </div>
      </div>

      {/* Tarih aralığı — muhasebeci “şu ayın paketini ver” senaryosu */}
      <div className="rounded-xl border border-white/[0.08] bg-[#08090c]/80 p-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Tarih aralığı (filtre)</p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="gider-filter-from" className="mb-1 block text-[10px] text-zinc-600">
              Başlangıç
            </label>
            <input
              id="gider-filter-from"
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="rounded-lg border border-white/[0.08] bg-[#07080a] px-2 py-2 text-xs text-zinc-200 outline-none focus:border-[#c69575]/35"
            />
          </div>
          <div>
            <label htmlFor="gider-filter-to" className="mb-1 block text-[10px] text-zinc-600">
              Bitiş
            </label>
            <input
              id="gider-filter-to"
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="rounded-lg border border-white/[0.08] bg-[#07080a] px-2 py-2 text-xs text-zinc-200 outline-none focus:border-[#c69575]/35"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={setPresetThisMonth}
              className="rounded-lg border border-white/[0.1] bg-white/[0.05] px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/[0.08]"
            >
              Bu ay
            </button>
            <button
              type="button"
              onClick={setPresetLastMonth}
              className="rounded-lg border border-white/[0.1] bg-white/[0.05] px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/[0.08]"
            >
              Geçen ay
            </button>
            <button
              type="button"
              onClick={clearDateFilter}
              className="rounded-lg border border-white/[0.06] px-3 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-300"
            >
              Tümünü göster
            </button>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-zinc-600">
          Aşağıdaki tabloda <strong className="text-zinc-500">tüm</strong> gider satırları düzenlenir.{" "}
          <strong className="text-zinc-500">Muhasebeci paketi indir</strong> düğmesi ise yalnızca bu tarih aralığına düşen
          satırları Excel’e yazar. Aralık boşsa indirmede tüm satırlar kullanılır.
          {filterFrom || filterTo ? (
            <span className="ml-1 text-[#c9a88a]">
              (İndirilecek: {filteredRows.length} satır)
            </span>
          ) : null}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#08090c]/80">
        <table className="w-full min-w-[920px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              <th className="px-3 py-3">Tarih</th>
              <th className="px-3 py-3">Açıklama</th>
              <th className="px-3 py-3">Kategori</th>
              <th className="px-3 py-3 tabular-nums">Tutar (₺)</th>
              <th className="px-3 py-3">Fatura dosyaları</th>
              <th className="px-3 py-3">Önizleme</th>
              <th className="px-3 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-white/[0.02]">
                <td className="px-3 py-2 align-middle">
                  <input
                    type="date"
                    value={row.dateIso}
                    onChange={(e) => updateRow(row.id, { dateIso: e.target.value })}
                    className="w-full min-w-[140px] rounded-lg border border-white/[0.08] bg-[#07080a] px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-[#c69575]/35"
                  />
                </td>
                <td className="px-3 py-2 align-middle">
                  <input
                    type="text"
                    value={row.description}
                    onChange={(e) => updateRow(row.id, { description: e.target.value })}
                    placeholder="Örn. Meta reklam faturası"
                    className="w-full min-w-[180px] rounded-lg border border-white/[0.08] bg-[#07080a] px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-[#c69575]/35"
                  />
                </td>
                <td className="px-3 py-2 align-middle">
                  <input
                    type="text"
                    value={row.category}
                    onChange={(e) => updateRow(row.id, { category: e.target.value })}
                    placeholder="Pazarlama, kargo…"
                    className="w-full min-w-[120px] rounded-lg border border-white/[0.08] bg-[#07080a] px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-[#c69575]/35"
                  />
                </td>
                <td className="px-3 py-2 align-middle">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={row.amountTry || ""}
                    onChange={(e) => updateRow(row.id, { amountTry: parseFloat(e.target.value) || 0 })}
                    className="w-full max-w-[120px] rounded-lg border border-white/[0.08] bg-[#07080a] px-2 py-1.5 text-xs tabular-nums text-zinc-200 outline-none focus:border-[#c69575]/35"
                  />
                </td>
                <td className="px-3 py-2 align-middle">
                  <input
                    ref={(el) => {
                      fileRefs.current[row.id] = el;
                    }}
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpeg,.jpg,application/pdf,image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => {
                      void onFilePick(row.id, e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileRefs.current[row.id]?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/35 bg-sky-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-sky-100 transition-colors hover:bg-sky-500/20"
                  >
                    <Upload className="h-3.5 w-3.5" strokeWidth={2} />
                    Dosya ekle (çoklu)
                  </button>
                  {row.invoices.length > 0 ? (
                    <ul className="mt-2 max-w-[200px] space-y-1">
                      {row.invoices.map((inv, idx) => (
                        <li
                          key={`${inv.url}-${idx}`}
                          className="flex items-center justify-between gap-1 rounded border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5"
                        >
                          <span className="truncate text-[10px] text-zinc-500" title={inv.originalName}>
                            {inv.originalName}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeInvoice(row.id, idx)}
                            className="shrink-0 rounded p-0.5 text-zinc-600 hover:bg-rose-500/20 hover:text-rose-300"
                            aria-label="Faturayı kaldır"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </td>
                <td className="px-3 py-2 align-middle">
                  <div className="flex flex-wrap items-center gap-2">
                    {row.invoices.length > 0 ? (
                      row.invoices.map((inv, idx) => (
                        <div key={`${inv.url}-${idx}`} className="flex items-center gap-1.5">
                          <InvoiceThumb url={inv.url} />
                          <a
                            href={inv.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-medium text-[#c9a88a] underline-offset-2 hover:underline"
                          >
                            Aç
                          </a>
                        </div>
                      ))
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] text-zinc-600">
                        <ImageIcon className="h-3.5 w-3.5 opacity-50" />
                        —
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-right align-middle">
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    disabled={rows.length <= 1}
                    className="inline-flex rounded-lg border border-rose-500/25 p-1.5 text-rose-300 transition-colors hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Satırı sil"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] leading-relaxed text-zinc-600">
        Dosyalar sunucuda <code className="rounded bg-white/[0.06] px-1 py-0.5 text-zinc-500">public/uploads/invoices/</code>{" "}
        altında saklanır; Excel’deki <strong className="text-zinc-500">Görüntüle</strong> bağlantıları bu dosyalara gider.
        Üretimde erişim için kimlik doğrulama veya imzalı URL eklemeniz önerilir.
      </p>
    </div>
  );
}
