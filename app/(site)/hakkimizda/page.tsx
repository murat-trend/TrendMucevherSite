import type { Metadata } from "next";
import { HakkimizdaClient } from "./HakkimizdaClient";

export const metadata: Metadata = {
  title: "About",
  description:
    "Murat Kaynaroğlu — jewelry designer since 2005. Creator of cast-ready 3D jewelry models for workshops worldwide.",
  alternates: { canonical: "https://trendmucevher.com/hakkimizda/" },
};

export default function HakkimizdaPage() {
  return <HakkimizdaClient />;
}
