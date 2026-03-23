import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Store,
  Package,
  ShoppingCart,
  Users,
  Wallet,
  Landmark,
  Table2,
  Tags,
  FileSpreadsheet,
  Megaphone,
  FileText,
  BarChart3,
  Shield,
  Settings,
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

/**
 * Sol menü — tek linkler + gruplar (ör. Muhasebe alt başlıkları).
 */
export const ADMIN_NAV_ENTRIES: AdminNavEntry[] = [
  { id: "dashboard", href: "/admin", labelTr: "Dashboard", labelEn: "Dashboard", icon: LayoutDashboard },
  { id: "sellers", href: "/admin/sellers", labelTr: "Satıcılar", labelEn: "Sellers", icon: Store },
  { id: "products", href: "/admin/products", labelTr: "Ürünler", labelEn: "Products", icon: Package },
  { id: "orders", href: "/admin/orders", labelTr: "Siparişler", labelEn: "Orders", icon: ShoppingCart },
  { id: "customers", href: "/admin/customers", labelTr: "Müşteriler", labelEn: "Customers", icon: Users },
  { id: "finance", href: "/admin/finance", labelTr: "Finans", labelEn: "Finance", icon: Wallet },
  { id: "campaigns", href: "/admin/campaigns", labelTr: "Kampanyalar", labelEn: "Campaigns", icon: Megaphone },
  { id: "cms", href: "/admin/cms", labelTr: "CMS", labelEn: "CMS", icon: FileText },
  { id: "reports", href: "/admin/reports", labelTr: "Raporlar", labelEn: "Reports", icon: BarChart3 },
  {
    type: "group",
    id: "muhasebe",
    titleTr: "Muhasebe",
    titleEn: "Accounting",
    icon: Landmark,
    children: [
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
  { id: "security", href: "/admin/security", labelTr: "Güvenlik", labelEn: "Security", icon: Shield },
  { id: "settings", href: "/admin/settings", labelTr: "Ayarlar", labelEn: "Settings", icon: Settings },
];

/** Yalnızca tek seviye `/admin/[slug]` sayfası için (grup yok) */
export const ADMIN_NAV: AdminNavItem[] = ADMIN_NAV_ENTRIES.filter((e): e is AdminNavItem => !isAdminNavGroup(e));
