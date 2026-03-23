import { Suspense } from "react";
import type { Metadata } from "next";
import { OrdersPage } from "@/components/admin/orders/OrdersPage";

export const metadata: Metadata = {
  title: "Siparişler | Super Admin",
  robots: { index: false, follow: false },
};

function OrdersFallback() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0a0b0e] p-10 text-center text-sm text-zinc-500">
      Yükleniyor…
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<OrdersFallback />}>
      <OrdersPage />
    </Suspense>
  );
}
