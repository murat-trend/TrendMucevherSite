import { Suspense } from "react";
import type { Metadata } from "next";
import { PageViewsPage } from "@/components/admin/page-views/PageViewsPage";

export const metadata: Metadata = {
  title: "Ziyaretçiler | Analiz | Super Admin",
  robots: { index: false, follow: false },
};

function PageViewsFallback() {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0a0b0e]/80 px-4 py-10 text-center text-sm text-zinc-500">
      Yükleniyor…
    </div>
  );
}

export default function AdminPageViewsRoutePage() {
  return (
    <Suspense fallback={<PageViewsFallback />}>
      <PageViewsPage />
    </Suspense>
  );
}
