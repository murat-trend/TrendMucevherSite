import { Suspense } from "react";
import type { Metadata } from "next";
import { ProductsModerationPage } from "@/components/admin/product-moderation/ProductsModerationPage";

export const metadata: Metadata = {
  title: "Ürünler | Super Admin",
  robots: { index: false, follow: false },
};

function ProductsFallback() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0a0b0e] p-10 text-center text-sm text-zinc-500">
      Yükleniyor…
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<ProductsFallback />}>
      <ProductsModerationPage />
    </Suspense>
  );
}
