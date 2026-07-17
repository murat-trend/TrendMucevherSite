// MONTÜR MOTORU — REÇETE (doğruluk kaynağı; MONTUR.md §0)
// Prompt/kaydıraç ne yazarsa yazsın geometriye clampRecete'den geçerek girer:
// her alan kural sınırına kısılır, kısılanlar notlara yazılır (sessiz kıstırma
// yok — kullanıcı neyin neden değiştiğini görür).

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

// T1 (HRD Excellent — SUYOLU mirası)
export const TAS_ORAN = {
  derinlik: 0.61, tac: 0.15, girdle: 0.03, tabla: 0.57,
} as const;

// T2: ct = 0.0037210 × çap³ (T1 derinliğiyle)
export const capToCt = (capMm: number): number => 0.003721 * capMm ** 3;
export const ctToCap = (ct: number): number => Math.cbrt(ct / 0.003721);

export type SankKesit = "yarimYuvarlak" | "dikdortgen";
export type KafaTip = "tirnak" | "bezel";

export type MonturRecete = {
  olcu: { euSize: number };                 // MR1: iç çevre mm (ISO 8653)
  sank: {
    genislikMm: number;                     // MS1
    kalinlikMm: number;                     // MS1
    kesit: SankKesit;                       // MS2
    taperOran: number;                      // MS3
  };
  kafa: {
    tip: KafaTip;
    tirnakSayisi: 4 | 6;                    // MK1
    tirnakCapMm: number | null;             // null = kuraldan (MK2/S7)
    bezelDuvarMm: number;                   // MB1
  };
  tas: { capMm: number };                   // MT1 (ct türetilir)
  maden: MadenId;
};

export const VARSAYILAN: MonturRecete = {
  olcu: { euSize: 54 },                     // MR2
  sank: { genislikMm: 2.2, kalinlikMm: 1.6, kesit: "yarimYuvarlak", taperOran: 1.25 },
  kafa: { tip: "tirnak", tirnakSayisi: 4, tirnakCapMm: null, bezelDuvarMm: 0.7 },
  tas: { capMm: 5.2 },                      // ≈ 0.50 ct (T2 çapası)
  maden: "au14",
};

// ---- sınır tablosu (MONTUR.md kural kimlikleriyle)
export const SINIR = {
  euSize: { min: 44, max: 72 },             // MR1
  sankGenislik: { min: 1.5, max: 6.0 },     // MS1
  sankKalinlik: { min: 1.2, max: 2.5 },     // MS1 (D5 taban)
  taper: { min: 1.0, max: 1.8 },            // MS3
  tirnakCap: { min: 0.45, oneriMin: 0.6, max: 2.0 }, // MK2/S7
  bezelDuvar: { min: 0.5, oneri: 0.7, max: 1.5 },    // MB1/D6
  tasCap: { min: 2.0, max: 10.0 },          // MT1 pratik solitaire bandı
} as const;

const num = (v: unknown, d: number): number =>
  typeof v === "number" && Number.isFinite(v) ? v : d;

function kistir(ad: string, v: number, min: number, max: number, notlar: string[]): number {
  if (v < min) { notlar.push(`${ad}: ${v} → ${min} (kural tabanı)`); return min; }
  if (v > max) { notlar.push(`${ad}: ${v} → ${max} (kural tavanı)`); return max; }
  return v;
}

/** Ham (prompt/AI/kaydıraç) reçeteyi kurallara kıstırır. Sessiz kıstırma yok. */
export function clampRecete(ham: unknown): { recete: MonturRecete; notlar: string[] } {
  const notlar: string[] = [];
  const h = (ham ?? {}) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const v = VARSAYILAN;
  const kesit: SankKesit = h.sank?.kesit === "dikdortgen" ? "dikdortgen" : "yarimYuvarlak";
  const kafaTip: KafaTip = h.kafa?.tip === "bezel" ? "bezel" : "tirnak";
  const tirnakSayisi: 4 | 6 = h.kafa?.tirnakSayisi === 6 ? 6 : 4;
  const tirnakCapHam = h.kafa?.tirnakCapMm;
  const recete: MonturRecete = {
    olcu: { euSize: kistir("EU ölçü (MR1)", num(h.olcu?.euSize, v.olcu.euSize), SINIR.euSize.min, SINIR.euSize.max, notlar) },
    sank: {
      genislikMm: kistir("şank genişlik (MS1)", num(h.sank?.genislikMm, v.sank.genislikMm), SINIR.sankGenislik.min, SINIR.sankGenislik.max, notlar),
      kalinlikMm: kistir("şank kalınlık (MS1/D5)", num(h.sank?.kalinlikMm, v.sank.kalinlikMm), SINIR.sankKalinlik.min, SINIR.sankKalinlik.max, notlar),
      kesit,
      taperOran: kistir("taper (MS3)", num(h.sank?.taperOran, v.sank.taperOran), SINIR.taper.min, SINIR.taper.max, notlar),
    },
    kafa: {
      tip: kafaTip,
      tirnakSayisi,
      tirnakCapMm:
        tirnakCapHam == null
          ? null
          : kistir("tırnak çapı (MK2/S7)", num(tirnakCapHam, 0.6), SINIR.tirnakCap.min, SINIR.tirnakCap.max, notlar),
      bezelDuvarMm: kistir("bezel duvarı (MB1)", num(h.kafa?.bezelDuvarMm, v.kafa.bezelDuvarMm), SINIR.bezelDuvar.min, SINIR.bezelDuvar.max, notlar),
    },
    tas: { capMm: kistir("taş çapı (MT1)", num(h.tas?.capMm, v.tas.capMm), SINIR.tasCap.min, SINIR.tasCap.max, notlar) },
    maden: (h.maden in MADENLER ? h.maden : v.maden) as MadenId,
  };
  return { recete, notlar };
}

/** Türetilmiş değerler (rapor + motor). */
export function turet(r: MonturRecete) {
  const icCevre = r.olcu.euSize;                       // MR1: EU = iç çevre mm
  const icCap = icCevre / Math.PI;
  const D = r.tas.capMm;
  const tirnakCap = r.kafa.tirnakCapMm ?? Math.max(SINIR.tirnakCap.oneriMin, 0.15 * D); // MK2/S7
  return {
    icCevreMm: icCevre,
    icCapMm: icCap,
    ct: capToCt(D),
    tirnakCapMm: tirnakCap,
    tacMm: TAS_ORAN.tac * D,
    girdleMm: TAS_ORAN.girdle * D,
    pavyonMm: (TAS_ORAN.derinlik - TAS_ORAN.tac - TAS_ORAN.girdle) * D,
  };
}
