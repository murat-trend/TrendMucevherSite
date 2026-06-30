// Remaura "Sıvı" — .rema düzenlenebilir model formatının çekirdeği.
// Geometri-bağımsız: okuma/yazma + komut registry'si. Motor (THREE/gltf) ayrı takılır.
// Tasarım: docs/remaura-sivi-RD.md

export * from "./types";
export * from "./io";
export * from "./registry";

import { REMA_VERSION, type RemaDocument } from "./types";

/** Boş bir tarif üret (sadece taban geometri; henüz işlem yok). */
export function createEmptyDocument(baseFileName = "base.glb"): RemaDocument {
  return { version: REMA_VERSION, base: baseFileName, operations: [], curves: [] };
}
