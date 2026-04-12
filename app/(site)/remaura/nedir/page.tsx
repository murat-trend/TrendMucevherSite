import type { Metadata } from "next";
import RemauraNedirClient from "./RemauraNedirClient";

const pageUrl = "https://trendmucevher.com/remaura/nedir";

export const metadata: Metadata = {
  title: "REMAURA AI Nedir? | Yapay Zeka ile Mücevher Tasarımı ve 3D Üretim Platformu",
  description:
    "REMAURA AI, takı ve dijital üretim sektörüne özel tasarımdan satışa kadar tüm süreci otomatikleştiren dünyanın ilk yapay zekâ destekli uçtan uca üretim ve satış platformudur.",
  alternates: { canonical: "/remaura/nedir" },
  keywords: [
    "REMAURA AI",
    "yapay zeka mücevher tasarımı",
    "3D takı modeli",
    "dijital mücevher üretim platformu",
    "AI takı tasarımı",
  ],
  openGraph: {
    title: "REMAURA AI Nedir? | Yapay Zeka ile Mücevher Tasarımı",
    description: "Tasarımdan satışa tek platform. REMAURA AI ile mücevher sektöründe dijital dönüşüm.",
    url: pageUrl,
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "REMAURA AI",
  description:
    "Takı ve dijital üretim sektörüne özel, tasarımdan satışa kadar süreçleri yapay zekâ ile destekleyen uçtan uca üretim ve satış platformu.",
  applicationCategory: "DesignApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "TRY",
  },
};

export default function RemauraNedirPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <RemauraNedirClient />
    </>
  );
}
