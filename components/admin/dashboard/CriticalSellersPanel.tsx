"use client";

import Link from "next/link";
import { AlertTriangle, Ban, PauseCircle, Wallet } from "lucide-react";
import {
  AdminDataScroll,
  ADMIN_CRITICAL_SELLERS_SCROLL_MAX_HEIGHT_CLASS,
  ADMIN_TABLE_TH_STICKY,
} from "@/components/admin/ui/AdminDataScroll";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";

/** İade oranı (%) bu eşiği aşan satıcı kritik listeye girer */
export const CRITICAL_SELLER_RETURN_RATE_PCT = 20;
/** Ortalama müşteri puanı bu değerin altına düşerse kritik */
export const CRITICAL_SELLER_RATING_MAX = 3;

export type SellerOperationalStatus = "aktif" | "incelemede" | "askida";

export type SellerHealthRow = {
  id: string;
  name: string;
  complaintCount: number;
  /** Son 3 işlemde verilen puanlar (1–5) */
  lastThreeOrderScores: readonly [number, number, number];
  /** Dönem içi iade oranı (%) */
  returnRatePct: number;
  /** Dönem içi ortalama müşteri puanı (1–5) */
  avgCustomerRating: number;
  status: SellerOperationalStatus;
};

/**
 * Kara liste / kritik satıcı mantığı (tek kaynak):
 * iade oranı > %20 VEYA (yeterli veri varsa) ortalama müşteri puanı < 3.
 * Puan = 0 (yeni / bekleyen satıcı) tek başına kritik sayılmaz.
 */
export function isSellerCritical(row: Pick<SellerHealthRow, "returnRatePct" | "avgCustomerRating">): boolean {
  const highReturn = row.returnRatePct > CRITICAL_SELLER_RETURN_RATE_PCT;
  const lowRating =
    row.avgCustomerRating > 0 && row.avgCustomerRating < CRITICAL_SELLER_RATING_MAX;
  return highReturn || lowRating;
}

export function filterCriticalSellers(rows: readonly SellerHealthRow[]): SellerHealthRow[] {
  return rows.filter((r) => isSellerCritical(r));
}

const numFmt = (n: number) => new Intl.NumberFormat("tr-TR").format(n);

function StatusBadge({ status }: { status: SellerOperationalStatus }) {
  const map: Record<SellerOperationalStatus, { label: string; className: string }> = {
    aktif: {
      label: "Aktif",
      className: "border-emerald-500/35 bg-emerald-500/12 text-emerald-200/95",
    },
    incelemede: {
      label: "İncelemede",
      className: "border-amber-500/40 bg-amber-500/12 text-amber-100/95",
    },
    askida: {
      label: "Askıda",
      className: "border-rose-500/40 bg-rose-500/12 text-rose-100/95",
    },
  };
  const c = map[status];
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${c.className}`}
    >
      {c.label}
    </span>
  );
}

function CriticalSellerActions({ sellerId, sellerName }: { sellerId: string; sellerName: string }) {
  const label = (action: string) => `${action}: ${sellerName}`;

  const handleSuspend = () => {
    if (
      !confirm(
        `${sellerName}: Yeni ürün listelemesi durdurulacak; mevcut siparişler tamamlanabilir. Askıya alınsın mı?`,
      )
    ) {
      return;
    }
    // TODO: PATCH /api/admin/sellers/:id/suspend
    void sellerId;
  };

  const handleRestrict = () => {
    if (!confirm(`${sellerName}: Ödemeler bloke edilecek. Devam edilsin mi?`)) {
      return;
    }
    // TODO: PATCH /api/admin/sellers/:id/restrict-payments
    void sellerId;
  };

  const handleBan = () => {
    if (
      !confirm(
        `${sellerName}: Satıcı tamamen sistem dışına alınacak (engelle). Bu işlem geri alınamayabilir. Emin misiniz?`,
      )
    ) {
      return;
    }
    // TODO: PATCH /api/admin/sellers/:id/ban
    void sellerId;
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-1.5">
      <button
        type="button"
        onClick={handleSuspend}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-400/45 bg-amber-500/[0.14] text-amber-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors hover:border-amber-400/65 hover:bg-amber-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40"
        title="Askıya al — yeni ürün listelemesini durdurur; mevcut siparişler tamamlanabilir"
        aria-label={label("Askıya al")}
      >
        <PauseCircle className="h-4 w-4" strokeWidth={2} aria-hidden />
      </button>
      <button
        type="button"
        onClick={handleRestrict}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-orange-500/45 bg-orange-500/[0.14] text-orange-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors hover:border-orange-400/65 hover:bg-orange-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40"
        title="Kısıtla — satıcı ödemelerini bloke eder"
        aria-label={label("Kısıtla")}
      >
        <Wallet className="h-4 w-4" strokeWidth={2} aria-hidden />
      </button>
      <button
        type="button"
        onClick={handleBan}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-500/50 bg-rose-500/[0.16] text-rose-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors hover:border-rose-400/70 hover:bg-rose-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/45"
        title="Hesabı kapat / engelle — satıcıyı tamamen sistem dışına alır"
        aria-label={label("Hesabı kapat veya engelle")}
      >
        <Ban className="h-4 w-4" strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}

type CriticalSellersPanelProps = {
  /** Ham satıcı sağlık verisi; panel içinde kritik filtresi uygulanır */
  allSellers: readonly SellerHealthRow[];
  className?: string;
};

export function CriticalSellersPanel({ allSellers, className = "" }: CriticalSellersPanelProps) {
  const critical = filterCriticalSellers(allSellers);

  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#12141a]/95 via-[#0c0d11] to-[#08090c] p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] sm:p-6 ${className}`}
      aria-labelledby="critical-sellers-heading"
    >
      <div className="mb-4 flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400/90" strokeWidth={1.75} aria-hidden />
            <h2 id="critical-sellers-heading" className="font-display text-lg font-semibold tracking-tight text-zinc-100">
              Kritik durumdaki satıcılar
            </h2>
          </div>
          <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-zinc-500 sm:text-xs">
            Liste otomatik: iade oranı &gt; %{CRITICAL_SELLER_RETURN_RATE_PCT} veya ortalama puan &lt;{" "}
            {CRITICAL_SELLER_RATING_MAX} olan satıcılar burada toplanır (kara liste / öncelikli inceleme).
          </p>
        </div>
        <Link
          href="/admin/sellers"
          className="shrink-0 text-xs font-medium text-[#c9a88a] transition-colors hover:text-[#e8d4c4]"
        >
          Tüm satıcılar →
        </Link>
      </div>

      {critical.length === 0 ? (
        <AdminEmptyState
          message="Kritik eşik altında satıcı yok"
          hint={`İade ≤ %${CRITICAL_SELLER_RETURN_RATE_PCT} ve puan ≥ ${CRITICAL_SELLER_RATING_MAX} (veya puan verisi yok) — API / ERP verisiyle güncellenir.`}
          variant="shield"
          size="compact"
          className="rounded-xl"
        />
      ) : (
        <div className="min-h-0 min-w-0 w-full max-w-full">
          <AdminDataScroll
            className="!rounded-lg"
            maxHeightClass={ADMIN_CRITICAL_SELLERS_SCROLL_MAX_HEIGHT_CLASS}
            overflowY="scroll"
            scrollInnerClassName="pr-1 [scrollbar-gutter:stable]"
            fadeBottom
            scrollAriaLabel="Kritik satıcılar — kaydırılabilir tablo ve açıklama"
          >
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  <th className={`px-3 py-3 font-medium ${ADMIN_TABLE_TH_STICKY}`}>Satıcı</th>
                  <th className={`px-3 py-3 font-medium tabular-nums ${ADMIN_TABLE_TH_STICKY}`}>Şikâyet</th>
                  <th className={`px-3 py-3 font-medium ${ADMIN_TABLE_TH_STICKY}`}>Son 3 işlem (puan)</th>
                  <th className={`px-3 py-3 font-medium tabular-nums ${ADMIN_TABLE_TH_STICKY}`}>İade %</th>
                  <th className={`px-3 py-3 font-medium tabular-nums ${ADMIN_TABLE_TH_STICKY}`}>Ort. puan</th>
                  <th className={`px-3 py-3 font-medium ${ADMIN_TABLE_TH_STICKY}`}>Durum</th>
                  <th className={`px-3 py-3 text-right font-medium ${ADMIN_TABLE_TH_STICKY}`}>Yönetim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {critical.map((row) => (
                  <tr key={row.id} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-3">
                      <Link
                        href={`/admin/sellers/${row.id}`}
                        className="font-medium text-[#e8d4c4] transition-colors hover:text-[#f5e6d8] hover:underline"
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 tabular-nums text-zinc-400">{numFmt(row.complaintCount)}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {row.lastThreeOrderScores.map((score, i) => (
                          <span
                            key={i}
                            className={`inline-flex min-w-[1.75rem] justify-center rounded border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                              score < CRITICAL_SELLER_RATING_MAX
                                ? "border-rose-500/40 bg-rose-500/15 text-rose-200"
                                : "border-white/[0.08] bg-white/[0.04] text-zinc-400"
                            }`}
                            title={`İşlem ${i + 1}: ${score}/5`}
                          >
                            {score}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td
                      className={`px-3 py-3 tabular-nums ${
                        row.returnRatePct > CRITICAL_SELLER_RETURN_RATE_PCT ? "font-semibold text-rose-400" : "text-zinc-400"
                      }`}
                    >
                      %{numFmt(Math.round(row.returnRatePct * 10) / 10)}
                    </td>
                    <td
                      className={`px-3 py-3 tabular-nums ${
                        row.avgCustomerRating < CRITICAL_SELLER_RATING_MAX
                          ? "font-semibold text-rose-400"
                          : "text-zinc-400"
                      }`}
                    >
                      {row.avgCustomerRating.toFixed(1)}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <CriticalSellerActions sellerId={row.id} sellerName={row.name} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-2 border-t border-white/[0.06] px-1 pb-1 pt-3 text-[11px] text-zinc-600">
              <p>
                <span className="font-medium text-zinc-500">Son 3 işlem:</span> kronolojik son üç siparişteki müşteri puanı;
                &lt; {CRITICAL_SELLER_RATING_MAX} kırmızı vurgu. Kritik giriş koşulu: iade &gt; %{CRITICAL_SELLER_RETURN_RATE_PCT}{" "}
                veya ortalama &lt; {CRITICAL_SELLER_RATING_MAX}.
              </p>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-zinc-500">
                <span className="inline-flex items-center gap-1">
                  <PauseCircle className="h-3.5 w-3.5 text-amber-400/90" aria-hidden />
                  <span>Askıya al: yeni listeleme durur, sipariş tamamlanır</span>
                </span>
                <span className="text-zinc-700">·</span>
                <span className="inline-flex items-center gap-1">
                  <Wallet className="h-3.5 w-3.5 text-orange-400/90" aria-hidden />
                  <span>Kısıtla: ödemeler bloke</span>
                </span>
                <span className="text-zinc-700">·</span>
                <span className="inline-flex items-center gap-1">
                  <Ban className="h-3.5 w-3.5 text-rose-400/90" aria-hidden />
                  <span>Engelle: tamamen sistem dışı</span>
                </span>
              </p>
            </div>
          </AdminDataScroll>
        </div>
      )}
    </section>
  );
}
