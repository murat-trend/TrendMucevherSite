"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ADMIN_PRIMARY_BUTTON_CLASS } from "@/components/admin/ui/adminPrimaryButton";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminDataScroll, ADMIN_TABLE_TH_STICKY } from "@/components/admin/ui/AdminDataScroll";
import { AdminKpiCard, type AdminKpiTone } from "@/components/admin/ui/AdminKpiCard";
import {
  AlertTriangle,
  Ban,
  ClipboardCheck,
  Eye,
  FileWarning,
  Layers,
  Package,
  Search,
  ShieldAlert,
  Tag,
  TrendingUp,
} from "lucide-react";

const tryFmt = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);

const dateFmt = (iso: string) =>
  new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));

export type ProductModerationStatus =
  | "Onay Bekliyor"
  | "Yayında"
  | "Reddedildi"
  | "Taslak"
  | "İnceleme Gerekiyor";

export type RiskLevel = "Düşük" | "Orta" | "Yüksek";

export type ProductRow = {
  id: string;
  name: string;
  sku: string;
  seller: string;
  category: string;
  price: number;
  stock: number;
  status: ProductModerationStatus;
  risk: RiskLevel;
  date: string;
  updatedAt: string;
  sales30d: number;
};

const INITIAL_PRODUCTS: ProductRow[] = [
  {
    id: "p1",
    name: "Elmas Yüzük — Aurora",
    sku: "TM-YZ-90421",
    seller: "Atölye Mara",
    category: "Yüzük",
    price: 24_800,
    stock: 6,
    status: "Onay Bekliyor",
    risk: "Orta",
    date: "2025-03-14",
    updatedAt: "2025-03-14T10:00:00",
    sales30d: 0,
  },
  {
    id: "p2",
    name: "İnci Kolye — Luna",
    sku: "TM-KL-88201",
    seller: "Luna İnci Atölyesi",
    category: "Kolye",
    price: 9_200,
    stock: 42,
    status: "Yayında",
    risk: "Düşük",
    date: "2025-02-20",
    updatedAt: "2025-03-12T09:30:00",
    sales30d: 38,
  },
  {
    id: "p3",
    name: "Hat Sanatı Madalyon",
    sku: "TM-MD-77102",
    seller: "Osmanlı Hat Sanatı",
    category: "Madalyon",
    price: 18_500,
    stock: 3,
    status: "Yayında",
    risk: "Yüksek",
    date: "2025-01-10",
    updatedAt: "2025-03-13T14:00:00",
    sales30d: 12,
  },
  {
    id: "p4",
    name: "Minimal Altın Bilezik",
    sku: "TM-BL-66009",
    seller: "Minimal Altın",
    category: "Bilezik",
    price: 44_000,
    stock: 0,
    status: "Yayında",
    risk: "Yüksek",
    date: "2024-12-05",
    updatedAt: "2025-03-11T11:20:00",
    sales30d: 21,
  },
  {
    id: "p5",
    name: "Pırlanta Küpe — Solstice",
    sku: "TM-KP-55188",
    seller: "Pırlanta Loft",
    category: "Küpe",
    price: 32_400,
    stock: 8,
    status: "Reddedildi",
    risk: "Orta",
    date: "2025-03-08",
    updatedAt: "2025-03-09T16:00:00",
    sales30d: 0,
  },
  {
    id: "p6",
    name: "Vintage Gümüş Set",
    sku: "TM-SET-44001",
    seller: "Vintage Koleksiyon",
    category: "Set",
    price: 11_900,
    stock: 15,
    status: "Taslak",
    risk: "Düşük",
    date: "2025-03-13",
    updatedAt: "2025-03-13T18:00:00",
    sales30d: 0,
  },
  {
    id: "p7",
    name: "Rose Gold Yüzük",
    sku: "TM-YZ-33210",
    seller: "Atölye Mara",
    category: "Yüzük",
    price: 19_200,
    stock: 22,
    status: "İnceleme Gerekiyor",
    risk: "Yüksek",
    date: "2025-03-12",
    updatedAt: "2025-03-14T08:15:00",
    sales30d: 2,
  },
  {
    id: "p8",
    name: "Gümüş Zincir Kolye",
    sku: "TM-KL-22100",
    seller: "Gümüş İşleri Co.",
    category: "Kolye",
    price: 3_450,
    stock: 120,
    status: "Yayında",
    risk: "Düşük",
    date: "2024-11-01",
    updatedAt: "2025-03-01T12:00:00",
    sales30d: 64,
  },
  {
    id: "p9",
    name: "Test Ürünü (kopya)",
    sku: "TM-DUP-11002",
    seller: "Pırlanta Loft",
    category: "Yüzük",
    price: 24_800,
    stock: 4,
    status: "İnceleme Gerekiyor",
    risk: "Orta",
    date: "2025-03-11",
    updatedAt: "2025-03-13T17:45:00",
    sales30d: 0,
  },
  {
    id: "p10",
    name: "Elmas Kanal Yüzük",
    sku: "TM-YZ-99102",
    seller: "Elmas Evi İstanbul",
    category: "Yüzük",
    price: 86_000,
    stock: 2,
    status: "Onay Bekliyor",
    risk: "Yüksek",
    date: "2025-03-14",
    updatedAt: "2025-03-14T13:00:00",
    sales30d: 0,
  },
];

const STATUS_BADGE: Record<ProductModerationStatus, string> = {
  "Onay Bekliyor": "border-amber-500/40 bg-amber-500/12 text-amber-200",
  Yayında: "border-emerald-500/35 bg-emerald-500/12 text-emerald-200",
  Reddedildi: "border-rose-500/35 bg-rose-500/12 text-rose-200",
  Taslak: "border-zinc-500/40 bg-zinc-500/10 text-zinc-400",
  "İnceleme Gerekiyor": "border-orange-500/40 bg-orange-500/12 text-orange-200",
};

const RISK_BADGE: Record<RiskLevel, string> = {
  Düşük: "border-sky-500/35 bg-sky-500/10 text-sky-200",
  Orta: "border-amber-500/35 bg-amber-500/10 text-amber-200",
  Yüksek: "border-rose-500/40 bg-rose-500/15 text-rose-200",
};

const DISTRIBUTION_BAR: Record<ProductModerationStatus, string> = {
  "Onay Bekliyor": "bg-amber-500/80",
  Yayında: "bg-emerald-500/80",
  Reddedildi: "bg-rose-500/80",
  Taslak: "bg-zinc-500/75",
  "İnceleme Gerekiyor": "bg-orange-500/80",
};

const MODERATION_ALERTS: { id: string; title: string; detail: string }[] = [
  { id: "a1", title: "Kategorisi eksik ürün", detail: "2 ürün için birincil kategori atanmadı; yayın öncesi zorunlu." },
  { id: "a2", title: "Eksik görsel", detail: "5 üründe minimum 3 görsel kuralı sağlanmıyor." },
  { id: "a3", title: "Düşük stok ama yayında", detail: "4 ürün stok ≤2 iken canlı; otomatik uyarı gönderildi." },
  { id: "a4", title: "Şüpheli açıklama", detail: "1 üründe marka ihlali anahtar kelimesi tespit edildi." },
  { id: "a5", title: "Yinelenen ürün riski", detail: "SKU ve görsel hash eşleşmesi — inceleme kuyruğunda." },
];

type StatusFilter = "Tümü" | ProductModerationStatus;
type SortKey = "newest" | "sales" | "risk" | "updated";

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

const RISK_ORDER: Record<RiskLevel, number> = { Yüksek: 0, Orta: 1, Düşük: 2 };

/** Dashboard “Kritik stok” KPI ile aynı eşik (`/admin/products?filter=low-stock`). */
const LOW_STOCK_FILTER_THRESHOLD = 10;

export function ProductsModerationPage() {
  const searchParams = useSearchParams();
  const lowStockOnly = searchParams.get("filter") === "low-stock";
  const [products, setProducts] = useState<ProductRow[]>(INITIAL_PRODUCTS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Tümü");
  const [categoryFilter, setCategoryFilter] = useState("Tümü");
  const [sellerFilter, setSellerFilter] = useState("Tümü");
  const [sort, setSort] = useState<SortKey>("newest");

  const categories = useMemo(() => {
    const u = new Set(products.map((p) => p.category));
    return ["Tümü", ...Array.from(u).sort()];
  }, [products]);

  const sellers = useMemo(() => {
    const u = new Set(products.map((p) => p.seller));
    return ["Tümü", ...Array.from(u).sort()];
  }, [products]);

  const kpi = useMemo(() => {
    const total = products.length;
    const pending = products.filter((p) => p.status === "Onay Bekliyor").length;
    const live = products.filter((p) => p.status === "Yayında").length;
    const rejected = products.filter((p) => p.status === "Reddedildi").length;
    const review = products.filter((p) => p.status === "İnceleme Gerekiyor").length;
    const risky = products.filter((p) => p.risk === "Yüksek").length;
    return { total, pending, live, rejected, review, risky };
  }, [products]);

  const distribution = useMemo(() => {
    const keys: ProductModerationStatus[] = [
      "Onay Bekliyor",
      "Yayında",
      "Reddedildi",
      "Taslak",
      "İnceleme Gerekiyor",
    ];
    const counts = keys.map((s) => products.filter((p) => p.status === s).length);
    return keys.map((label, i) => ({ label, count: counts[i] }));
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = products.filter((p) => {
      const match =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.seller.toLowerCase().includes(q);
      const st = statusFilter === "Tümü" || p.status === statusFilter;
      const cat = categoryFilter === "Tümü" || p.category === categoryFilter;
      const sel = sellerFilter === "Tümü" || p.seller === sellerFilter;
      const stockOk = !lowStockOnly || p.stock < LOW_STOCK_FILTER_THRESHOLD;
      return match && st && cat && sel && stockOk;
    });
    list = [...list].sort((a, b) => {
      if (sort === "newest") return b.date.localeCompare(a.date);
      if (sort === "sales") return b.sales30d - a.sales30d;
      if (sort === "risk") return RISK_ORDER[a.risk] - RISK_ORDER[b.risk];
      if (sort === "updated") return b.updatedAt.localeCompare(a.updatedAt);
      return 0;
    });
    return list;
  }, [products, search, statusFilter, categoryFilter, sellerFilter, sort, lowStockOnly]);

  const updateProduct = useCallback((id: string, patch: Partial<ProductRow>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const kpiCards: { id: string; label: string; value: string; icon: LucideIcon; sub: string; tone: AdminKpiTone }[] = [
    { id: "t", label: "Toplam Ürün", value: String(kpi.total), icon: Package, sub: "Kayıtlı SKU", tone: "neutral" },
    { id: "p", label: "Onay Bekleyen", value: String(kpi.pending), icon: ClipboardCheck, sub: "Kuyruk", tone: "neutral" },
    { id: "y", label: "Yayında", value: String(kpi.live), icon: TrendingUp, sub: "Canlı", tone: "neutral" },
    { id: "r", label: "Reddedilen", value: String(kpi.rejected), icon: Ban, sub: "Arşiv", tone: "negative" },
    { id: "rv", label: "İnceleme Gereken", value: String(kpi.review), icon: FileWarning, sub: "Öncelikli", tone: "neutral" },
    { id: "rk", label: "Riskli Ürünler", value: String(kpi.risky), icon: ShieldAlert, sub: "Yüksek risk", tone: "negative" },
  ];

  return (
    <div className="space-y-6 pb-10 lg:space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-zinc-50">Ürün Denetimi</h1>
          <p className="mt-1 text-sm text-zinc-500">Satıcı ürünlerini incele, onayla, reddet ve yayına al</p>
        </div>
        <button type="button" className={ADMIN_PRIMARY_BUTTON_CLASS}>
          <Layers className="h-4 w-4" strokeWidth={1.5} />
          İnceleme Kuralları
        </button>
      </header>

      <section aria-label="Özet" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
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
            <label htmlFor="prod-search" className="sr-only">
              Ara
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" strokeWidth={1.5} />
            <input
              id="prod-search"
              type="search"
              placeholder="Ürün adı, SKU veya satıcı..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-[#07080a] py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none ring-[#c69575]/30 focus:border-[#c69575]/30 focus:ring-2"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-4">
            <div>
              <label htmlFor="prod-status" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Durum
              </label>
              <select
                id="prod-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full cursor-pointer rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2.5 text-sm text-zinc-200 outline-none ring-[#c69575]/30 focus:border-[#c69575]/30 focus:ring-2"
              >
                <option value="Tümü">Tümü</option>
                <option value="Onay Bekliyor">Onay Bekliyor</option>
                <option value="Yayında">Yayında</option>
                <option value="Reddedildi">Reddedildi</option>
                <option value="Taslak">Taslak</option>
                <option value="İnceleme Gerekiyor">İnceleme Gerekiyor</option>
              </select>
            </div>
            <div>
              <label htmlFor="prod-cat" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Kategori
              </label>
              <select
                id="prod-cat"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full cursor-pointer rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2.5 text-sm text-zinc-200 outline-none ring-[#c69575]/30 focus:border-[#c69575]/30 focus:ring-2"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="prod-seller" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Satıcı
              </label>
              <select
                id="prod-seller"
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
            <div>
              <label htmlFor="prod-sort" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Sırala
              </label>
              <select
                id="prod-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="w-full cursor-pointer rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2.5 text-sm text-zinc-200 outline-none ring-[#c69575]/30 focus:border-[#c69575]/30 focus:ring-2"
              >
                <option value="newest">En yeni</option>
                <option value="sales">En çok satış</option>
                <option value="risk">En riskli</option>
                <option value="updated">Son güncellenen</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <CardShell title="Ürün Listesi">
            {products.length === 0 ? (
              <AdminEmptyState
                message="Henüz ürün kaydı yok"
                hint="Satıcılar ürün ekledikçe burada listelenecek."
                variant="shield"
              />
            ) : filtered.length === 0 ? (
              <AdminEmptyState
                message="Eşleşen ürün bulunamadı"
                hint="Filtreleri veya arama terimini güncelleyin."
                variant="warning"
              />
            ) : (
              <AdminDataScroll>
                <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      <th className={`px-3 py-3 font-medium ${ADMIN_TABLE_TH_STICKY}`}>Ürün</th>
                      <th className={`px-3 py-3 font-medium ${ADMIN_TABLE_TH_STICKY}`}>Satıcı</th>
                      <th className={`px-3 py-3 font-medium ${ADMIN_TABLE_TH_STICKY}`}>Kategori</th>
                      <th className={`px-3 py-3 font-medium tabular-nums ${ADMIN_TABLE_TH_STICKY}`}>Fiyat</th>
                      <th className={`px-3 py-3 font-medium tabular-nums ${ADMIN_TABLE_TH_STICKY}`}>Stok</th>
                      <th className={`px-3 py-3 font-medium ${ADMIN_TABLE_TH_STICKY}`}>Durum</th>
                      <th className={`px-3 py-3 font-medium ${ADMIN_TABLE_TH_STICKY}`}>Risk</th>
                      <th className={`px-3 py-3 font-medium ${ADMIN_TABLE_TH_STICKY}`}>Tarih</th>
                      <th className={`px-3 py-3 text-right font-medium ${ADMIN_TABLE_TH_STICKY}`}>Aksiyon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {filtered.map((row) => (
                      <tr key={row.id} className="hover:bg-white/[0.02]">
                        <td className="px-3 py-3">
                          <div className="max-w-[220px]">
                            <p className="font-medium text-zinc-100">{row.name}</p>
                            <p className="font-mono text-[11px] text-zinc-500">{row.sku}</p>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-zinc-400">{row.seller}</td>
                        <td className="px-3 py-3 text-zinc-400">{row.category}</td>
                        <td className="px-3 py-3 tabular-nums text-zinc-200">{tryFmt(row.price)}</td>
                        <td className="px-3 py-3 tabular-nums text-zinc-300">{row.stock}</td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[row.status]}`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${RISK_BADGE[row.risk]}`}
                          >
                            {row.risk}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-zinc-500">{dateFmt(row.date)}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <Link
                              href={`/admin/products/${row.id}`}
                              className="inline-flex items-center rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-[#c69575]/25 hover:bg-[#c69575]/10 hover:text-[#f0dcc8]"
                            >
                              <Eye className="mr-1 inline h-3.5 w-3.5" strokeWidth={2} />
                              Görüntüle
                            </Link>
                            <button
                              type="button"
                              onClick={() => updateProduct(row.id, { status: "Yayında", risk: "Düşük" })}
                              className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 py-1.5 text-xs font-medium text-emerald-200 transition-colors hover:bg-emerald-500/18"
                            >
                              Onayla
                            </button>
                            <button
                              type="button"
                              onClick={() => updateProduct(row.id, { status: "Reddedildi" })}
                              className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-2 py-1.5 text-xs font-medium text-rose-200 transition-colors hover:bg-rose-500/18"
                            >
                              Reddet
                            </button>
                            <button
                              type="button"
                              onClick={() => updateProduct(row.id, { status: "İnceleme Gerekiyor" })}
                              className="rounded-lg border border-orange-500/25 bg-orange-500/10 px-2 py-1.5 text-xs font-medium text-orange-200 transition-colors hover:bg-orange-500/18"
                            >
                              İncelemeye Al
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
          <CardShell title="Moderasyon Uyarıları">
            {MODERATION_ALERTS.length === 0 ? (
              <AdminEmptyState
                message="Şu an kritik moderasyon uyarısı bulunmuyor"
                hint="Kısıt veya politika ihlali tespit edilmedi."
                variant="shield"
                size="compact"
              />
            ) : (
              <ul className="space-y-3">
                {MODERATION_ALERTS.map((a) => (
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

      <CardShell title="Durum Dağılımı">
        {products.length === 0 ? (
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
                        className={`h-full rounded-full transition-all ${DISTRIBUTION_BAR[d.label]}`}
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
          <button
            type="button"
            onClick={() => {
              setStatusFilter("Onay Bekliyor");
              setSort("newest");
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-[#c69575]/30 hover:bg-[#c69575]/10 hover:text-[#f0dcc8]"
          >
            <ClipboardCheck className="h-4 w-4 text-[#b8956f]" strokeWidth={1.5} />
            Onay Bekleyenleri Gör
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter("Reddedildi");
              setSort("updated");
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-[#c69575]/30 hover:bg-[#c69575]/10 hover:text-[#f0dcc8]"
          >
            <Ban className="h-4 w-4 text-[#b8956f]" strokeWidth={1.5} />
            Reddedilenleri Gör
          </button>
          <button
            type="button"
            onClick={() => {
              setSort("risk");
              setStatusFilter("Tümü");
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-[#c69575]/30 hover:bg-[#c69575]/10 hover:text-[#f0dcc8]"
          >
            <ShieldAlert className="h-4 w-4 text-[#b8956f]" strokeWidth={1.5} />
            Riskli Ürünler
          </button>
          <Link
            href="/admin/commission-settings"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-[#c69575]/30 hover:bg-[#c69575]/10 hover:text-[#f0dcc8]"
          >
            <Tag className="h-4 w-4 text-[#b8956f]" strokeWidth={1.5} />
            Kategori Kuralları
          </Link>
        </div>
      </CardShell>
    </div>
  );
}
