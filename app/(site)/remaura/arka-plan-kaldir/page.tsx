import type { Metadata } from "next";
import { RemauraWorkspace } from "@/components/remaura/RemauraWorkspace";
import { RemauraLandingHeader } from "@/components/remaura/RemauraLandingHeader";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://trendmucevher.com";
const pageUrl = `${siteUrl}/remaura/arka-plan-kaldir`;

export const metadata: Metadata = {
  title: "Arka Plan Kaldirma Araci | Remaura AI",
  description:
    "Takı urun fotografi arka planini temizleyin, metal tonunu ayarlayin ve e-ticaret icin PNG/JPG olarak hizlica disa aktarın.",
  alternates: {
    canonical: "/remaura/arka-plan-kaldir",
  },
  keywords: [
    "arka plan kaldırma aracı",
    "takı fotoğrafı düzenleme",
    "mücevher ürün görseli",
    "png ürün fotoğrafı",
    "remaura",
  ],
  openGraph: {
    title: "Arka Plan Kaldirma Araci | Remaura AI",
    description:
      "Mucevher urun gorselleri icin arka plan kaldirma ve hizli export araci.",
    url: pageUrl,
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: "Arka Plan Kaldirma Araci",
      inLanguage: "tr-TR",
    },
    {
      "@type": "Service",
      name: "Remaura AI Arka Plan Kaldirma",
      serviceType: "Image Background Removal",
      areaServed: "TR",
      provider: {
        "@type": "Organization",
        name: "Trend Mucevher",
      },
    },
  ],
};

export default function RemauraBackgroundLandingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <RemauraLandingHeader
        title="Arka Plan Kaldirma Araci"
        description="Takı gorsellerini pazar yeri ve e-ticaret standartlarina uygun hale getirmek icin dogrudan bu ekrandan isleme baslayin."
      />
      <RemauraWorkspace initialCategory="background" />
    </>
  );
}

