import { Suspense } from "react";
import type { Metadata } from "next";
import { AdminShippingPage } from "@/components/admin/shipping/AdminShippingPage";

export const metadata: Metadata = {
  title: "Kargo & Teslimat | Super Admin",
  robots: { index: false, follow: false },
};

function ShippingFallback() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0a0b0e] p-10 text-center text-sm text-zinc-500">
      Yükleniyor…
    </div>
  );
}

export default function AdminShippingRoutePage() {
  return (
    <Suspense fallback={<ShippingFallback />}>
      <AdminShippingPage />
    </Suspense>
  );
}
