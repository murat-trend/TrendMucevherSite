"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminKpiCard } from "@/components/admin/ui/AdminKpiCard";
import { ArrowRight, FileSpreadsheet, Landmark, Loader2, Percent, Table2, Tags, Wallet } from "lucide-react";

const tryFmt = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);

type FinanceSummaryJson = {
  revenueTry?: number;
  expensesTry?: number;
  netProfitTry?: number;
  error?: string;
};

const cards = [
  {
    href: "/admin/finance/gelir-tablosu",
    title: "Gelir Tablosu",
    desc: "Aylık gelir, satıcı özetleri ve billing defteri",
    icon: Table2,
  },
  {
    href: "/admin/finance/gider-tanimlama",
    title: "Gider Tanımlama",
    desc: "Gider kalemleri ve hesap eşlemesi",
    icon: Tags,
  },
  {
    href: "/admin/finance/komisyon",
    title: "Komisyon Yönetimi",
    desc: "Komisyon kayıtları ve satıcı ödemeleri",
    icon: Percent,
  },
  {
    href: "/admin/finance/muhasebe-raporu",
    title: "Muhasebe Raporu",
    desc: "Mizan ve dönem raporları",
    icon: FileSpreadsheet,
  },
] as const;

export function FinansOverviewPage() {
  const [data, setData] = useState<FinanceSummaryJson | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/finance/summary", { credentials: "include" });
      const j = (await res.json()) as FinanceSummaryJson;
      if (!res.ok) {
        setErr(j.error ?? "Özet yüklenemedi.");
        setData(null);
        return;
      }
      setData(j);
    } catch {
      setErr("Ağ hatası.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rev = typeof data?.revenueTry === "number" ? data.revenueTry : 0;
  const exp = typeof data?.expensesTry === "number" ? data.expensesTry : 0;
  const net = typeof data?.netProfitTry === "number" ? data.netProfitTry : 0;

  return (
    <div className="space-y-8 pb-10">
      <div className="rounded-2xl border border-white/[0.14] bg-gradient-to-br from-[#14161d] via-[#0e1015] to-[#08090c] p-8 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] sm:p-10">
        <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-zinc-50">Finans</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-400">
          Mali özet Supabase sipariş ve gider tablolarından gelir. Detaylı tablolar için aşağıdaki bağlantıları kullanın.
        </p>

        {err && (
          <div className="mt-6 rounded-xl border border-rose-500/25 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-200/90">{err}</div>
        )}

        {loading ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#b8956f]" strokeWidth={1.5} />
            Özet yükleniyor…
          </div>
        ) : (
          <section aria-label="Genel KPI" className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <AdminKpiCard label="Toplam gelir" value={tryFmt(rev)} sub="Ödenmiş siparişler (TRY)" icon={Landmark} tone="revenue" />
            <AdminKpiCard label="Toplam gider" value={tryFmt(exp)} sub="finance_expenses toplamı" icon={Wallet} tone="neutral" />
            <AdminKpiCard label="Net kâr" value={tryFmt(net)} sub="Gelir − gider" icon={Wallet} tone={net >= 0 ? "positive" : "negative"} />
          </section>
        )}
      </div>

      <ul className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <li key={c.href}>
              <Link
                href={c.href}
                className="group flex h-full flex-col rounded-2xl border border-white/[0.1] bg-gradient-to-br from-[#12141a]/95 via-[#0c0d11] to-[#08090c] p-6 transition-colors hover:border-[#c69575]/35 hover:bg-[#c69575]/[0.06]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-[#c9a88a]">
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-[#d4b896]"
                    strokeWidth={1.5}
                  />
                </div>
                <p className="mt-4 font-display text-lg font-semibold text-zinc-100">{c.title}</p>
                <p className="mt-1 text-sm text-zinc-500">{c.desc}</p>
                {!loading && data && !err ? (
                  <div className="mt-4 rounded-xl border border-white/[0.06] bg-[#07080a]/80 px-3 py-2.5 text-[11px] leading-relaxed text-zinc-400">
                    <span className="font-medium text-zinc-300">Gelir</span> {tryFmt(rev)}
                    <span className="mx-1.5 text-zinc-600">·</span>
                    <span className="font-medium text-zinc-300">Gider</span> {tryFmt(exp)}
                    <span className="mx-1.5 text-zinc-600">·</span>
                    <span className="font-medium text-zinc-300">Net</span> {tryFmt(net)}
                  </div>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
