// AI CREATIVE STUDIO — domain tipleri (çerçeveden bağımsız çekirdek).
// Tüm modüller (görsel, video, timeline, ses, tipografi, thumbnail, marka, arşiv)
// bu tek tip setini paylaşır; UI katmanı buradan türetilir.

export type ModuleKey =
  | "image"
  | "video"
  | "timeline"
  | "audio"
  | "typography"
  | "thumbnail"
  | "brand"
  | "assets";

export type IndustryKey =
  | "jewelry"
  | "fashion"
  | "cosmetics"
  | "electronics"
  | "home"
  | "furniture"
  | "food"
  | "digital";

export type PlatformKey =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "youtube"
  | "etsy"
  | "shopify"
  | "woocommerce"
  | "pinterest"
  | "amazon";

export type VideoModeKey = "basic" | "showcase" | "luxury" | "lifestyle" | "ai-motion";

export type AssetKind = "image" | "video" | "stl" | "audio";

export type ExportFormat = "webm" | "mp4" | "mov";

export type TextAnimation = "none" | "fade" | "slide-up" | "slide-left" | "zoom" | "typewriter";

export type WatermarkPosition = "sol-ust" | "sag-ust" | "sol-alt" | "sag-alt" | "orta";

export interface Asset {
  id: string;
  kind: AssetKind;
  name: string;
  mimeType: string;
  /** Byte cinsinden orijinal boyut. */
  size: number;
  /**
   * Küçük varlıklar data URL olarak taşınır ve autosave'e girer;
   * büyükler (video/STL) sadece oturum içinde bellekte tutulur.
   */
  dataUrl?: string;
  createdAt: number;
}

export type TrackKind = "video" | "audio";

export interface Clip {
  id: string;
  /** Arşivdeki kaynak varlık; AI üretimlerinde de doldurulur. */
  assetId: string | null;
  label: string;
  /** Timeline üzerindeki başlangıç (saniye). */
  start: number;
  /** Timeline üzerindeki süre (saniye). */
  duration: number;
  /** Kaynak medyada nereden başladığı (trim/split için, saniye). */
  inPoint: number;
  /** Ses klipleri için 0–1 kazanç. */
  gain?: number;
  /** Ses klipleri için fade süresi (saniye). */
  fadeIn?: number;
  fadeOut?: number;
}

export interface Track {
  id: string;
  kind: TrackKind;
  label: string;
  clips: Clip[];
}

export interface TextOverlay {
  id: string;
  text: string;
  fontFamily: string;
  fontWeight: number;
  /** 1080p referans tuvale göre px. */
  sizePx: number;
  color: string;
  animation: TextAnimation;
  start: number;
  duration: number;
  /** 0–1 normalize konum (tuval oranından bağımsız). */
  x: number;
  y: number;
}

export interface BrandKit {
  logoAssetId: string | null;
  /** Marka renkleri (kullanıcı verisi olduğu için serbest hex). */
  colors: string[];
  fontFamily: string;
  watermark: {
    enabled: boolean;
    text: string;
    opacity: number; // 0–1
    position: WatermarkPosition;
  };
}

export interface Project {
  id: string;
  version: 1;
  name: string;
  industry: IndustryKey;
  platform: PlatformKey;
  videoMode: VideoModeKey;
  assets: Asset[];
  tracks: Track[];
  overlays: TextOverlay[];
  brand: BrandKit;
  updatedAt: number;
}

/** Undo/redo'nun kapsadığı düzenlenebilir alt-küme. */
export interface EditableState {
  tracks: Track[];
  overlays: TextOverlay[];
}

export interface GenerateRequest {
  type: "image" | "thumbnail" | "video";
  prompt: string;
  industry: IndustryKey;
  platform: PlatformKey;
  videoMode?: VideoModeKey;
  /** Ürün referans görseli (data URL) — varsa üretim buna sadık kalır. */
  productImage?: string;
}

export interface GenerateResponse {
  image?: string; // data URL
  error?: string;
}

export function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
