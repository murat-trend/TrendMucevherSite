import type { Metadata } from "next";
import { FiyatlandirmaClient } from "./FiyatlandirmaClient";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Personal and commercial license options for professional 3D jewelry models. Instant download, ready for casting.",
  alternates: { canonical: "https://trendmucevher.com/fiyatlandirma/" },
};

export default function FiyatlandirmaPage() {
  return <FiyatlandirmaClient />;
}
