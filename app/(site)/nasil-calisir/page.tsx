import type { Metadata } from "next";
import { NasilCalisirClient } from "./NasilCalisirClient";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "Download cast-ready STL and GLB jewelry models. Buy, download, produce — instant digital delivery.",
  alternates: { canonical: "https://trendmucevher.com/nasil-calisir/" },
};

export default function NasilCalisirPage() {
  return <NasilCalisirClient />;
}
