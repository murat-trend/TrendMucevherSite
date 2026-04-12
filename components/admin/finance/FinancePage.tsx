"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  Calculator,
  Download,
  FileBarChart,
  Landmark,
  Percent,
  RefreshCw,
  Scale,
  Settings2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { DEFAULT_PLATFORM_COMMISSION_RATE } from "@/lib/admin/finance-constants";
import { ADMIN_PRIMARY_BUTTON_CLASS } from "@/components/admin/ui/adminPrimaryButton";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { FinanceScrollTable, FINANCE_TH } from "@/components/admin/finance/FinanceScrollTable";
import { AdminKpiCard, type AdminKpiTone } from "@/components/admin/ui/AdminKpiCard";

const tryFmt = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);

const numFmt = (n: number) => new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(n);

const creditsFmt = (n: number) =>
  `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(n)} kr`;

const dateFmt = (iso: string) =>
  new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));

function addDaysIso(isoDate: string, deltaDays: number): string {
  const d = new Date(isoDate + "T12:00:00");
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function maxIsoDate(dates: string[]): string {
  return dates.slice().sort().at(-1) ?? new Date().toISOString().slice(0, 10);
}

function isIsoInRange(iso: string, rangeStart: string, rangeEnd: string): boolean {
  return iso >= rangeStart && iso <= rangeEnd;
}

type PayoutStatus = "Bekliyor" | "Hazır" | "Ödendi" | "Tutuldu" | "Hesaplanan";

type FinancePayoutStatusFilter = "Tümü" | PayoutStatus;

type DatePreset = "7d" | "30d" | "custom";

function transactionMatchesPayoutStatusFilter(filter: FinancePayoutStatusFilter, txStatus: string): boolean {
  if (filter === "Tümü") return true;
  if (filter === "Bekliyor") return txStatus === "Bekliyor";
  if (filter === "Ödendi") return txStatus === "Tamamlandı" || txStatus === "İşlendi";
  if (filter === "Hazır" || filter === "Tutuldu") return false;
  if (filter === "Hesaplanan") return txStatus === "Hesaplanan";
  return true;
}

const PAYOUT_STATUS_STYLES: Record<PayoutStatus, string> = {
  Bekliyor: "border-amber-500/35 bg-amber-500/12 text-amber-200",
  Hazır: "border-sky-500/35 bg-sky-500/12 text-sky-200",
  Ödendi: "border-emerald-500/35 bg-emerald-500/12 text-emerald-200",
  Tutuldu: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300",
  Hesaplanan: "border-[#c69575]/35 bg-[#c69575]/12 text-[#f0dcc8]",
};

type TxType = "Komisyon" | "Payout" | "Refund" | "Chargeback";

const TX_TYPE_BADGE: Record<TxType, string> = {
  Payout: "border-sky-500/40 bg-sky-500/15 text-sky-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
  Komisyon: "border-[#c69575]/45 bg-[#c69575]/14 text-[#f0dcc8] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
  Refund: "border-orange-500/45 bg-orange-500/14 text-orange-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
  Chargeback: "border-rose-500/45 bg-rose-500/14 text-rose-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
};

type FinanceSummaryResponse = {
  revenueTry?: number;
  estimatedCommissionTry?: number;
  pendingOrdersAmountTry?: number;
  paidOrderCount?: number;
  refundedAmountTry?: number;
  refundedOrdersCount?: number;
  revenueLast30DaysTry?: number;
  error?: string;
};

type IncomeApiSeller = {
  id: string;
  seller: string;
  period: string;
  asOfDate: string;
  earnings: number;
  commission: number;
  net: number;
  status: "Hesaplanan";
  orderCount: number;
};

type IncomeApiMonthly = { month: string; totalTry: number; orderCount: number };

type IncomeApiLedger = {
  id: string;
  created_at: string;
  user_id: string;
  amount: number;
  type: string;
  description: string | null;
};

type FinanceIncomeResponse = {
  range?: { from: string; to: string };
  commissionRate?: number;
  monthly?: IncomeApiMonthly[];
  sellers?: IncomeApiSeller[];
  ledger?: IncomeApiLedger[];
  ledgerDisplayNames?: Record<string, string>;
  error?: string;
};

type LedgerTx = {
  id: string;
  date: string;
  type: TxType;
  description: string;
  seller: string;
  amount: number;
  status: string;
};

const FINANCE_RISKS: { id: string; label: string; detail: string }[] = [];

const PAYOUT_COLGROUP = (
  <colgroup>
    <col className="w-[18%]" />
    <col className="w-[16%]" />
    <col className="w-[12%]" />
    <col className="w-[12%]" />
    <col className="w-[12%]" />
    <col className="w-[10%]" />
    <col className="w-[20%]" />
  </colgroup>
);

const TX_COLGROUP = (
  <colgroup>
    <col className="w-[12%]" />
    <col className="w-[12%]" />
    <col className="w-[28%]" />
    <col className="w-[16%]" />
    <col className="w-[14%]" />
    <col className="w-[18%]" />
  </colgroup>
);

const MONTHLY_COLGROUP = (
  <colgroup>
    <col className="w-[28%]" />
    <col className="w-[24%]" />
    <col className="w-[24%]" />
  </colgroup>
);

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
      className={`rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#10121a]/95 via-[#0a0b0f] to-[#060708] p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] sm:p-6 ${className}`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] pb-4">
        <h2 className="font-display text-lg font-semibold tracking-tight text-zinc-100">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function FinancePage() {
  const [summary, setSummary] = useState<FinanceSummaryResponse | null>(null);
  const [income, setIncome] = useState<FinanceIncomeResponse | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loadingIncome, setLoadingIncome] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const anchorEnd = useMemo(() => {
    const to = income?.range?.to;
    if (to) return to;
    return new Date().toISOString().slice(0, 10);
  }, [income?.range?.to]);

  const [datePreset, setDatePreset] = useState<DatePreset>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [sellerFilter, setSellerFilter] = useState<string>("Tümü");
  const [statusFilter, setStatusFilter] = useState<FinancePayoutStatusFilter>("Tümü");

  const prevPresetRef = useRef<DatePreset>("30d");
  useEffect(() => {
    if (datePreset === "custom" && prevPresetRef.current !== "custom") {
      setCustomTo((t) => t || anchorEnd);
      setCustomFrom((f) => f || addDaysIso(anchorEnd, -14));
    }
    prevPresetRef.current = datePreset;
  }, [datePreset, anchorEnd]);

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (datePreset === "custom" && customFrom && customTo) {
      const from = customFrom <= customTo ? customFrom : customTo;
      const to = customFrom <= customTo ? customTo : customFrom;
      return { rangeStart: from, rangeEnd: to };
    }
    const end = anchorEnd;
    const start = datePreset === "7d" ? addDaysIso(end, -7) : addDaysIso(end, -30);
    return { rangeStart: start, rangeEnd: end };
  }, [datePreset, customFrom, customTo, anchorEnd]);

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const res = await fetch("/api/admin/finance/summary", { credentials: "include" });
      const j = (await res.json()) as FinanceSummaryResponse;
      if (!res.ok) {
        setSummary(null);
        return;
      }
      setSummary(j);
    } catch {
      setSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  const loadIncome = useCallback(async () => {
    setLoadingIncome(true);
    setLoadErr(null);
    try {
      const qs = new URLSearchParams({ from: rangeStart, to: rangeEnd });
      const res = await fetch(`/api/admin/finance/income-statement?${qs}`, { credentials: "include" });
      const j = (await res.json()) as FinanceIncomeResponse;
      if (!res.ok) {
        setLoadErr(j.error ?? "Gelir verisi yüklenemedi.");
        setIncome(null);
        return;
      }
      setIncome(j);
    } catch {
      setLoadErr("Ağ hatası.");
      setIncome(null);
    } finally {
      setLoadingIncome(false);
    }
  }, [rangeStart, rangeEnd]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    void loadIncome();
  }, [loadIncome]);

  const ledgerTx: LedgerTx[] = useMemo(() => {
    if (!income?.ledger) return [];
    const names = income.ledgerDisplayNames ?? {};
    return income.ledger.map((r) => {
      const isCredit = r.type === "credit";
      return {
        id: r.id,
        date: r.created_at.slice(0, 10),
        type: isCredit ? "Komisyon" : "Payout",
        description: r.description?.trim() || `billing_ledger · ${r.type}`,
        seller: names[r.user_id]?.trim() || `${r.user_id.slice(0, 8)}…`,
        amount: isCredit ? r.amount : -r.amount,
        status: "Kayıt",
      };
    });
  }, [income]);

  const payoutRows = useMemo(() => {
    return (income?.sellers ?? []).map((s) => ({
      id: s.id,
      seller: s.seller,
      period: s.period,
      asOfDate: s.asOfDate,
      earnings: s.earnings,
      commission: s.commission,
      net: s.net,
      status: s.status as PayoutStatus,
      orderCount: s.orderCount,
    }));
  }, [income?.sellers]);

  const FINANCE_SELLER_OPTIONS = useMemo(() => {
    const u = new Set<string>();
    for (const r of payoutRows) u.add(r.seller);
    for (const t of ledgerTx) u.add(t.seller);
    return Array.from(u).sort((a, b) => a.localeCompare(b, "tr"));
  }, [payoutRows, ledgerTx]);

  const filteredPayouts = useMemo(() => {
    return payoutRows.filter((row) => {
      if (!isIsoInRange(row.asOfDate, rangeStart, rangeEnd)) return false;
      if (sellerFilter !== "Tümü" && row.seller !== sellerFilter) return false;
      if (statusFilter !== "Tümü" && row.status !== statusFilter) return false;
      return true;
    });
  }, [payoutRows, rangeStart, rangeEnd, sellerFilter, statusFilter]);

  const filteredLedger = useMemo(() => {
    return ledgerTx.filter((tx) => {
      if (!isIsoInRange(tx.date, rangeStart, rangeEnd)) return false;
      if (sellerFilter !== "Tümü" && tx.seller !== sellerFilter) return false;
      return true;
    });
  }, [ledgerTx, rangeStart, rangeEnd, sellerFilter]);

  const filteredTransactions = useMemo(() => {
    if (statusFilter === "Tümü") return filteredLedger;
    return filteredLedger.filter((tx) => transactionMatchesPayoutStatusFilter(statusFilter, tx.status));
  }, [filteredLedger, statusFilter]);

  const monthlyRows = useMemo(() => {
    const rows = [...(income?.monthly ?? [])].sort((a, b) => a.month.localeCompare(b.month));
    const rs = rangeStart.slice(0, 7);
    const re = rangeEnd.slice(0, 7);
    return rows.filter((m) => m.month >= rs && m.month <= re);
  }, [income?.monthly, rangeStart, rangeEnd]);

  const kpiCards: { id: string; label: string; value: string; icon: LucideIcon; sub: string; tone: AdminKpiTone }[] = useMemo(() => {
    const rev = summary?.revenueTry ?? 0;
    const estComm = summary?.estimatedCommissionTry ?? rev * DEFAULT_PLATFORM_COMMISSION_RATE;
    const pend = summary?.pendingOrdersAmountTry ?? 0;
    const paidN = summary?.paidOrderCount ?? 0;
    const refAmt = summary?.refundedAmountTry ?? 0;
    const refN = summary?.refundedOrdersCount ?? 0;
    return [
      { id: "gross", label: "Toplam Ciro", value: tryFmt(rev), icon: TrendingUp, sub: "Ödenmiş siparişler", tone: "revenue" },
      { id: "commission", label: "Tahmini komisyon", value: tryFmt(estComm), icon: Percent, sub: `%${numFmt(DEFAULT_PLATFORM_COMMISSION_RATE * 100)} varsayılan oran`, tone: "neutral" },
      { id: "pending", label: "Bekleyen sipariş tutarı", value: tryFmt(pend), icon: Wallet, sub: "payment_status: pending", tone: "neutral" },
      { id: "done", label: "Ödenen sipariş adedi", value: String(paidN), icon: Banknote, sub: "paid", tone: "neutral" },
      { id: "refund", label: "İade tutarı", value: tryFmt(refAmt), icon: RefreshCw, sub: `${refN} iade kaydı`, tone: "negative" },
      { id: "cb", label: "Chargeback", value: "—", icon: Scale, sub: "Veri bağlantısı yok", tone: "negative" },
    ];
  }, [summary]);

  const DEMO_KDV_ORAN = 0.2;
  const revenue30 = summary?.revenueLast30DaysTry ?? 0;
  const TAHMINI_KDV_ODEME = revenue30 * (DEMO_KDV_ORAN / (1 + DEMO_KDV_ORAN));

  const revenueSideSummary = useMemo(() => {
    const rate = income?.commissionRate ?? DEFAULT_PLATFORM_COMMISSION_RATE;
    const sortedM = [...(income?.monthly ?? [])].sort((a, b) => a.month.localeCompare(b.month));
    const lastM = sortedM.at(-1);
    const prevM = sortedM.at(-2);
    const monthGross = lastM?.totalTry ?? 0;
    const monthCommission = monthGross * rate;
    const vsLastMonthPct =
      prevM && prevM.totalTry > 0 ? ((lastM!.totalTry - prevM.totalTry) / prevM.totalTry) * 100 : 0;
    const top = income?.sellers?.[0];
    return {
      monthCommission,
      vsLastMonthPct,
      topSeller: top?.seller ?? "—",
      topSellerCommission: top?.commission ?? 0,
      avgCommissionRate: rate * 100,
    };
  }, [income]);

  const exportCsv = () => {
    const lines: string[] = [];
    lines.push(["Ay", "Gelir_TRY", "Siparis_Adet"].join(","));
    for (const m of monthlyRows) {
      lines.push([csvEscape(m.month), csvEscape(String(m.totalTry)), csvEscape(String(m.orderCount))].join(","));
    }
    lines.push("");
    lines.push(["Satici", "Donem", "Kazanc", "Komisyon", "Net", "Siparis"].join(","));
    for (const r of filteredPayouts) {
      lines.push(
        [csvEscape(r.seller), csvEscape(r.period), String(r.earnings), String(r.commission), String(r.net), String(r.orderCount)].join(
          ",",
        ),
      );
    }
    lines.push("");
    lines.push(["Tarih", "Tur", "Aciklama", "Kullanici", "Miktar_kr"].join(","));
    for (const tx of filteredLedger) {
      lines.push(
        [csvEscape(tx.date), csvEscape(tx.type), csvEscape(tx.description), csvEscape(tx.seller), String(tx.amount)].join(","),
      );
    }
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gelir-tablosu-${rangeStart}_${rangeEnd}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const presetBtnClass = (active: boolean) =>
    `rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
      active
        ? "border-[#c69575]/35 bg-[#c69575]/12 text-[#f0dcc8] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        : "border-white/[0.08] bg-[#07080a] text-zinc-400 hover:border-white/[0.12] hover:text-zinc-200"
    }`;

  const loading = loadingIncome || loadingSummary;

  return (
    <div className="space-y-6 pb-10 lg:space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-zinc-50">Gelir tablosu</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Siparişler (paid), giderler ve <span className="text-zinc-400">billing_ledger</span> (kredi birimi) — seçilen tarih aralığına
            göre.
          </p>
        </div>
        <button type="button" className={ADMIN_PRIMARY_BUTTON_CLASS} onClick={exportCsv} disabled={!income}>
          <Download className="h-4 w-4" strokeWidth={1.5} />
          Dışa aktar (CSV)
        </button>
      </header>

      {loadErr && (
        <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-200/90">{loadErr}</div>
      )}

      <section aria-label="Finans özeti" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {kpiCards.map((k) => (
          <AdminKpiCard key={k.id} label={k.label} value={loading ? "…" : k.value} sub={k.sub} icon={k.icon} tone={k.tone} />
        ))}
      </section>

      <section
        aria-label="Tahmini KDV"
        className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 via-[#0c0d11] to-[#08090c] p-4 sm:p-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-200">
              <Calculator className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-zinc-100">Tahmini KDV ödemesi</h2>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-500">
                Son 30 gün <strong className="text-zinc-400">ödenmiş sipariş cirosu</strong> üzerinden, KDV’nin fiyata dahil olduğu (%
                {Math.round(DEMO_KDV_ORAN * 100)} varsayımı) basit çıkarım. Muhasebecinizle netleştirin.
              </p>
            </div>
          </div>
          <div className="shrink-0 rounded-xl border border-white/[0.08] bg-[#07080a]/80 px-4 py-3 text-right">
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Kabaca tahmini KDV</p>
            <p className="mt-0.5 font-display text-xl font-semibold tabular-nums text-emerald-200/95">{tryFmt(TAHMINI_KDV_ODEME)}</p>
            <p className="mt-1 text-[10px] text-zinc-600" title="Son 30 gün paid ciro">
              Taban: {tryFmt(revenue30)} (30 gün)
            </p>
          </div>
        </div>
      </section>

      <section
        aria-label="Filtreler"
        className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#12141a]/90 via-[#0c0d11] to-[#08090c] p-4 sm:p-5"
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-5">
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">Tarih aralığı</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={presetBtnClass(datePreset === "7d")} onClick={() => setDatePreset("7d")}>
                Son 7 gün
              </button>
              <button type="button" className={presetBtnClass(datePreset === "30d")} onClick={() => setDatePreset("30d")}>
                Son 30 gün
              </button>
              <button type="button" className={presetBtnClass(datePreset === "custom")} onClick={() => setDatePreset("custom")}>
                Özel
              </button>
            </div>
            {datePreset === "custom" ? (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="fin-date-from" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                    Başlangıç
                  </label>
                  <input
                    id="fin-date-from"
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2.5 text-sm text-zinc-200 outline-none ring-[#c69575]/30 focus:border-[#c69575]/30 focus:ring-2"
                  />
                </div>
                <div>
                  <label htmlFor="fin-date-to" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                    Bitiş
                  </label>
                  <input
                    id="fin-date-to"
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2.5 text-sm text-zinc-200 outline-none ring-[#c69575]/30 focus:border-[#c69575]/30 focus:ring-2"
                  />
                </div>
              </div>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-2">
            <div>
              <label htmlFor="fin-seller" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Satıcı / kullanıcı
              </label>
              <select
                id="fin-seller"
                value={sellerFilter}
                onChange={(e) => setSellerFilter(e.target.value)}
                className="w-full cursor-pointer rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2.5 text-sm text-zinc-200 outline-none ring-[#c69575]/30 focus:border-[#c69575]/30 focus:ring-2"
              >
                <option value="Tümü">Tümü</option>
                {FINANCE_SELLER_OPTIONS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fin-status" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Ödeme durumu (satıcı tablosu)
              </label>
              <select
                id="fin-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FinancePayoutStatusFilter)}
                className="w-full cursor-pointer rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2.5 text-sm text-zinc-200 outline-none ring-[#c69575]/30 focus:border-[#c69575]/30 focus:ring-2"
              >
                <option value="Tümü">Tümü</option>
                <option value="Hesaplanan">Hesaplanan (satıcı özeti)</option>
                <option value="Bekliyor">Bekleyen</option>
                <option value="Hazır">Hazır</option>
                <option value="Ödendi">Ödendi</option>
                <option value="Tutuldu">Tutuldu</option>
              </select>
            </div>
          </div>
          <div className="lg:col-span-3">
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">Özet</p>
            <p className="rounded-xl border border-white/[0.06] bg-[#07080a]/80 px-3 py-2.5 text-xs leading-relaxed text-zinc-400">
              <span className="font-medium text-zinc-300">API aralığı:</span> {dateFmt(rangeStart)} — {dateFmt(rangeEnd)}
              <br />
              Satıcı satırı <span className="tabular-nums text-zinc-300">{filteredPayouts.length}</span> · Defter{" "}
              <span className="tabular-nums text-zinc-300">{filteredTransactions.length}</span>
            </p>
            <p className="mt-2 text-[11px] text-zinc-600">
              billing_ledger satırları &quot;Kayıt&quot; durumundadır; durum filtresi &quot;Tümü&quot; dışında çoğunlukla gizlenir.
            </p>
          </div>
        </div>
      </section>

      <CardShell title="Aylık gelir (ödenmiş siparişler)">
        {loadingIncome ? (
          <p className="py-8 text-center text-sm text-zinc-500">Yükleniyor…</p>
        ) : monthlyRows.length === 0 ? (
          <AdminEmptyState message="Bu aralıkta ödenmiş sipariş yok." variant="shield" size="compact" />
        ) : (
          <FinanceScrollTable
            minWidthPx={520}
            bodyMaxHeightClass="max-h-[280px]"
            colgroup={MONTHLY_COLGROUP}
            headerCells={
              <>
                <th className={`${FINANCE_TH} text-left`}>Ay (UTC)</th>
                <th className={`${FINANCE_TH} text-left tabular-nums`}>Gelir (TRY)</th>
                <th className={`${FINANCE_TH} text-left tabular-nums`}>Sipariş</th>
              </>
            }
            bodyRows={
              <>
                {monthlyRows.map((m) => (
                  <tr key={m.month} className="transition-colors hover:bg-white/[0.04]">
                    <td className="px-3.5 py-3.5 font-mono text-sm text-zinc-300">{m.month}</td>
                    <td className="px-3.5 py-3.5 tabular-nums text-zinc-200">{tryFmt(m.totalTry)}</td>
                    <td className="px-3.5 py-3.5 tabular-nums text-zinc-400">{m.orderCount}</td>
                  </tr>
                ))}
              </>
            }
          />
        )}
      </CardShell>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8" id="payout-queue">
          <CardShell title="Satıcı bazlı ödemeler (tahmini)">
            {loadingIncome ? (
              <p className="py-8 text-center text-sm text-zinc-500">Yükleniyor…</p>
            ) : filteredPayouts.length === 0 ? (
              <AdminEmptyState
                message="Bu filtrelere uyan satıcı özeti yok."
                hint="Tarih veya satıcı filtresini güncelleyin."
                variant="shield"
                size="compact"
              />
            ) : (
              <FinanceScrollTable
                minWidthPx={1120}
                bodyMaxHeightClass="max-h-[360px]"
                colgroup={PAYOUT_COLGROUP}
                headerCells={
                  <>
                    <th className={`${FINANCE_TH} text-left`}>Satıcı</th>
                    <th className={`${FINANCE_TH} text-left`}>Dönem</th>
                    <th className={`${FINANCE_TH} text-left tabular-nums`}>Kazanç</th>
                    <th className={`${FINANCE_TH} text-left tabular-nums`}>Komisyon</th>
                    <th className={`${FINANCE_TH} text-left tabular-nums`}>Net</th>
                    <th className={`${FINANCE_TH} text-left`}>Durum</th>
                    <th className={`${FINANCE_TH} text-left tabular-nums`}>#Sip.</th>
                  </>
                }
                bodyRows={
                  <>
                    {filteredPayouts.map((row) => (
                      <tr key={row.id} className="transition-colors hover:bg-white/[0.04]">
                        <td className="px-3.5 py-3.5 font-medium text-zinc-100">{row.seller}</td>
                        <td className="px-3.5 py-3.5 text-zinc-400">{row.period}</td>
                        <td className="px-3.5 py-3.5 tabular-nums text-zinc-300">{tryFmt(row.earnings)}</td>
                        <td className="px-3.5 py-3.5 tabular-nums text-zinc-400">{tryFmt(row.commission)}</td>
                        <td className="px-3.5 py-3.5 tabular-nums font-medium text-zinc-100">{tryFmt(row.net)}</td>
                        <td className="px-3.5 py-3.5">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${PAYOUT_STATUS_STYLES[row.status]}`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-3.5 py-3.5 tabular-nums text-zinc-500">{row.orderCount}</td>
                      </tr>
                    ))}
                  </>
                }
              />
            )}
          </CardShell>
        </div>

        <div className="xl:col-span-4">
          <section className="relative overflow-hidden rounded-2xl border border-white/[0.12] bg-gradient-to-b from-[#161820] via-[#0e1016] to-[#060708] p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_40px_-16px_rgba(0,0,0,0.5)] sm:p-8">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_45%_at_50%_-5%,rgba(198,149,117,0.1),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.04)_0%,transparent_28%,transparent_72%,rgba(0,0,0,0.35)_100%)] opacity-[0.97]"
              aria-hidden
            />
            <div className="relative">
              <header className="border-b border-white/[0.1] pb-5">
                <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-zinc-50">Dönem özeti</h2>
                <p className="mt-1.5 text-[13px] text-zinc-500">Seçilen aralık — tahmini komisyon</p>
              </header>

              <div className="border-b border-white/[0.09] py-7">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500/90">Son ay (aralıkta)</p>
                <p className="mt-3 font-display text-4xl font-semibold leading-none tracking-tight tabular-nums text-zinc-50 sm:text-[2.65rem]">
                  {tryFmt(revenueSideSummary.monthCommission)}
                </p>
                <div className="mt-3 flex items-start gap-2.5">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/45 bg-emerald-500/[0.14] text-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                    aria-hidden
                  >
                    <ArrowUpRight className="h-7 w-7" strokeWidth={2.5} />
                  </span>
                  <p className="min-w-0 leading-snug text-emerald-400/90">
                    <span className="block text-sm font-semibold tabular-nums tracking-tight">
                      {revenueSideSummary.vsLastMonthPct >= 0 ? "+" : ""}
                      {numFmt(revenueSideSummary.vsLastMonthPct)}%
                    </span>
                    <span className="mt-0.5 block text-[11px] font-normal text-zinc-500/90">önceki aya göre (brüt)</span>
                  </p>
                </div>
              </div>

              <div className="border-b border-white/[0.09] py-7">
                <div className="relative overflow-hidden rounded-xl border border-[#c69575]/30 bg-gradient-to-b from-[#c69575]/[0.14] via-[#0c0d12] to-[#08090c] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] sm:p-6">
                  <div
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_80%_0%,rgba(198,149,117,0.12),transparent_55%)]"
                    aria-hidden
                  />
                  <div className="relative">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#d4b896]">En yüksek brüt satıcı</p>
                    <p className="mt-3 font-display text-xl font-semibold leading-snug tracking-tight text-zinc-50 sm:text-2xl">
                      {revenueSideSummary.topSeller}
                    </p>
                    <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-white/[0.1] pt-4">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Tahmini komisyon</span>
                      <span className="font-display text-2xl font-semibold tabular-nums text-[#f0dcc8] sm:text-[1.75rem]">
                        {tryFmt(revenueSideSummary.topSellerCommission)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.09] py-6">
                <span className="text-[13px] font-medium text-zinc-400">Komisyon oranı (varsayılan)</span>
                <span className="font-display text-2xl font-semibold tabular-nums text-zinc-100 sm:text-[1.65rem]">
                  %{numFmt(revenueSideSummary.avgCommissionRate)}
                </span>
              </div>

              <p className="mt-6 text-[11px] leading-relaxed text-zinc-500">
                Komisyon, sipariş tutarı × varsayılan oran ile hesaplanır; gerçek mutabakat için{" "}
                <Link href="/admin/finance/komisyon" className="text-[#c69575] underline-offset-2 hover:underline">
                  komisyon
                </Link>{" "}
                ekranını kullanın.
              </p>
            </div>
          </section>
        </div>
      </div>

      <CardShell title="billing_ledger — kredi hareketleri (indirilebilir CSV ile birlikte)">
        {loadingIncome ? (
          <p className="py-8 text-center text-sm text-zinc-500">Yükleniyor…</p>
        ) : filteredTransactions.length === 0 ? (
          <AdminEmptyState
            message="Bu filtrelere uyan defter kaydı yok."
            hint="Tarih aralığını veya satıcıyı değiştirin; durum filtresi &quot;Tümü&quot; olmalı."
            variant="shield"
            size="compact"
          />
        ) : (
          <FinanceScrollTable
            minWidthPx={880}
            bodyMaxHeightClass="max-h-[360px]"
            colgroup={TX_COLGROUP}
            headerCells={
              <>
                <th className={`${FINANCE_TH} text-left`}>Tarih</th>
                <th className={`${FINANCE_TH} text-left`}>Tür</th>
                <th className={`${FINANCE_TH} text-left`}>Açıklama</th>
                <th className={`${FINANCE_TH} text-left`}>Kullanıcı</th>
                <th className={`${FINANCE_TH} text-left tabular-nums`}>Miktar (kr)</th>
                <th className={`${FINANCE_TH} text-left`}>Durum</th>
              </>
            }
            bodyRows={
              <>
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="transition-colors hover:bg-white/[0.04]">
                    <td className="px-4 py-3 text-zinc-400">{dateFmt(tx.date)}</td>
                    <td className="px-4 py-3 align-middle">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${TX_TYPE_BADGE[tx.type]}`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td className="max-w-[280px] px-4 py-3 text-zinc-300">{tx.description}</td>
                    <td className="px-4 py-3 text-zinc-400">{tx.seller}</td>
                    <td
                      className={`px-4 py-3 font-medium tabular-nums ${
                        tx.amount >= 0 ? "text-emerald-300/90" : "text-rose-300/85"
                      }`}
                    >
                      {tx.amount >= 0 ? "+" : ""}
                      {creditsFmt(tx.amount)}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{tx.status}</td>
                  </tr>
                ))}
              </>
            }
          />
        )}
      </CardShell>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <CardShell title="Finans riskleri">
            {FINANCE_RISKS.length === 0 ? (
              <AdminEmptyState
                message="Şu an kritik finans riski bulunmuyor"
                hint="Yüksek iade veya chargeback için sipariş ve iade ekranlarını izleyin."
                variant="shield"
                size="compact"
              />
            ) : (
              <ul className="space-y-3">
                {FINANCE_RISKS.map((r) => (
                  <li
                    key={r.id}
                    className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-sm"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/90" strokeWidth={1.5} />
                    <div>
                      <p className="font-medium text-zinc-200">{r.label}</p>
                      <p className="text-xs text-zinc-500">{r.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardShell>
        </div>

        <div className="lg:col-span-5">
          <CardShell title="Hızlı işlemler">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Link
                href="#payout-queue"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-[#c69575]/30 hover:bg-[#c69575]/10 hover:text-[#f0dcc8]"
              >
                <Landmark className="h-4 w-4 text-[#b8956f]" strokeWidth={1.5} />
                Satıcı özetleri
              </Link>
              <Link
                href="/admin/finance/komisyon"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-[#c69575]/30 hover:bg-[#c69575]/10 hover:text-[#f0dcc8]"
              >
                <Settings2 className="h-4 w-4 text-[#b8956f]" strokeWidth={1.5} />
                Komisyon yönetimi
              </Link>
              <Link
                href="/admin/returns"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-[#c69575]/30 hover:bg-[#c69575]/10 hover:text-[#f0dcc8]"
              >
                <RefreshCw className="h-4 w-4 text-[#b8956f]" strokeWidth={1.5} />
                İadeler
              </Link>
              <Link
                href="/admin/raporlar"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-[#c69575]/30 hover:bg-[#c69575]/10 hover:text-[#f0dcc8]"
              >
                <FileBarChart className="h-4 w-4 text-[#b8956f]" strokeWidth={1.5} />
                Raporlar
              </Link>
            </div>
          </CardShell>
        </div>
      </div>
    </div>
  );
}
