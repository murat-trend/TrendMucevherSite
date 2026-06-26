import type { Metadata } from "next";
import { RemauraAccessGate } from "@/components/remaura/RemauraAccessGate";
import { HollowClient } from "./HollowClient";

export const metadata: Metadata = {
  title: "Remaura Hollow",
  robots: { index: false, follow: false },
};

export default function HollowPage() {
  return (
    <RemauraAccessGate categoryId="hollow">
      <HollowClient />
    </RemauraAccessGate>
  );
}
