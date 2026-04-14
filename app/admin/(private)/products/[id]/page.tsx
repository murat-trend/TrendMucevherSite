import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { ProductModerationDetailView } from "@/components/admin/product-moderation/ProductModerationDetailView";
import type {
  ProductDetailFull,
  ProductModerationStatus,
} from "@/components/admin/product-moderation/product-moderation-detail-data";

type Props = { params: Promise<{ id: string }> };

async function fetchProductDetail(id: string): Promise<ProductDetailFull | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("products_3d")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  const row = data as typeof data & {
    seller_id?: string | null;
    seller_email?: string | null;
    updated_at?: string | null;
  };

  const status = (row.moderation_status ?? "pending") as ProductModerationStatus;
  const price = Number(row.personal_price ?? 0);
  const rawImages = (row.images ?? {}) as Record<string, unknown>;

  const thumbImages: ProductDetailFull["images"] = (
    ["on", "arka", "kenar", "ust"] as const
  )
    .filter((k) => typeof rawImages[k] === "string")
    .map((k) => ({ id: `${id}-${k}`, alt: k }));

  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    seller: row.seller_email ?? row.seller_id ?? "Bilinmiyor",
    sellerStatus: "Aktif",
    category: row.jewelry_type ?? "3D Model",
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
    shortDescription: row.story ?? "",
    longDescription: row.story ?? "",
    status,
    risk: "Düşük",
    riskScore: 0,
    price,
    stock: 0,
    variantCount: 0,
    compareAtPrice: row.commercial_price ?? null,
    lowStockWarning: false,
    priceAnomaly: false,
    images: thumbImages,
    variants: [],
    contentChecks: {
      descriptionOk: Boolean(row.story),
      categoryMatch: Boolean(row.jewelry_type),
      bannedPhrases: false,
      duplicateContentRisk: false,
    },
    sellerTotalSales: 0,
    sellerReturnRate: 0,
    sellerRating: 0,
    moderationChecks: {
      imagesOk: thumbImages.length > 0,
      categoryOk: Boolean(row.jewelry_type),
      descriptionOk: Boolean(row.story),
      priceOk: price > 0,
      stockOk: true,
      policyOk: true,
    },
    riskFlags: {
      duplicateProduct: false,
      suspiciousWording: false,
      missingCategory: !row.jewelry_type,
      missingMedia: thumbImages.length === 0,
      manualNote: null,
    },
    tabNotes: [],
    tabHistory: [],
    tabMessages: [],
    similarProducts: [],
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = await fetchProductDetail(id);
  if (!p) return { title: "Ürün | Super Admin" };
  return {
    title: `${p.name} | Ürün Denetimi`,
    robots: { index: false, follow: false },
  };
}

export default async function AdminProductModerationDetailPage({ params }: Props) {
  const { id } = await params;
  const product = await fetchProductDetail(id);
  if (!product) notFound();
  return <ProductModerationDetailView initial={product} />;
}
