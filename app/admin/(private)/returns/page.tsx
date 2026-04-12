import { Suspense } from "react";
import type { Metadata } from "next";
import { AdminReturnsPage } from "@/components/admin/returns/AdminReturnsPage";

export const metadata: Metadata = {
  title: "İade & Şikayetler | Super Admin",
  robots: { index: false, follow: false },
};

function ReturnsFallback() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0a0b0e] p-10 text-center text-sm text-zinc-500">
      Yükleniyor…
    </div>
  );
}

export default function AdminReturnsRoutePage() {
  return (
    <Suspense fallback={<ReturnsFallback />}>
      <AdminReturnsPage />
    </Suspense>
  );
}
