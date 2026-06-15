/**
 * 3D-ÜRET izole panel — promtların KOPYASI.
 *
 * Bu dosya, çalışan sayfalardaki (koleksiyon-edit, mesh3d) açı/stil promtlarının
 * BİREBİR kopyasıdır. Orijinaller ASLA bozulmaz; bu panel kendi kopyasıyla
 * çalışır, böylece yeni sayfa için serbestçe temizlenip geliştirilebilir.
 *
 * Kaynaklar:
 *  - lib/remaura/internal-visual-rules.ts → buildRingThreeQuarterBlock
 *  - app/api/remaura/koleksiyon-edit/gemini-uret/route.ts → KAMERA map
 *  - app/api/remaura/koleksiyon-edit/uret/route.ts → TAKI/METAL/FORM map
 */

/** İzole panelin desteklediği kategoriler (V1 lansman). */
export type Uretim3DKategori = "Yüzük" | "Kolye Ucu";

/** Yüzük kamera kilidi için sabit önek (kaynak: internal-visual-rules). */
export const RING_VIEW_SENTINEL = "<<<REMAURA_3DURET_RING_VIEW>>>";

/** Kullanıcı metninden İngilizce metal ifadesi çıkarır. */
export function inferRingMetalPhrase(userText: string): string {
  const hasGold =
    /\b(altın|altin|gold|rose\s*gold|yellow\s*gold|white\s*gold|14k|18k|22k|24k|14\s*ayar|18\s*ayar|22\s*ayar)\b/i.test(
      userText
    );
  const hasSilver =
    /\b(gümüş|gumus|silver|sterling|925|oxidized\s*silver|oksitli\s*gümüş|oksitli\s*gumus)\b/i.test(
      userText
    );
  if (hasGold && hasSilver) return "gold and silver";
  if (hasGold) return "gold";
  if (hasSilver) return "silver";
  return "gold or silver";
}

/**
 * Yüzük için kilit kamera paragrafı (UI'da gizli).
 * Kaynak: internal-visual-rules.ts → buildRingThreeQuarterBlock (birebir kopya).
 * Referans: üst-ön 3/4 perspektif; parmak deliği açık ve görünür.
 */
export function buildRingThreeQuarterBlock(metalContext: string): string {
  const metal = inferRingMetalPhrase(metalContext);
  return `${RING_VIEW_SENTINEL}
CAMERA: Three-quarter high-angle product shot of a ${metal} ring.
HORIZONTAL ORBIT: Camera orbits 30° to the right of front-center (2 o'clock position). The ring's front face and right side band are both visible.
VERTICAL TILT: Camera elevated 45° above the ring, looking down. High-angle, NOT eye-level.
RING POSE: Standing upright on shank, band vertical, decorative head on top. NOT lying flat, NOT on its side.
MUST SEE: Front face at an angle + side band curving away showing thickness and surface detail + top of crown from above + the finger opening (inner hollow) clearly visible and OPEN at the bottom of the ring, showing empty space through the band — this hole must not be blocked or hidden.
DO NOT: Frontal straight-on shot, top-down bird's-eye into the opening, ring lying horizontal, eye-level perspective, finger hole hidden or closed.
FRAMING: Centered, entire ring in frame with margin, ring fills 75% of frame height.
LIGHTING: Strong upper-left directional light, crisp specular highlights on metal, deep shadows in recesses.`.trim();
}

/** Kolye Ucu / Madalyon için tam-ön kamera kuralı (kaynak: gemini-uret KAMERA). */
export const PENDANT_CAMERA_BLOCK =
  "CAMERA: front-facing orthographic view, pendant perfectly centered and symmetric, " +
  "entire piece flat and parallel to the camera plane, no perspective distortion, " +
  "relief and engraving clearly readable, upper bail/chain loop visible at top, " +
  "pure white background.";

/**
 * Kategoriye göre 3D-üretim kamera bloğunu döndürür.
 * Yüzük → 45° üç-çeyrek; Kolye Ucu → tam ön.
 */
export function buildKameraBlock(
  kategori: Uretim3DKategori,
  metalContext: string
): string {
  if (kategori === "Yüzük") return buildRingThreeQuarterBlock(metalContext);
  return PENDANT_CAMERA_BLOCK;
}

/**
 * İşçilik kalite promtu — Fal/koleksiyon promtlarından damıtılmış gizli kelimeler.
 * 3D motorlarına temiz, keskin, mesh-ready bir yüzey gitmesini sağlar.
 */
export const ISCILIK_KALITE_BLOCK =
  "Enhance craftsmanship to luxury jewelry CAD standard: sharp micro-details, " +
  "clean polished metal surfaces, crisp edges, well-defined filigree and engraving, " +
  "even reflective highlights that reveal surface depth, no blur, no noise, " +
  "isolated single object on pure white background, no hands, no fingers, no model.";

export const TAKI_TIPI_EN: Record<Uretim3DKategori, string> = {
  "Yüzük": "ring",
  "Kolye Ucu": "pendant",
};

export const METAL_RENGI_EN: Record<string, string> = {
  "Sarı Altın": "18k yellow gold",
  "Rose Gold": "18k rose gold",
  "Beyaz Altın": "18k white gold",
  "Gümüş": "sterling silver",
  "Oksitlenmiş Gümüş": "oxidized silver",
};
