import { Suspense } from "react";
import type { Metadata } from "next";
import { MuhasebeRaporuPage } from "@/components/admin/finance/MuhasebeRaporuPage";

export const metadata: Metadata = {
  title: "Muhasebe Raporu | Muhasebe | Super Admin",
  robots: { index: false, follow: false },
};

function MuhasebeRaporuFallback() {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0a0b0e]/80 px-4 py-10 text-center text-sm text-zinc-500">
      Yükleniyor…
    </div>
  );
}

export default function AdminFinanceAccountingReportPage() {
  return (
    <Suspense fallback={<MuhasebeRaporuFallback />}>
      <MuhasebeRaporuPage />
    </Suspense>
  );
}
