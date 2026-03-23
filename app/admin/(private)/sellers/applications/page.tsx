import type { Metadata } from "next";
import { SellerApplicationsPage } from "@/components/admin/sellers/SellerApplicationsPage";

export const metadata: Metadata = {
  title: "Satıcı başvuruları | Super Admin",
  robots: { index: false, follow: false },
};

export default function AdminSellerApplicationsRoutePage() {
  return <SellerApplicationsPage />;
}
