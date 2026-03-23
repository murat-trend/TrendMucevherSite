import type { Metadata } from "next";
import { RemauraWorkspace } from "@/components/remaura/RemauraWorkspace";
import { RemauraLandingHeader } from "@/components/remaura/RemauraLandingHeader";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://trendmucevher.com";
const pageUrl = `${siteUrl}/remaura/foto-edit`;

export const metadata: Metadata = {
  title: "Foto Edit | Remaura AI",
  description:
    "Telefonla cekilen taki gorsellerini hizli duzeltme, renk/kontrast ayari ve e-ticaret odakli cikti alma araci.",
  alternates: {
    canonical: "/remaura/foto-edit",
  },
  openGraph: {
    title: "Foto Edit | Remaura AI",
    description: "Telefon fotoğraflarını hızlıca e-ticaret kalitesine getirin.",
    url: pageUrl,
    type: "website",
  },
};

export default function RemauraPhotoEditPage() {
  return (
    <>
      <RemauraLandingHeader
        title="Foto Edit Kategorisi"
        description="Telefonla cekilen urun gorsellerini duzenlemek icin hizli araclara bu sayfadan ulasin."
      />
      <RemauraWorkspace initialCategory="photoEdit" />
    </>
  );
}

