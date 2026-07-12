import type { Metadata } from "next";
import { FotoIyilestirClient } from "./FotoIyilestirClient";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://trendmucevher.com";
const pageUrl = `${siteUrl}/remaura/foto-iyilestir`;

export const metadata: Metadata = {
  title: "Mücevher Fotoğraf İyileştirme | Remaura AI",
  description:
    "Telefonla çektiğiniz takı fotoğrafını satışa hazır ürün fotoğrafına çevirin: otomatik iyileştirme, arka plan temizliği, stüdyo zemini, gölge ve metal tonu — ücretsiz.",
  alternates: {
    canonical: "/remaura/foto-iyilestir",
  },
  keywords: [
    "takı fotoğrafı iyileştirme",
    "mücevher fotoğraf düzenleme",
    "arka plan kaldırma",
    "ürün fotoğrafı yapma",
    "telefon fotoğrafı iyileştirme",
    "remaura",
  ],
  openGraph: {
    title: "Mücevher Fotoğraf İyileştirme | Remaura AI",
    description:
      "Telefon fotoğrafını profesyonel ürün fotoğrafına çeviren ücretsiz araç: otomatik iyileştirme, temiz zemin, gölge, metal tonu.",
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
      name: "Mücevher Fotoğraf İyileştirme Aracı",
      inLanguage: "tr-TR",
    },
    {
      "@type": "SoftwareApplication",
      name: "Remaura AI Fotoğraf İyileştirme",
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "TRY" },
      featureList: [
        "Otomatik beyaz dengesi ve pozlama düzeltme",
        "Arka plan temizliği",
        "Stüdyo zemini ve kontakt gölge",
        "Metal tonu ayarı",
        "Keskinlik ve gürültü giderme",
        "PNG/JPG dışa aktarım",
      ],
    },
    {
      "@type": "HowTo",
      name: "Telefon fotoğrafını ürün fotoğrafına çevirme",
      totalTime: "PT1M",
      step: [
        { "@type": "HowToStep", name: "Fotoğrafı yükle" },
        { "@type": "HowToStep", name: "Otomatik İyileştir'e tıkla" },
        { "@type": "HowToStep", name: "Zemin, gölge ve metal tonunu seç" },
        { "@type": "HowToStep", name: "PNG veya JPG olarak indir" },
      ],
    },
  ],
};

export default function FotoIyilestirPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FotoIyilestirClient />
    </>
  );
}
