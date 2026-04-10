import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Remaura AI 3D",
  description:
    "Görüntüden 3D model (Meshy Image-to-3D). Çalışma alanı Remaura panelinde REMAURA 3D AI sekmesinde.",
  alternates: {
    canonical: "/remaura?category=mesh3d",
  },
};

export default function Remaura3DPage() {
  redirect("/remaura?category=mesh3d");
}

