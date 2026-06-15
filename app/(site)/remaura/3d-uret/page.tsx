import type { Metadata } from "next";
import { RemauraAccessGate } from "@/components/remaura/RemauraAccessGate";
import { Uretim3DClient } from "./Uretim3DClient";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://trendmucevher.com").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "Remaura 3D Üret",
  description:
    "Mücevher görselinizi yükleyin, yapay zeka ile 3D modele dönüştürün.",
  alternates: { canonical: "/remaura/3d-uret" },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Remaura 3D Üret | Trend Mücevher",
    url: `${siteUrl}/remaura/3d-uret`,
    type: "website",
  },
};

export default function Uretim3DPage() {
  return (
    <RemauraAccessGate categoryId="mesh3d">
      <Uretim3DClient />
    </RemauraAccessGate>
  );
}
