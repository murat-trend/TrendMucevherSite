import type { Metadata } from "next";
import { FinansOverviewPage } from "@/components/admin/finance/FinansOverviewPage";

export const metadata: Metadata = {
  title: "Finans | Super Admin",
  robots: { index: false, follow: false },
};

export default function AdminFinancePage() {
  return <FinansOverviewPage />;
}
