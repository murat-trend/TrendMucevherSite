"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Building2,
  ChevronLeft,
  Clock,
  CreditCard,
  MapPin,
  MoreHorizontal,
  Package,
  Printer,
  Route,
  ShieldAlert,
  Truck,
  User,
} from "lucide-react";
import { AdminKpiCard, type AdminKpiTone } from "@/components/admin/ui/AdminKpiCard";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminDataScroll, ADMIN_TABLE_TH_STICKY } from "@/components/admin/ui/AdminDataScroll";
import type { OrderDetailFull, DeliveryStatus, OrderStatus, PaymentStatus } from "./order-detail-data";

const tryFmt = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);

const dateFmt = (iso: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

const STATUS_BADGE: Record<OrderStatus, string> = {
  Bekleyen: "border-amber-500/35 bg-amber-500/12 text-amber-200",
  Hazırlanıyor: "border-sky-500/35 bg-sky-500/12 text-sky-200",
  Kargoda: "border-violet-500/35 bg-violet-500/12 text-violet-200",
  Tamamlandı: "border-emerald-500/35 bg-emerald-500/12 text-emerald-200",
  İptal: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300",
  İade: "border-rose-500/35 bg-rose-500/12 text-rose-200",
};

const PAYMENT_BADGE: Record<PaymentStatus, string> = {
  Ödendi: "border-emerald-500/35 bg-emerald-500/12 text-emerald-200",
  Bekliyor: "border-amber-500/35 bg-amber-500/12 text-amber-200",
  "İade Edildi": "border-rose-500/35 bg-rose-500/12 text-rose-200",
};

const DELIVERY_BADGE: Record<DeliveryStatus, string> = {
  Hazırlanıyor: "border-sky-500/35 bg-sky-500/12 text-sky-200",
  Kargoda: "border-violet-500/35 bg-violet-500/12 text-violet-200",
  "Teslim Edildi": "border-emerald-500/35 bg-emerald-500/12 text-emerald-200",
  Problemli: "border-orange-500/40 bg-orange-500/12 text-orange-200",
};

function Badge({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${className}`}>{children}</span>
  );
}

function Card({
  title,
  icon: Icon,
  children,
  className = "",
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
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

type TabId = "notes" | "refunds" | "payments" | "messages";

export function OrderDetailView({ order }: { order: OrderDetailFull }) {
  const [tab, setTab] = useState<TabId>("notes");

  const kpi = useMemo(() => {
    const riskTone: AdminKpiTone = order.riskScore >= 60 ? "critical" : "neutral";
    return [
      { label: "Sipariş Tutarı", value: tryFmt(order.amount), tone: "neutral" as const },
      { label: "Ödenen Tutar", value: tryFmt(order.paidAmount), tone: "neutral" as const },
      { label: "Refund Tutarı", value: tryFmt(order.refundedAmount), tone: "negative" as const },
      { label: "Risk Skoru", value: `${order.riskScore}/100`, tone: riskTone },
    ];
  }, [order]);

  const tabLabels: Record<TabId, string> = {
    notes: "Notlar",
    refunds: "İade Geçmişi",
    payments: "Ödeme Olayları",
    messages: "Müşteri Mesajları",
  };

  const riskClean =
    !order.fraudFlag && !order.disputeLikelihood && !order.highRefundRisk && !order.manualReviewNote;

  return (
    <div className="space-y-6 pb-12 lg:space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-6 border-b border-white/[0.06] pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-[#d4b896]"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            Siparişler
          </Link>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-zinc-50 sm:text-3xl">
              #{order.orderNo}
            </h1>
            <Badge className={STATUS_BADGE[order.status]}>{order.status}</Badge>
            <Badge className={PAYMENT_BADGE[order.payment]}>{order.payment}</Badge>
            <Badge className={DELIVERY_BADGE[order.delivery]}>{order.delivery}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm font-medium text-sky-100 transition-colors hover:bg-sky-500/18"
          >
            Durumu Güncelle
          </button>
          <button
            type="button"
            className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-100 transition-colors hover:bg-amber-500/18"
          >
            Refund / İade İşlemi
          </button>
          <button
            type="button"
            className="rounded-xl border border-white/[0.1] bg-white/[0.05] px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/[0.08]"
          >
            <Printer className="mr-1.5 inline h-4 w-4" strokeWidth={1.5} />
            Yazdır
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.05] px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-zinc-100"
          >
            <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
            Daha Fazla
          </button>
        </div>
      </header>

      {/* KPI */}
      <section aria-label="Sipariş özeti" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpi.map((k) => (
          <AdminKpiCard key={k.label} label={k.label} value={k.value} tone={k.tone} />
        ))}
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-7">
          <Card title="Sipariş özeti" icon={Package}>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                ["Sipariş no", order.orderNo],
                ["Tarih", dateFmt(order.date)],
                ["Satıcı", order.seller],
                ["Müşteri", order.customer],
                ["Ödeme yöntemi", order.paymentMethod],
                ["Teslimat yöntemi", order.shippingMethod],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
                  <dt className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{k}</dt>
                  <dd className="mt-1 text-sm text-zinc-200">{v}</dd>
                </div>
              ))}
              <div className="sm:col-span-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
                <dt className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Notlar</dt>
                <dd className="mt-1 text-sm leading-relaxed text-zinc-300">{order.notes}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Sipariş Kalemleri" icon={Package}>
            <AdminDataScroll>
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    <th className={`px-3 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Ürün adı</th>
                    <th className={`px-3 py-3 tabular-nums ${ADMIN_TABLE_TH_STICKY}`}>Adet</th>
                    <th className={`px-3 py-3 tabular-nums ${ADMIN_TABLE_TH_STICKY}`}>Birim fiyat</th>
                    <th className={`px-3 py-3 tabular-nums ${ADMIN_TABLE_TH_STICKY}`}>Toplam</th>
                    <th className={`px-3 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Satıcı</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {order.lineItems.map((li) => (
                    <tr key={li.id} className="hover:bg-white/[0.02]">
                      <td className="px-3 py-3 font-medium text-zinc-200">{li.name}</td>
                      <td className="px-3 py-3 tabular-nums text-zinc-400">{li.qty}</td>
                      <td className="px-3 py-3 tabular-nums text-zinc-400">{tryFmt(li.unitPrice)}</td>
                      <td className="px-3 py-3 tabular-nums font-medium text-zinc-100">{tryFmt(li.total)}</td>
                      <td className="px-3 py-3 text-zinc-500">{li.seller}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminDataScroll>
          </Card>

          <Card title="Sipariş Zaman Akışı" icon={Clock}>
            <ol className="relative space-y-0 border-l border-white/[0.1] pl-6">
              {order.timeline.map((ev) => (
                <li key={ev.id} className="relative pb-8 last:pb-0">
                  <span className="absolute -left-[25px] top-1 flex h-3 w-3 items-center justify-center rounded-full border border-[#c69575]/50 bg-[#c69575]/25" />
                  <p className="text-sm font-semibold text-zinc-100">{ev.title}</p>
                  <p className="text-xs text-zinc-500">{dateFmt(ev.at)}</p>
                  {ev.detail && <p className="mt-1 text-xs text-zinc-400">{ev.detail}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6 xl:col-span-5">
          <Card title="Müşteri" icon={User}>
            <ul className="space-y-3 text-sm">
              <li>
                <span className="text-zinc-500">Ad soyad</span>
                <p className="mt-0.5 font-medium text-zinc-100">{order.customer}</p>
              </li>
              <li>
                <span className="text-zinc-500">E-posta</span>
                <p className="mt-0.5 text-zinc-300">{order.customerEmail}</p>
              </li>
              <li>
                <span className="text-zinc-500">Telefon</span>
                <p className="mt-0.5 tabular-nums text-zinc-300">{order.customerPhone}</p>
              </li>
              <li className="flex gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" strokeWidth={1.5} />
                <div>
                  <span className="text-zinc-500">Teslimat adresi</span>
                  <p className="mt-0.5 leading-relaxed text-zinc-300">{order.shippingAddress}</p>
                </div>
              </li>
              <li className="flex gap-2">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" strokeWidth={1.5} />
                <div>
                  <span className="text-zinc-500">Fatura adresi</span>
                  <p className="mt-0.5 leading-relaxed text-zinc-300">{order.billingAddress}</p>
                </div>
              </li>
            </ul>
          </Card>

          <Card title="Ödeme & İade" icon={CreditCard}>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between gap-2">
                <span className="text-zinc-500">Ödeme durumu</span>
                <Badge className={PAYMENT_BADGE[order.payment]}>{order.payment}</Badge>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-zinc-500">İşlem referansı</span>
                <span className="font-mono text-xs text-zinc-300">{order.transactionRef}</span>
              </li>
              <li className="flex justify-between gap-2 border-t border-white/[0.06] pt-2">
                <span className="text-zinc-500">Tahsil edilen</span>
                <span className="font-semibold tabular-nums text-zinc-100">{tryFmt(order.paidAmount)}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-zinc-500">Refund edilen</span>
                <span className="font-semibold tabular-nums text-rose-300/90">{tryFmt(order.refundedAmount)}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-zinc-500">Kalan tutar</span>
                <span className="font-semibold tabular-nums text-zinc-100">{tryFmt(order.remainingAmount)}</span>
              </li>
              {order.refundReason && (
                <li className="rounded-lg border border-rose-500/20 bg-rose-500/[0.06] px-3 py-2">
                  <span className="text-[11px] font-medium uppercase text-rose-300/80">Refund nedeni</span>
                  <p className="mt-1 text-sm text-zinc-300">{order.refundReason}</p>
                </li>
              )}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-100 transition-colors hover:bg-rose-500/18"
              >
                Refund Başlat
              </button>
              <button
                type="button"
                className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-100 transition-colors hover:bg-amber-500/18"
              >
                Kısmi Refund
              </button>
              <button
                type="button"
                className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.08]"
              >
                Ödeme Geçmişi
              </button>
            </div>
          </Card>

          <Card title="Teslimat" icon={Truck}>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between gap-2">
                <span className="text-zinc-500">Durum</span>
                <Badge className={DELIVERY_BADGE[order.delivery]}>{order.delivery}</Badge>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-zinc-500">Kargo firması</span>
                <span className="text-zinc-200">{order.carrier}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-zinc-500">Takip no</span>
                <span className="font-mono text-xs text-zinc-300">{order.trackingNo}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-zinc-500">Tahmini teslimat</span>
                <span className="text-zinc-300">{order.estimatedDelivery}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-zinc-500">Teslim problemi</span>
                <span className={order.deliveryProblem ? "text-rose-300" : "text-emerald-400/90"}>
                  {order.deliveryProblem ? "Evet" : "Hayır"}
                </span>
              </li>
            </ul>
            <button
              type="button"
              className="mt-4 w-full rounded-xl border border-white/[0.1] bg-white/[0.04] py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:border-[#c69575]/30 hover:bg-[#c69575]/10 hover:text-[#f0dcc8]"
            >
              <Route className="mr-2 inline h-4 w-4" strokeWidth={1.5} />
              Takibi Gör
            </button>
          </Card>

          <Card title="Risk & inceleme" icon={ShieldAlert}>
            {riskClean ? (
              <AdminEmptyState
                message="Şu an kritik risk sinyali bulunmuyor"
                hint="Otomatik ve manuel inceleme için bekleyen işaret yok."
                variant="shield"
                size="compact"
              />
            ) : (
              <ul className="space-y-3 text-sm">
                <li className="flex items-center justify-between gap-2">
                  <span className="text-zinc-500">Fraud bayrağı</span>
                  <span className={order.fraudFlag ? "text-rose-300" : "text-emerald-400/90"}>
                    {order.fraudFlag ? "Aktif" : "Yok"}
                  </span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="text-zinc-500">Dispute ihtimali</span>
                  <span className={order.disputeLikelihood ? "text-amber-200" : "text-zinc-400"}>
                    {order.disputeLikelihood ? "Yüksek" : "Düşük"}
                  </span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="text-zinc-500">Yüksek iade riski</span>
                  <span className={order.highRefundRisk ? "text-amber-200" : "text-zinc-400"}>
                    {order.highRefundRisk ? "Evet" : "Hayır"}
                  </span>
                </li>
                {order.manualReviewNote && (
                  <li className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-xs leading-relaxed text-zinc-300">
                    <span className="font-semibold text-amber-200/90">Manuel inceleme: </span>
                    {order.manualReviewNote}
                  </li>
                )}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {/* Bottom tabs */}
      <section className="rounded-2xl border border-white/[0.09] bg-[#08090d]/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
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
          {tab === "notes" &&
            (order.tabNotes.length === 0 ? (
              <AdminEmptyState message="Henüz operasyon notu eklenmedi." variant="shield" size="compact" />
            ) : (
              <ul className="space-y-3">
                {order.tabNotes.map((n) => (
                  <li key={n.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm">
                    <p className="text-xs text-zinc-500">
                      {dateFmt(n.at)} · {n.author}
                    </p>
                    <p className="mt-1 text-zinc-300">{n.text}</p>
                  </li>
                ))}
              </ul>
            ))}

          {tab === "refunds" &&
            (order.tabRefunds.length === 0 ? (
              <AdminEmptyState message="İade / refund kaydı bulunmuyor." variant="shield" size="compact" />
            ) : (
              <AdminDataScroll>
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="text-[11px] font-semibold uppercase text-zinc-500">
                      <th className={`px-3 py-2 ${ADMIN_TABLE_TH_STICKY}`}>Tarih</th>
                      <th className={`px-3 py-2 tabular-nums ${ADMIN_TABLE_TH_STICKY}`}>Tutar</th>
                      <th className={`px-3 py-2 ${ADMIN_TABLE_TH_STICKY}`}>Neden</th>
                      <th className={`px-3 py-2 ${ADMIN_TABLE_TH_STICKY}`}>Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {order.tabRefunds.map((r) => (
                      <tr key={r.id}>
                        <td className="px-3 py-2 text-zinc-400">{dateFmt(r.at)}</td>
                        <td className="px-3 py-2 tabular-nums text-zinc-200">{tryFmt(r.amount)}</td>
                        <td className="px-3 py-2 text-zinc-400">{r.reason}</td>
                        <td className="px-3 py-2 text-zinc-500">{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AdminDataScroll>
            ))}

          {tab === "payments" &&
            (order.tabPaymentEvents.length === 0 ? (
              <AdminEmptyState message="Ödeme olayı kaydı yok." variant="shield" size="compact" />
            ) : (
              <ul className="space-y-2">
                {order.tabPaymentEvents.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm"
                  >
                    <span className="text-zinc-500">{dateFmt(p.at)}</span>
                    <span className="font-medium text-zinc-200">{p.type}</span>
                    <span className="tabular-nums text-zinc-100">{tryFmt(p.amount)}</span>
                    <span className="font-mono text-xs text-zinc-500">{p.ref}</span>
                  </li>
                ))}
              </ul>
            ))}

          {tab === "messages" &&
            (order.tabMessages.length === 0 ? (
              <AdminEmptyState message="Müşteri mesajı bulunmuyor." variant="shield" size="compact" />
            ) : (
              <ul className="space-y-3">
                {order.tabMessages.map((m) => (
                  <li key={m.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                    <p className="text-xs text-zinc-500">
                      {dateFmt(m.at)} · {m.from}
                    </p>
                    <p className="mt-1 text-sm text-zinc-300">{m.preview}</p>
                  </li>
                ))}
              </ul>
            ))}
        </div>
      </section>
    </div>
  );
}

