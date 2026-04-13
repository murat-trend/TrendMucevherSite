export type ThumbnailViewKey = "on" | "arka" | "kenar" | "ust";
export const THUMBNAIL_VIEW_KEYS: ThumbnailViewKey[] = ["on", "arka", "kenar", "ust"];

export function getModelGlbUrl(slug: string): string {
  return `/models/${slug}.glb`;
}

/** Relative `/models/...` paths resolve against optional NEXT_PUBLIC_MODEL_FILES_BASE_URL (e.g. staging/prod origin when local public/models is empty). */
export function resolvePublicModelAssetUrl(pathOrUrl: string): string {
  const s = String(pathOrUrl ?? "").trim();
  if (!s) return s;
  if (/^https?:\/\//i.test(s)) return s;
  const path = s.startsWith("/") ? s : `/${s}`;
  const base = (process.env.NEXT_PUBLIC_MODEL_FILES_BASE_URL ?? "").trim().replace(/\/$/, "");
  if (base) return `${base}${path}`;
  return path;
}

export function getThumbnailViewUrl(slug: string, view: ThumbnailViewKey): string {
  return `/thumbnails/${slug}-${view}.webp`;
}

export type PublishTargets = {
  modeller: boolean;
  homeFeatured: boolean;
  urunler: boolean;
};

export type Stored3DModel = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  glbUrl?: string | null;
  stlUrl?: string | null;
  thumbnailUrl?: string | null;
  thumbnailViews?: Partial<Record<ThumbnailViewKey, string | null>>;
  jewelryType: "Yüzük" | "Kolye" | "Bilezik" | "Küpe" | "Pandant" | "Broş";
  price: number;
  story: string;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  } | null;
  weight?: number | null;
  licensePersonalEnabled?: boolean;
  licensePersonalPrice?: number | null;
  licenseCommercialEnabled?: boolean;
  licenseCommercialPrice?: number | null;
  hasGlb: boolean;
  hasStl: boolean;
  hasThumbnail: boolean;
  glbFileName?: string | null;
  stlFileName?: string | null;
  thumbnailFileName?: string | null;
  thumbnailViewFileNames?: Partial<Record<ThumbnailViewKey, string | null>>;
  isPublished: boolean;
  publishTargets: PublishTargets;
  /** Satıcı metin kaynağı: tr | en | de | ru */
  contentSourceLocale?: string | null;
};

