import type { Metadata } from "next";
import { RemauraWorkspace } from "@/components/remaura/RemauraWorkspace";
import { RemauraLandingHeader } from "@/components/remaura/RemauraLandingHeader";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://trendmucevher.com";
const pageUrl = `${siteUrl}/remaura`;

export const metadata: Metadata = {
  title: "Remaura AI | Takı Gorsel Duzenleme ve Arka Plan Kaldirma",
  description:
    "Remaura AI ile taki gorsellerinde arka plan kaldirma, metal tonu duzeltme ve vitrin uyumlu export islemlerini tek ekranda yonetin.",
  alternates: {
    canonical: "/remaura",
  },
  keywords: [
    "arka plan kaldirma",
    "takı görsel düzenleme",
    "mücevher fotoğraf düzenleme",
    "remaura ai",
    "e-ticaret ürün görseli",
  ],
  openGraph: {
    title: "Remaura AI | Taki Gorsel Is Akisi",
    description:
      "Takı odaklı arka plan kaldırma, metal ton ayarı ve hızlı export iş akışını tek panelde kullanın.",
    url: pageUrl,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Remaura AI | Taki Gorsel Is Akisi",
    description: "Arka plan kaldirma ve urun gorseli optimizasyonunu tek adimda yonetin.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: "Remaura AI Landing",
      description:
        "Remaura AI ile takı görselleri için arka plan kaldırma, tonlama ve export optimizasyonu.",
      inLanguage: "tr-TR",
    },
    {
      "@type": "SoftwareApplication",
      name: "Remaura AI",
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "TRY",
      },
      featureList: [
        "Arka plan kaldirma",
        "Metal ton ayarlari",
        "Studio ve vitrin isigi presetleri",
        "PNG/JPG export",
      ],
    },
    {
      "@type": "HowTo",
      name: "Taki urunu arka planindan ayirma",
      totalTime: "PT2M",
      step: [
        { "@type": "HowToStep", name: "Gorsel yukle" },
        { "@type": "HowToStep", name: "Arka plani kaldir" },
        { "@type": "HowToStep", name: "Metal tonu ve isik ayarla" },
        { "@type": "HowToStep", name: "PNG veya JPG olarak indir" },
      ],
    },
  ],
};

export default function RemauraPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <RemauraLandingHeader
        title="Remaura AI ile Taki Gorsellerini Dakikalar Icinde Hazirla"
        description="Arka plani temizle, metal tonunu duzelt, e-ticaret ve sosyal medya icin tek tikla dogru formatta indir."
      />
      <RemauraWorkspace />
    </>
  );
}
