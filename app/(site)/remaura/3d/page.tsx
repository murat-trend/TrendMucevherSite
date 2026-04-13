import type { Metadata } from "next";
import { Remaura3DLanding } from "./Remaura3DLanding";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://trendmucevher.com").replace(/\/$/, "");
const pageUrl = `${siteUrl}/remaura/3d`;

export const metadata: Metadata = {
  title: "Remaura AI 3D",
  description:
    "Görüntüden 3D model (Meshy Image-to-3D). Çalışma alanı Remaura panelinde REMAURA 3D AI sekmesinde.",
  alternates: {
    canonical: "/remaura/3d",
  },
  openGraph: {
    title: "Remaura AI 3D | Trend Mücevher",
    description: "Meshy Image-to-3D ile görüntüden 3D model; Remaura 3D AI sekmesi.",
    url: pageUrl,
    type: "website",
  },
};

export default function Remaura3DPage() {
  return <Remaura3DLanding />;
}
