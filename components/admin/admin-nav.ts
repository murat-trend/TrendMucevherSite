import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Store,
  Package,
  ShoppingCart,
  Users,
  Wallet,
  Percent,
  Landmark,
  Table2,
  Tag,
  Tags,
  FileSpreadsheet,
  Megaphone,
  FileText,
  BarChart3,
  Bell,
  Settings,
  PackageX,
  Truck,
  Star,
  Cpu,
  CheckSquare,
  Eye,
  Coins,
  BookOpen,
  Gem,
  Clapperboard,
  PenTool,
  Boxes,
  Images,
  Folder,
  Type,
  FlaskConical,
  Crop,
  Share2,
  ShoppingBag,
  Sparkles,
  Brush,
  Circle,
  LayoutGrid,
  Droplet,
  Aperture,
  Hammer,
  Map,
  Hand,
  Link2,
} from "lucide-react";

export type AdminNavItem = {
  id: string;
  href: string;
  labelTr: string;
  labelEn: string;
  icon: LucideIcon;
};

export type AdminNavChild = {
  id: string;
  href: string;
  labelTr: string;
  labelEn: string;
  icon: LucideIcon;
};

export type AdminNavGroup = {
  type: "group";
  id: string;
  titleTr: string;
  titleEn: string;
  icon: LucideIcon;
  children: AdminNavChild[];
};

export type AdminNavEntry = AdminNavItem | AdminNavGroup;

export function isAdminNavGroup(entry: AdminNavEntry): entry is AdminNavGroup {
  return "type" in entry && entry.type === "group";
}

export const ADMIN_NAV_ENTRIES: AdminNavEntry[] = [

  // ── Genel ──────────────────────────────────────────────
  {
    id: "dashboard",
    href: "/admin",
    labelTr: "Dashboard",
    labelEn: "Dashboard",
    icon: LayoutDashboard,
  },

  // ── Pazar Yeri ─────────────────────────────────────────
  {
    type: "group",
    id: "marketplace",
    titleTr: "Pazar Yeri",
    titleEn: "Marketplace",
    icon: Store,
    children: [
      {
        id: "sellers",
        href: "/admin/sellers",
        labelTr: "Satıcılar",
        labelEn: "Sellers",
        icon: Store,
      },
      {
        id: "products",
        href: "/admin/products",
        labelTr: "Ürünler",
        labelEn: "Products",
        icon: Package,
      },
      {
        id: "product-moderation",
        href: "/admin/product-moderation",
        labelTr: "Ürün Moderasyonu",
        labelEn: "Product Moderation",
        icon: CheckSquare,
      },
      {
        id: "campaigns",
        href: "/admin/campaigns",
        labelTr: "Kampanyalar",
        labelEn: "Campaigns",
        icon: Megaphone,
      },
    ],
  },

  // ── Satış & Operasyon ──────────────────────────────────
  {
    type: "group",
    id: "operations",
    titleTr: "Satış & Operasyon",
    titleEn: "Sales & Operations",
    icon: ShoppingCart,
    children: [
      {
        id: "orders",
        href: "/admin/orders",
        labelTr: "Siparişler",
        labelEn: "Orders",
        icon: ShoppingCart,
      },
      {
        id: "returns",
        href: "/admin/returns",
        labelTr: "İade & Şikayetler",
        labelEn: "Returns & Complaints",
        icon: PackageX,
      },
      {
        id: "shipping",
        href: "/admin/shipping",
        labelTr: "Kargo & Teslimat",
        labelEn: "Shipping & Delivery",
        icon: Truck,
      },
    ],
  },

  // ── Müşteriler ─────────────────────────────────────────
  {
    type: "group",
    id: "customers-group",
    titleTr: "Müşteriler",
    titleEn: "Customers",
    icon: Users,
    children: [
      {
        id: "customers",
        href: "/admin/customers",
        labelTr: "Müşteri Listesi",
        labelEn: "Customer List",
        icon: Users,
      },
      {
        id: "reviews",
        href: "/admin/reviews",
        labelTr: "Değerlendirmeler",
        labelEn: "Reviews",
        icon: Star,
      },
    ],
  },

  // ── Finans & Muhasebe ──────────────────────────────────
  {
    type: "group",
    id: "finance-group",
    titleTr: "Finans & Muhasebe",
    titleEn: "Finance & Accounting",
    icon: Landmark,
    children: [
      {
        id: "finance",
        href: "/admin/finance",
        labelTr: "Finans Özeti",
        labelEn: "Finance Overview",
        icon: Wallet,
      },
      {
        id: "credits",
        href: "/admin/credits",
        labelTr: "Kredi Yönetimi",
        labelEn: "Credit Management",
        icon: Coins,
      },
      {
        id: "finance-komisyon",
        href: "/admin/finance/komisyon",
        labelTr: "Komisyon Yönetimi",
        labelEn: "Commission Management",
        icon: Percent,
      },
      {
        id: "finance-income",
        href: "/admin/finance/gelir-tablosu",
        labelTr: "Gelir Tablosu",
        labelEn: "Income Statement",
        icon: Table2,
      },
      {
        id: "finance-expenses",
        href: "/admin/finance/gider-tanimlama",
        labelTr: "Gider Tanımlama",
        labelEn: "Expense Definitions",
        icon: Tags,
      },
      {
        id: "finance-accounting",
        href: "/admin/finance/muhasebe-raporu",
        labelTr: "Muhasebe Raporu",
        labelEn: "Accounting Report",
        icon: FileSpreadsheet,
      },
    ],
  },

  // ── Analiz & Raporlama ─────────────────────────────────
  {
    type: "group",
    id: "analytics",
    titleTr: "Analiz & Raporlama",
    titleEn: "Analytics & Reports",
    icon: BarChart3,
    children: [
      {
        id: "reports",
        href: "/admin/raporlar",
        labelTr: "Raporlar",
        labelEn: "Reports",
        icon: BarChart3,
      },
      {
        id: "api-usage",
        href: "/admin/api-usage",
        labelTr: "API Kullanımı",
        labelEn: "API Usage",
        icon: Cpu,
      },
      {
        id: "page-views",
        href: "/admin/page-views",
        labelTr: "Ziyaretçiler",
        labelEn: "Visitors",
        icon: Eye,
      },
    ],
  },

  // ── İletişim & İçerik ──────────────────────────────────
  {
    type: "group",
    id: "content",
    titleTr: "İletişim & İçerik",
    titleEn: "Communication & Content",
    icon: FileText,
    children: [
      {
        id: "blog",
        href: "/admin/blog",
        labelTr: "Blog / Günlük",
        labelEn: "Blog / Journal",
        icon: BookOpen,
      },
      {
        id: "cms",
        href: "/admin/cms",
        labelTr: "İçerik",
        labelEn: "Content",
        icon: FileText,
      },
    ],
  },

  // ── Fiyatlar ────────────────────────────────────────────
  {
    type: "group",
    id: "fiyat",
    titleTr: "Fiyatlar",
    titleEn: "Pricing",
    icon: Tag,
    children: [
      {
        id: "fiyat-yonetimi",
        href: "/admin/fiyat-yonetimi",
        labelTr: "Fiyat Yönetimi",
        labelEn: "Price Management",
        icon: Tag,
      },
    ],
  },

  // ── Nextaura B2B ───────────────────────────────────────
  {
    type: "group",
    id: "nextaura",
    titleTr: "Nextaura",
    titleEn: "Nextaura",
    icon: Gem,
    children: [
      {
        id: "nextaura-firms",
        href: "/admin/nextaura",
        labelTr: "Firmalar",
        labelEn: "Firms",
        icon: Store,
      },
    ],
  },

  // ── Remaura Araçları (süper-admin site araçlarına kısayol) ──
  {
    type: "group",
    id: "remaura-tools",
    titleTr: "Remaura Araçları",
    titleEn: "Remaura Tools",
    icon: Gem,
    children: [
      {
        id: "aci",
        href: "/remaura/aci",
        labelTr: "Açı",
        labelEn: "Angle",
        icon: Aperture,
      },
      {
        id: "iscilik",
        href: "/remaura/iscilik",
        labelTr: "İşçilik",
        labelEn: "Craftsmanship",
        icon: Hammer,
      },
      {
        id: "creative-studio",
        href: "/remaura/creative-studio",
        labelTr: "AI Creative Studio",
        labelEn: "AI Creative Studio",
        icon: Clapperboard,
      },
      {
        id: "nakkas",
        href: "/remaura/nakkas",
        labelTr: "Nakkaş — Desen",
        labelEn: "Nakkaş — Ornament",
        icon: PenTool,
      },
      {
        id: "3d-uret",
        href: "/remaura/3d-uret",
        labelTr: "3D Üret",
        labelEn: "3D Generate",
        icon: Boxes,
      },
      {
        id: "galeri",
        href: "/remaura/galeri",
        labelTr: "Galeri",
        labelEn: "Gallery",
        icon: Images,
      },
      {
        id: "aci-lab",
        href: "/remaura/aci-lab",
        labelTr: "Açı Lab",
        labelEn: "Angle Lab",
        icon: Aperture,
      },
      {
        id: "uv",
        href: "/remaura/uv",
        labelTr: "UV Haritalama",
        labelEn: "UV Mapping",
        icon: Map,
      },
      {
        id: "yuzuk-dene",
        href: "/remaura/yuzuk-dene",
        labelTr: "Yüzük Dene",
        labelEn: "Ring Try-On",
        icon: Hand,
      },
      {
        id: "koleksiyon-edit",
        href: "/remaura/koleksiyon-edit",
        labelTr: "Koleksiyon Edit",
        labelEn: "Collection Edit",
        icon: Folder,
      },
      {
        id: "isim-kolye",
        href: "/remaura/isim-kolye",
        labelTr: "İsim & Harf Kolye",
        labelEn: "Name & Letter Necklace",
        icon: Type,
      },
      {
        id: "koleksiyon-lab",
        href: "/remaura/koleksiyon-lab",
        labelTr: "Koleksiyon Lab",
        labelEn: "Collection Lab",
        icon: FlaskConical,
      },
      {
        id: "sosyal-boyut",
        href: "/remaura/sosyal-boyut",
        labelTr: "Sosyal Boyutlayıcı",
        labelEn: "Social Resizer",
        icon: Crop,
      },
      {
        id: "sosyal-post",
        href: "/remaura/sosyal-post",
        labelTr: "Sosyal Post",
        labelEn: "Social Post",
        icon: Share2,
      },
      {
        id: "etsy-boyut",
        href: "/remaura/etsy-boyut",
        labelTr: "Etsy Boyutlandırıcı",
        labelEn: "Etsy Resizer",
        icon: ShoppingBag,
      },
      {
        id: "hologram",
        href: "/remaura/hologram",
        labelTr: "Hologram",
        labelEn: "Hologram",
        icon: Sparkles,
      },
      {
        id: "mesh-temizle",
        href: "/remaura/mesh-temizle",
        labelTr: "Mesh Temizleme & Gramaj",
        labelEn: "Mesh Cleanup & Weight",
        icon: Brush,
      },
      {
        id: "hollow",
        href: "/remaura/hollow",
        labelTr: "İç Boşaltma",
        labelEn: "Hollowing",
        icon: Circle,
      },
      {
        id: "ajur",
        href: "/remaura/ajur",
        labelTr: "Ajur & Arka Kesim",
        labelEn: "Openwork & Back Cut",
        icon: LayoutGrid,
      },
      {
        id: "sivi",
        href: "/remaura/sivi",
        labelTr: "Sıvı — Kalıp Döküm",
        labelEn: "Liquid — Mold Casting",
        icon: Droplet,
      },
      {
        id: "geometri",
        href: "/remaura/geometri",
        labelTr: "Geometri Çekirdeği",
        labelEn: "Geometry Kernel",
        icon: PenTool,
      },
      {
        id: "suyolu",
        href: "/remaura/suyolu",
        labelTr: "Suyolu — Taşlı Bileklik",
        labelEn: "Tennis Bracelet Studio",
        icon: Gem,
      },
      {
        id: "zincir",
        href: "/remaura/zincir",
        labelTr: "Zincir",
        labelEn: "Chain",
        icon: Link2,
      },
    ],
  },

  // ── Sistem ─────────────────────────────────────────────
  {
    type: "group",
    id: "system",
    titleTr: "Sistem",
    titleEn: "System",
    icon: Settings,
    children: [
      {
        id: "notifications",
        href: "/admin/notifications",
        labelTr: "Bildirimler",
        labelEn: "Notifications",
        icon: Bell,
      },
      {
        id: "settings",
        href: "/admin/settings",
        labelTr: "Ayarlar",
        labelEn: "Settings",
        icon: Settings,
      },
    ],
  },
];

export const ADMIN_NAV: AdminNavItem[] = ADMIN_NAV_ENTRIES.filter(
  (e): e is AdminNavItem => !isAdminNavGroup(e)
);
