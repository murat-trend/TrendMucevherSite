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
  Shield,
  Settings,
  PackageX,
  Truck,
  Star,
  Bell,
  Mail,
  Cpu,
  CheckSquare,
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
        href: "/admin/reports",
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
        id: "cms",
        href: "/admin/cms",
        labelTr: "CMS",
        labelEn: "CMS",
        icon: FileText,
      },
      {
        id: "email-templates",
        href: "/admin/email-templates",
        labelTr: "E-posta Şablonları",
        labelEn: "Email Templates",
        icon: Mail,
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
        id: "security",
        href: "/admin/security",
        labelTr: "Güvenlik",
        labelEn: "Security",
        icon: Shield,
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
