import type { Metadata } from "next";
import { SellersPage } from "@/components/admin/sellers/SellersPage";

export const metadata: Metadata = {
  title: "Satıcılar | Super Admin",
  robots: { index: false, follow: false },
};

export default function AdminSellersPage() {
  return <SellersPage />;
}
