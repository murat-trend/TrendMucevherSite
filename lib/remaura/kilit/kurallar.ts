// KİLİT MOTORU — KURAL SABİTLERİ
// Tek kaynak: lib/remaura/kilit/KILIT.md (kural kimlikleri oradan).
// İlke: keyfi sayı yok; [KALİBRE] etiketliler atölye doğrulamasıyla güncellenir.

// ---- MADENLER (zincir G6 kartlarıyla aynı; yoğunluk g/mm³)
export const MADENLER = {
  au8: { ad: "8 Ayar Altın", yogunlukGmm3: 0.0112 },
  au14: { ad: "14 Ayar Altın", yogunlukGmm3: 0.0131 },
  au14r: { ad: "14 Ayar Roz Altın", yogunlukGmm3: 0.0131 },
  au18: { ad: "18 Ayar Altın", yogunlukGmm3: 0.01535 },
  au22: { ad: "22 Ayar Altın", yogunlukGmm3: 0.01775 },
  ag925: { ad: "925 Gümüş", yogunlukGmm3: 0.01036 },
  pt950: { ad: "950 Platin", yogunlukGmm3: 0.0207 },
} as const;
export type MadenId = keyof typeof MADENLER;

export type KilitTipId = "kutu" | "toggle" | "kanca" | "istakoz" | "miknatis";

export type KilitKart = {
  ad: string;
  aciklama: string;
  uretim: "dokum" | "hazir" | "v2";
  rozet: string;
};

export const TIPLER: Record<KilitTipId, KilitKart> = {
  kutu: {
    ad: "Kutu Kilit",
    aciklama: "Küba/gurmet standardı — gövde döküm, dil hadde sac (KK)",
    uretim: "dokum", rozet: "gövde döküm · dil sac",
  },
  toggle: {
    ad: "Toggle (T-bar)",
    aciklama: "Bar + halka — tamamı dökülür; ağır kolyeye uygun (TG)",
    uretim: "dokum", rozet: "tam döküm",
  },
  kanca: {
    ad: "Kanca (S)",
    aciklama: "Gerilimli kullanım — ağır parçada tek başına emniyetsiz (KN)",
    uretim: "dokum", rozet: "döküm · gerilimli",
  },
  istakoz: {
    ad: "İstakoz",
    aciklama: "İç çelik yay — dökülemez, hazır satın alınır (HZ1)",
    uretim: "hazir", rozet: "hazır alınır",
  },
  miknatis: {
    ad: "Mıknatıslı",
    aciklama: "Yuva dökülür, NdFeB sonradan yapıştırılır (MB) — v2",
    uretim: "v2", rozet: "v2",
  },
};

// ---- KK: kutu kilit
export const KUTU = {
  boyFn: (w: number) => 18 + 0.75 * w,      // KK1 [HESAP — K-2 serisi uyumlu]
  duvarMm: (w: number) => (w < 8 ? 0.5 : 0.7), // KK2 [PRATİK]
  dilSacMm: (w: number) => (w < 8 ? 0.4 : 0.7), // KK6 [PRATİK]
  icYukseklikOran: 2.75,   // KK3: iç H = 2.75 × katlı dil [PRATİK+HESAP]
  girisPayYukMm: 0.08,     // KK5: giriş yuvası yükseklik payı (0.05-0.1)
  girisPayEnMm: 0.1,       // KK5
  dilEnPayMm: 0.2,         // KK7: dil eni = iç en − 0.2
  vSerbestOran: 1.75,      // KK8: V serbest açıklık = 1.75 × giriş [KALİBRE]
  // KK9 — buton (10mm sınıfı taban değerleri; ×w/10 ölçeklenir)
  buton10: { enMm: 3, boyMm: 2, hMm: 3, centikMm: 0.7, tasmaMm: 0.7 },
  butonStrokMm: 1.0,       // KK4: pencere boyu = buton + strok [KALİBRE]
  halkaDelikMm: 2.0,       // bağlantı halkası iç delik (zincir son baklası)
} as const;

// ---- TG: toggle
export const TOGGLE = {
  barOran: 2.2,            // TG1: bar = 2.2 × halka iç çapı (güvenli bant)
  barOranMin: 2.0,
  barOranMax: 2.5,
  halkaTelMinMm: 1.4,      // TG2
  barTelOran: 1.3,         // TG2: bar teli = halka × 1.2-1.4 ortası
  barTelMinMm: 1.9,        // TG2
  icCapVarsayilanMm: 12,   // takı ölçeği 10-18
  icCapMinMm: 10, icCapMaxMm: 18,
} as const;

// ---- KN: kanca
export const KANCA = {
  telOran: 1.35,           // KN2: zincir teli × 1.2-1.5 ortası [KALİBRE]
  telMinMm: 1.0,
  icYaricapOran: 2.0,      // KN2: iç yarıçap ≥ 2×tel
  agizPayMm: 0.3,          // KN2: ağız = karşı halka teli + 0.3 [KALİBRE]
} as const;

// ---- HZ1: istakoz eşleşme tablosu (hazır komponent — bilgi kartı)
export const ISTAKOZ_TABLO: { boyMm: number; zincir: string }[] = [
  { boyMm: 10, zincir: "≤2 mm ince zincir" },
  { boyMm: 12, zincir: "2-4 mm standart kolye/bileklik" },
  { boyMm: 15, zincir: "4-6 mm ağır zincir" },
  { boyMm: 21, zincir: "6-8 mm kalın erkek zinciri" },
  { boyMm: 30, zincir: "çok ağır / aksesuar" },
];

// ---- GE: eşleşme önerisi
export function kilitOner(zincirGenislikMm: number): string {
  if (zincirGenislikMm <= 4) return "istakoz (hazır)";
  if (zincirGenislikMm < 6) return "büyük istakoz veya kutu kilit";
  if (zincirGenislikMm < 10) return "kutu kilit + 1 sekiz emniyeti (KK11)";
  return "kutu kilit + 2 sekiz emniyeti (KK11)";
}

export const OLCU = {
  zincirGenislikMinMm: 2, zincirGenislikMaxMm: 16, zincirGenislikVarsayilanMm: 8,
  zincirTelVarsayilanMm: 2.2, // kanca/toggle tel türetimi için zincir teli
} as const;
