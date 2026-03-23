"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { ADMIN_PRIMARY_BUTTON_CLASS } from "@/components/admin/ui/adminPrimaryButton";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { FinanceScrollTable, FINANCE_TH } from "@/components/admin/finance/FinanceScrollTable";
import { AdminKpiCard, type AdminKpiTone } from "@/components/admin/ui/AdminKpiCard";

const tryFmt = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);

const numFmt = (n: number) => new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(n);

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

type PayoutStatus = "Bekliyor" | "Hazır" | "Ödendi" | "Tutuldu";

type FinancePayoutStatusFilter = "Tümü" | PayoutStatus;

type DatePreset = "7d" | "30d" | "custom";

/** Ödeme kuyruğu durumu → hareketler tablosu (farklı etiketler) eşlemesi */
function transactionMatchesPayoutStatusFilter(
  filter: FinancePayoutStatusFilter,
  txStatus: string,
): boolean {
  if (filter === "Tümü") return true;
  if (filter === "Bekliyor") return txStatus === "Bekliyor";
  if (filter === "Ödendi") return txStatus === "Tamamlandı" || txStatus === "İşlendi";
  if (filter === "Tutuldu" || filter === "Hazır") return false;
  return true;
}

const PAYOUT_STATUS_STYLES: Record<PayoutStatus, string> = {
  Bekliyor: "border-amber-500/35 bg-amber-500/12 text-amber-200",
  Hazır: "border-sky-500/35 bg-sky-500/12 text-sky-200",
  Ödendi: "border-emerald-500/35 bg-emerald-500/12 text-emerald-200",
  Tutuldu: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300",
};

type TxType = "Komisyon" | "Payout" | "Refund" | "Chargeback";

/** İşlem türü — rozet (tabloda anında ayırt edilebilir) */
const TX_TYPE_BADGE: Record<TxType, string> = {
  Payout: "border-sky-500/40 bg-sky-500/15 text-sky-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
  Komisyon: "border-[#c69575]/45 bg-[#c69575]/14 text-[#f0dcc8] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
  Refund: "border-orange-500/45 bg-orange-500/14 text-orange-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
  Chargeback: "border-rose-500/45 bg-rose-500/14 text-rose-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
};

const KPI: {
  id: string;
  label: string;
  value: string;
  icon: LucideIcon;
  sub: string;
  tone: AdminKpiTone;
}[] = [
  { id: "gross", label: "Toplam Ciro", value: tryFmt(18_420_000), icon: TrendingUp, sub: "Son 30 gün", tone: "revenue" },
  { id: "commission", label: "Platform Komisyonu", value: tryFmt(2_210_400), icon: Percent, sub: "%12 ort. kesinti", tone: "neutral" },
  { id: "pending", label: "Bekleyen Satıcı Ödemeleri", value: tryFmt(486_200), icon: Wallet, sub: "42 satıcı", tone: "neutral" },
  { id: "done", label: "Tamamlanan Ödemeler", value: tryFmt(1_924_800), icon: Banknote, sub: "Bu ay", tone: "neutral" },
  { id: "refund", label: "İade Tutarı", value: tryFmt(128_400), icon: RefreshCw, sub: "Brüt iade", tone: "negative" },
  { id: "cb", label: "Chargeback / Uyuşmazlık", value: tryFmt(24_600), icon: Scale, sub: "3 aktif dosya", tone: "negative" },
];

const PAYOUT_ROWS = [
  {
    id: "p1",
    seller: "Atölye Mara",
    period: "1–15 Mart 2025",
    asOfDate: "2025-03-14",
    earnings: 186_400,
    commission: 22_368,
    net: 164_032,
    status: "Hazır" as PayoutStatus,
  },
  {
    id: "p2",
    seller: "Osmanlı Hat Sanatı",
    period: "1–15 Mart 2025",
    asOfDate: "2025-03-13",
    earnings: 264_200,
    commission: 31_704,
    net: 232_496,
    status: "Bekliyor" as PayoutStatus,
  },
  {
    id: "p3",
    seller: "Luna İnci Atölyesi",
    period: "16–28 Şubat 2025",
    asOfDate: "2025-02-28",
    earnings: 98_750,
    commission: 11_850,
    net: 86_900,
    status: "Ödendi" as PayoutStatus,
  },
  {
    id: "p4",
    seller: "Pırlanta Loft",
    period: "1–15 Mart 2025",
    asOfDate: "2025-03-12",
    earnings: 142_000,
    commission: 17_040,
    net: 124_960,
    status: "Bekliyor" as PayoutStatus,
  },
  {
    id: "p5",
    seller: "Vintage Koleksiyon",
    period: "Özel düzeltme",
    asOfDate: "2025-03-10",
    earnings: 44_200,
    commission: 5_304,
    net: 38_896,
    status: "Tutuldu" as PayoutStatus,
  },
];

const REVENUE_SUMMARY = {
  monthCommission: 612_400,
  vsLastMonthPct: 8.4,
  topSeller: "Osmanlı Hat Sanatı",
  topSellerCommission: 84_200,
  avgCommissionRate: 12.0,
};

/** Demo: KPI’daki “Toplam Ciro” ile aynı taban; KDV dahil fiyat varsayımı (%20). Muhasebe ile doğrulayın. */
const DEMO_KDV_DAHIL_CIRO = 18_420_000;
const DEMO_KDV_ORAN = 0.2;
/** KDV dahil tutardan tahmini KDV: tutar × (oran / (1 + oran)) */
const TAHMINI_KDV_ODEME = DEMO_KDV_DAHIL_CIRO * (DEMO_KDV_ORAN / (1 + DEMO_KDV_ORAN));

const TRANSACTIONS: {
  id: string;
  date: string;
  type: TxType;
  description: string;
  seller: string;
  amount: number;
  status: string;
}[] = [
  {
    id: "t1",
    date: "2025-03-14",
    type: "Payout",
    description: "Haftalık satıcı ödemesi — batch #428",
    seller: "Atölye Mara",
    amount: -164_032,
    status: "Tamamlandı",
  },
  {
    id: "t2",
    date: "2025-03-14",
    type: "Komisyon",
    description: "Komisyon tahakkuku — günlük netleştirme",
    seller: "Platform",
    amount: 42_180,
    status: "Tamamlandı",
  },
  {
    id: "t3",
    date: "2025-03-13",
    type: "Refund",
    description: "Sipariş iadesi — TM-9021",
    seller: "Vintage Koleksiyon",
    amount: -12_400,
    status: "İşlendi",
  },
  {
    id: "t4",
    date: "2025-03-13",
    type: "Chargeback",
    description: "Kart uyuşmazlığı — incelemede",
    seller: "Elmas Evi İstanbul",
    amount: -8_900,
    status: "Bekliyor",
  },
  {
    id: "t5",
    date: "2025-03-12",
    type: "Komisyon",
    description: "Komisyon tahakkuku — haftalık",
    seller: "Platform",
    amount: 118_640,
    status: "Tamamlandı",
  },
  {
    id: "t6",
    date: "2025-03-11",
    type: "Payout",
    description: "Satıcı ödemesi — manuel onay",
    seller: "Luna İnci Atölyesi",
    amount: -86_900,
    status: "Tamamlandı",
  },
  {
    id: "t7",
    date: "2025-03-11",
    type: "Komisyon",
    description: "Komisyon tahakkuku — günlük",
    seller: "Platform",
    amount: 36_420,
    status: "Tamamlandı",
  },
  {
    id: "t8",
    date: "2025-03-10",
    type: "Refund",
    description: "Kısmi iade — TM-8892",
    seller: "Pırlanta Loft",
    amount: -4_200,
    status: "İşlendi",
  },
  {
    id: "t9",
    date: "2025-03-10",
    type: "Payout",
    description: "Haftalık satıcı ödemesi — batch #426",
    seller: "Osmanlı Hat Sanatı",
    amount: -232_496,
    status: "Tamamlandı",
  },
  {
    id: "t10",
    date: "2025-03-09",
    type: "Komisyon",
    description: "Komisyon tahakkuku — haftalık",
    seller: "Platform",
    amount: 94_100,
    status: "Tamamlandı",
  },
  {
    id: "t11",
    date: "2025-03-09",
    type: "Chargeback",
    description: "İtiraz — belge bekleniyor",
    seller: "Atölye Mara",
    amount: -15_600,
    status: "Bekliyor",
  },
  {
    id: "t12",
    date: "2025-03-08",
    type: "Payout",
    description: "Satıcı ödemesi — otomatik",
    seller: "Vintage Koleksiyon",
    amount: -38_896,
    status: "Tamamlandı",
  },
];

const FINANCE_SELLER_OPTIONS = Array.from(
  new Set([...PAYOUT_ROWS.map((r) => r.seller), ...TRANSACTIONS.map((t) => t.seller)]),
).sort((a, b) => a.localeCompare(b, "tr"));

/** Boş bırakıldığında boş durum mesajı gösterilir. */
const FINANCE_RISKS: { id: string; label: string; detail: string }[] = [];

/** Daha geniş aksiyon sütunu; tablo kart alanını daha iyi doldurur (minWidth ile birlikte). */
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

export function FinancePage() {
  const anchorEnd = useMemo(
    () =>
      maxIsoDate([
        ...PAYOUT_ROWS.map((r) => r.asOfDate),
        ...TRANSACTIONS.map((t) => t.date),
      ]),
    [],
  );

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

  const filteredPayouts = useMemo(() => {
    return PAYOUT_ROWS.filter((row) => {
      if (!isIsoInRange(row.asOfDate, rangeStart, rangeEnd)) return false;
      if (sellerFilter !== "Tümü" && row.seller !== sellerFilter) return false;
      if (statusFilter !== "Tümü" && row.status !== statusFilter) return false;
      return true;
    });
  }, [rangeStart, rangeEnd, sellerFilter, statusFilter]);

  const filteredTransactions = useMemo(() => {
    return TRANSACTIONS.filter((tx) => {
      if (!isIsoInRange(tx.date, rangeStart, rangeEnd)) return false;
      if (sellerFilter !== "Tümü" && tx.seller !== sellerFilter) return false;
      if (!transactionMatchesPayoutStatusFilter(statusFilter, tx.status)) return false;
      return true;
    });
  }, [rangeStart, rangeEnd, sellerFilter, statusFilter]);

  const presetBtnClass = (active: boolean) =>
    `rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
      active
        ? "border-[#c69575]/35 bg-[#c69575]/12 text-[#f0dcc8] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        : "border-white/[0.08] bg-[#07080a] text-zinc-400 hover:border-white/[0.12] hover:text-zinc-200"
    }`;

  return (
    <div className="space-y-6 pb-10 lg:space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-zinc-50">Finans</h1>
          <p className="mt-1 text-sm text-zinc-500">Komisyonlar, satıcı ödemeleri ve platform gelirleri</p>
        </div>
        <button type="button" className={ADMIN_PRIMARY_BUTTON_CLASS}>
          <Download className="h-4 w-4" strokeWidth={1.5} />
          Ödeme Dışa Aktar
        </button>
      </header>

      {/* KPI */}
      <section aria-label="Finans özeti" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {KPI.map((k) => (
          <AdminKpiCard key={k.id} label={k.label} value={k.value} sub={k.sub} icon={k.icon} tone={k.tone} />
        ))}
      </section>

      {/* Tahmini KDV (özet; mücevherde matrah/KDV ayrımı muhasebeci ile netleştirilmeli) */}
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
                Son 30 gün <strong className="text-zinc-400">toplam ciro</strong> üzerinden, KDV’nin fiyata dahil
                olduğu (%{Math.round(DEMO_KDV_ORAN * 100)} varsayımı) basit bir çıkarım. İndirimli ürün, tevkifat ve
                teşvikler için mutlaka muhasebecinizle netleştirin.
              </p>
            </div>
          </div>
          <div className="shrink-0 rounded-xl border border-white/[0.08] bg-[#07080a]/80 px-4 py-3 text-right">
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Kabaca tahmini KDV</p>
            <p className="mt-0.5 font-display text-xl font-semibold tabular-nums text-emerald-200/95">
              {tryFmt(TAHMINI_KDV_ODEME)}
            </p>
            <p className="mt-1 text-[10px] text-zinc-600" title="KDV dahil ciro üzerinden">
              Taban: {tryFmt(DEMO_KDV_DAHIL_CIRO)} (KDV dahil ciro, demo)
            </p>
          </div>
        </div>
      </section>

      {/* Filtreler */}
      <section
        aria-label="Filtreler"
        className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#12141a]/90 via-[#0c0d11] to-[#08090c] p-4 sm:p-5"
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-5">
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">Tarih aralığı</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={presetBtnClass(datePreset === "7d")}
                onClick={() => setDatePreset("7d")}
              >
                Son 7 gün
              </button>
              <button
                type="button"
                className={presetBtnClass(datePreset === "30d")}
                onClick={() => setDatePreset("30d")}
              >
                Son 30 gün
              </button>
              <button
                type="button"
                className={presetBtnClass(datePreset === "custom")}
                onClick={() => setDatePreset("custom")}
              >
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
                Satıcı
              </label>
              <select
                id="fin-seller"
                value={sellerFilter}
                onChange={(e) => setSellerFilter(e.target.value)}
                className="w-full cursor-pointer rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2.5 text-sm text-zinc-200 outline-none ring-[#c69575]/30 focus:border-[#c69575]/30 focus:ring-2"
              >
                <option value="Tümü">Tüm satıcılar</option>
                {FINANCE_SELLER_OPTIONS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fin-status" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Ödeme durumu
              </label>
              <select
                id="fin-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FinancePayoutStatusFilter)}
                className="w-full cursor-pointer rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2.5 text-sm text-zinc-200 outline-none ring-[#c69575]/30 focus:border-[#c69575]/30 focus:ring-2"
              >
                <option value="Tümü">Tümü</option>
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
              <span className="font-medium text-zinc-300">Aktif aralık:</span> {dateFmt(rangeStart)} — {dateFmt(rangeEnd)}
              <br />
              Ödeme kuyruğu <span className="tabular-nums text-zinc-300">{filteredPayouts.length}</span> · Hareketler{" "}
              <span className="tabular-nums text-zinc-300">{filteredTransactions.length}</span>
            </p>
            <p className="mt-2 text-[11px] text-zinc-600">
              Durum filtresi ödeme kuyruğunda doğrudan eşleşir; hareketler tablosunda tamamlanan işlemler &quot;Ödendi&quot; ile
              eşlenir.
            </p>
          </div>
        </div>
      </section>

      {/* Payout queue + Revenue */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8" id="payout-queue">
          <CardShell title="Bekleyen Satıcı Ödemeleri">
            {filteredPayouts.length === 0 ? (
              <AdminEmptyState
                message="Bu filtrelere uyan ödeme kaydı yok."
                hint="Tarih aralığını, satıcıyı veya durumu güncelleyin."
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
                    <th className={`${FINANCE_TH} text-left tabular-nums`}>Net Ödeme</th>
                    <th className={`${FINANCE_TH} text-left`}>Durum</th>
                    <th className={`${FINANCE_TH} !px-5 text-right`}>Aksiyon</th>
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
                        <td className="min-w-0 px-5 py-3.5 pl-5">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <button
                              type="button"
                              className="shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-[#c69575]/25 hover:bg-[#c69575]/10 hover:text-[#f0dcc8]"
                            >
                              Detay
                            </button>
                            <button
                              type="button"
                              className="shrink-0 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200 transition-colors hover:bg-emerald-500/18"
                            >
                              Ödemeyi İşaretle
                            </button>
                          </div>
                        </td>
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
                <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-zinc-50">Platform Gelir Özeti</h2>
                <p className="mt-1.5 text-[13px] text-zinc-500">Bu dönem — özet gösterge paneli</p>
              </header>

              {/* Ana metrik */}
              <div className="border-b border-white/[0.09] py-7">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500/90">Bu ay komisyon geliri</p>
                <p className="mt-3 font-display text-4xl font-semibold leading-none tracking-tight tabular-nums text-zinc-50 sm:text-[2.65rem]">
                  {tryFmt(REVENUE_SUMMARY.monthCommission)}
                </p>
                <div className="mt-3 flex items-start gap-2.5">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/45 bg-emerald-500/[0.14] text-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                    aria-label="Yükseliş"
                    role="img"
                  >
                    <ArrowUpRight className="h-7 w-7" strokeWidth={2.5} aria-hidden />
                  </span>
                  <p className="min-w-0 leading-snug text-emerald-400/90">
                    <span className="block text-sm font-semibold tabular-nums tracking-tight">
                      +{numFmt(REVENUE_SUMMARY.vsLastMonthPct)}%
                    </span>
                    <span className="mt-0.5 block text-[11px] font-normal text-zinc-500/90">geçen aya göre</span>
                  </p>
                </div>
              </div>

              {/* Lider satıcı — vurgulu blok */}
              <div className="border-b border-white/[0.09] py-7">
                <div className="relative overflow-hidden rounded-xl border border-[#c69575]/30 bg-gradient-to-b from-[#c69575]/[0.14] via-[#0c0d12] to-[#08090c] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] sm:p-6">
                  <div
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_80%_0%,rgba(198,149,117,0.12),transparent_55%)]"
                    aria-hidden
                  />
                  <div className="relative">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#d4b896]">En çok komisyon üreten satıcı</p>
                    <p className="mt-3 font-display text-xl font-semibold leading-snug tracking-tight text-zinc-50 sm:text-2xl">
                      {REVENUE_SUMMARY.topSeller}
                    </p>
                    <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-white/[0.1] pt-4">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Komisyon payı</span>
                      <span className="font-display text-2xl font-semibold tabular-nums text-[#f0dcc8] sm:text-[1.75rem]">
                        {tryFmt(REVENUE_SUMMARY.topSellerCommission)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ortalama oran */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.09] py-6">
                <span className="text-[13px] font-medium text-zinc-400">Ortalama komisyon oranı</span>
                <span className="font-display text-2xl font-semibold tabular-nums text-zinc-100 sm:text-[1.65rem]">
                  %{numFmt(REVENUE_SUMMARY.avgCommissionRate)}
                </span>
              </div>

              <p className="mt-6 text-[11px] leading-relaxed text-zinc-500">
                Özetler tahmini netleştirme tarihine göre güncellenir; kesin rakamlar dönem kapanışında kilitlenir.
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* Transactions */}
      <CardShell title="Son Finans Hareketleri" className="min-w-0 overflow-hidden">
        {filteredTransactions.length === 0 ? (
            <AdminEmptyState
              message="Bu filtrelere uyan finans hareketi yok."
              hint="Tarih aralığını veya satıcıyı değiştirmeyi deneyin."
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
                  <th className={`${FINANCE_TH} text-left`}>Satıcı</th>
                  <th className={`${FINANCE_TH} text-left tabular-nums`}>Tutar</th>
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
                        {tryFmt(tx.amount)}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">{tx.status}</td>
                    </tr>
                  ))}
                </>
              }
            />
          )}
      </CardShell>

      {/* Risk + Quick */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <CardShell title="Finans Riskleri">
            {FINANCE_RISKS.length === 0 ? (
              <AdminEmptyState
                message="Şu an kritik finans riski bulunmuyor"
                hint="Yüksek iade, chargeback veya manuel inceleme gerektiren ödeme tespit edilmedi."
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
          <CardShell title="Hızlı İşlemler">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Link
                href="#payout-queue"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-[#c69575]/30 hover:bg-[#c69575]/10 hover:text-[#f0dcc8]"
              >
                <Landmark className="h-4 w-4 text-[#b8956f]" strokeWidth={1.5} />
                Payoutları İncele
              </Link>
              <Link
                href="/admin/settings"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-[#c69575]/30 hover:bg-[#c69575]/10 hover:text-[#f0dcc8]"
              >
                <Settings2 className="h-4 w-4 text-[#b8956f]" strokeWidth={1.5} />
                Komisyon Ayarları
              </Link>
              <Link
                href="/admin/orders"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-[#c69575]/30 hover:bg-[#c69575]/10 hover:text-[#f0dcc8]"
              >
                <RefreshCw className="h-4 w-4 text-[#b8956f]" strokeWidth={1.5} />
                İadeleri Gör
              </Link>
              <Link
                href="/admin/reports"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-[#c69575]/30 hover:bg-[#c69575]/10 hover:text-[#f0dcc8]"
              >
                <FileBarChart className="h-4 w-4 text-[#b8956f]" strokeWidth={1.5} />
                Finans Raporu
              </Link>
            </div>
          </CardShell>
        </div>
      </div>
    </div>
  );
}
