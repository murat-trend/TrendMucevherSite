import { Suspense } from "react";
import type { Metadata } from "next";
import { FinancePage } from "@/components/admin/finance/FinancePage";

export const metadata: Metadata = {
  title: "Gelir Tablosu | Muhasebe | Super Admin",
  robots: { index: false, follow: false },
};

function FinancePageFallback() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0a0b0e] p-10 text-center text-sm text-zinc-500">
      Yükleniyor…
    </div>
  );
}

export default function AdminFinanceIncomeStatementPage() {
  return (
    <Suspense fallback={<FinancePageFallback />}>
      <FinancePage />
    </Suspense>
  );
}
