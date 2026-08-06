/**
 * MÜŞTERİ ATÖLYESİ — tür kataloğu.
 *
 * Hem istemci (çip listesi) hem sunucu (prompt) bu listeyi kullanır; bu yüzden
 * dosyada `server-only` YOK. Liste kapalı değil — tasarımcı serbest metinle
 * listede olmayan bir tür de yazabilir.
 */

export type Tur = {
  /** İstemci anahtarı */
  id: string;
  /** Arayüzde görünen ad */
  tr: string;
  /** Prompt'a giren İngilizce karşılık — tür adı ne kadar netse çıktı o kadar sadık */
  en: string;
};

export const TURLER: Tur[] = [
  { id: "kedi", tr: "Kedi", en: "cat" },
  { id: "yunus", tr: "Yunus Balığı", en: "dolphin" },
  { id: "panda", tr: "Panda", en: "giant panda" },
  { id: "golden", tr: "Köpek (Golden)", en: "golden retriever puppy" },
  { id: "baykus", tr: "Baykuş", en: "owl" },
  { id: "denizati", tr: "Deniz Atı", en: "seahorse" },
  { id: "koala", tr: "Koala", en: "koala" },
  { id: "japon-baligi", tr: "Japon Balığı", en: "goldfish" },
  { id: "kartal", tr: "Kartal", en: "eagle" },
  { id: "ayi", tr: "Ayı", en: "bear cub" },
  { id: "civciv", tr: "Civciv", en: "baby chick" },
  { id: "penguen", tr: "Penguen", en: "penguin" },
  { id: "leopar", tr: "Leopar", en: "leopard cub" },
  { id: "tavsan", tr: "Tavşan", en: "rabbit" },
];

export function turAdi(idVeyaAd: string): { tr: string; en: string } {
  const bulunan = TURLER.find((t) => t.id === idVeyaAd);
  if (bulunan) return { tr: bulunan.tr, en: bulunan.en };
  // Listede yoksa tasarımcının yazdığı metin doğrudan kullanılır.
  const serbest = idVeyaAd.trim();
  return { tr: serbest, en: serbest };
}
