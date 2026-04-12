import { Suspense } from "react";
import type { Metadata } from "next";
import { AdminReviewsPage } from "@/components/admin/reviews/AdminReviewsPage";

export const metadata: Metadata = {
  title: "Değerlendirmeler | Super Admin",
  robots: { index: false, follow: false },
};

function ReviewsFallback() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0a0b0e] p-10 text-center text-sm text-zinc-500">
      Yükleniyor…
    </div>
  );
}

export default function AdminReviewsRoutePage() {
  return (
    <Suspense fallback={<ReviewsFallback />}>
      <AdminReviewsPage />
    </Suspense>
  );
}
