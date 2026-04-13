"use client";

import KampanyaYonetimi from "@/components/satici/KampanyaYonetimi";
import { SaticiNav } from "@/app/(site)/satici/dashboard/page";
import { useLanguage } from "@/components/i18n/LanguageProvider";

export default function SaticiKampanyalarimPage() {
  const { t } = useLanguage();
  const sc = t.sellerCampaigns;

  return (
    <div className="min-h-screen bg-background">
      <SaticiNav active="campaigns" />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-2xl font-medium tracking-[-0.02em] text-foreground sm:text-3xl">{sc.pageTitle}</h1>
        <div className="mt-8">
          <KampanyaYonetimi />
        </div>
      </div>
    </div>
  );
}
