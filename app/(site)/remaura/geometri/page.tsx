import type { Metadata } from "next";
import { RemauraAccessGate } from "@/components/remaura/RemauraAccessGate";
import { GeometriClient } from "./GeometriClient";

export const metadata: Metadata = {
  title: "Remaura Geometri",
  robots: { index: false, follow: false },
};

export default function GeometriPage() {
  return (
    <RemauraAccessGate categoryId="geometri">
      <GeometriClient />
    </RemauraAccessGate>
  );
}
