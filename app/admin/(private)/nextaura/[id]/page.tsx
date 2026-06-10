import type { Metadata } from "next";
import { NextauraFirmDetail } from "@/components/admin/nextaura/NextauraFirmDetail";

export const metadata: Metadata = {
  title: "Firma Detayı | Nextaura Admin",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ id: string }> };

export default async function AdminNextauraFirmPage({ params }: Props) {
  const { id } = await params;
  return <NextauraFirmDetail firmId={id} />;
}
