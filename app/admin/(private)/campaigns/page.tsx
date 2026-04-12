import { Suspense } from "react";
import type { Metadata } from "next";
import { AdminCampaignsPage } from "@/components/admin/campaigns/AdminCampaignsPage";

export const metadata: Metadata = {
  title: "Kampanyalar | Super Admin",
  robots: { index: false, follow: false },
};

function CampaignsFallback() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0a0b0e] p-10 text-center text-sm text-zinc-500">
      Yükleniyor…
    </div>
  );
}

export default function AdminCampaignsRoutePage() {
  return (
    <Suspense fallback={<CampaignsFallback />}>
      <AdminCampaignsPage />
    </Suspense>
  );
}
