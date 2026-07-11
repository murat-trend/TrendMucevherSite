import type { Metadata } from "next";
import { RemauraAccessGate } from "@/components/remaura/RemauraAccessGate";
import { SiviClient } from "./SiviClient";

export const metadata: Metadata = {
  title: "Remaura Sıvı — Kalıp Döküm",
  robots: { index: false, follow: false },
};

export default function SiviPage() {
  return (
    <RemauraAccessGate categoryId="sivi">
      <SiviClient />
    </RemauraAccessGate>
  );
}
