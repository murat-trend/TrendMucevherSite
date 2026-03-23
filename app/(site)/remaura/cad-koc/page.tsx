import type { Metadata } from "next";
import { RemauraLandingHeader } from "@/components/remaura/RemauraLandingHeader";
import { RemauraCadCoachSection } from "@/components/remaura/RemauraCadCoachSection";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://trendmucevher.com";
const pageUrl = `${siteUrl}/remaura/cad-koc`;

export const metadata: Metadata = {
  title: "Rhino Ring Tutor | Remaura AI",
  description:
    "Premium single-page tutor for step-by-step ring construction education in Rhino/MatrixGold workflows.",
  alternates: {
    canonical: "/remaura/cad-koc",
  },
  openGraph: {
    title: "Rhino Ring Tutor | Remaura AI",
    description: "Interactive jewelry CAD training canvas for ring construction logic and workflow guidance.",
    url: pageUrl,
    type: "website",
  },
};

export default function RemauraCadKocPage() {
  return (
    <>
      <RemauraLandingHeader
        title="Rhino Ring Tutor"
        description="Interactive ring modeling tutor for Rhino and MatrixGold workflows. Learn method, order, and connection logic step by step."
      />
      <RemauraCadCoachSection />
    </>
  );
}
