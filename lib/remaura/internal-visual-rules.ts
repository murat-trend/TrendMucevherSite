/**
 * Görsel modeline eklenen dahili kurallar. Yalnızca API route’larından import edin;
 * istemci bundle’ına alınmamalı (kullanıcı arayüzünde gösterilmez).
 *
 * Yüzük kamera standardı = `camera-prompt.ts` içindeki `RING_CAMERA_ANGLE45_BODY` (angle45 soneki ile tek kaynak);
 * dik duruş, kadraj, mesh netliği; yatay flat-lay yok.
 */

import { RING_CAMERA_ANGLE45_BODY } from "@/lib/remaura/camera-prompt";

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
 * Yüzük butonu aktifken modele giden kilit paragraf (kullanıcı arayüzünde gösterilmez).
 * `contextPrompt`: görünür kullanıcı promptu + birleşik üretim metni — metal çıkarımı için.
 */
export function buildRingThreeQuarterBlock(metalContext: string): string {
  const metal = inferRingMetalPhrase(metalContext);
  return `${RING_VIEW_SENTINEL}
REMAURA RING CAMERA (camera panel angle45): Professional macro jewelry photography of a ${metal} ring, ${RING_CAMERA_ANGLE45_BODY}

Table and crown must read clearly in frame.

ORIENTATION — CRITICAL: Do NOT show the ring lying flat on the ground plane with the shank fully horizontal like a flat-lay product on a desk. Avoid "ring asleep on the surface". Present the ring upright, steeply banked, or on a minimal slim stand / discreet support so the stone table faces substantially toward the lens; the band may touch a dark base at one point but the hero pose is table-forward, not parallel to the floor.

GEOMETRY: Sharp silhouette lines, zero warping, no barrel distortion; crisp prongs/bezel, inner shank curve visible where the angle allows; high-relief on shank reads with deep shadows. Controlled directional studio lighting, technical reference quality.`.trim();
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
