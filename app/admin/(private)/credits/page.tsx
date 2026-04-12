import { Suspense } from "react";
import type { Metadata } from "next";
import { AdminCreditsPage } from "@/components/admin/credits/AdminCreditsPage";

export const metadata: Metadata = {
  title: "Kredi Yönetimi | Finans | Super Admin",
  robots: { index: false, follow: false },
};

function CreditsFallback() {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0a0b0e]/80 px-4 py-10 text-center text-sm text-zinc-500">
      Yükleniyor…
    </div>
  );
}

export default function AdminCreditsRoutePage() {
  return (
    <Suspense fallback={<CreditsFallback />}>
      <AdminCreditsPage />
    </Suspense>
  );
}
