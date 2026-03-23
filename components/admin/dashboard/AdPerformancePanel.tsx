"use client";

import { Megaphone, PieChart, Target, Wallet } from "lucide-react";
import {
  DASHBOARD_TOTAL_REVENUE_TRY,
  MARKETING_SNAPSHOT,
  TRAFFIC_SOURCES,
  getCacTry,
  getEstimatedNetProfitBreakdown,
  getNetProfitMargin,
  getRoasRatio,
} from "./marketing-dashboard-constants";

const tryFmt = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);

const numFmt = (n: number) => new Intl.NumberFormat("tr-TR").format(n);

const pctFmt = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);

const roasFmt = (r: number) =>
  `${new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(r)}×`;

/** KPI kartlarıyla uyumlu: imleç, hafif kalkış, gölge, kenar (AdminKpiCard hover’a benzer) */
const cardHover =
  "cursor-pointer transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:duration-100";

const cardHoverNeutral =
  `${cardHover} hover:border-white/[0.14] hover:bg-[#0b0d14] hover:shadow-[0_10px_40px_-16px_rgba(0,0,0,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c69575]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090c]`;

const cardHoverAmber =
  `${cardHover} hover:border-amber-400/40 hover:bg-amber-500/[0.1] hover:shadow-[0_10px_36px_-14px_rgba(245,158,11,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090c]`;

const cardHoverMetric =
  `${cardHover} hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-[0_10px_40px_-16px_rgba(0,0,0,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c69575]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090c]`;

const cardHoverProfit =
  `${cardHover} border-emerald-500/25 bg-emerald-500/[0.06] hover:border-emerald-400/40 hover:bg-emerald-500/[0.1] hover:shadow-[0_10px_36px_-14px_rgba(16,185,129,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090c]`;

const rowHover =
  `${cardHover} rounded-lg px-2 py-2 -mx-2 hover:bg-white/[0.04] hover:shadow-[0_8px_28px_-18px_rgba(0,0,0,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c69575]/30 focus-visible:ring-offset-1 focus-visible:ring-offset-[#08090c]`;

const segmentHover = "cursor-pointer transition-[filter,transform] duration-150 hover:brightness-110 hover:saturate-125";

export function AdPerformancePanel() {
  const cac = getCacTry();
  const roas = getRoasRatio();
  const { periodLabel, adSpendTry, attributedSalesTry, newCustomers } = MARKETING_SNAPSHOT;
  const profitBreakdown = getEstimatedNetProfitBreakdown();
  const netVsRevenue = profitBreakdown.netProfitTry / DASHBOARD_TOTAL_REVENUE_TRY;
  const netProfitMargin = getNetProfitMargin(DASHBOARD_TOTAL_REVENUE_TRY, profitBreakdown.netProfitTry);

  const spendVsTotalRevenue = adSpendTry / DASHBOARD_TOTAL_REVENUE_TRY;
  const spendVsAttributed = adSpendTry / attributedSalesTry;

  return (
    <section
      className="mt-4 rounded-xl border border-[#c69575]/20 bg-gradient-to-br from-[#c69575]/[0.06] via-[#0c0d11] to-[#08090c] p-4 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] sm:p-5"
      aria-labelledby="ad-performance-heading"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h2
            id="ad-performance-heading"
            className="font-display text-base font-semibold tracking-tight text-zinc-100 sm:text-lg"
          >
            Reklam performansı
          </h2>
          <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-zinc-500 sm:text-xs">
            Ne sattığımız kadar, <strong className="font-medium text-zinc-400">nasıl ve hangi kanaldan</strong> sattığımız,
            <strong className="font-medium text-zinc-400"> reklam yükü</strong> ve{" "}
            <strong className="font-medium text-zinc-400">tahmini net kar</strong> burada özetlenir. Tüm rakamlar{" "}
            <span className="tabular-nums">{periodLabel}</span> için gösterimdir; net kar tarihi KPI ile aynı:{" "}
            <span className="tabular-nums text-zinc-400">{profitBreakdown.periodRangeLabel}</span>.
          </p>
        </div>
        <div
          className={`flex shrink-0 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-zinc-500 ${cardHover} hover:border-white/[0.12] hover:bg-white/[0.06]`}
        >
          <PieChart className="h-4 w-4 text-[#c9a88a]" strokeWidth={1.75} aria-hidden />
          <span>Trafik + attribüsyon</span>
        </div>
      </div>

      {/* Dashboard ile aynı net kar hesabı — bu bölümün üstünde vurgulu özet */}
      <div
        className="mt-4 flex flex-col gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/25 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4"
        role="region"
        aria-label="Net kar hesaplama özeti"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-500/35 bg-emerald-500/15 text-emerald-300">
            <Wallet className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200/85">Net kar (hesaplanan)</p>
            <p className="truncate text-[11px] text-zinc-500">
              Ciro − COGS − reklam − iade — KPI ile aynı dönem ({profitBreakdown.periodRangeLabel})
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 sm:justify-end">
          <p className="font-display text-xl font-semibold tabular-nums text-emerald-100 sm:text-2xl">
            {tryFmt(profitBreakdown.netProfitTry)}
          </p>
          <p className="text-[11px] text-zinc-500">
            Marj <span className="font-medium tabular-nums text-zinc-300">{pctFmt(netProfitMargin)}</span>
          </p>
        </div>
      </div>

      {/* Ciro, reklam, harcama/ciro, tahmini net kar — eşit yükseklik */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:items-stretch">
        <div
          className={`flex h-full min-h-[8.5rem] flex-col rounded-lg border border-white/[0.08] bg-[#08090c]/80 px-3 py-3 sm:min-h-0 ${cardHoverNeutral}`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Toplam ciro (platform)</p>
          <p className="mt-1 shrink-0 font-display text-xl font-semibold tabular-nums text-[#e4d0bf] sm:text-2xl">
            {tryFmt(DASHBOARD_TOTAL_REVENUE_TRY)}
          </p>
          <p className="mt-auto pt-2 text-[11px] leading-snug text-zinc-600">Tüm kanallar — brüt</p>
        </div>
        <div
          className={`flex h-full min-h-[8.5rem] flex-col rounded-lg border border-white/[0.08] bg-[#08090c]/80 px-3 py-3 sm:min-h-0 ${cardHoverNeutral}`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Reklam harcaması</p>
          <p className="mt-1 shrink-0 font-display text-xl font-semibold tabular-nums text-zinc-100 sm:text-2xl">
            {tryFmt(adSpendTry)}
          </p>
          <p className="mt-auto pt-2 text-[11px] leading-snug text-zinc-600">Ödenen medya + yönetim (gösterim)</p>
        </div>
        <div
          className={`flex h-full min-h-[8.5rem] flex-col rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-3 sm:min-h-0 ${cardHoverAmber}`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/80">Harcama / ciro</p>
          <p className="mt-1 shrink-0 font-display text-xl font-semibold tabular-nums text-amber-100/95 sm:text-2xl">
            {pctFmt(spendVsTotalRevenue)}
          </p>
          <p className="mt-auto pt-2 text-[11px] leading-snug text-amber-200/60">
            Toplam ciroya göre reklam yükü — örn. 124,5k ciro için ~{tryFmt(adSpendTry)} harcama
          </p>
        </div>
        <div
          className={`flex h-full min-h-[8.5rem] flex-col rounded-lg border px-3 py-3 sm:min-h-0 ${cardHoverProfit}`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200/85">Tahmini net kar</p>
          <p className="mt-1 shrink-0 font-display text-xl font-semibold tabular-nums text-emerald-200 sm:text-2xl">
            {tryFmt(profitBreakdown.netProfitTry)}
          </p>
          <p className="mt-auto pt-2 text-[11px] leading-snug text-emerald-200/65">
            Ciro − (ürün maliyeti + reklam + iade) · Ciroya oran {pctFmt(netVsRevenue)}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-[11px] leading-relaxed text-zinc-500">
        <p className="font-medium text-zinc-400">Net para (özet)</p>
        <p className="mt-1 font-mono text-[11px] text-zinc-500">
          {tryFmt(profitBreakdown.revenueTry)} − {tryFmt(profitBreakdown.productCostTry)} (COGS) −{" "}
          {tryFmt(profitBreakdown.adSpendTry)} (reklam) − {tryFmt(profitBreakdown.returnsLossTry)} (iade kaybı) ={" "}
          <span className="font-semibold text-emerald-400/95">{tryFmt(profitBreakdown.netProfitTry)}</span>
        </p>
        <p className="mt-1.5 text-zinc-600">
          KPI’daki “Net Kar” ({tryFmt(profitBreakdown.netProfitTry)}) ile aynı dönem (
          {profitBreakdown.periodRangeLabel}). Yönetici sorusu: “%21 reklam harcıyoruz; gün sonunda elimize kalan” →{" "}
          <strong className="font-medium text-zinc-400">{tryFmt(profitBreakdown.netProfitTry)}</strong> (tahmini, vergi
          öncesi/sonrası rapor tanımına göre ERP’de netleştirilir).
        </p>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
        Reklamla ilişkilendirilen satış <span className="font-medium tabular-nums text-zinc-400">{tryFmt(attributedSalesTry)}</span>{" "}
        (ROAS hesabı bu tutar üzerinden). Harcama / attribüte satış ≈{" "}
        <span className="tabular-nums text-zinc-400">{pctFmt(spendVsAttributed)}</span>.
      </p>

      {/* CAC + ROAS — eşit yükseklik */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-stretch">
        <div
          className={`flex h-full min-h-[6.5rem] gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-3 sm:min-h-0 ${cardHoverMetric}`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center self-start rounded-lg border border-white/[0.08] bg-white/[0.04] text-zinc-400">
            <Target className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">CAC (müşteri edinme maliyeti)</p>
            <p className="shrink-0 font-display text-xl font-semibold tabular-nums text-zinc-50">{tryFmt(Math.round(cac))}</p>
            <p className="mt-auto pt-2 text-[11px] leading-snug text-zinc-600">
              {numFmt(newCustomers)} yeni müşteri — harcama ÷ yeni müşteri
            </p>
          </div>
        </div>
        <div
          className={`flex h-full min-h-[6.5rem] gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-3 sm:min-h-0 ${cardHoverMetric}`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center self-start rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-300/90">
            <Megaphone className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">ROAS (reklam verimliliği)</p>
            <p className="shrink-0 font-display text-xl font-semibold tabular-nums text-emerald-400/95">{roasFmt(roas)}</p>
            <p className="mt-auto pt-2 text-[11px] leading-snug text-zinc-600">Attribüte satış ÷ reklam harcaması</p>
          </div>
        </div>
      </div>

      {/* Trafik + satış dağılımı */}
      <div className="mt-6 border-t border-white/[0.08] pt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Trafik ve satış kaynakları</h3>
        <p className="mt-1 text-[11px] text-zinc-600">
          Sol: oturum / ziyaret kaynağı. Sağ: tamamlanan satışın attribüte dağılımı (Instagram, Google vb.).
        </p>

        <div
          className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-white/[0.06]"
          role="img"
          aria-label="Trafik kaynakları yüzde dağılımı"
        >
          {TRAFFIC_SOURCES.map((s) => (
            <div
              key={s.id}
              className={`h-full ${s.barClass} ${segmentHover}`}
              style={{ width: `${s.trafficPct}%` }}
              title={`${s.label}: %${s.trafficPct} trafik`}
            />
          ))}
        </div>
        <p className="mt-1 text-[10px] text-zinc-600">Trafik — toplam %100</p>

        <ul className="mt-4 space-y-3">
          {TRAFFIC_SOURCES.map((s) => {
            const salesTry = (attributedSalesTry * s.salesPct) / 100;
            return (
              <li
                key={s.id}
                className={`flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.05] pb-3 last:border-0 last:pb-0 ${rowHover}`}
              >
                <div className="min-w-0">
                  <p className="font-medium text-zinc-200">{s.label}</p>
                  <p className="text-[11px] text-zinc-600">{s.detail}</p>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-right text-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">Trafik</p>
                    <p className="font-semibold tabular-nums text-zinc-300">%{s.trafficPct}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">Satış payı</p>
                    <p className="font-semibold tabular-nums text-[#d4b896]">%{s.salesPct}</p>
                  </div>
                  <div className="min-w-[7rem]">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">Attribüte ciro</p>
                    <p className="font-medium tabular-nums text-zinc-200">{tryFmt(Math.round(salesTry))}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
