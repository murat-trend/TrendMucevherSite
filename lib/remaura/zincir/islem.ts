// ZİNCİR MOTORU — CSG İŞLEMLERİ (manifold-3d WASM)
// bakla.ts saf süpürmeyi üretir; burada:
//  0. yatış (B6) mesh'e İŞLENİR — gerçek zincirde pres/traş zincir düzleminde
//     yapılır, bakla düzleminde değil; ayna bakla zincir.ts'te z-yansıma ile
//     bedavaya çıkar (traş + ajur z-simetrik olduğundan CSG tekrarı gerekmez).
//  1. traş (diamond-cut / yassılaştırma, T1-T5) — simetrik z düzlem kesimi
//  2. ajur delme (A1-A4) — ajur desen kütüphanesi yeniden kullanılır (Murat,
//     2026-07-16: "ajur sayfamızdaki kodlar"); delikler yalnız DÜZ YAN
//     BANTLARA açılır, uç kıvrımlar (gerilme zirvesi, A1) DOKUNULMAZ.
//  3. kesişim/clearance denetimi (D4) — komşu baklalar çakışmasın, tek parça
//     döküm boşluğu (C2) korunsun.
// WASM disiplini: her ara Manifold'a delete() (GC yok — sızıntı).
import { buildBaklaTube, BaklaGeoParams, BaklaMesh, baklaOlc } from "./bakla";
import { buildOrguDamarlar, OrguTip, OrguBilgi } from "./orgu";
import { AJUR } from "./kurallar";
import { patternById } from "@/app/(site)/remaura/ajur/lib/patterns";

/* eslint-disable @typescript-eslint/no-explicit-any -- manifold-3d WASM tipleri dışarıdan */
let wasmPromise: Promise<any> | null = null;
async function getWasm(): Promise<any> {
  if (!wasmPromise) {
    wasmPromise = import("manifold-3d").then(async (M) => {
      const w = await M.default();
      w.setup();
      return w;
    });
  }
  return wasmPromise;
}

function meshToManifold(w: any, m: BaklaMesh): any {
  const mesh = new w.Mesh({
    numProp: 3,
    vertProperties: Float32Array.from(m.positions),
    triVerts: Uint32Array.from(m.indices),
  });
  mesh.merge();
  return new w.Manifold(mesh);
}

function manifoldToMesh(mf: any): BaklaMesh {
  const out = mf.getMesh();
  return {
    positions: Float64Array.from(out.vertProperties as Float32Array),
    indices: Uint32Array.from(out.triVerts as Uint32Array),
  };
}

function manifoldHacim(mf: any): number {
  if (typeof mf.volume === "function") return Math.abs(mf.volume());
  return Math.abs(mf.getProperties().volume);
}

/** x ekseni etrafında yatış — mesh'e işlenir (pres/traş çerçevesi). */
function yatisUygula(m: BaklaMesh, yatisDeg: number): void {
  if (Math.abs(yatisDeg) < 1e-9) return;
  const a = (yatisDeg * Math.PI) / 180;
  const c = Math.cos(a), s = Math.sin(a);
  const p = m.positions;
  for (let i = 0; i < p.length; i += 3) {
    const y = p[i + 1], z = p[i + 2];
    p[i + 1] = y * c - z * s;
    p[i + 2] = y * s + z * c;
  }
}

function zZarf(m: BaklaMesh): number {
  let zMax = 0;
  const p = m.positions;
  for (let i = 2; i < p.length; i += 3) zMax = Math.max(zMax, Math.abs(p[i]));
  return zMax;
}

export type AjurParams = {
  desenId: string;    // ajur kütüphanesi kimliği (oval, damla, petek, ...)
  hucreMm: number;    // hücre adımı (bant boyunca)
  doz: number;        // 0..1 — delik ölçeği (ajur sayfasındaki holeScale)
  duvarMm: number;    // A4: delik-kenar asgari köprü
  ucKorumaMm: number; // A2: düz segment ucundan koruma payı
};

/** Kural-türevli ajur parametreleri (A2/A4). Delik sığmıyorsa null. */
export function autoAjur(g: BaklaGeoParams, desenId: string, doz: number): AjurParams | null {
  const d = g.telCapMm;
  const maxDelik = d - 2 * AJUR.duvarMm;
  if (maxDelik <= 0.2) return null; // P1: 0.5mm altı delik baskıda kapanır; 0.2 mutlak taban
  const o = baklaOlc(g);
  // A2: serbest bölge uçtan %25 içeride başlar; düz segment zaten kıvrımların
  // içindedir — taşan kısım kadar koru: max(0, S/2 − L_o/4)
  const ucKoruma = Math.max(0, o.duzBoyMm / 2 - o.disBoyMm / 4);
  const desen = patternById(desenId);
  const hucre = Math.min(desen?.defaultCellMm ?? maxDelik, maxDelik / Math.max(0.2, Math.min(1, doz)));
  return { desenId, hucreMm: hucre, doz, duvarMm: AJUR.duvarMm, ucKorumaMm: ucKoruma };
}

export type BaklaUretimParams = BaklaGeoParams & {
  yatisDeg: number;       // B6 — mesh'e işlenir
  trasOrani: number;      // 0..TRAS.maxOran — toplam kalınlıktan simetrik pay
  ajur?: AjurParams | null;
};

export type BaklaUretim = {
  mesh: BaklaMesh;
  hacimMm3: number;        // final (ajurlu) hacim
  hacimDoluMm3: number;    // traşlı ama ajursuz hacim (hafifletme % için)
  kalinlikMm: number;      // traş sonrası gerçek kalınlık
  delikSayisi: number;
  delikAlanOrani: number;  // delinen bant alanına oranla (A3/A6 denetimi)
};

/** Delik poligonlarını düz yan bantlara yerleştirir (xy izdüşümü, yatış dahil).
 *  Bant merkezi bükümlü+yatık telin izdüşümünde koşar: y(x) = ±Rc·cos(α(x)+λ). */
function delikPoligonlari(
  g: BaklaGeoParams, yatisDeg: number, ajur: AjurParams,
): { polys: [number, number][][]; bandAlanMm2: number; delikAlanMm2: number } {
  const bos = { polys: [] as [number, number][][], bandAlanMm2: 0, delikAlanMm2: 0 };
  const desen = patternById(ajur.desenId);
  if (!desen?.tile) return bos;
  const d = g.telCapMm;
  const o = baklaOlc(g);
  const S = o.duzBoyMm;
  const Rc = o.omurgaYariEnMm;
  const xMax = S / 2 + Rc;
  const bukumRad = (g.bukumDeg * Math.PI) / 180;
  const yatisRad = (yatisDeg * Math.PI) / 180;

  const maxDelik = d - 2 * ajur.duvarMm;
  if (maxDelik <= 0.2) return bos;
  const cell = Math.min(ajur.hucreMm, maxDelik / Math.max(0.2, Math.min(1, ajur.doz)));
  const spec = desen.tile(cell, ajur.doz);

  const x0 = -S / 2 + ajur.ucKorumaMm;
  const x1 = S / 2 - ajur.ucKorumaMm;
  if (x1 - x0 < cell * 0.5) return bos;

  const polys: [number, number][][] = [];
  let delikAlan = 0;
  const nAdim = Math.max(0, Math.floor((x1 - x0) / spec.strideU));
  const xBas = x0 + ((x1 - x0) - nAdim * spec.strideU) / 2;
  for (const taraf of [1, -1] as const) {
    for (let i = 0; i <= nAdim; i++) {
      const cx = xBas + i * spec.strideU;
      const al = (bukumRad / 2) * (cx / xMax) + yatisRad;
      const cy = taraf * Rc * Math.cos(al);
      for (const poly of spec.polys) {
        const maxV = Math.max(...poly.map(([, v]) => Math.abs(v)));
        const maxU = Math.max(...poly.map(([u]) => Math.abs(u)));
        if (2 * maxV > maxDelik) continue;               // enine sığmadı (A4)
        if (cx - maxU < x0 || cx + maxU > x1) continue;  // uç korumasına taştı (A2)
        const p2 = poly.map(([u, v]) => [cx + u, cy + v] as [number, number]);
        polys.push(p2);
        delikAlan += polyAlan(p2);
      }
    }
  }
  const bandAlan = 2 * (x1 - x0) * d; // iki bant, tel eni kadar
  return { polys, bandAlanMm2: bandAlan, delikAlanMm2: delikAlan };
}

function polyAlan(poly: [number, number][]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    s += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(s) / 2;
}

/** Tek baklayı üretir: süpürme → yatış → traş → ajur. */
export async function baklaUret(p: BaklaUretimParams): Promise<BaklaUretim> {
  const w = await getWasm();
  const { Manifold } = w;
  const tube = buildBaklaTube(p);
  yatisUygula(tube, p.yatisDeg);
  const o = baklaOlc(p);
  const zMax = zZarf(tube);
  let govde = meshToManifold(w, tube);

  // ---- traş: simetrik z kesimi (T5 — zincir düzlemine paralel iki yüz)
  let kalinlik = 2 * zMax;
  if (p.trasOrani > 0) {
    kalinlik = 2 * zMax * (1 - p.trasOrani);
    const kutu = Manifold.cube([o.disBoyMm + 2, o.disEnMm + 2, kalinlik], true);
    const g2 = govde.intersect(kutu);
    govde.delete(); kutu.delete();
    govde = g2;
  }
  const hacimDolu = manifoldHacim(govde);

  // ---- ajur: z-prizmalarıyla delme (A1-A4)
  let delikSayisi = 0;
  let delikAlanOrani = 0;
  if (p.ajur) {
    const { polys, bandAlanMm2, delikAlanMm2 } = delikPoligonlari(p, p.yatisDeg, p.ajur);
    if (polys.length) {
      let kesici: any = null;
      for (const poly of polys) {
        const priz = Manifold.extrude([poly], 2 * zMax + 2)
          .translate([0, 0, -(zMax + 1)]);
        if (!kesici) kesici = priz;
        else {
          const k2 = kesici.add(priz);
          kesici.delete(); priz.delete();
          kesici = k2;
        }
      }
      const g2 = govde.subtract(kesici);
      govde.delete(); kesici.delete();
      govde = g2;
      delikSayisi = polys.length;
      delikAlanOrani = bandAlanMm2 > 0 ? delikAlanMm2 / bandAlanMm2 : 0;
    }
  }

  const hacim = manifoldHacim(govde);
  const mesh = manifoldToMesh(govde);
  govde.delete();
  return { mesh, hacimMm3: hacim, hacimDoluMm3: hacimDolu, kalinlikMm: kalinlik, delikSayisi, delikAlanOrani };
}

/** K5 örgü üretimi: damarlar üretilir, union'la TEK GÖVDE olur (gömme %12 —
 *  TELKARI §1.6: lehim boynu kalın, döküm sağlam). Hacim union'dan (kesişen
 *  bölgeler çift sayılmaz — gram dürüst). */
export async function orguUret(tip: OrguTip, disCapMm: number, uzunlukMm: number): Promise<{
  mesh: BaklaMesh;
  hacimMm3: number;
  bilgi: OrguBilgi;
}> {
  const w = await getWasm();
  const { damarlar, bilgi } = buildOrguDamarlar(tip, disCapMm, uzunlukMm);
  let govde: any = null;
  for (const dm of damarlar) {
    const m = meshToManifold(w, dm);
    if (!govde) govde = m;
    else {
      const g2 = govde.add(m);
      govde.delete(); m.delete();
      govde = g2;
    }
  }
  const hacim = manifoldHacim(govde);
  const mesh = manifoldToMesh(govde);
  govde.delete();
  return { mesh, hacimMm3: hacim, bilgi };
}

export type KesisimSonuc = {
  komsuCakismaMm3: number;   // bakla j ↔ j+1 fiziksel çakışma (D4: 0 olmalı)
  ikinciCakismaMm3: number;  // bakla j ↔ j+2 (D4: 0 olmalı)
  bosluk02: boolean;         // C2 mutlak alt sınır 0.2mm sağlandı mı
  bosluk03: boolean;         // C2 önerilen tasarım boşluğu 0.3mm sağlandı mı
};

/** Montaj dizilim denetimi (D4 + C2): baklalar mesh olarak verilir (üretimden
 *  çıkan gerçek geometri), ikincisi z-yansıma (ayna) + adım ötelemesiyle konur.
 *  Şişirilmiş denetim: her iki bakla yüzeyden boşluk/2 kadar ofsetlenmiş kabul
 *  edilir — Minkowski yerine tel çapı büyütülmüş yeniden süpürme kullanılır. */
export async function dizilimDenetim(args: {
  geo: BaklaGeoParams;
  yatisDeg: number;
  trasOrani: number;
  adimMm: number;
  komsuRotXDeg: number;     // forse/doç: 90 (dik alternasyon); curb ailesi: 0
}): Promise<KesisimSonuc> {
  const w = await getWasm();
  const { Manifold } = w;

  const uret = (telCapMm: number, dx: number, rotXDeg: number) => {
    const tube = buildBaklaTube({ ...args.geo, telCapMm });
    yatisUygula(tube, args.yatisDeg);
    const zMax = zZarf(tube);
    let m = meshToManifold(w, tube);
    if (args.trasOrani > 0) {
      const o = baklaOlc({ ...args.geo, telCapMm });
      const kutu = Manifold.cube([o.disBoyMm + 2, o.disEnMm + 2, 2 * zMax * (1 - args.trasOrani)], true);
      const m2 = m.intersect(kutu);
      m.delete(); kutu.delete();
      m = m2;
    }
    let son = m;
    if (Math.abs(rotXDeg) > 1e-9) { son = m.rotate([rotXDeg, 0, 0]); m.delete(); }
    const t = son.translate([dx, 0, 0]);
    son.delete();
    return t;
  };
  const kesisim = (a: any, b: any): number => {
    const i = a.intersect(b);
    const v = manifoldHacim(i);
    i.delete();
    return v;
  };

  const d = args.geo.telCapMm;
  const a = uret(d, 0, 0);
  const b1 = uret(d, args.adimMm, args.komsuRotXDeg);
  const b2 = uret(d, 2 * args.adimMm, 0);
  const komsu = kesisim(a, b1);
  const ikinci = kesisim(a, b2);
  a.delete(); b1.delete(); b2.delete();

  // C2 ikili denetim: tel çapı boşluk kadar büyütülmüş kopyalar kesişmiyorsa
  // gerçek yüzey aralığı ≥ boşluk demektir
  const boslukTesti = (boslukMm: number): boolean => {
    const aS = uret(d + boslukMm, 0, 0);
    const bS = uret(d + boslukMm, args.adimMm, args.komsuRotXDeg);
    const v = kesisim(aS, bS);
    aS.delete(); bS.delete();
    return v < 1e-6;
  };
  const bosluk03 = boslukTesti(0.3);
  const bosluk02 = bosluk03 || boslukTesti(0.2); // 0.3 sağlanıyorsa 0.2 bedava

  return { komsuCakismaMm3: komsu, ikinciCakismaMm3: ikinci, bosluk02, bosluk03 };
}
