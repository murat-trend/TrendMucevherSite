// ZİNCİR MOTORU — KURAL SABİTLERİ
// Tek kaynak: lib/remaura/zincir/ZINCIR.md (kural kimlikleri oradan).
// İlke: keyfi sayı yok — her sabit kural numarası taşır; [KALİBRE] etiketliler
// Murat'ın atölye ölçümüyle güncellenecek.

// ---- MADENLER (G6 — SUYOLU M4 kartları; yoğunluk g/mm³)
export const MADENLER = {
  au8: { ad: "8 Ayar Altın", yogunlukGmm3: 0.0112 },
  au14: { ad: "14 Ayar Altın", yogunlukGmm3: 0.0131 },
  au14r: { ad: "14 Ayar Roz Altın", yogunlukGmm3: 0.0131 }, // aynı ayar bandı [HESAP]
  au18: { ad: "18 Ayar Altın", yogunlukGmm3: 0.01535 },
  au22: { ad: "22 Ayar Altın", yogunlukGmm3: 0.01775 },
  ag925: { ad: "925 Gümüş", yogunlukGmm3: 0.01036 },
  pt950: { ad: "950 Platin", yogunlukGmm3: 0.0207 },
} as const;
export type MadenId = keyof typeof MADENLER;

// ---- K1: tipler (K3 Türkçe adlarıyla) + K5 yapı sınıfları
// K5 (Murat, 2026-07-17: "halat, venedik ve diğerleri de aktif olsun"):
//   bakla — tekil bakla CAD'i (gerçek üretim karşılığı birebir)
//   orgu  — MASİF ÖRGÜ YORUMU: damarlar tek gövdeye gömülü döküm (burma
//           geleneği); gerçek örme halat/spiga makine işidir (K2 geçerli)
//   boru  — MASİF/BORU YORUMU: dokulu gövde (yılan derisi, balıksırtı
//           çevronu); gerçek ürün esnek makine örgüsüdür (K2 geçerli)
export type ZincirTipId =
  | "forse" | "doc" | "gurmet" | "kuba" | "figaro" | "venedik"
  | "halat" | "spiga"
  | "yilan" | "baliksirti";
export type ZincirYapi = "bakla" | "orgu" | "boru";

export type TipKart = {
  ad: string;
  aciklama: string;
  yapi: ZincirYapi;       // K5 — client akışı ve denetim seti buradan dallanır
  kesitVarsayilan?: import("./bakla").TelKesit; // venedik: kare
  omurga?: import("./bakla").BaklaOmurga;       // K4 — venedik: kare çerçeve
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
    yapi: "bakla",
    disBoyFn: (W) => 1.333 * W,       // B4
    telVarsayilanBolen: 3.75,
    caprazGecis: false,
    bukumDeg: 0, yatisDeg: 90,
    trasVarsayilan: 0, ajurUygun: false,
  },
  doc: {
    ad: "Doç", aciklama: "Yuvarlak halka (rolo) — forsenin boy=en hali",
    yapi: "bakla",
    disBoyFn: (W) => W,               // daire: L_o = dış en
    telVarsayilanBolen: 4.5,
    caprazGecis: false,
    bukumDeg: 0, yatisDeg: 90,
    trasVarsayilan: 0, ajurUygun: false,
  },
  venedik: {
    ad: "Venedik", aciklama: "Küp/box — kare çerçeve bakla + kare tel",
    yapi: "bakla",
    kesitVarsayilan: "kare",          // K4 venedik kimliği (kare kesit)
    omurga: "kare",                   // K4: omurga da KARE ÇERÇEVE (2026-07-17
                                      // düzeltmesi — yuvarlak halka "ezbere"ydi)
    disBoyFn: (W) => W,               // kare çerçeve: L_o = dış en
    telVarsayilanBolen: 4.5,
    caprazGecis: false,
    bukumDeg: 0, yatisDeg: 90,
    trasVarsayilan: 0, ajurUygun: false,
  },
  gurmet: {
    ad: "Gurmet", aciklama: "Curb — bükümlü bakla, düz yatar, traşlı yüz",
    yapi: "bakla",
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
    yapi: "bakla",
  },
  figaro: {
    ad: "Figaro", aciklama: "3 kısa + 1 uzun desen (B7) — gurmet tabanlı",
    yapi: "bakla",
    disBoyFn: (W) => 1.175 * W,
    telVarsayilanBolen: 4.0,
    caprazGecis: true,
    bukumDeg: 90, yatisDeg: 0,
    trasVarsayilan: 0.15, ajurUygun: true,
  },
  // ---- K5 örgü tipleri (masif yorum — damar sayısı/pitch ORGU sabitlerinde)
  halat: {
    ad: "Halat", aciklama: "Burma/rope — masif örgü yorumu, tek gövde döküm",
    yapi: "orgu",
    disBoyFn: (W) => W, telVarsayilanBolen: 3.0, caprazGecis: false,
    bukumDeg: 0, yatisDeg: 0, trasVarsayilan: 0, ajurUygun: false,
  },
  spiga: {
    ad: "Spiga", aciklama: "Başak/wheat — süper-helis örgü yorumu, masif",
    yapi: "orgu",
    disBoyFn: (W) => W, telVarsayilanBolen: 3.6, caprazGecis: false,
    bukumDeg: 0, yatisDeg: 0, trasVarsayilan: 0, ajurUygun: false,
  },
  // ---- K5 boru tipleri (dokulu gövde yorumu)
  yilan: {
    ad: "Yılan", aciklama: "Snake — helis pullu boru yorumu (uçları açık)",
    yapi: "boru",
    disBoyFn: (W) => W, telVarsayilanBolen: 3.0, caprazGecis: false,
    bukumDeg: 0, yatisDeg: 0, trasVarsayilan: 0, ajurUygun: false,
  },
  baliksirti: {
    ad: "Balıksırtı", aciklama: "Herringbone — çevronlu yassı şerit yorumu",
    yapi: "boru",
    disBoyFn: (W) => W, telVarsayilanBolen: 3.0, caprazGecis: false,
    bukumDeg: 0, yatisDeg: 0, trasVarsayilan: 0, ajurUygun: false,
  },
};

// ---- K5 örgü/boru sabitleri
export const ORGU = {
  // halat: 3 damar tek yön sarım; pitch = 3×dış çap (TELKARI burgu bandı
  // 2.5-4×D ortası [PRATİK]); damarlar %12 gömme ile tek gövde (TELKARI §1.6)
  halat: { damar: 3, pitchOran: 3.0, gomme: 0.12 },
  // spiga: 4 damar süper-helis (ana sarım + ikincil kıvrım) — başak dokusunun
  // CAD yaklaşığı; ikincil yarıçap oranı görsel iterasyonla [KALİBRE]
  spiga: { damar: 4, pitchOran: 2.4, gomme: 0.12, ikincilOran: 0.35 },
} as const;

export const BORU = {
  // yılan: açık uçlu boru (iki uç = döküm drenajı, A5) + helis pul çentiği.
  // Et C4 tabanından (0.8); çentik derinliği/adımı zanaat görünümü [KALİBRE]
  yilan: { etMm: 0.8, centikDerinlikOran: 0.10, centikAdimOran: 0.6 },
  // balıksırtı: masif yassı şerit + iki sıra zıt eğik çevron çentiği.
  // Kalınlık oranı ve çevron açısı görsel [KALİBRE]; esnek DEĞİLDİR (K5)
  baliksirti: { kalinlikOran: 0.16, centikDerinlikOran: 0.35, centikAdimOran: 0.5, aciDeg: 35 },
} as const;

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
  venedik: 0.15,
  // örgü/boru tipleri bakla dizmez — adım kullanılmaz
  halat: 0, spiga: 0, yilan: 0, baliksirti: 0,
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

// ---- SP: saport/tij kuralları (D11 tabanlı — Murat, 2026-07-17:
// "yandan saport veya reçine için alttan takabilmeliyiz")
// D11: besleme kesiti bağlantının %70-150'i → çap ≈ 0.9×tel (alan ~%81);
// mutlak taban 0.8 (D5 duvar ailesi). Gömme: uç bakla yüzeyine 0.4 gömülür
// (traş/kavis yüzeyinde güvenli temas — TELKARI §1.6 mantığı).
export const SAPORT = {
  capOran: 0.9,
  capTabanMm: 0.8,
  capTavanMm: 3.0,
  boyVarsayilanMm: 3,
  boyMinMm: 2,
  boyMaxMm: 6,
  gommeMm: 0.4,
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
