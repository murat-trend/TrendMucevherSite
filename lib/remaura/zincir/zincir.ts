// ZİNCİR MOTORU — DİZİLİM + MONTAJ + RAPOR
// Üretim birimi TEK BAKLA'dır; montaj önizleme/komple-STL/rapor içindir.
// Kurallar ZINCIR.md: B (bakla), D (dizilim), G (gramaj), Ö (ölçü).
//
// Curb ailesinde komşu bakla AYNA baklasıdır (büküm işareti ters). Ayna,
// z ekseninde yansıtmayla elde edilir — traş kesimi ve ajur prizmaları
// z-simetrik olduğundan CSG'yi yeniden koşturmak gerekmez (bedava).
import { BaklaGeoParams, BaklaMesh, baklaOlc } from "./bakla";
import { MADENLER, MadenId, TIPLER, ZincirTipId, FIGARO, DOKUM, ADIM_PAYI_MM, telSinir } from "./kurallar";

export type BaklaTuru = "kisa" | "uzun"; // figaro; diğer tiplerde hep "kisa"

export type Yer = {
  turu: BaklaTuru;
  ayna: boolean;      // ayna bakla mı (curb ailesi: tek indeksler)
  dxMm: number;       // zincir ekseni konumu (bakla merkezi)
  rotXDeg: number;    // yatış (B6)
  varyant?: boolean;  // S3: B-varyant bakla (atlamalı doku / ikinci metal)
};

/** Tip + genişlik (+isteğe bağlı tel çapı) → bakla geometrisi (B1-B4, B8).
 *  B8: W dış görünümdür, d metaldir — d verilmezse dolu (varsayılan) hal;
 *  verilirse telSinir aralığına kıstırılır. İç ölçüler ikisinden türer. */
export function geoTuret(tip: ZincirTipId, genislikMm: number, telCapMm?: number): {
  kisa: BaklaGeoParams;
  uzun: BaklaGeoParams | null;
  telCapMm: number;
} {
  const k = TIPLER[tip];
  const sinir = telSinir(tip, genislikMm);
  const d = Math.min(Math.max(telCapMm ?? sinir.varsayilanMm, sinir.minMm), sinir.maxMm);
  const icEn = genislikMm - 2 * d;
  const icBoy = Math.max(k.disBoyFn(genislikMm) - 2 * d, icEn);
  const kisa: BaklaGeoParams = {
    telCapMm: d,
    icBoyMm: icBoy,
    icEnMm: icEn,
    bukumDeg: k.bukumDeg,
  };
  const uzun: BaklaGeoParams | null =
    tip === "figaro"
      ? { ...kisa, icBoyMm: kisa.icBoyMm * FIGARO.uzunOran }
      : null;
  return { kisa, uzun, telCapMm: d };
}

/** İstenen uzunluğa dizilim: bakla yerleri + gerçekleşen uzunluk (Ö5).
 *  Adım (D1, tek formül): p(a,b) = (L_i(a)+L_i(b))/4 + d + C2/2 — eş
 *  baklalarda L_i/2 + d + C2/2'ye iner; j±2 dış yüzeyleri arasında tam C2
 *  boşluğu kalır (tek parça döküm garantisi, C2). */
export function dizilim(
  tip: ZincirTipId, genislikMm: number, uzunlukMm: number, telCapMm?: number,
): { yerler: Yer[]; gercekUzunlukMm: number; adimOrtMm: number; n: number } {
  const k = TIPLER[tip];
  const { kisa, uzun, telCapMm: d } = geoTuret(tip, genislikMm, telCapMm);
  const curb = k.bukumDeg !== 0;

  const turuDizi = (i: number): BaklaTuru =>
    tip === "figaro" && i % (FIGARO.kisaAdet + 1) === FIGARO.kisaAdet ? "uzun" : "kisa";
  const Li = (t: BaklaTuru) => (t === "uzun" && uzun ? uzun.icBoyMm : kisa.icBoyMm);
  const adimCift = (a: BaklaTuru, b: BaklaTuru): number =>
    (Li(a) + Li(b)) / 4 + d + ADIM_PAYI_MM[tip];

  // ortalama adımla N tahmini, sonra gerçek yürüyüş
  const pOrt = adimCift("kisa", turuDizi(1));
  const n = Math.max(3, Math.round(uzunlukMm / pOrt));
  const yerler: Yer[] = [];
  let x = 0;
  for (let i = 0; i < n; i++) {
    const t = turuDizi(i);
    if (i > 0) x += adimCift(turuDizi(i - 1), t);
    yerler.push({
      turu: t,
      // curb ailesinde TÜM baklalar özdeş ve aynı yönlüdür: büküm uç açılarını
      // kendisi alternate eder (+x ucu +45°, −x ucu −45°) → komşu uçlar 90°
      // çaprazlanır. Ayna/dönüş gerekmez (test: ayna z-yansıma paralel uç
      // üretip çakıştı, 2026-07-16). Forse/doç: 90° dik alternasyon.
      ayna: false,
      dxMm: x,
      rotXDeg: curb ? 0 : (i % 2) * k.yatisDeg,
    });
  }
  const gercek = x + Li(turuDizi(n - 1)) / 2 + Li("kisa") / 2 + d; // uç baklaların dış yarıları
  return { yerler, gercekUzunlukMm: gercek, adimOrtMm: x / Math.max(1, n - 1), n };
}

/** Ayna bakla: z yansıt + sarımı çevir (büküm işareti tersine döner). */
export function aynaBakla(m: BaklaMesh): BaklaMesh {
  const positions = Float64Array.from(m.positions);
  for (let i = 2; i < positions.length; i += 3) positions[i] = -positions[i];
  const indices = Uint32Array.from(m.indices);
  for (let t = 0; t < indices.length; t += 3) {
    const tmp = indices[t + 1];
    indices[t + 1] = indices[t + 2];
    indices[t + 2] = tmp;
  }
  return { positions, indices };
}

// kisaB/uzunB: S3 atlamalı doku için B-varyant baklalar (yer.varyant seçer)
type MeshSeti = {
  kisa: BaklaMesh; kisaAyna: BaklaMesh;
  uzun?: BaklaMesh; uzunAyna?: BaklaMesh;
  kisaB?: BaklaMesh; uzunB?: BaklaMesh;
};

function yerMesh(set: MeshSeti, y: Yer): BaklaMesh {
  if (y.turu === "uzun") {
    if (y.varyant && set.uzunB) return set.uzunB;
    return (y.ayna ? set.uzunAyna : set.uzun) ?? set.kisa;
  }
  if (y.varyant && set.kisaB) return set.kisaB;
  return y.ayna ? set.kisaAyna : set.kisa;
}

/** Düz seriliş montajı (yerde görünüm + komple STL). */
export function montajDuz(set: MeshSeti, yerler: Yer[]): BaklaMesh {
  return montaj(set, yerler, (x, y, z) => [x, y, z]);
}

/** Daire sarımı (kolyede görünüm): zincir ekseni XZ düzleminde çembere sarılır.
 *  Baklalar RİJİT taşınır (bükülmez) — gerçek zincir de bakla bükmez (D3). */
export function montajDaire(set: MeshSeti, yerler: Yer[], gercekUzunlukMm: number): BaklaMesh {
  const R = gercekUzunlukMm / (2 * Math.PI);
  return montaj(set, yerler, (x, y, z, dx) => {
    const th = dx / R;
    const c = Math.cos(th), s = Math.sin(th);
    return [R * s + x * c + z * s, y, R * c - x * s + z * c];
  }, true);
}

function montaj(
  set: MeshSeti, yerler: Yer[],
  harita: (x: number, y: number, z: number, dx: number) => [number, number, number],
  merkezle = false,
): BaklaMesh {
  let vToplam = 0, iToplam = 0;
  const parcalar = yerler.map((y) => {
    const m = yerMesh(set, y);
    vToplam += m.positions.length;
    iToplam += m.indices.length;
    return m;
  });
  const positions = new Float64Array(vToplam);
  const indices = new Uint32Array(iToplam);
  let vOff = 0, iOff = 0;
  yerler.forEach((y, k) => {
    const m = parcalar[k];
    const rot = (y.rotXDeg * Math.PI) / 180;
    const cr = Math.cos(rot), sr = Math.sin(rot);
    for (let i = 0; i < m.positions.length; i += 3) {
      const x0 = m.positions[i];
      const y0 = m.positions[i + 1] * cr - m.positions[i + 2] * sr;
      const z0 = m.positions[i + 1] * sr + m.positions[i + 2] * cr;
      const [X, Y, Z] = merkezle
        ? harita(x0, y0, z0, y.dxMm)
        : harita(x0 + y.dxMm, y0, z0, y.dxMm);
      positions[vOff + i] = X;
      positions[vOff + i + 1] = Y;
      positions[vOff + i + 2] = Z;
    }
    const base = vOff / 3;
    for (let i = 0; i < m.indices.length; i++) indices[iOff + i] = m.indices[i] + base;
    vOff += m.positions.length;
    iOff += m.indices.length;
  });
  return { positions, indices };
}

/** K5 örgü/boru "kolyede" görünümü: düz üretilen gövdeyi çembere BÜKER
 *  (x → açı; y/z kesit korunur — bend.ts mantığı). Bu tipler masif yorum
 *  olduğundan bükülmüş STL ayrı üründür (düz ≠ bükük; UI not düşer). */
export function daireBuk(m: BaklaMesh, uzunlukMm: number): BaklaMesh {
  const R = uzunlukMm / (2 * Math.PI);
  const positions = new Float64Array(m.positions.length);
  for (let i = 0; i < m.positions.length; i += 3) {
    const x = m.positions[i], y = m.positions[i + 1], z = m.positions[i + 2];
    const th = x / R;
    const rad = R + z;
    positions[i] = rad * Math.sin(th);
    positions[i + 1] = y;
    positions[i + 2] = rad * Math.cos(th);
  }
  return { positions, indices: Uint32Array.from(m.indices) };
}

// ---- anlık gram tahmini (B8 hedef gramaj) ---------------------------------

/** Bakla omurga uzunluğu (stadyum çevresi) — Pappus hacmi için. */
export function omurgaBoyMm(g: BaklaGeoParams): number {
  const Rc = (g.icEnMm + g.telCapMm) / 2;
  const S = g.icBoyMm - g.icEnMm;
  return 2 * S + 2 * Math.PI * Rc;
}

/** Pappus hacmi: V = π·r²·L (traşsız/ajursız tam süpürme — kesin). */
export function pappusHacimMm3(g: BaklaGeoParams): number {
  const r = g.telCapMm / 2;
  return Math.PI * r * r * omurgaBoyMm(g);
}

/** Anlık gram tahmini — slider oynarken CSG kurmadan hesap (B8).
 *  kFaktor = kesinHacim / pappusHacim (son üretimden; traş+ajur kaybını taşır;
 *  ilk üretimden önce 1 kullan, üretim sonrası kesinleşir). */
export function gramTahmin(args: {
  tip: ZincirTipId;
  genislikMm: number;
  uzunlukMm: number;
  telCapMm?: number;
  maden: MadenId;
  kFaktor?: number;
}): { gram: number; gCm: number; n: number; telCapMm: number } {
  const { kisa, uzun, telCapMm: d } = geoTuret(args.tip, args.genislikMm, args.telCapMm);
  const diz = dizilim(args.tip, args.genislikMm, args.uzunlukMm, args.telCapMm);
  const k = args.kFaktor ?? 1;
  const vKisa = pappusHacimMm3(kisa) * k;
  const vUzun = uzun ? pappusHacimMm3(uzun) * k : vKisa;
  let hacim = 0;
  for (const y of diz.yerler) hacim += y.turu === "uzun" ? vUzun : vKisa;
  const gram = hacim * MADENLER[args.maden].yogunlukGmm3;
  return { gram, gCm: gram / (diz.gercekUzunlukMm / 10), n: diz.n, telCapMm: d };
}

// ---- rapor ---------------------------------------------------------------

export type ZincirRapor = {
  tip: ZincirTipId;
  n: number;
  telCapMm: number;
  baklaDisBoyMm: number;
  baklaDisEnMm: number;
  kalinlikMm: number;          // traş sonrası
  adimOrtMm: number;
  gercekUzunlukMm: number;
  gram: number;
  gCm: number;
  hafifletmeYuzde: number;     // ajur kazancı (traşlı dolu hacme göre)
  delikSayisi: number;         // bakla başına
  delikAlanOrani: number;      // A3 denetimi
  bukulmeYaricapiMm: number;   // D3 rapor değeri
  cekmePayiYuzde: number;      // C5
  maden: MadenId;
};

export function rapor(args: {
  tip: ZincirTipId;
  genislikMm: number;
  uzunlukMm: number;
  telCapMm?: number;
  maden: MadenId;
  hacimKisaMm3: number;
  hacimDoluKisaMm3: number;
  hacimUzunMm3?: number;
  hacimDoluUzunMm3?: number;
  kalinlikMm: number;
  delikSayisi: number;
  delikAlanOrani: number;
}): ZincirRapor {
  const { kisa, telCapMm: d } = geoTuret(args.tip, args.genislikMm, args.telCapMm);
  const o = baklaOlc(kisa);
  const diz = dizilim(args.tip, args.genislikMm, args.uzunlukMm, args.telCapMm);
  let hacim = 0, hacimDolu = 0;
  for (const y of diz.yerler) {
    hacim += y.turu === "uzun" ? (args.hacimUzunMm3 ?? args.hacimKisaMm3) : args.hacimKisaMm3;
    hacimDolu += y.turu === "uzun" ? (args.hacimDoluUzunMm3 ?? args.hacimDoluKisaMm3) : args.hacimDoluKisaMm3;
  }
  const gram = hacim * MADENLER[args.maden].yogunlukGmm3;
  // D3: R ≈ p/(2·sin(α/2)), α = atan((W_i − d)/p)
  const p = diz.adimOrtMm;
  const alfa = Math.atan((kisa.icEnMm - d) / p);
  const bukulmeR = alfa > 1e-6 ? p / (2 * Math.sin(alfa / 2)) : Infinity;
  const cekme = args.maden === "ag925" ? DOKUM.cekmePayi.ag
    : args.maden === "pt950" ? DOKUM.cekmePayi.pt : DOKUM.cekmePayi.au;
  return {
    tip: args.tip,
    n: diz.n,
    telCapMm: d,
    baklaDisBoyMm: o.disBoyMm,
    baklaDisEnMm: o.disEnMm,
    kalinlikMm: args.kalinlikMm,
    adimOrtMm: diz.adimOrtMm,
    gercekUzunlukMm: diz.gercekUzunlukMm,
    gram,
    gCm: gram / (diz.gercekUzunlukMm / 10),
    hafifletmeYuzde: hacimDolu > 0 ? (1 - hacim / hacimDolu) * 100 : 0,
    delikSayisi: args.delikSayisi,
    delikAlanOrani: args.delikAlanOrani,
    bukulmeYaricapiMm: bukulmeR,
    cekmePayiYuzde: cekme * 100,
    maden: args.maden,
  };
}
