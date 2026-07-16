// ZİNCİR MOTORU — KURAL SABİTLERİ
// Tek kaynak: lib/remaura/zincir/ZINCIR.md (kural kimlikleri oradan).
// İlke: keyfi sayı yok — her sabit kural numarası taşır; [KALİBRE] etiketliler
// Murat'ın atölye ölçümüyle güncellenecek.

// ---- MADENLER (G6 — SUYOLU M4 kartları; yoğunluk g/mm³)
export const MADENLER = {
  au8: { ad: "8 Ayar Altın", yogunlukGmm3: 0.0112 },
  au14: { ad: "14 Ayar Altın", yogunlukGmm3: 0.0131 },
  au18: { ad: "18 Ayar Altın", yogunlukGmm3: 0.01535 },
  au22: { ad: "22 Ayar Altın", yogunlukGmm3: 0.01775 },
  ag925: { ad: "925 Gümüş", yogunlukGmm3: 0.01036 },
  pt950: { ad: "950 Platin", yogunlukGmm3: 0.0207 },
} as const;
export type MadenId = keyof typeof MADENLER;

// ---- K1: v1 tipleri (K3 Türkçe adlarıyla)
export type ZincirTipId = "forse" | "doc" | "gurmet" | "kuba" | "figaro";

export type TipKart = {
  ad: string;
  aciklama: string;
  // B8 (2026-07-16, Murat): genişlik W = DIŞ GÖRÜNÜM, tel çapı d = METAL —
  // ikisi AYRI parametredir. Bakla iç ölçüleri ikisinden türer:
  //   W_i = W − 2d (iç en) · L_i = disBoyFn(W) − 2d (iç boy)
  // d inceldikçe bakla ferahlar, gram düşer; görünüm genişliği korunur.
  disBoyFn: (W: number) => number;  // L_o — bakla dış boyu (görünümden türer)
  telVarsayilanBolen: number;       // d varsayılan = W / bölen (B1-B4 dolu hali)
  caprazGecis: boolean;             // bükümlü aile: yuvadan tel 45° çapraz
                                    // geçer → 1.41d yer ister (B2-CAD)
  bukumDeg: number;       // B5: curb ailesi 90 (uçlar ±45 — mating'i BÜKÜM
                          // sağlar, gövde düz yatar), forse 0
  yatisDeg: number;       // forse/doç: alternatif bakla dönüşü (90° dik);
                          // curb ailesi 0 — özdeş bakla dizilimi
  trasVarsayilan: number; // T1-T4: toplam kalınlıktan alınan oran (0 = yok)
  ajurUygun: boolean;     // A1: yalnız düz yatan geniş yüzlü tipler
};

// D1 adım formülü TEK'tir (zincir.ts): p(a,b) = (L_i(a)+L_i(b))/4 + d + C2/2
// — eş baklalarda L_i/2 + d + C2/2'ye iner; j±2 dış yüzeyleri arasında tam
// C2 boşluğu kalır (tek parça döküm garantisi). Forse için de aynı formül
// (L_o/2 + C2/2'ye denk gelir) ve taut sınırı L_i'nin altında kalır.
//
// disBoyFn/bölen katsayıları eski d-tabanlı oranların birebir W karşılığıdır
// (varsayılan telde geometri değişmez): forse L_o=5d, dışEn=3.75d → 1.333W ·
// doç L_o=dışEn=4.5d → W · gurmet L_o=4.7d, dışEn=4d → 1.175W ·
// Küba L_o=4.83d+0.5, dışEn=3.55d → 1.361W+0.5 · figaro=gurmet bandı.
export const TIPLER: Record<ZincirTipId, TipKart> = {
  forse: {
    ad: "Forse", aciklama: "Klasik oval halka — 90° dik alternasyon (cable)",
    disBoyFn: (W) => 1.333 * W,       // B4
    telVarsayilanBolen: 3.75,
    caprazGecis: false,
    bukumDeg: 0, yatisDeg: 90,
    trasVarsayilan: 0, ajurUygun: false,
  },
  doc: {
    ad: "Doç", aciklama: "Yuvarlak halka (rolo) — forsenin boy=en hali",
    disBoyFn: (W) => W,               // daire: L_o = dış en
    telVarsayilanBolen: 4.5,
    caprazGecis: false,
    bukumDeg: 0, yatisDeg: 90,
    trasVarsayilan: 0, ajurUygun: false,
  },
  gurmet: {
    ad: "Gurmet", aciklama: "Curb — bükümlü bakla, düz yatar, traşlı yüz",
    disBoyFn: (W) => 1.175 * W,       // B3: L_o≈4.7d @ d=W/4
    telVarsayilanBolen: 4.0,
    caprazGecis: true,
    bukumDeg: 90, yatisDeg: 0,        // B5 + B6
    trasVarsayilan: 0.15, ajurUygun: true,
  },
  kuba: {
    ad: "Küba", aciklama: "Miami cuban — sıkı dizilim, dolgun kesit, çift traş",
    // B2-CAD: dolu Miami'de L_i = 2.83d + 0.5, W_i = 1.55d (kesişim taraması
    // 2026-07-16). W karşılığı: L_o = 1.361W + 0.5; varsayılan tel W/3.55 =
    // en dolgun (solid) hal — Murat 2026-07-16: gramaj kullanıcı tercihinde,
    // tel inceltilerek hedef grama inilir (B8).
    disBoyFn: (W) => 1.361 * W + 0.5,
    telVarsayilanBolen: 3.55,
    caprazGecis: true,
    bukumDeg: 90, yatisDeg: 0,
    trasVarsayilan: 0.2, ajurUygun: true,
  },
  figaro: {
    ad: "Figaro", aciklama: "3 kısa + 1 uzun desen (B7) — gurmet tabanlı",
    disBoyFn: (W) => 1.175 * W,
    telVarsayilanBolen: 4.0,
    caprazGecis: true,
    bukumDeg: 90, yatisDeg: 0,
    trasVarsayilan: 0.15, ajurUygun: true,
  },
};

// B8 — tel çapı sınırları (kural-türevli, keyfi sayı yok):
//   max: iç ende çapraz/dik geçen komşu tel + C2 boşluğu sığmalı:
//        çapraz (curb ailesi): W − 2d ≥ 1.41d + C2 → d ≤ (W − C2)/3.41
//        dik (forse/doç):      W − 2d ≥ d + C2     → d ≤ (W − C2)/3
//   min: D7 döküm tabanı 0.5mm (0.5 dolar ama distorsiyonlu; 0.8 altı
//        UI'da uyarılır — D5 yapısal duvar bandı).
export function telSinir(tip: ZincirTipId, genislikMm: number): {
  minMm: number; maxMm: number; varsayilanMm: number;
} {
  const k = TIPLER[tip];
  const bosluk = DOKUM.baklaBoslukMm;
  const max = k.caprazGecis
    ? (genislikMm - bosluk) / 3.41
    : (genislikMm - bosluk) / 3.0;
  const min = Math.min(0.5, max);
  const varsayilan = Math.min(Math.max(genislikMm / k.telVarsayilanBolen, min), max);
  return { minMm: min, maxMm: max, varsayilanMm: varsayilan };
}

// D1 adım payı: p = (L_i(a)+L_i(b))/4 + d + adimPay — tarama sonuçları
// (2026-07-16): forse/doç 0.15 · gurmet/figaro 0.25 · Küba 0.30 (C2 0.2 ✓)
export const ADIM_PAYI_MM: Record<ZincirTipId, number> = {
  forse: 0.15, doc: 0.15, gurmet: 0.25, kuba: 0.3, figaro: 0.25,
};

// B7: figaro deseni — adet oranı 3:1, uzun bakla boyu = kısa × FIGARO_UZUN_ORAN
export const FIGARO = { kisaAdet: 3, uzunOran: 2.2 } as const; // 2-2.5 bandı ortası

// ---- T kuralları: traş
export const TRAS = {
  pasDerinligiMm: 0.08,     // T1: 0.05-0.10/yüz (patent bandı ortası)
  minKalanOran: 0.8,        // T2: kalan kalınlık ≥ 0.8×d [HESAP-KALİBRE]
  maxOran: 0.35,            // T2'den türetilen slider tavanı
} as const;

// ---- A kuralları: ajur
export const AJUR = {
  ucTamponOran: 0.25,       // A2: bakla boyunun %25'i uçlardan korunur [KALİBRE]
  delikAlanTavan: 0.30,     // A3: serbest bölgede delik alanı ≤ %30
  delikAlanUyari: 0.20,     // A3/A6: %20 üstü "etkin E −%26+" uyarısı
  duvarMm: 0.8,             // A4: delik-kenar köprüsü (döküm duvarı)
} as const;

// ---- C kuralları: döküm
export const DOKUM = {
  baklaBoslukMm: 0.3,       // C2: tek parça dökümde bakla arası tasarım boşluğu
  cekmePayi: { au: 0.015, ag: 0.02, pt: 0.02 }, // C5 — [KALİBRE]
} as const;

// ---- Ö kuralları: ölçülendirme
export const OLCU = {
  kolyeMm: [400, 450, 500, 550, 600],       // Ö1
  bileklikKadinMm: 180, bileklikErkekMm: 210, // Ö2
  uzunlukMinMm: 150, uzunlukMaxMm: 650,
  kolyeVarsayilanMm: 500,                    // Ö1: erkek standardı alt ucu
  genislikMinMm: 2, genislikMaxMm: 16, genislikVarsayilanMm: 8, // Ö4
} as const;

// ---- G çapaları (sanity-check; motor geometriden hesaplar)
export const GRAMAJ_CAPALARI = [
  { ad: "8mm Miami Küba 14k", gCm: 1.97, kural: "G1" },
  { ad: "4mm gurmet Ag925", gCm: 0.205, kural: "G2" },
  { ad: "12mm curb 14k (Uverly)", gCm: 1.31, kural: "G4" },
] as const;
