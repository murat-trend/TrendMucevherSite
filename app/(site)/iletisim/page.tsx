import type { Metadata } from "next";
import { IletisimClient } from "./IletisimClient";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with Trend Mücevher. Questions about 3D jewelry models, custom orders or partnerships.",
  alternates: { canonical: "https://trendmucevher.com/iletisim/" },
};

export default function IletisimPage() {
  return <IletisimClient />;
}
