/**
 * Mücevher üretiminde kamera rejimi — UI yok; yalnızca kullanıcı promptundaki anahtar kelimeler.
 * Öncelik: yüzük → 45° kilit kuralı; aksi halde kolye/madalyon → tam ön; diğer → nötr (genel 3/4 ipucu).
 */
export type JewelryShotTrigger = "ring45" | "frontCatalog" | "neutral";

/**
 * `\b` yalnızca ASCII [A-Za-z0-9_] için çalışır; "yüzük" içinde `ü` yüzünden kelime içinde sahte sınır oluşur.
 * Unicode harf/rakam olmayan yerlerde kelime sınırı say.
 */
function hasUnicodeBoundaryWord(text: string, alternation: string): boolean {
  return new RegExp(`(^|[^\\p{L}\\p{N}])(${alternation})(?=[^\\p{L}\\p{N}]|$)`, "iu").test(
    text
  );
}

function mentionsRing(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    hasUnicodeBoundaryWord(text, "yüzük|yuzuk|alyans") ||
    /\b(ring|wedding band|eternity ring|signet)\b/.test(lower) ||
    /\b(trauring|ehering|fingerring|siegelring)\b/.test(lower) ||
    hasUnicodeBoundaryWord(text, "кольцо|обручальное кольцо|перстень")
  );
}

function mentionsNecklaceOrMedallion(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    /\b(kolye|madalyon)\b/i.test(text) ||
    /\b(necklace|medallion|pendant)\b/i.test(lower) ||
    /\b(halskette|anhänger|medaillon)\b/.test(lower) ||
    hasUnicodeBoundaryWord(text, "колье|медальон|подвеска")
  );
}

/** Görsel üretim / ön görünüm istisnası gibi yerlerde ham veya zenginleştirilmiş metin için */
export function promptTextContainsRingKeyword(text: string): boolean {
  return mentionsRing(text);
}

/** Birden fazla metin birleştirilir (ham prompt + optimize çıktısı vb.) */
export function detectJewelryShotFromUserPrompt(...parts: (string | undefined | null)[]): JewelryShotTrigger {
  const text = parts.filter(Boolean).join("\n");
  if (!text.trim()) return "neutral";
  if (mentionsRing(text)) return "ring45";
  if (mentionsNecklaceOrMedallion(text)) return "frontCatalog";
  return "neutral";
}
