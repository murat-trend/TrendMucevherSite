import type { Metadata } from "next";
import { RemauraAccessGate } from "@/components/remaura/RemauraAccessGate";
import { MeshTemizleClient } from "./MeshTemizleClient";

export const metadata: Metadata = {
  title: "Remaura Mesh Temizleme & Gramaj",
  robots: { index: false, follow: false },
};

export default function MeshTemizlePage() {
  return (
    <RemauraAccessGate categoryId="mesh-temizle">
      <MeshTemizleClient />
    </RemauraAccessGate>
  );
}
