"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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
import {
  getThumbnailViewUrl,
  type Stored3DModel,
  type ThumbnailViewKey,
} from "@/lib/modeller/model-store";
import { createClient } from "@/utils/supabase/client";
import { type DbProduct3D, mapDbProductToUi } from "@/lib/modeller/supabase";

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
type AdminProductsTab = "products" | "models3d";

type Model3DRow = Stored3DModel;
const THUMBNAIL_VIEWS: { key: ThumbnailViewKey; label: string }[] = [
  { key: "on", label: "Ön Görsel" },
  { key: "arka", label: "Arka Görsel" },
  { key: "kenar", label: "Kenar Görsel" },
  { key: "ust", label: "Üst Görsel" },
];

function toModelRow(row: DbProduct3D): Model3DRow {
  const ui = mapDbProductToUi(row);
  return {
    id: ui.id,
    sku: ui.sku,
    name: ui.name,
    slug: ui.slug,
    jewelryType: ui.jewelryType,
    price: ui.price,
    story: ui.story,
    licensePersonalEnabled: (ui.licensePersonalPrice ?? 0) > 0,
    licensePersonalPrice: ui.licensePersonalPrice,
    licenseCommercialEnabled: (ui.licenseCommercialPrice ?? 0) > 0,
    licenseCommercialPrice: ui.licenseCommercialPrice,
    glbUrl: ui.glbUrl,
    stlUrl: ui.stlUrl ?? null,
    thumbnailUrl: ui.thumbnailUrl,
    thumbnailViews: ui.thumbnailViews,
    dimensions: ui.dimensions,
    weight: ui.weight,
    hasGlb: Boolean(ui.glbUrl),
    hasStl: Boolean(ui.stlUrl),
    hasThumbnail: Boolean(ui.thumbnailUrl || ui.thumbnailViews.on || ui.thumbnailViews.arka || ui.thumbnailViews.kenar || ui.thumbnailViews.ust),
    glbFileName: ui.glbUrl ? ui.glbUrl.split("/").pop() ?? null : null,
    stlFileName: ui.stlUrl ? ui.stlUrl.split("/").pop() ?? null : null,
    thumbnailFileName: ui.thumbnailUrl ? ui.thumbnailUrl.split("/").pop() ?? null : null,
    thumbnailViewFileNames: {
      on: ui.thumbnailViews.on ? String(ui.thumbnailViews.on).split("/").pop() ?? null : null,
      arka: ui.thumbnailViews.arka ? String(ui.thumbnailViews.arka).split("/").pop() ?? null : null,
      kenar: ui.thumbnailViews.kenar ? String(ui.thumbnailViews.kenar).split("/").pop() ?? null : null,
      ust: ui.thumbnailViews.ust ? String(ui.thumbnailViews.ust).split("/").pop() ?? null : null,
    },
    isPublished: ui.isPublished,
    publishTargets: {
      modeller: ui.showOnModeller,
      homeFeatured: ui.showOnHome,
      urunler: false,
    },
  };
}

const MODEL_TYPE_CODE = {
  yuzuk: "YZ",
  kolye: "KL",
  bilezik: "BL",
  kupe: "KP",
} as const;

type ModelTypeCode = (typeof MODEL_TYPE_CODE)[keyof typeof MODEL_TYPE_CODE];

const JEWELRY_TYPE_TO_CODE: Record<Model3DRow["jewelryType"], ModelTypeCode> = {
  Yüzük: MODEL_TYPE_CODE.yuzuk,
  Kolye: MODEL_TYPE_CODE.kolye,
  Bilezik: MODEL_TYPE_CODE.bilezik,
  Küpe: MODEL_TYPE_CODE.kupe,
  Pandant: MODEL_TYPE_CODE.kolye,
  Broş: MODEL_TYPE_CODE.kupe,
};

function slugifyTr(input: string): string {
  return input
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function nextSkuOrder(rows: Model3DRow[]): number {
  const max = rows.reduce((acc, row) => {
    const match = row.sku.match(/-(\d{5})$/);
    if (!match) return acc;
    const n = Number(match[1]);
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 0);
  return max + 1;
}

function inferModelTypeCode(name: string, slug: string): ModelTypeCode {
  const s = `${name} ${slug}`.toLocaleLowerCase("tr-TR");
  if (s.includes("kolye")) return MODEL_TYPE_CODE.kolye;
  if (s.includes("bilezik")) return MODEL_TYPE_CODE.bilezik;
  if (s.includes("kupe") || s.includes("küpe")) return MODEL_TYPE_CODE.kupe;
  return MODEL_TYPE_CODE.yuzuk;
}

function build3dSku(typeCode: ModelTypeCode, order: number): string {
  return `TM-3D-${typeCode}-${String(order).padStart(5, "0")}`;
}

const INITIAL_3D_MODELS_BASE = [
  {
    id: "m1",
    name: "Melek Yüzüğü",
    slug: "melek-yuzuk",
    jewelryType: "Yüzük" as const,
    price: 1200,
    story: "Koruyucu melek figürü ile yüksek rölyef yüzük tasarımı.",
    dimensions: { width: 22, height: 28, depth: 12 },
    weight: 8,
    licensePersonalEnabled: true,
    licensePersonalPrice: 1200,
    licenseCommercialEnabled: true,
    licenseCommercialPrice: 2200,
    glbUrl: "/models/melek-yuzuk.glb",
    thumbnailUrl: "/thumbnails/melek-yuzuk.webp",
    hasGlb: true,
    hasStl: true,
    hasThumbnail: true,
    glbFileName: "melek-yuzuk.glb",
    stlFileName: "melek-yuzuk.stl",
    thumbnailFileName: "melek-yuzuk.jpg",
    isPublished: true,
    publishTargets: { modeller: true, homeFeatured: true, urunler: false },
  },
  {
    id: "m2",
    name: "Kurt Başı Yüzük",
    slug: "kurt-yuzuk",
    jewelryType: "Yüzük" as const,
    price: 950,
    story: "Bozkurt temasında güçlü hatlara sahip erkek yüzük modeli.",
    dimensions: { width: 24, height: 26, depth: 14 },
    weight: 10,
    licensePersonalEnabled: true,
    licensePersonalPrice: 950,
    licenseCommercialEnabled: false,
    licenseCommercialPrice: null,
    glbUrl: "/models/kurt-yuzuk.glb",
    thumbnailUrl: "/thumbnails/kurt-yuzuk.webp",
    hasGlb: true,
    hasStl: false,
    hasThumbnail: true,
    glbFileName: "kurt-yuzuk.glb",
    stlFileName: null,
    thumbnailFileName: "kurt-yuzuk.jpg",
    isPublished: false,
    publishTargets: { modeller: true, homeFeatured: true, urunler: false },
  },
  {
    id: "m3",
    name: "Ejderha Kolye",
    slug: "ejderha-kolye",
    jewelryType: "Kolye" as const,
    price: 1500,
    story: "Doğu mitolojisinden esinlenilmiş ejderha figürlü kolye.",
    dimensions: { width: 35, height: 40, depth: 8 },
    weight: 12,
    licensePersonalEnabled: true,
    licensePersonalPrice: 1500,
    licenseCommercialEnabled: true,
    licenseCommercialPrice: 2800,
    glbUrl: "/models/ejderha-kolye.glb",
    thumbnailUrl: "/thumbnails/ejderha-kolye.webp",
    hasGlb: false,
    hasStl: true,
    hasThumbnail: false,
    glbFileName: null,
    stlFileName: "ejderha-kolye.stl",
    thumbnailFileName: null,
    isPublished: false,
    publishTargets: { modeller: true, homeFeatured: true, urunler: false },
  },
  {
    id: "m4",
    name: "Aslan Yüzüğü",
    slug: "aslan-yuzuk",
    jewelryType: "Yüzük" as const,
    price: 1100,
    story: "Aslan başı rölyef detayına sahip klasik signet model.",
    dimensions: { width: 25, height: 28, depth: 13 },
    weight: 9,
    licensePersonalEnabled: true,
    licensePersonalPrice: 1100,
    licenseCommercialEnabled: true,
    licenseCommercialPrice: 2100,
    glbUrl: "/models/aslan-yuzuk.glb",
    thumbnailUrl: "/thumbnails/aslan-yuzuk.webp",
    hasGlb: true,
    hasStl: true,
    hasThumbnail: true,
    glbFileName: "aslan-yuzuk.glb",
    stlFileName: "aslan-yuzuk.stl",
    thumbnailFileName: "aslan-yuzuk.webp",
    isPublished: true,
    publishTargets: { modeller: true, homeFeatured: true, urunler: false },
  },
] as const;

const INITIAL_3D_MODELS: Model3DRow[] = INITIAL_3D_MODELS_BASE.map((row, index) => {
  const typeCode = inferModelTypeCode(row.name, row.slug);
  return {
    ...row,
    sku: build3dSku(typeCode, index + 1),
  };
});

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
  const [activeTab, setActiveTab] = useState<AdminProductsTab>("products");
  const [modelRows, setModelRows] = useState<Model3DRow[]>([]);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [modelForm, setModelForm] = useState({
    name: "",
    jewelryType: "Yüzük" as Model3DRow["jewelryType"],
    price: "",
    width: "",
    height: "",
    depth: "",
    weight: "",
    story: "",
    glbFile: null as File | null,
    stlFile: null as File | null,
    thumbnailFiles: {
      on: null as File | null,
      arka: null as File | null,
      kenar: null as File | null,
      ust: null as File | null,
    },
    publish: false,
    licensePersonalEnabled: true,
    licensePersonalPrice: "",
    licenseCommercialEnabled: false,
    licenseCommercialPrice: "",
    publishTargets: {
      modeller: true,
      homeFeatured: true,
      urunler: false,
    },
  });

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

  const toggleModelPublish = useCallback(async (id: string) => {
    const row = modelRows.find((m) => m.id === id);
    if (!row) return;
    const nextValue = !row.isPublished;
    const supabase = createClient();
    const { error } = await supabase
      .from("products_3d")
      .update({ is_published: nextValue })
      .eq("id", id);
    if (error) {
      window.alert("Yayın durumu güncellenemedi.");
      return;
    }
    setModelRows((prev) => prev.map((m) => (m.id === id ? { ...m, isPublished: nextValue } : m)));
  }, [modelRows]);

  const deleteModelRow = useCallback(async (id: string) => {
    const ok = window.confirm("Bu modeli silmek istediğinize emin misiniz?");
    if (!ok) return;
    const res = await fetch(`/api/admin/products-3d/${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
    if (!res.ok) {
      window.alert(data.error ?? "Model silinemedi.");
      return;
    }
    setModelRows((prev) => prev.filter((m) => m.id !== id));
  }, []);
  useEffect(() => {
    let alive = true;
    const loadModels = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("products_3d").select("*").order("created_at", { ascending: false });
      if (error) {
        console.error("[admin:products] supabase error", error);
        if (alive) setModelRows([]);
        return;
      }
      if (!alive) return;
      setModelRows(((data ?? []) as DbProduct3D[]).map(toModelRow));
    };
    void loadModels();
    return () => {
      alive = false;
    };
  }, []);

  const resetModelForm = useCallback(() => {
    setModelForm({
      name: "",
      jewelryType: "Yüzük",
      price: "",
      width: "",
      height: "",
      depth: "",
      weight: "",
      story: "",
      glbFile: null,
      stlFile: null,
      thumbnailFiles: {
        on: null,
        arka: null,
        kenar: null,
        ust: null,
      },
      publish: false,
      licensePersonalEnabled: true,
      licensePersonalPrice: "",
      licenseCommercialEnabled: false,
      licenseCommercialPrice: "",
      publishTargets: {
        modeller: true,
        homeFeatured: true,
        urunler: false,
      },
    });
  }, []);

  const openCreateModelModal = useCallback(() => {
    setEditingModelId(null);
    resetModelForm();
    setIsModelModalOpen(true);
  }, [resetModelForm]);

  const openEditModelModal = useCallback((row: Model3DRow) => {
    setEditingModelId(row.id);
    setModelForm({
      name: row.name,
      jewelryType: row.jewelryType,
      price: String(row.price),
      width: row.dimensions?.width ? String(row.dimensions.width) : "",
      height: row.dimensions?.height ? String(row.dimensions.height) : "",
      depth: row.dimensions?.depth ? String(row.dimensions.depth) : "",
      weight: row.weight ? String(row.weight) : "",
      story: row.story || "",
      glbFile: null,
      stlFile: null,
      thumbnailFiles: {
        on: null,
        arka: null,
        kenar: null,
        ust: null,
      },
      publish: row.isPublished,
      licensePersonalEnabled: Boolean(row.licensePersonalEnabled),
      licensePersonalPrice: row.licensePersonalPrice ? String(row.licensePersonalPrice) : "",
      licenseCommercialEnabled: Boolean(row.licenseCommercialEnabled),
      licenseCommercialPrice: row.licenseCommercialPrice ? String(row.licenseCommercialPrice) : "",
      publishTargets: row.publishTargets ?? {
        modeller: true,
        homeFeatured: true,
        urunler: false,
      },
    });
    setIsModelModalOpen(true);
  }, []);

  const closeModelModal = useCallback(() => {
    setIsModelModalOpen(false);
    setEditingModelId(null);
    resetModelForm();
  }, [resetModelForm]);

  const handleModelSave = useCallback(async () => {
    const name = modelForm.name.trim();
    const price = Number(modelForm.price);
    if (!name || !Number.isFinite(price) || price <= 0) {
      window.alert("Geçerli model adı ve fiyat girin.");
      return;
    }
    const width = Number(modelForm.width);
    const height = Number(modelForm.height);
    const depth = Number(modelForm.depth);
    const weight = Number(modelForm.weight);
    if (
      !Number.isFinite(width) || width <= 0 ||
      !Number.isFinite(height) || height <= 0 ||
      !Number.isFinite(depth) || depth <= 0 ||
      !Number.isFinite(weight) || weight <= 0
    ) {
      window.alert("Ölçü ve ağırlık alanlarına 0’dan büyük sayılar girin.");
      return;
    }
    const personalPrice = Number(modelForm.licensePersonalPrice);
    const commercialPrice = Number(modelForm.licenseCommercialPrice);
    if (
      !modelForm.licensePersonalEnabled &&
      !modelForm.licenseCommercialEnabled
    ) {
      window.alert("En az bir lisans türü seçin.");
      return;
    }
    if (
      (modelForm.licensePersonalEnabled && (!Number.isFinite(personalPrice) || personalPrice <= 0)) ||
      (modelForm.licenseCommercialEnabled && (!Number.isFinite(commercialPrice) || commercialPrice <= 0))
    ) {
      window.alert("Seçili lisans türleri için geçerli fiyat girin.");
      return;
    }
    const editingRow = editingModelId ? modelRows.find((row) => row.id === editingModelId) : null;
    const nextOrder = nextSkuOrder(modelRows);
    const typeCode = JEWELRY_TYPE_TO_CODE[modelForm.jewelryType];
    let slug = editingRow?.slug ?? "";
    if (!editingRow) {
      const baseSlug = slugifyTr(name) || `model-${nextOrder}`;
      const exists = new Set(modelRows.map((x) => x.slug));
      slug = baseSlug;
      let ix = 2;
      while (exists.has(slug)) {
        slug = `${baseSlug}-${ix}`;
        ix += 1;
      }
    }

    let glbUrl: string | null = editingRow?.glbUrl ?? null;
    let stlUrl: string | null =
      editingRow?.stlUrl ??
      (editingRow?.hasStl && editingRow.stlFileName ? `/models/${editingRow.stlFileName}` : null);
    const fallbackViews: Partial<Record<ThumbnailViewKey, string | null>> = editingRow?.thumbnailViews ?? {};
    const thumbnailViews: Partial<Record<ThumbnailViewKey, string | null>> = { ...fallbackViews };
    let thumbnailUrl: string | null = editingRow?.thumbnailUrl ?? null;

    if (!editingRow && !modelForm.glbFile && !modelForm.stlFile) {
      window.alert("Yeni model için en az bir dosya (GLB veya STL) seçin.");
      return;
    }

    if (modelForm.glbFile || modelForm.stlFile) {
      const uploadFd = new FormData();
      uploadFd.set("slug", slug);
      if (modelForm.glbFile) uploadFd.set("glb", modelForm.glbFile);
      if (modelForm.stlFile) uploadFd.set("stl", modelForm.stlFile);
      const uploadRes = await fetch("/api/upload-model", { method: "POST", body: uploadFd });
      if (!uploadRes.ok) {
        const errJson = (await uploadRes.json().catch(() => ({}))) as { error?: string };
        window.alert(errJson.error ?? "Model dosyası yüklenemedi. Lütfen tekrar deneyin.");
        return;
      }
      const uploadData = (await uploadRes.json()) as { glbUrl?: string | null; stlUrl?: string | null };
      if (uploadData.glbUrl) glbUrl = uploadData.glbUrl;
      if (uploadData.stlUrl) stlUrl = uploadData.stlUrl;
    }

    for (const view of THUMBNAIL_VIEWS) {
      const file = modelForm.thumbnailFiles[view.key];
      if (!file) continue;
      const thumbForm = new FormData();
      thumbForm.set("slug", slug);
      thumbForm.set("view", view.key);
      thumbForm.set("file", file);
      const thumbRes = await fetch("/api/upload-thumbnail", { method: "POST", body: thumbForm });
      if (!thumbRes.ok) {
        window.alert(`${view.label} yüklenemedi. Lütfen tekrar deneyin.`);
        return;
      }
      const thumbData = (await thumbRes.json()) as { url?: string | null };
      thumbnailViews[view.key] = thumbData.url ?? getThumbnailViewUrl(slug, view.key);
      if (view.key === "on") {
        thumbnailUrl = thumbnailViews[view.key] ?? getThumbnailViewUrl(slug, "on");
      }
    }
    if (!thumbnailUrl) {
      thumbnailUrl =
        thumbnailViews.on ??
        thumbnailViews.arka ??
        thumbnailViews.kenar ??
        thumbnailViews.ust ??
        null;
    }
    const modelRowPayload: Model3DRow = {
      id: editingRow?.id ?? `m${Date.now()}`,
      sku: editingRow?.sku ?? build3dSku(typeCode, nextOrder),
      name,
      slug,
      glbUrl,
      thumbnailUrl,
      thumbnailViews,
      jewelryType: modelForm.jewelryType,
      price,
      dimensions: { width, height, depth },
      weight,
      story: modelForm.story.trim(),
      licensePersonalEnabled: modelForm.licensePersonalEnabled,
      licensePersonalPrice: modelForm.licensePersonalEnabled ? personalPrice : null,
      licenseCommercialEnabled: modelForm.licenseCommercialEnabled,
      licenseCommercialPrice: modelForm.licenseCommercialEnabled ? commercialPrice : null,
      hasGlb: modelForm.glbFile ? true : (editingRow?.hasGlb ?? !!glbUrl),
      hasStl: modelForm.stlFile ? true : (editingRow?.hasStl ?? Boolean(stlUrl)),
      hasThumbnail: THUMBNAIL_VIEWS.some((view) => Boolean(thumbnailViews[view.key])) || Boolean(thumbnailUrl),
      glbFileName: modelForm.glbFile?.name ?? editingRow?.glbFileName ?? null,
      stlFileName: modelForm.stlFile?.name ?? editingRow?.stlFileName ?? null,
      thumbnailFileName: modelForm.thumbnailFiles.on?.name ?? editingRow?.thumbnailFileName ?? null,
      thumbnailViewFileNames: {
        on: modelForm.thumbnailFiles.on?.name ?? editingRow?.thumbnailViewFileNames?.on ?? null,
        arka: modelForm.thumbnailFiles.arka?.name ?? editingRow?.thumbnailViewFileNames?.arka ?? null,
        kenar: modelForm.thumbnailFiles.kenar?.name ?? editingRow?.thumbnailViewFileNames?.kenar ?? null,
        ust: modelForm.thumbnailFiles.ust?.name ?? editingRow?.thumbnailViewFileNames?.ust ?? null,
      },
      isPublished: modelForm.publish,
      publishTargets: modelForm.publishTargets,
    };
    const dbPayload = {
      sku: modelRowPayload.sku,
      name: modelRowPayload.name,
      slug: modelRowPayload.slug,
      story: modelRowPayload.story,
      jewelry_type: modelRowPayload.jewelryType,
      personal_price: modelRowPayload.licensePersonalPrice ?? modelRowPayload.price,
      commercial_price: modelRowPayload.licenseCommercialEnabled ? modelRowPayload.licenseCommercialPrice : null,
      glb_url: modelRowPayload.glbUrl,
      stl_url: stlUrl,
      thumbnail_url: modelRowPayload.thumbnailUrl,
      images: modelRowPayload.thumbnailViews,
      dimensions: {
        width,
        height,
        depth,
        weight,
      },
      is_published: modelRowPayload.isPublished,
      show_on_home: modelRowPayload.publishTargets.homeFeatured,
      show_on_modeller: modelRowPayload.publishTargets.modeller,
    };
    const supabase = createClient();
    if (editingRow) {
      const { data, error } = await supabase
        .from("products_3d")
        .update(dbPayload)
        .eq("id", editingRow.id)
        .select("*")
        .single();
      if (error) {
        window.alert("Model güncellenemedi.");
        return;
      }
      const nextRow = toModelRow(data as DbProduct3D);
      setModelRows((prev) => prev.map((row) => (row.id === editingRow.id ? nextRow : row)));
    } else {
      const { data, error } = await supabase.from("products_3d").insert(dbPayload).select("*").single();
      if (error) {
        window.alert("Model kaydedilemedi.");
        return;
      }
      setModelRows((prev) => [toModelRow(data as DbProduct3D), ...prev]);
    }
    closeModelModal();
  }, [closeModelModal, editingModelId, modelForm, modelRows]);

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

      <section aria-label="Sekmeler" className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("products")}
          className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "products"
              ? "border-[#c69575]/45 bg-[#c69575]/15 text-[#f0dcc8]"
              : "border-white/[0.1] bg-white/[0.04] text-zinc-300 hover:border-white/[0.18]"
          }`}
        >
          Ürün Listesi
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("models3d")}
          className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "models3d"
              ? "border-[#c69575]/45 bg-[#c69575]/15 text-[#f0dcc8]"
              : "border-white/[0.1] bg-white/[0.04] text-zinc-300 hover:border-white/[0.18]"
          }`}
        >
          3D Modeller
        </button>
      </section>

      {activeTab === "products" ? (
        <>
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
        </>
      ) : (
        <CardShell title="3D Modeller">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-zinc-500">3D model listesini yönetin, yayın durumunu buradan kontrol edin.</p>
            <button type="button" className={ADMIN_PRIMARY_BUTTON_CLASS} onClick={openCreateModelModal}>
              Yeni Model Ekle
            </button>
          </div>
          {modelRows.length === 0 ? (
            <AdminEmptyState message="Henüz 3D model yok" hint="İlk modeli ekleyerek başlayın." />
          ) : (
            <AdminDataScroll>
              <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                <thead>
                  <tr className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    <th className={`px-3 py-3 font-medium ${ADMIN_TABLE_TH_STICKY}`}>SKU</th>
                    <th className={`px-3 py-3 font-medium ${ADMIN_TABLE_TH_STICKY}`}>Model Adı</th>
                    <th className={`px-3 py-3 font-medium ${ADMIN_TABLE_TH_STICKY}`}>Slug</th>
                    <th className={`px-3 py-3 font-medium tabular-nums ${ADMIN_TABLE_TH_STICKY}`}>Fiyat</th>
                    <th className={`px-3 py-3 font-medium ${ADMIN_TABLE_TH_STICKY}`}>GLB</th>
                    <th className={`px-3 py-3 font-medium ${ADMIN_TABLE_TH_STICKY}`}>STL</th>
                    <th className={`px-3 py-3 font-medium ${ADMIN_TABLE_TH_STICKY}`}>Yayın</th>
                    <th className={`px-3 py-3 text-right font-medium ${ADMIN_TABLE_TH_STICKY}`}>Aksiyon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {modelRows.map((row) => (
                    <tr key={row.id} className="hover:bg-white/[0.02]">
                      <td className="px-3 py-3 font-mono text-[12px] text-zinc-400">{row.sku}</td>
                      <td className="px-3 py-3 font-medium text-zinc-100">{row.name}</td>
                      <td className="px-3 py-3 font-mono text-[12px] text-zinc-400">/{row.slug}</td>
                      <td className="px-3 py-3 tabular-nums text-zinc-200">{tryFmt(row.price)}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                            row.hasGlb
                              ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
                              : "border-zinc-500/35 bg-zinc-500/10 text-zinc-400"
                          }`}
                        >
                          {row.hasGlb ? "Var" : "Yok"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                            row.hasStl
                              ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
                              : "border-zinc-500/35 bg-zinc-500/10 text-zinc-400"
                          }`}
                        >
                          {row.hasStl ? "Var" : "Yok"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                            row.isPublished
                              ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
                              : "border-zinc-500/35 bg-zinc-500/10 text-zinc-400"
                          }`}
                        >
                          {row.isPublished ? "Yayında" : "Gizli"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/modeller/${row.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-white/[0.12] bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-[#c69575]/30 hover:bg-[#c69575]/10 hover:text-[#f0dcc8]"
                          >
                            👁️ Görüntüle
                          </Link>
                          <button
                            type="button"
                            onClick={() => openEditModelModal(row)}
                            className="rounded-lg border border-sky-500/25 bg-sky-500/10 px-2.5 py-1.5 text-xs font-medium text-sky-200 transition-colors hover:bg-sky-500/18"
                          >
                            ✏️ Düzenle
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleModelPublish(row.id)}
                            className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                              row.isPublished
                                ? "border-zinc-500/30 bg-zinc-500/10 text-zinc-300 hover:bg-zinc-500/20"
                                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/18"
                            }`}
                          >
                            {row.isPublished ? "🙈 Gizle" : "✅ Yayınla"}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteModelRow(row.id)}
                            className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-200 transition-colors hover:bg-rose-500/18"
                          >
                            🗑️ Sil
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
      )}

      {isModelModalOpen ? (
        <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
          <div className="mx-auto flex min-h-full w-full max-w-2xl items-start justify-center py-4 sm:py-8">
            <div className="flex w-full max-h-[86vh] flex-col overflow-hidden rounded-2xl border border-white/[0.12] bg-gradient-to-br from-[#12141a] via-[#0d0f15] to-[#08090c] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4 sm:px-6">
              <h3 className="font-display text-xl font-semibold text-zinc-100">
                {editingModelId ? "Model Düzenle" : "Yeni Model Ekle"}
              </h3>
              <button
                type="button"
                onClick={closeModelModal}
                className="rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-white/[0.2]"
              >
                Kapat
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 overflow-y-auto px-5 py-4 sm:grid-cols-2 sm:px-6">
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">Model Adı</span>
                <input
                  type="text"
                  value={modelForm.name}
                  onChange={(e) => setModelForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2.5 text-sm text-zinc-200 outline-none ring-[#c69575]/30 focus:border-[#c69575]/30 focus:ring-2"
                  placeholder="Örn: Simurg Yüzük"
                />
              </label>

              <label>
                <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">Takı Tipi</span>
                <select
                  value={modelForm.jewelryType}
                  onChange={(e) =>
                    setModelForm((p) => ({ ...p, jewelryType: e.target.value as Model3DRow["jewelryType"] }))
                  }
                  className="w-full cursor-pointer rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2.5 text-sm text-zinc-200 outline-none ring-[#c69575]/30 focus:border-[#c69575]/30 focus:ring-2"
                >
                  <option value="Yüzük">Yüzük</option>
                  <option value="Kolye">Kolye</option>
                  <option value="Bilezik">Bilezik</option>
                  <option value="Küpe">Küpe</option>
                  <option value="Pandant">Pandant</option>
                  <option value="Broş">Broş</option>
                </select>
              </label>

              <label>
                <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">Fiyat (₺)</span>
                <input
                  type="number"
                  min={1}
                  value={modelForm.price}
                  onChange={(e) => setModelForm((p) => ({ ...p, price: e.target.value }))}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2.5 text-sm text-zinc-200 outline-none ring-[#c69575]/30 focus:border-[#c69575]/30 focus:ring-2"
                  placeholder="0"
                />
              </label>

              <label>
                <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">Genişlik (mm)</span>
                <input
                  type="number"
                  min={0.1}
                  step="0.1"
                  value={modelForm.width}
                  onChange={(e) => setModelForm((p) => ({ ...p, width: e.target.value }))}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2.5 text-sm text-zinc-200 outline-none ring-[#c69575]/30 focus:border-[#c69575]/30 focus:ring-2"
                  placeholder="0.0"
                />
              </label>

              <label>
                <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">Yükseklik (mm)</span>
                <input
                  type="number"
                  min={0.1}
                  step="0.1"
                  value={modelForm.height}
                  onChange={(e) => setModelForm((p) => ({ ...p, height: e.target.value }))}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2.5 text-sm text-zinc-200 outline-none ring-[#c69575]/30 focus:border-[#c69575]/30 focus:ring-2"
                  placeholder="0.0"
                />
              </label>

              <label>
                <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">Derinlik (mm)</span>
                <input
                  type="number"
                  min={0.1}
                  step="0.1"
                  value={modelForm.depth}
                  onChange={(e) => setModelForm((p) => ({ ...p, depth: e.target.value }))}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2.5 text-sm text-zinc-200 outline-none ring-[#c69575]/30 focus:border-[#c69575]/30 focus:ring-2"
                  placeholder="0.0"
                />
              </label>

              <label>
                <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">Ağırlık (gr)</span>
                <input
                  type="number"
                  min={0.1}
                  step="0.1"
                  value={modelForm.weight}
                  onChange={(e) => setModelForm((p) => ({ ...p, weight: e.target.value }))}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2.5 text-sm text-zinc-200 outline-none ring-[#c69575]/30 focus:border-[#c69575]/30 focus:ring-2"
                  placeholder="0.0"
                />
              </label>

              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">Hikaye</span>
                <textarea
                  rows={4}
                  value={modelForm.story}
                  onChange={(e) => setModelForm((p) => ({ ...p, story: e.target.value }))}
                  className="w-full resize-y rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2.5 text-sm text-zinc-200 outline-none ring-[#c69575]/30 focus:border-[#c69575]/30 focus:ring-2"
                  placeholder="Model hikayesini yazın..."
                />
              </label>

              <label>
                <span className="mb-1.5 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  GLB Dosyası
                  {modelForm.glbFile ? (
                    <button
                      type="button"
                      onClick={() => setModelForm((p) => ({ ...p, glbFile: null }))}
                      className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-zinc-300 hover:border-white/30"
                    >
                      x
                    </button>
                  ) : null}
                </span>
                <input
                  type="file"
                  accept=".glb,model/gltf-binary"
                  onChange={(e) => setModelForm((p) => ({ ...p, glbFile: e.target.files?.[0] ?? null }))}
                  className="block w-full cursor-pointer rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2 text-sm text-zinc-300 file:mr-3 file:rounded-md file:border-0 file:bg-white/[0.08] file:px-2.5 file:py-1 file:text-xs file:text-zinc-200"
                />
                {modelForm.glbFile ? <p className="mt-1 text-xs text-zinc-500">{modelForm.glbFile.name}</p> : null}
              </label>

              <label>
                <span className="mb-1.5 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  STL Dosyası
                  {modelForm.stlFile ? (
                    <button
                      type="button"
                      onClick={() => setModelForm((p) => ({ ...p, stlFile: null }))}
                      className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-zinc-300 hover:border-white/30"
                    >
                      x
                    </button>
                  ) : null}
                </span>
                <input
                  type="file"
                  accept=".stl,model/stl"
                  onChange={(e) => setModelForm((p) => ({ ...p, stlFile: e.target.files?.[0] ?? null }))}
                  className="block w-full cursor-pointer rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2 text-sm text-zinc-300 file:mr-3 file:rounded-md file:border-0 file:bg-white/[0.08] file:px-2.5 file:py-1 file:text-xs file:text-zinc-200"
                />
                {modelForm.stlFile ? <p className="mt-1 text-xs text-zinc-500">{modelForm.stlFile.name}</p> : null}
              </label>

              <div className="sm:col-span-2">
                <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">Thumbnail (4 Görsel)</span>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {THUMBNAIL_VIEWS.map((view) => (
                    <label key={view.key}>
                      <span className="mb-1.5 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                        {view.label}
                        {modelForm.thumbnailFiles[view.key] ? (
                          <button
                            type="button"
                            onClick={() =>
                              setModelForm((p) => ({
                                ...p,
                                thumbnailFiles: { ...p.thumbnailFiles, [view.key]: null },
                              }))
                            }
                            className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-zinc-300 hover:border-white/30"
                          >
                            x
                          </button>
                        ) : null}
                      </span>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        onChange={(e) =>
                          setModelForm((p) => ({
                            ...p,
                            thumbnailFiles: {
                              ...p.thumbnailFiles,
                              [view.key]: e.target.files?.[0] ?? null,
                            },
                          }))
                        }
                        className="block w-full cursor-pointer rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2 text-sm text-zinc-300 file:mr-3 file:rounded-md file:border-0 file:bg-white/[0.08] file:px-2.5 file:py-1 file:text-xs file:text-zinc-200"
                      />
                      {modelForm.thumbnailFiles[view.key] ? (
                        <p className="mt-1 text-xs text-zinc-500">{modelForm.thumbnailFiles[view.key]?.name}</p>
                      ) : editingModelId ? (
                        <p className="mt-1 text-xs text-zinc-600">Mevcut görsel korunacak</p>
                      ) : null}
                    </label>
                  ))}
                </div>
              </div>

              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">Lisans</span>
                <div className="space-y-3 rounded-xl border border-white/[0.08] bg-[#07080a] p-3">
                  <label className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm text-zinc-300">
                      <input
                        type="checkbox"
                        checked={modelForm.licensePersonalEnabled}
                        onChange={(e) => setModelForm((p) => ({ ...p, licensePersonalEnabled: e.target.checked }))}
                        className="h-4 w-4 rounded border-white/20 bg-black/30 accent-[#c69575]"
                      />
                      Kişisel Kullanım
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={modelForm.licensePersonalPrice}
                      onChange={(e) => setModelForm((p) => ({ ...p, licensePersonalPrice: e.target.value }))}
                      disabled={!modelForm.licensePersonalEnabled}
                      placeholder="₺"
                      className="w-36 rounded-lg border border-white/[0.08] bg-[#050608] px-2.5 py-1.5 text-sm text-zinc-200 outline-none disabled:opacity-40"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm text-zinc-300">
                      <input
                        type="checkbox"
                        checked={modelForm.licenseCommercialEnabled}
                        onChange={(e) => setModelForm((p) => ({ ...p, licenseCommercialEnabled: e.target.checked }))}
                        className="h-4 w-4 rounded border-white/20 bg-black/30 accent-[#c69575]"
                      />
                      Ticari Kullanım
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={modelForm.licenseCommercialPrice}
                      onChange={(e) => setModelForm((p) => ({ ...p, licenseCommercialPrice: e.target.value }))}
                      disabled={!modelForm.licenseCommercialEnabled}
                      placeholder="₺"
                      className="w-36 rounded-lg border border-white/[0.08] bg-[#050608] px-2.5 py-1.5 text-sm text-zinc-200 outline-none disabled:opacity-40"
                    />
                  </label>
                </div>
              </label>

              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">Yayın Sayfası</span>
                <div className="rounded-xl border border-white/[0.08] bg-[#07080a] p-3">
                  {[
                    { key: "modeller", label: "/modeller sayfası (3D Model Mağazası)" },
                    { key: "homeFeatured", label: "Ana sayfa - Öne Çıkan Koleksiyonlar" },
                    { key: "urunler", label: "/urunler sayfası (Fiziksel Ürünler)" },
                  ].map((item) => (
                    <label key={item.key} className="mb-2 flex cursor-pointer items-center gap-2 last:mb-0">
                      <input
                        type="checkbox"
                        checked={modelForm.publishTargets[item.key as keyof typeof modelForm.publishTargets]}
                        onChange={(e) =>
                          setModelForm((p) => ({
                            ...p,
                            publishTargets: {
                              ...p.publishTargets,
                              [item.key]: e.target.checked,
                            },
                          }))
                        }
                        className="h-4 w-4 rounded border-white/20 bg-black/30 accent-[#c69575]"
                      />
                      <span className="text-sm text-zinc-300">{item.label}</span>
                    </label>
                  ))}
                </div>
              </label>

              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">Yayınla</span>
                <button
                  type="button"
                  onClick={() => setModelForm((p) => ({ ...p, publish: !p.publish }))}
                  className={`inline-flex h-9 w-16 items-center rounded-full border p-1 transition-colors ${
                    modelForm.publish
                      ? "border-emerald-500/35 bg-emerald-500/20"
                      : "border-zinc-500/35 bg-zinc-500/10"
                  }`}
                  aria-pressed={modelForm.publish}
                >
                  <span
                    className={`h-7 w-7 rounded-full bg-white transition-transform ${
                      modelForm.publish ? "translate-x-7" : "translate-x-0"
                    }`}
                  />
                </button>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/[0.08] bg-[#0b0c10]/95 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={closeModelModal}
                className="rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-300 hover:border-white/[0.2]"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleModelSave}
                className={ADMIN_PRIMARY_BUTTON_CLASS}
                disabled={
                  !modelForm.name.trim() ||
                  !modelForm.price ||
                  Number(modelForm.price) <= 0 ||
                  !modelForm.width ||
                  Number(modelForm.width) <= 0 ||
                  !modelForm.height ||
                  Number(modelForm.height) <= 0 ||
                  !modelForm.depth ||
                  Number(modelForm.depth) <= 0 ||
                  !modelForm.weight ||
                  Number(modelForm.weight) <= 0 ||
                  (!modelForm.licensePersonalEnabled && !modelForm.licenseCommercialEnabled)
                }
              >
                {editingModelId ? "Güncelle" : "Kaydet"}
              </button>
            </div>
          </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
