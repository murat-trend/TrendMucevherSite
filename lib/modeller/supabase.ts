export type DbProduct3D = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  story: string | null;
  content_source_locale?: string | null;
  translations?: Record<string, { name?: string; story?: string }> | null;
  name_en: string | null;
  name_de: string | null;
  name_ru: string | null;
  story_en: string | null;
  story_de: string | null;
  story_ru: string | null;
  jewelry_type: string | null;
  personal_price: number | null;
  commercial_price: number | null;
  glb_url: string | null;
  stl_url: string | null;
  thumbnail_url: string | null;
  thumbnail_front_url?: string | null;
  images: string[] | null;
  tags: string[] | null;
  image_alts: string[] | null;
  dimensions: unknown;
  is_published: boolean;
  /** products_3d.moderation_status — published | rejected | suspended | pending */
  moderation_status?: string | null;
  show_on_home: boolean;
  show_on_modeller: boolean;
  created_at: string;
  seller_note: string | null;
};

export type Ui3DModel = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  story: string;
  jewelryType: "Yüzük" | "Kolye" | "Bilezik" | "Küpe" | "Pandant" | "Broş";
  price: number;
  licensePersonalPrice: number | null;
  licenseCommercialPrice: number | null;
  glbUrl: string | null;
  stlUrl: string | null;
  thumbnailUrl: string | null;
  thumbnailViews: Partial<Record<"on" | "arka" | "kenar" | "ust", string | null>>;
  dimensions: { width: number; height: number; depth: number } | null;
  weight: number | null;
  isPublished: boolean;
  showOnHome: boolean;
  showOnModeller: boolean;
  story_en: string | null;
  story_de: string | null;
  story_ru: string | null;
  name_en: string | null;
  name_de: string | null;
  name_ru: string | null;
  translations?: Record<string, { name?: string; story?: string }> | null;
  contentSourceLocale?: string | null;
};

function normalizeJewelryType(value: string): Ui3DModel["jewelryType"] {
  const v = value.toLocaleLowerCase("tr-TR");
  if (v.includes("kolye")) return "Kolye";
  if (v.includes("bilezik")) return "Bilezik";
  if (v.includes("küpe") || v.includes("kupe")) return "Küpe";
  if (v.includes("pandant")) return "Pandant";
  if (v.includes("broş") || v.includes("bros")) return "Broş";
  return "Yüzük";
}

export function mapDbProductToUi(row: DbProduct3D): Ui3DModel {
  const rawDimensions = (row.dimensions ?? {}) as Record<string, unknown>;
  const width = Number(rawDimensions.width ?? 0);
  const height = Number(rawDimensions.height ?? 0);
  const depth = Number(rawDimensions.depth ?? 0);
  const weight = Number(rawDimensions.weight ?? 0);
  const rawImages = (row.images ?? []) as string[];

  const thumbnailViews: Partial<Record<"on" | "arka" | "kenar" | "ust", string | null>> = {
    on: rawImages[0] ?? null,
    arka: rawImages[1] ?? null,
    kenar: rawImages[2] ?? null,
    ust: rawImages[3] ?? null,
  };

  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    slug: row.slug,
    story: row.story ?? "",
    story_en: row.story_en ?? null,
    story_de: row.story_de ?? null,
    story_ru: row.story_ru ?? null,
    name_en: row.name_en ?? null,
    name_de: row.name_de ?? null,
    name_ru: row.name_ru ?? null,
    translations: row.translations ?? null,
    contentSourceLocale: row.content_source_locale ?? null,
    jewelryType: normalizeJewelryType(row.jewelry_type ?? ""),
    price: Number(row.personal_price ?? 0),
    licensePersonalPrice: row.personal_price ?? null,
    licenseCommercialPrice: row.commercial_price ?? null,
    glbUrl: row.glb_url,
    stlUrl: row.stl_url,
    thumbnailUrl: row.thumbnail_url,
    thumbnailViews,
    dimensions:
      width > 0 && height > 0 && depth > 0
        ? {
            width,
            height,
            depth,
          }
        : null,
    weight: weight > 0 ? weight : null,
    isPublished: row.is_published,
    showOnHome: row.show_on_home,
    showOnModeller: row.show_on_modeller,
  };
}

