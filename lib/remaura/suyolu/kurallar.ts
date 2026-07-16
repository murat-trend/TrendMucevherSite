// SUYOLU MOTORU — KURAL SABİTLERİ
// Tek kaynak: lib/remaura/suyolu/SUYOLU.md (kural kimlikleri oradan).
// İlke: keyfi sayı yok — her sabit kural numarası taşır; [KALİBRE] etiketliler
// Murat'ın atölye ölçümüyle güncellenecek.

// ---- MADENLER (M4 + kimlik bölümü; yoğunluk g/mm³)
export const MADENLER = {
  au8: { ad: "8 Ayar Altın", yogunlukGmm3: 0.0112, kaynak: "KALİBRE — yaklaşık (Au333 tipik ~11.2 g/cm³, kaynaklı kart eksik)" },
  au14: { ad: "14 Ayar Altın", yogunlukGmm3: 0.0131, kaynak: "Kitco/derleme 12.9-13.4 ortası" },
  au18: { ad: "18 Ayar Altın", yogunlukGmm3: 0.01535, kaynak: "Total Materia 15.2-15.5 ortası" },
  au22: { ad: "22 Ayar Altın", yogunlukGmm3: 0.01775, kaynak: "derleme 17.7-17.8" },
  ag925: { ad: "925 Gümüş", yogunlukGmm3: 0.01036, kaynak: "ESPI Metals (KANITLI)" },
  pt950: { ad: "950 Platin", yogunlukGmm3: 0.0207, kaynak: "Pt950 tipik 20.6-20.9 (saf Pt 21.45 DEĞİL)" },
} as const;
export type MadenId = keyof typeof MADENLER;

// ---- TAŞ CİNSLERİ (T3/T4)
export const TAS_CINSLERI = {
  pirlanta: { ad: "Pırlanta", yogunlukGmm3: 0.00352, toleransMm: 0.05, esdegerCarpani: 1 },
  // CZ aynı mm serisiyle kesilir; karat etiketi "pırlanta eşdeğeri", gerçek gram ×~1.7 (T4)
  cz: { ad: "Zirkon (CZ)", yogunlukGmm3: 0.0058, toleransMm: 0.02, esdegerCarpani: 5.8 / 3.52 },
} as const;
export type TasCinsiId = keyof typeof TAS_CINSLERI;

// ---- T2: mm ↔ ct (Stuller resmi çapaları, KANITLI) + formül
// ct = çap² × derinlik(mm) × 0.0061; derinlik = 0.61×çap (T1) → ct = 0.0037210×d³
export const MM_CT_CAPALARI: [number, number][] = [
  [1.0, 0.005], [1.2, 0.0075], [1.3, 0.01], [1.5, 0.015], [1.7, 0.02],
  [1.8, 0.025], [2.0, 0.03], [2.2, 0.04], [2.4, 0.05], [2.5, 0.06],
  [3.0, 0.10], [3.4, 0.15], [3.5, 0.16], [3.8, 0.22], [4.1, 0.25],
  [4.4, 0.33], [4.8, 0.40], [5.2, 0.50], [6.4, 1.00],
];

// ---- T1: taş CAD oranları (HRD Excellent bantlarından, KANITLI)
export const TAS_ORAN = {
  derinlik: 0.61,       // toplam yükseklik / çap
  tac: 0.15,            // taç (girdle üstü) / çap
  girdle: 0.03,         // girdle kalınlığı / çap
  tabla: 0.57,          // tabla çapı / çap (HRD EX %52-62 ortası)
  pavyonAciDeg: 41.0,   // HRD EX 40.6-41.8
} as const;

// ---- S kuralları: oturtma
export const OTURTMA = {
  kanalAciklikOran: 0.95,     // S1: kanal açıklığı = çapın %95'i (Stuller yuvarlak)
  seatGirdleOran: 0.98,       // S2: yuva kesici = girdle'ın %98'i (sıkı geçme)
  azureOran: 0.60,            // S12: ışık deliği = çapın %50-67'si → 0.60
  tasArasiMinMm: 0.15,        // S11: girdle-girdle minimum (Stuller)
  pavyonBoslukMm: 0.25,       // S10: pavyon-taban boşluğu (pırlanta 0.2-0.3)
  polisajPayiMm: 0.2,         // S14: CAD = bitmiş + 0.2 (Stuller)
} as const;

// S4: kanal duvarı taş boyuna göre (Stuller, KANITLI)
export function kanalDuvariMm(tasCapMm: number): number {
  if (tasCapMm < 1.8) return 0.5;
  if (tasCapMm <= 2.5) return 0.65;
  return 0.8;
}

// ---- B kuralları: bakla/mafsal
export const MAFSAL = {
  pimCapMm: 1.0,          // B1: çift-kesme formülü, P=200N SF=2 sterling sonucu
  pimBoslukMm: 0.06,      // B3: dönebilir alıştırma (üretimde broşlanır; CAD payı)
  knuckleEtMm: 0.8,       // B2: delik çevresi döküm eti → dış çap = pim + 1.6
  stopIcDeg: 16,          // B5: içe bükülme stop (patent 16-18°)
  stopDisDeg: 0,          // B5: ters katlanma dik omuz
  kulakBoslukMm: 0.15,    // menteşe çatal-kulak yanal hareket boşluğu
  eklemBoslukMm: 0.2,     // komşu baklalar arası zincir-yönü boşluk
} as const;

// ---- D kuralları: döküm
export const DOKUM = {
  tabanEtMm: 0.8,         // D5: yapısal dış duvar minimumu
  cekmePayi: { au: 0.015, ag: 0.02, pt: 0.02 }, // D1-D4: CAD ölçek başlangıcı — [KALİBRE: kendi zincirinde test dökümü]
} as const;

// ---- Ö kuralları: ölçülendirme
export const OLCU = {
  uzunlukMinMm: 150, uzunlukMaxMm: 210, uzunlukVarsayilanMm: 178, // Ö2: kadın standart 7"
  konforPayiMm: 12.7,     // Ö2: bilek + 12.7 normal
} as const;

/** T2: carat → çap (mm). Çapalar arası lineer; üstünde d = (ct/0.0037210)^(1/3). */
export function caratToCapMm(ct: number): number {
  const t = MM_CT_CAPALARI;
  if (ct <= t[0][1]) return t[0][0];
  for (let i = 0; i + 1 < t.length; i++) {
    const [d1, c1] = t[i], [d2, c2] = t[i + 1];
    if (ct >= c1 && ct <= c2) return d1 + ((ct - c1) / (c2 - c1)) * (d2 - d1);
  }
  return Math.cbrt(ct / 0.003721);
}

/** T2 ters: çap (mm) → carat. */
export function capToCaratMm(dMm: number): number {
  const t = MM_CT_CAPALARI;
  if (dMm <= t[0][0]) return t[0][1];
  for (let i = 0; i + 1 < t.length; i++) {
    const [d1, c1] = t[i], [d2, c2] = t[i + 1];
    if (dMm >= d1 && dMm <= d2) return c1 + ((dMm - d1) / (d2 - d1)) * (c2 - c1);
  }
  return 0.003721 * dMm ** 3;
}
