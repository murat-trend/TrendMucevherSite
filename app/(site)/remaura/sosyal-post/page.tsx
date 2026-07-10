import type { Metadata } from "next";
import { RemauraAccessGate } from "@/components/remaura/RemauraAccessGate";
import { SosyalPostClient } from "./SosyalPostClient";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://trendmucevher.com").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "Remaura Sosyal Post",
  description: "Ürün görselinizden Etsy / Instagram için hazır listing postu üretin.",
  alternates: { canonical: "/remaura/sosyal-post" },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Remaura Sosyal Post | Trend Mücevher",
    url: `${siteUrl}/remaura/sosyal-post`,
    type: "website",
  },
};

export default function SosyalPostPage() {
  return (
    <RemauraAccessGate categoryId="mesh3d">
      <SosyalPostClient />
    </RemauraAccessGate>
  );
}
