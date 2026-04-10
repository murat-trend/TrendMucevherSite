import type { CameraComposition } from "@/components/remaura/remaura-types";

/**
 * MESH VE ÜRETİM ODAKLI KAMERA SİSTEMİ
 * Görselin sadece 'güzel' değil, teknik olarak 'üretilebilir' (mesh-ready) olmasını sağlar.
 */

export const CAMERA_PANEL_MAIN_PROMPT_SUFFIX: Record<Exclude<CameraComposition, "none">, string> = {
  front: " direct frontal view, perpendicular camera, 0-degree tilt, jewelry standing perfectly upright on its shank, symmetrical balance.",

  angle45:
    " The ring is photographed from a high three-quarter angle — imagine looking down at a ring on a table from a seated position. " +
    "The viewer simultaneously sees: the top/crown of the ring, the full decorative front face, the ornamental side of the band curving away, and a glimpse of the hollow inner shank through the opening at the bottom. " +
    "The ring stands upright on its band (shank vertical, crown on top) and is rotated roughly 10–20° so both the front face and a generous slice of the side band are visible. " +
    "Entire ring 100% within the frame, no cropping at any edge, generous breathing room around the piece.",
};

/**
 * Dahili yüzük kuralı (`internal-visual-rules`) ile aynı kaynak: `angle45` gövdesi, cümle içi kullanım için baştaki virgül atılır.
 */
export const RING_CAMERA_ANGLE45_BODY = CAMERA_PANEL_MAIN_PROMPT_SUFFIX.angle45.replace(/^,\s*/, "").trim();

/** PLATFORM BOYUTLARI (TikTok, YouTube, Instagram) */
export const PLATFORM_FORMAT_PROMPTS = {
  tiktok: "Aspect ratio 9:16, vertical framing, centered composition.",
  instagram: "Aspect ratio 1:1, square professional catalog framing.",
  youtube: "Aspect ratio 16:9, wide cinematic landscape framing, product centered.",
  portrait: "Aspect ratio 4:5, vertical portrait framing.",
};

/** MESH DERİNLİĞİ VE NETLİK KURALLARI */
export const PRODUCTION_QUALITY_SUFFIX =
  " Clean background, isolated product, high-contrast studio lighting to define mesh depth, zero lens distortion, photorealistic metal reflections.";

export function appendCameraMainSuffix(
  mainPrompt: string,
  composition: CameraComposition,
  platform: keyof typeof PLATFORM_FORMAT_PROMPTS = "instagram"
): string {
  if (composition === "none") return mainPrompt;

  const platformSuffix = PLATFORM_FORMAT_PROMPTS[platform] || PLATFORM_FORMAT_PROMPTS.instagram;
  const cameraSuffix = CAMERA_PANEL_MAIN_PROMPT_SUFFIX[composition];

  // Tüm teknik emirleri birleştirerek 'Sert' bir prompt oluşturur
  return `${mainPrompt} ${cameraSuffix} ${platformSuffix} ${PRODUCTION_QUALITY_SUFFIX}`;
}
