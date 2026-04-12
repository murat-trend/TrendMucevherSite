import { Suspense } from "react";
import type { Metadata } from "next";
import { FinansOverviewPage } from "@/components/admin/finance/FinansOverviewPage";

export const metadata: Metadata = {
  title: "Finans | Super Admin",
  robots: { index: false, follow: false },
};

function FinanceOverviewFallback() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0a0b0e] p-10 text-center text-sm text-zinc-500">
      Yükleniyor…
    </div>
  );
}

export default function AdminFinancePage() {
  return (
    <Suspense fallback={<FinanceOverviewFallback />}>
      <FinansOverviewPage />
    </Suspense>
  );
}
