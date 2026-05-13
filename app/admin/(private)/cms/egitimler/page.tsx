import { Suspense } from "react";
import type { Metadata } from "next";
import { AdminCoursesPage } from "@/components/admin/cms/AdminCoursesPage";

export const metadata: Metadata = {
  title: "Eğitimler & Kurslar | CMS | Super Admin",
  robots: { index: false, follow: false },
};

export default function EgitimlerRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-white/[0.08] bg-[#0a0b0e]/80 px-4 py-10 text-center text-sm text-zinc-500">
          Yükleniyor…
        </div>
      }
    >
      <AdminCoursesPage />
    </Suspense>
  );
}
