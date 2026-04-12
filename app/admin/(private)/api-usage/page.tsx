import { Suspense } from "react";
import type { Metadata } from "next";
import { ApiUsagePage } from "@/components/admin/api-usage/ApiUsagePage";

export const metadata: Metadata = {
  title: "API Kullanımı | Analiz | Super Admin",
  robots: { index: false, follow: false },
};

function ApiUsageFallback() {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0a0b0e]/80 px-4 py-10 text-center text-sm text-zinc-500">
      Yükleniyor…
    </div>
  );
}

export default function AdminApiUsagePage() {
  return (
    <Suspense fallback={<ApiUsageFallback />}>
      <ApiUsagePage />
    </Suspense>
  );
}
