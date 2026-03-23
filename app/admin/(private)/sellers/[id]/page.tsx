import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSellerDetail } from "@/components/admin/sellers/seller-detail-data";
import { SellerDetailView } from "@/components/admin/sellers/SellerDetailView";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const d = getSellerDetail(id);
  if (!d) return { title: "Satıcı | Super Admin" };
  return {
    title: `${d.storeName} | Satıcı`,
    robots: { index: false, follow: false },
  };
}

export default async function AdminSellerDetailPage({ params }: Props) {
  const { id } = await params;
  const detail = getSellerDetail(id);
  if (!detail) notFound();
  return <SellerDetailView initialDetail={detail} />;
}
