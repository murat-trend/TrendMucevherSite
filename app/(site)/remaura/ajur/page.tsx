import type { Metadata } from "next";
import { RemauraAccessGate } from "@/components/remaura/RemauraAccessGate";
import { AjurClient } from "./AjurClient";

export const metadata: Metadata = {
  title: "Remaura Ajur & Arka Kesim",
  robots: { index: false, follow: false },
};

export default function AjurPage() {
  return (
    <RemauraAccessGate categoryId="ajur">
      <AjurClient />
    </RemauraAccessGate>
  );
}
