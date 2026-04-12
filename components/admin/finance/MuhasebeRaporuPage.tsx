"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileDown, Landmark, Loader2, Percent, Printer, RefreshCw, Wallet } from "lucide-react";
import { DEFAULT_PLATFORM_COMMISSION_RATE } from "@/lib/admin/finance-constants";
import { ADMIN_PRIMARY_BUTTON_CLASS } from "@/components/admin/ui/adminPrimaryButton";
import { AdminKpiCard } from "@/components/admin/ui/AdminKpiCard";
import { FinanceScrollTable, FINANCE_TH } from "@/components/admin/finance/FinanceScrollTable";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";

const tryFmt = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);

const pctLabel = `${Math.round(DEFAULT_PLATFORM_COMMISSION_RATE * 100)}%`;

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function defaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - 365 * 86400000);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function monthLabelYm(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  const d = new Date(Date.UTC(y, m - 1, 1));
  return new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric", timeZone: "UTC" }).format(d);
}

type SummaryJson = {
  revenueTry?: number;
  expensesTry?: number;
  netProfitTry?: number;
  estimatedCommissionTry?: number;
  monthlyRevenue?: { month: string; totalTry: number; orderCount: number }[];
  monthlyExpenses?: { month: string; totalTry: number; rowCount: number }[];
  error?: string;
};

type IncomeSeller = {
  id: string;
  seller: string;
  earnings: number;
  commission: number;
  net: number;
  orderCount: number;
};

type IncomeJson = {
  range?: { from: string; to: string };
  commissionRate?: number;
  sellers?: IncomeSeller[];
  error?: string;
};

const MONTHLY_COL = (
  <colgroup>
    <col className="w-[30%]" />
    <col className="w-[23%]" />
    <col className="w-[23%]" />
    <col className="w-[24%]" />
  </colgroup>
);

const SELLER_COL = (
  <colgroup>
    <col className="w-[32%]" />
    <col className="w-[22%]" />
    <col className="w-[22%]" />
    <col className="w-[24%]" />
  </colgroup>
);

export function MuhasebeRaporuPage() {
  const [range, setRange] = useState(defaultDateRange);
  const [summary, setSummary] = useState<SummaryJson | null>(null);
  const [income, setIncome] = useState<IncomeJson | null>(null);
  const [sumLoading, setSumLoading] = useState(true);
  const [incLoading, setIncLoading] = useState(true);
  const [sumErr, setSumErr] = useState<string | null>(null);
  const [incErr, setIncErr] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setSumLoading(true);
    setSumErr(null);
    try {
      const res = await fetch("/api/admin/finance/summary", { credentials: "include" });
      const j = (await res.json()) as SummaryJson;
      if (!res.ok) {
        setSumErr(j.error ?? "Özet alınamadı.");
        setSummary(null);
        return;
      }
      setSummary(j);
    } catch {
      setSumErr("Ağ hatası.");
      setSummary(null);
    } finally {
      setSumLoading(false);
    }
  }, []);

  const loadIncome = useCallback(async () => {
    setIncLoading(true);
    setIncErr(null);
    const q = new URLSearchParams({ from: range.from, to: range.to });
    try {
      const res = await fetch(`/api/admin/finance/income-statement?${q}`, { credentials: "include" });
      const j = (await res.json()) as IncomeJson;
      if (!res.ok) {
        setIncErr(j.error ?? "Gelir tablosu alınamadı.");
        setIncome(null);
        return;
      }
      setIncome(j);
    } catch {
      setIncErr("Ağ hatası.");
      setIncome(null);
    } finally {
      setIncLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    void loadIncome();
  }, [loadIncome]);

  const fromYm = range.from.slice(0, 7);
  const toYm = range.to.slice(0, 7);

  const monthlyRows = useMemo(() => {
    const rev = summary?.monthlyRevenue ?? [];
    const expMap = new Map((summary?.monthlyExpenses ?? []).map((e) => [e.month, e]));
    return rev
      .map((r) => {
        const ex = expMap.get(r.month)?.totalTry ?? 0;
        return {
          month: r.month,
          gelir: r.totalTry,
          gider: ex,
          net: r.totalTry - ex,
        };
      })
      .filter((row) => row.month >= fromYm && row.month <= toYm);
  }, [summary, fromYm, toYm]);

  const sellers = income?.sellers ?? [];

  const exportCsv = () => {
    const lines: string[] = [];
    lines.push("Muhasebe Raporu");
    lines.push(`Tarih aralığı,${csvEscape(range.from)},${csvEscape(range.to)}`);
    lines.push("");
    lines.push("KPI,Değer (TRY)");
    lines.push(`Toplam gelir,${summary?.revenueTry ?? 0}`);
    lines.push(`Toplam gider,${summary?.expensesTry ?? 0}`);
    lines.push(`Net kâr,${summary?.netProfitTry ?? 0}`);
    lines.push(`Platform komisyonu (${pctLabel}),${summary?.estimatedCommissionTry ?? 0}`);
    lines.push("");
    lines.push("Ay,Gelir (TRY),Gider (TRY),Net (TRY)");
    for (const r of monthlyRows) {
      lines.push([csvEscape(r.month), String(r.gelir), String(r.gider), String(r.net)].join(","));
    }
    lines.push("");
    lines.push("Satıcı,Brüt satış (TRY),Komisyon (TRY),Net ödeme (TRY)");
    for (const s of sellers) {
      lines.push([csvEscape(s.seller), String(s.earnings), String(s.commission), String(s.net)].join(","));
    }
    const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `muhasebe-raporu_${range.from}_${range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPdf = () => {
    window.print();
  };

  const rev = typeof summary?.revenueTry === "number" ? summary.revenueTry : 0;
  const exp = typeof summary?.expensesTry === "number" ? summary.expensesTry : 0;
  const net = typeof summary?.netProfitTry === "number" ? summary.netProfitTry : 0;
  const comm = typeof summary?.estimatedCommissionTry === "number" ? summary.estimatedCommissionTry : 0;

  return (
    <div id="muhasebe-print-area" className="space-y-8 pb-10">
      <div className="rounded-2xl border border-white/[0.14] bg-gradient-to-br from-[#14161d] via-[#0e1015] to-[#08090c] p-6 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] sm:p-8 print:border-zinc-300 print:bg-white print:shadow-none">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl print:text-zinc-900">
              Muhasebe Raporu
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400 print:text-zinc-700">
              Özet KPI&apos;lar tüm dönemden; aylık tablo son 12 ayın sipariş ve gider dağılımı; satıcı özeti seçilen
              tarih aralığındaki ödenmiş siparişlere göre hesaplanır.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button type="button" className={ADMIN_PRIMARY_BUTTON_CLASS} onClick={() => void loadSummary()}>
              <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
              Özet yenile
            </button>
            <button type="button" className={ADMIN_PRIMARY_BUTTON_CLASS} onClick={exportCsv}>
              <FileDown className="h-4 w-4" strokeWidth={1.5} />
              Excel (CSV)
            </button>
            <button type="button" className={ADMIN_PRIMARY_BUTTON_CLASS} onClick={printPdf}>
              <Printer className="h-4 w-4" strokeWidth={1.5} />
              PDF / Yazdır
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-end gap-4 rounded-xl border border-white/[0.08] bg-[#0a0b0e]/60 p-4 print:hidden">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-zinc-500">
            Başlangıç
            <input
              type="date"
              value={range.from}
              max={range.to}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              className="rounded-lg border border-white/[0.12] bg-[#0e1015] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#c69575]/50"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-zinc-500">
            Bitiş
            <input
              type="date"
              value={range.to}
              min={range.from}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              className="rounded-lg border border-white/[0.12] bg-[#0e1015] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#c69575]/50"
            />
          </label>
        </div>

        {sumErr && (
          <div className="mt-6 rounded-xl border border-rose-500/25 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-200/90">
            {sumErr}
          </div>
        )}

        {sumLoading ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#b8956f]" strokeWidth={1.5} />
            Özet yükleniyor…
          </div>
        ) : (
          <section aria-label="Özet KPI" className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AdminKpiCard label="Toplam gelir" value={tryFmt(rev)} sub="Ödenmiş siparişler (TRY)" icon={Landmark} tone="revenue" />
            <AdminKpiCard label="Toplam gider" value={tryFmt(exp)} sub="finance_expenses toplamı" icon={Wallet} tone="neutral" />
            <AdminKpiCard label="Net kâr" value={tryFmt(net)} sub="Gelir − gider" icon={Wallet} tone={net >= 0 ? "positive" : "negative"} />
            <AdminKpiCard
              label={`Platform komisyonu (${pctLabel})`}
              value={tryFmt(comm)}
              sub="Tahmini komisyon (ciro üzerinden)"
              icon={Percent}
              tone="neutral"
            />
          </section>
        )}

        <section className="mt-10 rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#10121a]/95 via-[#0a0b0f] to-[#060708] p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] sm:p-6 print:border-zinc-200 print:bg-white print:shadow-none">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4 print:border-zinc-200">
            <h2 className="font-display text-lg font-semibold tracking-tight text-zinc-100 print:text-zinc-900">
              Aylık gelir / gider (son 12 ay)
            </h2>
            <p className="text-xs text-zinc-500 print:text-zinc-600">
              Gelir: ödenmiş siparişler · Gider: finance_expenses (ay bazında)
            </p>
          </div>
          {sumLoading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-zinc-500">
              <Loader2 className="h-5 w-5 animate-spin text-[#b8956f]" strokeWidth={1.5} />
              Aylık veriler yükleniyor…
            </div>
          ) : monthlyRows.length === 0 ? (
            <AdminEmptyState
              variant="warning"
              message="Bu aralıkta ay yok"
              hint="Tarih filtresini genişletin veya özet yüklenene kadar bekleyin."
            />
          ) : (
            <FinanceScrollTable
              minWidthPx={520}
              colgroup={MONTHLY_COL}
              bodyMaxHeightClass="max-h-[320px]"
              headerCells={
                <>
                  <th className={`${FINANCE_TH} text-left`}>Ay</th>
                  <th className={`${FINANCE_TH} text-right tabular-nums`}>Gelir</th>
                  <th className={`${FINANCE_TH} text-right tabular-nums`}>Gider</th>
                  <th className={`${FINANCE_TH} text-right tabular-nums`}>Net</th>
                </>
              }
              bodyRows={
                <>
                  {monthlyRows.map((r) => (
                    <tr key={r.month} className="text-zinc-200">
                      <td className="px-3.5 py-2.5 text-sm text-zinc-300">{monthLabelYm(r.month)}</td>
                      <td className="px-3.5 py-2.5 text-right text-sm tabular-nums text-emerald-200/90">{tryFmt(r.gelir)}</td>
                      <td className="px-3.5 py-2.5 text-right text-sm tabular-nums text-amber-200/85">{tryFmt(r.gider)}</td>
                      <td className="px-3.5 py-2.5 text-right text-sm tabular-nums text-zinc-100">{tryFmt(r.net)}</td>
                    </tr>
                  ))}
                </>
              }
            />
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#10121a]/95 via-[#0a0b0f] to-[#060708] p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] sm:p-6 print:border-zinc-200 print:bg-white print:shadow-none">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4 print:border-zinc-200">
            <h2 className="font-display text-lg font-semibold tracking-tight text-zinc-100 print:text-zinc-900">Satıcı bazlı özet</h2>
            {incLoading ? (
              <span className="flex items-center gap-2 text-xs text-zinc-500 print:hidden">
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                Yükleniyor…
              </span>
            ) : (
              <p className="text-xs text-zinc-500 print:text-zinc-600">
                {range.from} — {range.to}
              </p>
            )}
          </div>
          {incErr && (
            <div className="mb-4 rounded-lg border border-rose-500/25 bg-rose-500/[0.06] px-3 py-2 text-sm text-rose-200/90">
              {incErr}
            </div>
          )}
          {incLoading && sellers.length === 0 && !incErr ? (
            <div className="flex items-center gap-2 py-10 text-sm text-zinc-500">
              <Loader2 className="h-5 w-5 animate-spin text-[#b8956f]" strokeWidth={1.5} />
              Satıcı özeti yükleniyor…
            </div>
          ) : !incLoading && sellers.length === 0 ? (
            <AdminEmptyState
              variant="warning"
              message="Satıcı satışı yok"
              hint="Bu tarih aralığında ödenmiş sipariş bulunamadı."
            />
          ) : (
            <FinanceScrollTable
              minWidthPx={560}
              colgroup={SELLER_COL}
              bodyMaxHeightClass="max-h-[360px]"
              headerCells={
                <>
                  <th className={`${FINANCE_TH} text-left`}>Satıcı</th>
                  <th className={`${FINANCE_TH} text-right tabular-nums`}>Brüt satış</th>
                  <th className={`${FINANCE_TH} text-right tabular-nums`}>Komisyon</th>
                  <th className={`${FINANCE_TH} text-right tabular-nums`}>Net ödeme</th>
                </>
              }
              bodyRows={
                <>
                  {sellers.map((s) => (
                    <tr key={s.id} className="text-zinc-200">
                      <td className="px-3.5 py-2.5 text-sm text-zinc-300">{s.seller}</td>
                      <td className="px-3.5 py-2.5 text-right text-sm tabular-nums text-emerald-200/90">{tryFmt(s.earnings)}</td>
                      <td className="px-3.5 py-2.5 text-right text-sm tabular-nums text-[#f0dcc8]/90">{tryFmt(s.commission)}</td>
                      <td className="px-3.5 py-2.5 text-right text-sm tabular-nums text-zinc-100">{tryFmt(s.net)}</td>
                    </tr>
                  ))}
                </>
              }
            />
          )}
        </section>
      </div>
    </div>
  );
}
