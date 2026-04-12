import { Suspense } from "react";
import type { Metadata } from "next";
import { AdminBlogPage } from "@/components/admin/blog/AdminBlogPage";

export const metadata: Metadata = {
  title: "Blog / Günlük | İçerik | Super Admin",
  robots: { index: false, follow: false },
};

function BlogFallback() {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0a0b0e]/80 px-4 py-10 text-center text-sm text-zinc-500">
      Yükleniyor…
    </div>
  );
}

export default function BlogAdminRoutePage() {
  return (
    <Suspense fallback={<BlogFallback />}>
      <AdminBlogPage />
    </Suspense>
  );
}
