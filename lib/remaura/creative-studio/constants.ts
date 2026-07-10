// AI CREATIVE STUDIO — sabitler: sektörler, platform preset'leri, video modları,
// fontlar, animasyonlar. UI etiketleri Türkçe (dev sürümü; remauraai'de i18n).

import type {
  ExportFormat,
  IndustryKey,
  ModuleKey,
  PlatformKey,
  TextAnimation,
  VideoModeKey,
  WatermarkPosition,
} from "./types";

export const MODULES: { key: ModuleKey; label: string; desc: string }[] = [
  { key: "image", label: "Görsel Stüdyo", desc: "Üründen pazarlama görseli üret" },
  { key: "video", label: "Video Stüdyo", desc: "Ürün videosu oluştur" },
  { key: "timeline", label: "Timeline", desc: "Böl, kırp, birleştir" },
  { key: "audio", label: "Ses Stüdyo", desc: "Müzik ve ses efektleri" },
  { key: "typography", label: "Tipografi", desc: "Yazı, font, animasyon" },
  { key: "thumbnail", label: "Thumbnail", desc: "Kapak görseli üret/düzenle" },
  { key: "brand", label: "Marka Kiti", desc: "Logo, renk, filigran" },
  { key: "assets", label: "Arşiv", desc: "Tüm varlıkların kütüphanesi" },
];

export const INDUSTRIES: { key: IndustryKey; label: string }[] = [
  { key: "jewelry", label: "Mücevher" },
  { key: "fashion", label: "Moda" },
  { key: "cosmetics", label: "Kozmetik" },
  { key: "electronics", label: "Elektronik" },
  { key: "home", label: "Ev & Yaşam" },
  { key: "furniture", label: "Mobilya" },
  { key: "food", label: "Yiyecek & İçecek" },
  { key: "digital", label: "Dijital Ürün" },
];

export interface PlatformPreset {
  key: PlatformKey;
  label: string;
  /** Ana video/görsel çıktı boyutu. */
  width: number;
  height: number;
  /** Thumbnail/kapak boyutu. */
  thumbWidth: number;
  thumbHeight: number;
  maxVideoSec: number;
}

export const PLATFORMS: PlatformPreset[] = [
  { key: "instagram", label: "Instagram", width: 1080, height: 1350, thumbWidth: 1080, thumbHeight: 1080, maxVideoSec: 90 },
  { key: "facebook", label: "Facebook", width: 1080, height: 1080, thumbWidth: 1200, thumbHeight: 630, maxVideoSec: 240 },
  { key: "tiktok", label: "TikTok", width: 1080, height: 1920, thumbWidth: 1080, thumbHeight: 1920, maxVideoSec: 180 },
  { key: "youtube", label: "YouTube", width: 1920, height: 1080, thumbWidth: 1280, thumbHeight: 720, maxVideoSec: 600 },
  { key: "etsy", label: "Etsy", width: 2000, height: 2000, thumbWidth: 570, thumbHeight: 456, maxVideoSec: 15 },
  { key: "shopify", label: "Shopify", width: 2048, height: 2048, thumbWidth: 1600, thumbHeight: 1600, maxVideoSec: 60 },
  { key: "woocommerce", label: "WooCommerce", width: 1200, height: 1200, thumbWidth: 800, thumbHeight: 800, maxVideoSec: 60 },
  { key: "pinterest", label: "Pinterest", width: 1000, height: 1500, thumbWidth: 1000, thumbHeight: 1500, maxVideoSec: 60 },
  { key: "amazon", label: "Amazon", width: 2000, height: 2000, thumbWidth: 1600, thumbHeight: 1600, maxVideoSec: 60 },
];

export function platformPreset(key: PlatformKey): PlatformPreset {
  return PLATFORMS.find((p) => p.key === key) ?? PLATFORMS[0];
}

export const VIDEO_MODES: { key: VideoModeKey; label: string; desc: string }[] = [
  { key: "basic", label: "Basic Motion", desc: "Sade zoom/pan hareketi, hızlı sonuç" },
  { key: "showcase", label: "Studio Showcase", desc: "Stüdyo ışığı, dönen ürün sunumu" },
  { key: "luxury", label: "Luxury", desc: "Karanlık zemin, dramatik ışık, premium his" },
  { key: "lifestyle", label: "Lifestyle", desc: "Gerçek yaşam sahnesi içinde ürün" },
  { key: "ai-motion", label: "AI Motion", desc: "Serbest yaratıcı hareket ve sahneler" },
];

export const GOOGLE_FONTS = [
  "Outfit",
  "Cormorant Garamond",
  "Playfair Display",
  "Montserrat",
  "Poppins",
  "Lora",
  "Raleway",
  "Oswald",
  "DM Serif Display",
  "Inter",
] as const;

export const TEXT_ANIMATIONS: { key: TextAnimation; label: string }[] = [
  { key: "none", label: "Yok" },
  { key: "fade", label: "Solarak Gir" },
  { key: "slide-up", label: "Aşağıdan Kay" },
  { key: "slide-left", label: "Sağdan Kay" },
  { key: "zoom", label: "Yakınlaş" },
  { key: "typewriter", label: "Daktilo" },
];

export const WATERMARK_POSITIONS: { key: WatermarkPosition; label: string }[] = [
  { key: "sol-ust", label: "Sol Üst" },
  { key: "sag-ust", label: "Sağ Üst" },
  { key: "sol-alt", label: "Sol Alt" },
  { key: "sag-alt", label: "Sağ Alt" },
  { key: "orta", label: "Orta" },
];

export const EXPORT_FORMATS: { key: ExportFormat; label: string; available: boolean }[] = [
  { key: "webm", label: "WEBM", available: true },
  { key: "mp4", label: "MP4", available: false },
  { key: "mov", label: "MOV", available: false },
];

export const AUDIO_MIMES = ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/aac", "audio/mp4", "audio/x-m4a"];

/** Autosave'e girecek data URL üst sınırı (localStorage kotası için). */
export const AUTOSAVE_ASSET_BYTE_LIMIT = 400 * 1024;
