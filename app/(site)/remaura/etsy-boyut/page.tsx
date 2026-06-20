import type { Metadata } from "next";
import { RemauraAccessGate } from "@/components/remaura/RemauraAccessGate";
import EtsyBoyutClient from "./EtsyBoyutClient";

export const metadata: Metadata = {
  title: "Etsy Boyutlandırıcı | Remaura",
  robots: { index: false, follow: false },
};

export default function EtsyBoyutPage() {
  return (
    <RemauraAccessGate categoryId="etsy-boyut">
      <EtsyBoyutClient />
    </RemauraAccessGate>
  );
}
