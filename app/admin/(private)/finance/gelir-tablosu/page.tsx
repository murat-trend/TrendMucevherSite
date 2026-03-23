import type { Metadata } from "next";
import { FinancePage } from "@/components/admin/finance/FinancePage";

export const metadata: Metadata = {
  title: "Gelir Tablosu | Muhasebe | Super Admin",
  robots: { index: false, follow: false },
};

export default function AdminFinanceIncomeStatementPage() {
  return <FinancePage />;
}
