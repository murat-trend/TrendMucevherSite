import type { Metadata } from "next";
import { CommissionSettingsPage } from "@/components/admin/commission/CommissionSettingsPage";

export const metadata: Metadata = {
  title: "Komisyon Ayarları | Super Admin",
  robots: { index: false, follow: false },
};

export default function AdminCommissionSettingsPage() {
  return <CommissionSettingsPage />;
}
