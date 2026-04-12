import { Suspense } from "react";
import type { Metadata } from "next";
import { KomisyonYonetimiPage } from "@/components/admin/finance/KomisyonYonetimiPage";

export const metadata: Metadata = {
  title: "Komisyon Yönetimi | Super Admin",
  robots: { index: false, follow: false },
};

function KomisyonFallback() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0a0b0e] p-10 text-center text-sm text-zinc-500">
      Yükleniyor…
    </div>
  );
}

export default function AdminFinanceKomisyonPage() {
  return (
    <Suspense fallback={<KomisyonFallback />}>
      <KomisyonYonetimiPage />
    </Suspense>
  );
}
