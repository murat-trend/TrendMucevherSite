export type ChannelTab = "desc" | "tags" | "hash";

/** Kamera paneli / mesh odaklı görsel kompozisyon (prompt sonekleri için). */
export type CameraComposition = "none" | "front" | "angle45";

export type PlatformFormat =
  | "insta-post"
  | "story-reels"
  | "youtube-web"
  | "portrait"
  | "3d-export";

export const FORMAT_IDS: PlatformFormat[] = [
  "insta-post",
  "story-reels",
  "youtube-web",
  "portrait",
  "3d-export",
];

/** Mücevher tasarım panelinde gösterilmeyen formatlar (ör. 3D export). */
export const JEWELRY_DESIGN_EXCLUDED_FORMATS: readonly PlatformFormat[] = ["3d-export"];

export const IMAGE_SIZE_MAP: Record<PlatformFormat, { w: number; h: number }> = {
  "insta-post": { w: 1024, h: 1024 },
  "story-reels": { w: 1024, h: 1536 },
  "youtube-web": { w: 1536, h: 1024 },
  portrait: { w: 1024, h: 1536 },
  "3d-export": { w: 1024, h: 1024 },
};

/** Görsel açıklama ve negatif prompt textarea’ları (aynı yükseklik) için ortak üst sınır */
export const MAX_CHARS = 1000;
export const MAX_NEGATIVE_CHARS = MAX_CHARS;

/** Stil penceresi referans görsel yuvası (UI + API ortak) */
export const MAX_STYLE_REFERENCE_SLOTS = 2;

export type MainBlockId = "image" | "bgRemover" | "jewelry";

export const MAIN_CONTENT_BLOCK_ORDER: MainBlockId[] = [
  "image",
  "bgRemover",
  "jewelry",
];
