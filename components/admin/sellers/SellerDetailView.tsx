"use client";

import { useCallback, useMemo, useState, type ReactNode, type ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Ban,
  Check,
  ChevronLeft,
  CircleAlert,
  Package,
  Percent,
  ShoppingCart,
  Star,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminDataScroll, ADMIN_TABLE_TH_STICKY } from "@/components/admin/ui/AdminDataScroll";
import { AdminKpiCard, type AdminKpiTone } from "@/components/admin/ui/AdminKpiCard";
import { buildSellerDetailFromSeller, type SellerDetail } from "./seller-detail-data";
import { SellerDetailMiniChart } from "./SellerDetailMiniChart";
import { SellerStatusBadge } from "./SellerStatusBadge";
import type { Seller } from "./types";
import { isHighReturnCount } from "./types";

const tryFmt = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);

const numFmt = (n: number) => new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(n);

const intFmt = (n: number) => new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(n);

const dateFmt = (iso: string) =>
  new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(iso));

type TabId = "orders" | "products" | "payments" | "reviews";

function Card({
  title,
  icon: Icon,
  children,
  className = "",
}: {
  title: string;
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#10121a]/95 via-[#0a0b0f] to-[#060708] p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] sm:p-6 ${className}`}
    >
      <div className="mb-4 flex items-center gap-2 border-b border-white/[0.06] pb-3">
        {Icon && <Icon className="h-4 w-4 text-[#b8956f]" strokeWidth={1.5} />}
        <h2 className="font-display text-base font-semibold tracking-tight text-zinc-100">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function SellerDetailView({ initialDetail }: { initialDetail: SellerDetail }) {
  const router = useRouter();
  const [detail, setDetail] = useState(initialDetail);
  const [tab, setTab] = useState<TabId>("orders");

  const kpi = useMemo(() => {
    const returnTone: AdminKpiTone = detail.returnRate > 4 ? "negative" : "neutral";
    return [
      { label: "Toplam Satış", value: tryFmt(detail.totalSales), icon: TrendingUp, tone: "revenue" as const },
      { label: "Sipariş Sayısı", value: intFmt(detail.orderCount), icon: ShoppingCart, tone: "neutral" as const },
      { label: "İade Oranı", value: `%${numFmt(detail.returnRate)}`, icon: Percent, tone: returnTone },
      {
        label: "Ortalama Puan",
        value: detail.rating > 0 ? `${numFmt(detail.rating)} / 5` : "—",
        icon: Star,
        tone: "neutral" as const,
      },
    ];
  }, [detail]);

  const approve = useCallback(() => {
    setDetail((d) => {
      const base: Seller = {
        id: d.id,
        storeName: d.storeName,
        ownerName: d.ownerName,
        ownerEmail: d.ownerEmail,
        phone: d.phone,
        status: "active",
        totalSales: d.totalSales,
        orderCount: d.orderCount,
        returnCount: d.returnCount,
        returnRate: d.returnRate,
        rating: d.rating > 0 ? d.rating : 4.5,
        registeredAt: d.registeredAt,
      };
      return buildSellerDetailFromSeller(base);
    });
  }, []);

  const suspend = useCallback(() => {
    setDetail((d) => {
      const base: Seller = {
        id: d.id,
        storeName: d.storeName,
        ownerName: d.ownerName,
        ownerEmail: d.ownerEmail,
        phone: d.phone,
        status: "suspended",
        totalSales: d.totalSales,
        orderCount: d.orderCount,
        returnCount: d.returnCount,
        returnRate: d.returnRate,
        rating: d.rating,
        registeredAt: d.registeredAt,
      };
      return buildSellerDetailFromSeller(base);
    });
  }, []);

  const remove = useCallback(() => {
    if (typeof window !== "undefined" && window.confirm("Bu satıcıyı silmek istediğinize emin misiniz?")) {
      router.push("/admin/sellers");
    }
  }, [router]);

  const tabLabels: Record<TabId, string> = {
    orders: "Siparişler",
    products: "Ürünler",
    payments: "Ödemeler",
    reviews: "Yorumlar",
  };

  const emptyMessages: Record<TabId, string> = {
    orders: "Henüz sipariş kaydı yok.",
    products: "Henüz ürün listelenmiyor.",
    payments: "Henüz ödeme hareketi yok.",
    reviews: "Henüz değerlendirme yok.",
  };

  return (
    <div className="space-y-6 pb-10 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-6 border-b border-white/[0.06] pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-3">
          <Link
            href="/admin/sellers"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-[#d4b896]"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            Satıcılar
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-zinc-50 sm:text-3xl">
              <span className="inline-flex items-center gap-2">
                {detail.storeName}
                {isHighReturnCount(detail.returnCount) && (
                  <span
                    className="inline-flex shrink-0 text-rose-500"
                    title={`Yüksek iade: ${detail.returnCount} iade`}
                  >
                    <CircleAlert className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={2} aria-hidden />
                    <span className="sr-only">Uyarı: yüksek iade sayısı</span>
                  </span>
                )}
              </span>
            </h1>
            <SellerStatusBadge status={detail.status} />
          </div>
          <p className="text-xs text-zinc-600">Satıcı ID: {detail.id}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {detail.status === "pending" && (
            <button
              type="button"
              onClick={approve}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/12 px-4 py-2.5 text-sm font-medium text-emerald-100 transition-colors hover:bg-emerald-500/22"
            >
              <Check className="h-4 w-4" strokeWidth={2} />
              Onayla
            </button>
          )}
          {detail.status !== "suspended" && (
            <button
              type="button"
              onClick={suspend}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-100 transition-colors hover:bg-amber-500/18"
            >
              <Ban className="h-4 w-4" strokeWidth={2} />
              Askıya Al
            </button>
          )}
          <button
            type="button"
            onClick={remove}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-100 transition-colors hover:bg-rose-500/18"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2} />
            Sil
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <section aria-label="Özet KPI" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpi.map((row) => (
          <AdminKpiCard key={row.label} label={row.label} value={row.value} icon={row.icon} tone={row.tone} />
        ))}
      </section>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-7">
          <Card title="Satıcı bilgileri" icon={Package}>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                ["Mağaza adı", detail.storeName],
                ["Sahip", detail.ownerName],
                ["E-posta", detail.ownerEmail],
                ["Telefon", detail.phone],
                ["Kayıt tarihi", dateFmt(detail.registeredAt)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
                  <dt className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{k}</dt>
                  <dd className="mt-1 text-sm text-zinc-200">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card title="Performans" icon={TrendingUp}>
            <SellerDetailMiniChart values={detail.salesTrend30d} chartId={`chart-${detail.id}`} />
            <div className="mt-4 flex flex-col gap-3 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Son 30 gün satış</p>
                <p className="mt-1 font-display text-lg font-semibold tabular-nums text-zinc-100">
                  {tryFmt(detail.last30DaysSales)}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">En çok satan ürün</p>
                <p className="mt-1 max-w-[240px] truncate text-sm font-medium text-zinc-200">{detail.topProduct}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6 xl:col-span-5">
          <Card title="Finansal özet" icon={Wallet}>
            <ul className="space-y-3">
              {[
                ["Toplam kazanç", tryFmt(detail.totalEarnings)],
                ["Platform komisyonu", tryFmt(detail.platformCommission)],
                ["Satıcı bakiyesi", tryFmt(detail.sellerBalance)],
                ["Bekleyen ödeme", tryFmt(detail.pendingPayout)],
              ].map(([label, value]) => (
                <li
                  key={label}
                  className="flex items-center justify-between gap-4 border-b border-white/[0.05] pb-3 last:border-0 last:pb-0"
                >
                  <span className="text-sm text-zinc-500">{label}</span>
                  <span className="font-display text-base font-semibold tabular-nums text-zinc-100">{value}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11px] leading-relaxed text-zinc-600">
              Rakamlar brüt ciro ve tahmini kesintiler üzerinden özetlenir; kesin mutabakat finans modülünde yapılır.
            </p>
          </Card>

          <Card title="Risk & sağlık" icon={AlertTriangle}>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center justify-between gap-3">
                <span className="text-zinc-500">İade oranı</span>
                <span className="tabular-nums font-medium text-zinc-200">%{numFmt(detail.returnRate)}</span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="text-zinc-500">Şikayet sayısı</span>
                <span className="tabular-nums font-medium text-zinc-200">{intFmt(detail.complaintsCount)}</span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="text-zinc-500">Fraud bayrağı</span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase ${
                    detail.fraudFlag
                      ? "border-rose-500/40 bg-rose-500/15 text-rose-200"
                      : "border-emerald-500/35 bg-emerald-500/12 text-emerald-200"
                  }`}
                >
                  {detail.fraudFlag ? "Aktif" : "Temiz"}
                </span>
              </li>
            </ul>
            <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
              <p className="text-xs font-medium leading-relaxed text-zinc-400">{detail.healthMessage}</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <section aria-label="Detay sekmeleri" className="rounded-2xl border border-white/[0.09] bg-[#08090d]/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="flex flex-wrap gap-1 border-b border-white/[0.06] p-2">
          {(Object.keys(tabLabels) as TabId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === id
                  ? "bg-white/[0.08] text-zinc-100 shadow-[inset_0_0_0_1px_rgba(198,149,117,0.25)]"
                  : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
              }`}
            >
              {tabLabels[id]}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6">
          {tab === "orders" &&
            (detail.orders.length === 0 ? (
              <AdminEmptyState message={emptyMessages.orders} variant="shield" size="compact" />
            ) : (
              <AdminDataScroll>
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      <th className={`px-4 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Sipariş</th>
                      <th className={`px-4 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Tarih</th>
                      <th className={`px-4 py-3 tabular-nums ${ADMIN_TABLE_TH_STICKY}`}>Tutar</th>
                      <th className={`px-4 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {detail.orders.map((r) => (
                      <tr key={r.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-mono text-xs text-zinc-300">{r.orderNo}</td>
                        <td className="px-4 py-3 text-zinc-400">{dateFmt(r.date)}</td>
                        <td className="px-4 py-3 tabular-nums text-zinc-200">{tryFmt(r.amount)}</td>
                        <td className="px-4 py-3 text-zinc-400">{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AdminDataScroll>
            ))}

          {tab === "products" &&
            (detail.products.length === 0 ? (
              <AdminEmptyState message={emptyMessages.products} variant="shield" size="compact" />
            ) : (
              <AdminDataScroll>
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      <th className={`px-4 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Ürün</th>
                      <th className={`px-4 py-3 ${ADMIN_TABLE_TH_STICKY}`}>SKU</th>
                      <th className={`px-4 py-3 tabular-nums ${ADMIN_TABLE_TH_STICKY}`}>Satış</th>
                      <th className={`px-4 py-3 tabular-nums ${ADMIN_TABLE_TH_STICKY}`}>Ciro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {detail.products.map((r) => (
                      <tr key={r.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-medium text-zinc-200">{r.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-zinc-500">{r.sku}</td>
                        <td className="px-4 py-3 tabular-nums text-zinc-400">{intFmt(r.sales)}</td>
                        <td className="px-4 py-3 tabular-nums text-zinc-200">{tryFmt(r.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AdminDataScroll>
            ))}

          {tab === "payments" &&
            (detail.payments.length === 0 ? (
              <AdminEmptyState message={emptyMessages.payments} variant="shield" size="compact" />
            ) : (
              <AdminDataScroll>
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      <th className={`px-4 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Tarih</th>
                      <th className={`px-4 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Tür</th>
                      <th className={`px-4 py-3 tabular-nums ${ADMIN_TABLE_TH_STICKY}`}>Tutar</th>
                      <th className={`px-4 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {detail.payments.map((r) => (
                      <tr key={r.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 text-zinc-400">{dateFmt(r.date)}</td>
                        <td className="px-4 py-3 text-zinc-300">{r.type}</td>
                        <td className="px-4 py-3 tabular-nums text-zinc-200">{tryFmt(r.amount)}</td>
                        <td className="px-4 py-3 text-zinc-400">{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AdminDataScroll>
            ))}

          {tab === "reviews" &&
            (detail.reviews.length === 0 ? (
              <AdminEmptyState message={emptyMessages.reviews} variant="shield" size="compact" />
            ) : (
              <AdminDataScroll>
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      <th className={`px-4 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Tarih</th>
                      <th className={`px-4 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Alıcı</th>
                      <th className={`px-4 py-3 tabular-nums ${ADMIN_TABLE_TH_STICKY}`}>Puan</th>
                      <th className={`px-4 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Yorum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {detail.reviews.map((r) => (
                      <tr key={r.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 text-zinc-400">{dateFmt(r.date)}</td>
                        <td className="px-4 py-3 text-zinc-300">{r.buyer}</td>
                        <td className="px-4 py-3 tabular-nums text-zinc-200">{numFmt(r.rating)}</td>
                        <td className="px-4 py-3 text-zinc-400">{r.excerpt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AdminDataScroll>
            ))}
        </div>
      </section>
    </div>
  );
}
