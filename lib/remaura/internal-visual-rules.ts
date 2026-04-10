/**
 * Görsel modeline eklenen dahili kurallar. Yalnızca API route’larından import edin;
 * istemci bundle’ına alınmamalı (kullanıcı arayüzünde gösterilmez).
 *
 * Yüzük kamera standardı: referans timsah yüzük fotoğrafı — üst-ön 3/4 perspektif.
 */

/** Strip ve teşhis için sabit önek (metal cümlesi değişse bile aynı kalır) */
export const RING_VIEW_SENTINEL = "<<<REMAURA_INTERNAL_RING_VIEW>>>";

/** Kullanıcı metninden İngilizce metal ifadesi (yüzük görsel promptu için) */
export function inferRingMetalPhrase(userText: string): string {
  const hasGold =
    /\b(altın|altin|gold|rose\s*gold|yellow\s*gold|white\s*gold|14k|18k|22k|24k|14\s*ayar|18\s*ayar|22\s*ayar)\b/i.test(
      userText
    );
  const hasSilver =
    /\b(gümüş|gumus|silver|sterling|925|oxidized\s*silver|oksitli\s*gümüş|oksitli\s*gumus)\b/i.test(userText);
  if (hasGold && hasSilver) return "gold and silver";
  if (hasGold) return "gold";
  if (hasSilver) return "silver";
  return "gold or silver";
}

/**
 * Yüzük tetiklendiğinde modele giden kilit kamera paragrafı (UI'da gizli).
 * `metalContext`: kullanıcı metni — metal çıkarımı için.
 *
 * Referans açı: Timsah başlı altın yüzük referans fotoğrafı — üst-ön 3/4 perspektif.
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

/**
 * @param prompt — modele giden birleşik metnin sonuna blok eklenir
 * @param metalHint — isteğe bağlı; kullanıcının yazdığı görsel açıklama (TR metal kelimeleri için)
 */
export function appendRingThreeQuarterRule(prompt: string, metalHint?: string): string {
  const t = prompt.trimEnd();
  const metalSource = [metalHint, t].filter((s) => s?.trim()).join("\n");
  const block = buildRingThreeQuarterBlock(metalSource);
  if (!t) return block;
  return `${t}\n\n${block}`;
}

export function stripRingThreeQuarterRule(full: string): string {
  const idx = full.indexOf(RING_VIEW_SENTINEL);
  if (idx < 0) return full;
  return full.slice(0, idx).trimEnd();
}
