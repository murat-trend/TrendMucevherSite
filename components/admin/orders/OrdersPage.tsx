"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ADMIN_PRIMARY_BUTTON_CLASS } from "@/components/admin/ui/adminPrimaryButton";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminDataScroll, ADMIN_TABLE_TH_STICKY } from "@/components/admin/ui/AdminDataScroll";
import { AdminKpiCard, type AdminKpiTone } from "@/components/admin/ui/AdminKpiCard";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  FileBarChart,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
  ShoppingCart,
  Truck,
} from "lucide-react";

const tryFmt = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);

const dateFmt = (iso: string) =>
  new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );

export type OrderStatus = "Bekleyen" | "Hazırlanıyor" | "Kargoda" | "Tamamlandı" | "İptal" | "İade";
export type PaymentStatus = "Ödendi" | "Bekliyor" | "İade Edildi";
export type DeliveryStatus = "Hazırlanıyor" | "Kargoda" | "Teslim Edildi" | "Problemli";

export type OrderRow = {
  id: string;
  orderNo: string;
  date: string;
  customer: string;
  seller: string;
  amount: number;
  payment: PaymentStatus;
  delivery: DeliveryStatus;
  status: OrderStatus;
  risk: boolean;
};

const INITIAL_ORDERS: OrderRow[] = [
  {
    id: "o1",
    orderNo: "TM-2025-90421",
    date: "2025-03-14T11:20:00",
    customer: "Ece Yıldız",
    seller: "Atölye Mara",
    amount: 24_800,
    payment: "Ödendi",
    delivery: "Kargoda",
    status: "Kargoda",
    risk: false,
  },
  {
    id: "o2",
    orderNo: "TM-2025-90418",
    date: "2025-03-14T09:05:00",
    customer: "Murat Kılıç",
    seller: "Pırlanta Loft",
    amount: 62_400,
    payment: "Ödendi",
    delivery: "Teslim Edildi",
    status: "Tamamlandı",
    risk: false,
  },
  {
    id: "o3",
    orderNo: "TM-2025-90412",
    date: "2025-03-13T16:40:00",
    customer: "Selin Aydın",
    seller: "Vintage Koleksiyon",
    amount: 18_200,
    payment: "Bekliyor",
    delivery: "Hazırlanıyor",
    status: "Bekleyen",
    risk: true,
  },
  {
    id: "o4",
    orderNo: "TM-2025-90408",
    date: "2025-03-13T14:22:00",
    customer: "Can Öztürk",
    seller: "Osmanlı Hat Sanatı",
    amount: 128_000,
    payment: "Ödendi",
    delivery: "Problemli",
    status: "Kargoda",
    risk: true,
  },
  {
    id: "o5",
    orderNo: "TM-2025-90399",
    date: "2025-03-12T10:15:00",
    customer: "Deniz Arslan",
    seller: "Luna İnci Atölyesi",
    amount: 9_450,
    payment: "Ödendi",
    delivery: "Hazırlanıyor",
    status: "Hazırlanıyor",
    risk: false,
  },
  {
    id: "o6",
    orderNo: "TM-2025-90388",
    date: "2025-03-11T18:30:00",
    customer: "Burak Şen",
    seller: "Minimal Altın",
    amount: 42_100,
    payment: "İade Edildi",
    delivery: "Teslim Edildi",
    status: "İade",
    risk: false,
  },
  {
    id: "o7",
    orderNo: "TM-2025-90371",
    date: "2025-03-10T12:00:00",
    customer: "Ayşe Demir",
    seller: "Elmas Evi İstanbul",
    amount: 33_900,
    payment: "Ödendi",
    delivery: "Kargoda",
    status: "Kargoda",
    risk: false,
  },
  {
    id: "o8",
    orderNo: "TM-2025-90365",
    date: "2025-03-09T08:45:00",
    customer: "Kerem Polat",
    seller: "Gümüş İşleri Co.",
    amount: 7_200,
    payment: "Ödendi",
    delivery: "Teslim Edildi",
    status: "Tamamlandı",
    risk: false,
  },
  {
    id: "o9",
    orderNo: "TM-2025-90350",
    date: "2025-03-08T15:10:00",
    customer: "Zeynep Koç",
    seller: "Atölye Mara",
    amount: 56_000,
    payment: "Ödendi",
    delivery: "Teslim Edildi",
    status: "İptal",
    risk: false,
  },
  {
    id: "o10",
    orderNo: "TM-2025-90341",
    date: "2025-03-07T11:28:00",
    customer: "Hakan Yılmaz",
    seller: "Pırlanta Loft",
    amount: 91_750,
    payment: "Bekliyor",
    delivery: "Hazırlanıyor",
    status: "Bekleyen",
    risk: false,
  },
  {
    id: "o11",
    orderNo: "TM-2025-90322",
    date: "2025-03-06T09:50:00",
    customer: "Merve Çelik",
    seller: "Vintage Koleksiyon",
    amount: 14_300,
    payment: "Ödendi",
    delivery: "Teslim Edildi",
    status: "Tamamlandı",
    risk: false,
  },
  {
    id: "o12",
    orderNo: "TM-2025-90310",
    date: "2025-03-05T13:05:00",
    customer: "Onur Taş",
    seller: "Luna İnci Atölyesi",
    amount: 22_600,
    payment: "Ödendi",
    delivery: "Problemli",
    status: "Kargoda",
    risk: true,
  },
];

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

const DISTRIBUTION_BAR: Record<OrderStatus, string> = {
  Bekleyen: "bg-amber-500/80",
  Hazırlanıyor: "bg-sky-500/80",
  Kargoda: "bg-violet-500/80",
  Tamamlandı: "bg-emerald-500/80",
  İptal: "bg-zinc-500/75",
  İade: "bg-rose-500/80",
};

const OPERATION_ALERTS: { id: string; title: string; detail: string }[] = [
  { id: "a1", title: "Geciken gönderiler", detail: "3 sipariş SLA aşımına yaklaşıyor (kargo henüz teslim edilmedi)." },
  { id: "a2", title: "İade bekleyen siparişler", detail: "2 sipariş için satıcı onayı veya inceleme bekleniyor." },
  { id: "a3", title: "Teslimat problemi", detail: "1 sipariş kurye geri dönüşü nedeniyle operasyon ekibinde." },
  { id: "a4", title: "Şüpheli sipariş", detail: "Yüksek tutar + yeni müşteri profili — risk skoru yükseldi." },
];

type StatusFilter = "Tümü" | OrderStatus;
type SortKey = "newest" | "amount" | "risk";

function CardShell({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#10121a]/95 via-[#0a0b0f] to-[#060708] p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] sm:p-6 ${className}`}
    >
      <div className="mb-4 border-b border-white/[0.06] pb-4">
        <h2 className="font-display text-lg font-semibold tracking-tight text-zinc-100">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Badge({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${className}`}>{children}</span>
  );
}

export function OrdersPage() {
  const searchParams = useSearchParams();
  const [orders] = useState<OrderRow[]>(INITIAL_ORDERS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Tümü");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sellerFilter, setSellerFilter] = useState("Tümü");
  const [sort, setSort] = useState<SortKey>("newest");

  useEffect(() => {
    if (searchParams.get("status") === "pending") {
      setStatusFilter("Bekleyen");
    }
  }, [searchParams]);

  const sellers = useMemo(() => {
    const u = new Set(orders.map((o) => o.seller));
    return ["Tümü", ...Array.from(u).sort()];
  }, [orders]);

  const kpi = useMemo(() => {
    const total = orders.length;
    const bekleyen = orders.filter((o) => o.status === "Bekleyen").length;
    const hazir = orders.filter((o) => o.status === "Hazırlanıyor").length;
    const kargo = orders.filter((o) => o.status === "Kargoda").length;
    const tamam = orders.filter((o) => o.status === "Tamamlandı").length;
    const iade = orders.filter((o) => o.status === "İade").length;
    const iptal = orders.filter((o) => o.status === "İptal").length;
    return { total, bekleyen, hazir, kargo, tamam, iade, iptal };
  }, [orders]);

  const distribution = useMemo(() => {
    const keys: OrderStatus[] = ["Bekleyen", "Hazırlanıyor", "Kargoda", "Tamamlandı", "İptal", "İade"];
    const counts = keys.map((s) => orders.filter((o) => o.status === s).length);
    return keys.map((s, i) => ({
      label: s,
      count: counts[i],
    }));
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = orders.filter((o) => {
      const match =
        !q ||
        o.orderNo.toLowerCase().includes(q) ||
        o.customer.toLowerCase().includes(q) ||
        o.seller.toLowerCase().includes(q);
      const st = statusFilter === "Tümü" || o.status === statusFilter;
      const sell = sellerFilter === "Tümü" || o.seller === sellerFilter;
      const d = new Date(o.date);
      const fromOk = !dateFrom || d >= new Date(dateFrom + "T00:00:00");
      const toOk = !dateTo || d <= new Date(dateTo + "T23:59:59");
      return match && st && sell && fromOk && toOk;
    });
    list = [...list].sort((a, b) => {
      if (sort === "newest") return b.date.localeCompare(a.date);
      if (sort === "amount") return b.amount - a.amount;
      if (sort === "risk") {
        if (a.risk !== b.risk) return a.risk ? -1 : 1;
        return b.date.localeCompare(a.date);
      }
      return 0;
    });
    return list;
  }, [orders, search, statusFilter, sellerFilter, dateFrom, dateTo, sort]);

  const kpiCards: { id: string; label: string; value: string; icon: LucideIcon; sub: string; tone: AdminKpiTone }[] = [
    { id: "t", label: "Toplam Sipariş", value: String(kpi.total), icon: ShoppingCart, sub: "Kayıtlı sipariş", tone: "neutral" },
    { id: "b", label: "Bekleyen", value: String(kpi.bekleyen), icon: Clock, sub: "Onay / ödeme", tone: "neutral" },
    { id: "h", label: "Hazırlanıyor", value: String(kpi.hazir), icon: Package, sub: "Atölye", tone: "neutral" },
    { id: "k", label: "Kargoda", value: String(kpi.kargo), icon: Truck, sub: "Yolda", tone: "neutral" },
    { id: "tm", label: "Tamamlandı", value: String(kpi.tamam), icon: CheckCircle2, sub: "Teslim edildi", tone: "neutral" },
    {
      id: "ri",
      label: "İade / İptal",
      value: String(kpi.iade + kpi.iptal),
      icon: RefreshCw,
      sub: `${kpi.iade} iade · ${kpi.iptal} iptal`,
      tone: "negative",
    },
  ];

  return (
    <div className="space-y-6 pb-10 lg:space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-zinc-50">Siparişler</h1>
          <p className="mt-1 text-sm text-zinc-500">Sipariş yönetimi ve operasyon takibi</p>
        </div>
        <button type="button" className={ADMIN_PRIMARY_BUTTON_CLASS}>
          <Download className="h-4 w-4" strokeWidth={1.5} />
          Sipariş Dışa Aktar
        </button>
      </header>

      <section aria-label="Sipariş özeti" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {kpiCards.map((k) => (
          <AdminKpiCard key={k.id} label={k.label} value={k.value} sub={k.sub} icon={k.icon} tone={k.tone} />
        ))}
      </section>

      <section
        aria-label="Filtreler"
        className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#12141a]/90 via-[#0c0d11] to-[#08090c] p-4 sm:p-5"
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end">
          <div className="relative lg:col-span-4">
            <label htmlFor="order-search" className="sr-only">
              Ara
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" strokeWidth={1.5} />
            <input
              id="order-search"
              type="search"
              placeholder="Sipariş no, müşteri veya satıcı..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-[#07080a] py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none ring-[#c69575]/30 focus:border-[#c69575]/30 focus:ring-2"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-4">
            <div>
              <label htmlFor="order-status" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Durum
              </label>
              <select
                id="order-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full cursor-pointer rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2.5 text-sm text-zinc-200 outline-none ring-[#c69575]/30 focus:border-[#c69575]/30 focus:ring-2"
              >
                <option value="Tümü">Tümü</option>
                <option value="Bekleyen">Bekleyen</option>
                <option value="Hazırlanıyor">Hazırlanıyor</option>
                <option value="Kargoda">Kargoda</option>
                <option value="Tamamlandı">Tamamlandı</option>
                <option value="İptal">İptal</option>
                <option value="İade">İade</option>
              </select>
            </div>
            <div>
              <label htmlFor="order-from" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Başlangıç
              </label>
              <input
                id="order-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2.5 text-sm text-zinc-200 outline-none ring-[#c69575]/30 focus:border-[#c69575]/30 focus:ring-2"
              />
            </div>
            <div>
              <label htmlFor="order-to" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Bitiş
              </label>
              <input
                id="order-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2.5 text-sm text-zinc-200 outline-none ring-[#c69575]/30 focus:border-[#c69575]/30 focus:ring-2"
              />
            </div>
            <div>
              <label htmlFor="order-seller" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Satıcı
              </label>
              <select
                id="order-seller"
                value={sellerFilter}
                onChange={(e) => setSellerFilter(e.target.value)}
                className="w-full cursor-pointer rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2.5 text-sm text-zinc-200 outline-none ring-[#c69575]/30 focus:border-[#c69575]/30 focus:ring-2"
              >
                {sellers.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="mt-4 max-w-xs">
          <label htmlFor="order-sort" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            Sırala
          </label>
          <select
            id="order-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="w-full cursor-pointer rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2.5 text-sm text-zinc-200 outline-none ring-[#c69575]/30 focus:border-[#c69575]/30 focus:ring-2"
          >
            <option value="newest">En yeni</option>
            <option value="amount">En yüksek tutar</option>
            <option value="risk">Riskli siparişler</option>
          </select>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <CardShell title="Sipariş Listesi">
            {orders.length === 0 ? (
              <AdminEmptyState
                message="Henüz sipariş bulunmuyor"
                hint="Yeni siparişler geldiğinde burada listelenecek."
                variant="shield"
              />
            ) : filtered.length === 0 ? (
              <AdminEmptyState
                message="Sonuç bulunamadı"
                hint="Filtreleri veya tarih aralığını güncelleyin."
                variant="warning"
              />
            ) : (
              <AdminDataScroll>
                <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      <th className={`px-3 py-3 font-medium ${ADMIN_TABLE_TH_STICKY}`}>Sipariş No</th>
                      <th className={`px-3 py-3 font-medium ${ADMIN_TABLE_TH_STICKY}`}>Tarih</th>
                      <th className={`px-3 py-3 font-medium ${ADMIN_TABLE_TH_STICKY}`}>Müşteri</th>
                      <th className={`px-3 py-3 font-medium ${ADMIN_TABLE_TH_STICKY}`}>Satıcı</th>
                      <th className={`px-3 py-3 font-medium tabular-nums ${ADMIN_TABLE_TH_STICKY}`}>Tutar</th>
                      <th className={`px-3 py-3 font-medium ${ADMIN_TABLE_TH_STICKY}`}>Ödeme</th>
                      <th className={`px-3 py-3 font-medium ${ADMIN_TABLE_TH_STICKY}`}>Teslimat</th>
                      <th className={`px-3 py-3 font-medium ${ADMIN_TABLE_TH_STICKY}`}>Durum</th>
                      <th className={`px-3 py-3 text-right font-medium ${ADMIN_TABLE_TH_STICKY}`}>Aksiyon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {filtered.map((row) => (
                      <tr key={row.id} className="hover:bg-white/[0.02]">
                        <td className="px-3 py-3 font-mono text-xs text-zinc-300">{row.orderNo}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-zinc-400">{dateFmt(row.date)}</td>
                        <td className="px-3 py-3 text-zinc-200">{row.customer}</td>
                        <td className="px-3 py-3 text-zinc-400">{row.seller}</td>
                        <td className="px-3 py-3 font-medium tabular-nums text-zinc-100">{tryFmt(row.amount)}</td>
                        <td className="px-3 py-3">
                          <Badge className={PAYMENT_BADGE[row.payment]}>{row.payment}</Badge>
                        </td>
                        <td className="px-3 py-3">
                          <Badge className={DELIVERY_BADGE[row.delivery]}>{row.delivery}</Badge>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge className={STATUS_BADGE[row.status]}>{row.status}</Badge>
                            {row.risk && (
                              <span className="inline-flex items-center rounded border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-200">
                                Risk
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <Link
                              href={`/admin/orders/${row.id}`}
                              className="inline-flex items-center rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-[#c69575]/25 hover:bg-[#c69575]/10 hover:text-[#f0dcc8]"
                            >
                              Görüntüle
                            </Link>
                            <button
                              type="button"
                              className="rounded-lg border border-sky-500/25 bg-sky-500/10 px-2 py-1.5 text-xs font-medium text-sky-200 transition-colors hover:bg-sky-500/18"
                            >
                              Durumu Güncelle
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-1.5 text-xs font-medium text-amber-100 transition-colors hover:bg-amber-500/18"
                            >
                              İade İncele
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AdminDataScroll>
            )}
          </CardShell>
        </div>

        <div className="xl:col-span-4">
          <CardShell title="Operasyon Uyarıları">
            {OPERATION_ALERTS.length === 0 ? (
              <AdminEmptyState
                message="Şu an kritik operasyon uyarısı yok"
                hint="Gecikme, iade veya teslimat uyarısı bulunmuyor."
                variant="shield"
                size="compact"
              />
            ) : (
              <ul className="space-y-3">
                {OPERATION_ALERTS.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-sm"
                  >
                    <div className="flex gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/90" strokeWidth={1.5} />
                      <div>
                        <p className="font-medium text-zinc-100">{a.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-zinc-500">{a.detail}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardShell>
        </div>
      </div>

      <CardShell title="Sipariş Durumu Dağılımı">
        {orders.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">Gösterilecek veri yok.</p>
        ) : (
          <ul className="space-y-3">
            {(() => {
              const maxCount = Math.max(...distribution.map((x) => x.count), 1);
              return distribution.map((d) => {
                const w = Math.round((d.count / maxCount) * 100);
                return (
                <li key={d.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-400">{d.label}</span>
                    <span className="tabular-nums text-zinc-300">{d.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={`h-full rounded-full transition-all ${DISTRIBUTION_BAR[d.label as OrderStatus]}`}
                      style={{ width: `${w}%` }}
                    />
                  </div>
                </li>
                );
              });
            })()}
          </ul>
        )}
      </CardShell>

      <CardShell title="Hızlı İşlemler">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/admin/finance"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-[#c69575]/30 hover:bg-[#c69575]/10 hover:text-[#f0dcc8]"
          >
            <RefreshCw className="h-4 w-4 text-[#b8956f]" strokeWidth={1.5} />
            İadeleri Gör
          </Link>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-[#c69575]/30 hover:bg-[#c69575]/10 hover:text-[#f0dcc8]"
          >
            <Truck className="h-4 w-4 text-[#b8956f]" strokeWidth={1.5} />
            Kargoyu Yönet
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-[#c69575]/30 hover:bg-[#c69575]/10 hover:text-[#f0dcc8]"
            onClick={() => {
              setSort("risk");
            }}
          >
            <ShieldAlert className="h-4 w-4 text-[#b8956f]" strokeWidth={1.5} />
            Riskli Siparişler
          </button>
          <Link
            href="/admin/reports"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-[#c69575]/30 hover:bg-[#c69575]/10 hover:text-[#f0dcc8]"
          >
            <FileBarChart className="h-4 w-4 text-[#b8956f]" strokeWidth={1.5} />
            Sipariş Raporu
          </Link>
        </div>
      </CardShell>
    </div>
  );
}
