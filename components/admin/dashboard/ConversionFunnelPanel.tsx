"use client";

import { BadgeCheck, CreditCard, ShoppingCart } from "lucide-react";

/**
 * Huni — tüm yüzdeler **aynı payda**: tekil oturum (toplam trafik).
 * Formül: yüzde = (o aşamaya ulaşan oturum sayısı) ÷ (toplam oturum sayısı).
 * Akademik akış: Ziyaret → Sepet → Ödeme → Satın alma; üst geniş, alt dar (oturum sayıları monoton azalır).
 */
const FUNNEL_SNAPSHOT = {
  periodLabel: "Son 30 gün",
  /** Tekil oturum — tüm yüzdelerin paydası (funnel denominator) */
  totalSessions: 182_400,
  stages: [
    {
      id: "addToCart",
      title: "Sepete ekleme",
      subtitle: "Add-to-cart",
      /** Bu eylemi yapan tekil oturum; yüzde = bu sayı ÷ totalSessions */
      sessionsAtStage: 43_776,
      description: "Tüm ziyaretler içinde en az bir ürünü sepete ekleyen oturumlar.",
      icon: ShoppingCart,
      barClass: "bg-[#c69575]/85",
    },
    {
      id: "checkout",
      title: "Ödeme başlatma",
      subtitle: "Checkout",
      sessionsAtStage: 14_592,
      description: "Tüm ziyaretler içinde ödeme sayfasına / checkout’a ulaşan oturumlar.",
      icon: CreditCard,
      barClass: "bg-sky-500/75",
    },
    {
      id: "purchase",
      title: "Satın alma",
      subtitle: "Purchase",
      sessionsAtStage: 5_837,
      description: "Tüm ziyaretler içinde siparişi tamamlayan oturumlar.",
      icon: BadgeCheck,
      barClass: "bg-emerald-500/70",
    },
  ],
} as const;

const TRAFFIC_DENOMINATOR = "Payda: tekil oturum (toplam trafik)";

function pctFmt(n: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(n);
}

function numFmt(n: number) {
  return new Intl.NumberFormat("tr-TR").format(n);
}

/** Funnel: her aşama oturumu ≤ bir önceki (aynı oturum akışı). */
function assertFunnelMonotonic(sessionsAtStages: readonly number[]) {
  if (process.env.NODE_ENV !== "production") {
    for (let i = 1; i < sessionsAtStages.length; i++) {
      if (sessionsAtStages[i]! > sessionsAtStages[i - 1]!) {
        console.warn("[ConversionFunnel] Aşama oturum sayıları huni mantığına aykırı (üst aşama < alt).");
      }
    }
  }
}

/**
 * Yüzde = o aşamadaki oturum ÷ toplam oturum (önceki aşama paydası DEĞİL).
 */
function pctOfTotalSessions(sessionsAtStage: number, totalSessions: number): number {
  if (totalSessions <= 0) return 0;
  return sessionsAtStage / totalSessions;
}

export function ConversionFunnelPanel() {
  const { totalSessions, stages } = FUNNEL_SNAPSHOT;
  const sessionsAtStages = stages.map((s) => s.sessionsAtStage);
  assertFunnelMonotonic(sessionsAtStages);

  /** Oturum → satın alma: son aşama ÷ toplam oturum (tek payda) */
  const sessionToPurchase = pctOfTotalSessions(stages[stages.length - 1]!.sessionsAtStage, totalSessions);

  return (
    <section
      className="mt-4 rounded-xl border border-white/[0.09] bg-gradient-to-br from-[#101218]/95 via-[#0c0d11] to-[#08090c] p-4 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] sm:p-5"
      aria-labelledby="conversion-funnel-heading"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h2
            id="conversion-funnel-heading"
            className="font-display text-base font-semibold tracking-tight text-zinc-100 sm:text-lg"
          >
            Dönüşüm hunisi
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-500 sm:text-xs">
            <span className="font-medium text-zinc-400">{FUNNEL_SNAPSHOT.periodLabel}</span> · Yüzdeler{" "}
            <strong className="font-medium text-zinc-400">(aşama oturumu ÷ toplam oturum)</strong> ile hesaplanır; önceki
            aşama paydası kullanılmaz (klasik funnel / trafik bazlı dönüşüm).
          </p>
        </div>
        <p className="shrink-0 text-[11px] text-zinc-600 sm:text-right">
          <span className="block tabular-nums text-zinc-500">Toplam oturum (payda)</span>
          <span className="font-medium tabular-nums text-zinc-400">{numFmt(totalSessions)}</span>
          <span className="mt-0.5 block text-[10px] text-zinc-600">%100 = tüm trafik</span>
        </p>
      </div>

      <ol className="mt-5 space-y-4">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const pct = pctOfTotalSessions(stage.sessionsAtStage, totalSessions);
          const w = Math.round(pct * 1000) / 10;
          const count = stage.sessionsAtStage;
          return (
            <li key={stage.id}>
              <div className="flex flex-wrap items-start gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-zinc-400"
                  aria-hidden
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        Aşama {index + 1}
                      </span>
                      <p className="font-medium text-zinc-200">
                        {stage.title}{" "}
                        <span className="font-normal text-zinc-500">({stage.subtitle})</span>
                      </p>
                    </div>
                    <span className="font-display text-lg font-semibold tabular-nums text-zinc-100 sm:text-xl">
                      {pctFmt(pct)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">
                    {TRAFFIC_DENOMINATOR} ·{" "}
                    <span className="tabular-nums">
                      {numFmt(count)} ÷ {numFmt(totalSessions)}
                    </span>
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-zinc-600/90">{stage.description}</p>
                  <p className="mt-1 text-[11px] tabular-nums text-zinc-500">≈ {numFmt(count)} oturum</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={`h-full rounded-full transition-all ${stage.barClass}`}
                      style={{ width: `${w}%` }}
                      role="presentation"
                    />
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-5 border-t border-white/[0.08] pt-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Oturum → satın alma (genel dönüşüm)
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              Satın alma oturumu ÷ toplam oturum; çarpım veya önceki aşama paydası yok.
            </p>
          </div>
          <p className="font-display text-2xl font-semibold tabular-nums text-emerald-400/95 sm:text-[1.65rem]">
            {pctFmt(sessionToPurchase)}
          </p>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-600/95">
          Örnek (100 oturum ölçeğinde): ~{Math.round(100 * pctOfTotalSessions(stages[0]!.sessionsAtStage, totalSessions))}{" "}
          sepet, ~{Math.round(100 * pctOfTotalSessions(stages[1]!.sessionsAtStage, totalSessions))} ödeme, ~
          {Math.round(100 * sessionToPurchase)} satın alma — hepsi{" "}
          <strong className="font-medium text-zinc-500">aynı toplam oturum paydasına</strong> göre.
        </p>
      </div>
    </section>
  );
}
