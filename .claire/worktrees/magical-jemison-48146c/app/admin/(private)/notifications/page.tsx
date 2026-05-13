import { Suspense } from "react";
import type { Metadata } from "next";
import { AdminNotificationsPage } from "@/components/admin/notifications/AdminNotificationsPage";

export const metadata: Metadata = {
  title: "Bildirimler | Super Admin",
  robots: { index: false, follow: false },
};

export default function NotificationsRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-white/[0.08] bg-[#0a0b0e]/80 px-4 py-10 text-center text-sm text-zinc-500">
          Yükleniyor…
        </div>
      }
    >
      <AdminNotificationsPage />
    </Suspense>
  );
}
