import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductDetail } from "@/components/admin/product-moderation/product-moderation-detail-data";
import { ProductModerationDetailView } from "@/components/admin/product-moderation/ProductModerationDetailView";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = getProductDetail(id);
  if (!p) return { title: "Ürün | Super Admin" };
  return {
    title: `${p.name} | Ürün Denetimi`,
    robots: { index: false, follow: false },
  };
}

export default async function AdminProductModerationDetailPage({ params }: Props) {
  const { id } = await params;
  const product = getProductDetail(id);
  if (!product) notFound();
  return <ProductModerationDetailView initial={product} />;
}
