import { Suspense } from "react";
import type { Metadata } from "next";
import { AdminCustomersPage } from "@/components/admin/customers/AdminCustomersPage";

export const metadata: Metadata = {
  title: "Müşteri Listesi | Super Admin",
  robots: { index: false, follow: false },
};

function CustomersFallback() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0a0b0e] p-10 text-center text-sm text-zinc-500">
      Yükleniyor…
    </div>
  );
}

export default function AdminCustomersRoutePage() {
  return (
    <Suspense fallback={<CustomersFallback />}>
      <AdminCustomersPage />
    </Suspense>
  );
}
