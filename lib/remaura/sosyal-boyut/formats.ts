/**
 * Sosyal Boyutlayıcı — format presetleri (çerçeveden bağımsız).
 * Mini-Canva editörü de bu listeyi paylaşabilir.
 */

export type SosyalFormat = {
  id: string;
  ad: string;
  sub: string;
  w: number;
  h: number;
  /** Varsayılan olarak seçili mi */
  on: boolean;
};

export const SOSYAL_FORMATLAR: SosyalFormat[] = [
  { id: "ig1", ad: "Instagram Gönderi", sub: "kare", w: 1080, h: 1080, on: true },
  { id: "ig45", ad: "Instagram Gönderi", sub: "4:5 portre", w: 1080, h: 1350, on: true },
  { id: "story", ad: "Story / Reels", sub: "dikey", w: 1080, h: 1920, on: true },
  { id: "fb", ad: "Facebook Gönderi", sub: "yatay", w: 1200, h: 630, on: true },
  { id: "x", ad: "X (Twitter)", sub: "yatay", w: 1600, h: 900, on: true },
  { id: "pin", ad: "Pinterest Pin", sub: "2:3 dikey", w: 1000, h: 1500, on: true },
  { id: "yt", ad: "YouTube Kapak", sub: "yatay", w: 1280, h: 720, on: false },
  { id: "li", ad: "LinkedIn", sub: "yatay", w: 1200, h: 627, on: false },
  { id: "etsy", ad: "Etsy / Pazaryeri", sub: "kare", w: 2000, h: 2000, on: true },
  { id: "wa", ad: "WhatsApp Durum", sub: "dikey", w: 1080, h: 1920, on: true },
];
