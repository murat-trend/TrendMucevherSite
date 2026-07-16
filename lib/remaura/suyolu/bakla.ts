// SUYOLU MOTORU — BAKLA (tennis bileklik segmenti, üretim modeli)
// Tek bakla = suyolunun dökülecek birimi. Kurallar SUYOLU.md'den:
//  - kanal açıklığı %95 (S1), yuva %98 girdle-scale (S2), azure %60 (S12),
//    pavyon boşluğu 0.25 (S10), taban et 0.8 (D5)
//  - pim Ø1.0 (B1) + knuckle et 0.8/taraf (B2) + alıştırma payı (B3)
//  - menteşe: bir uçta tek kulak, diğer uçta çatal — komşu baklalar iç içe
// manifold-3d CSG ile kurulur; WASM nesnelerinde delete() disiplini şart.
import { kanalDuvariMm, MAFSAL, OTURTMA, DOKUM, TAS_ORAN } from "./kurallar";
import { tasOlc } from "./tas";

export type BaklaMesh = { positions: Float64Array; indices: Uint32Array };

export type BaklaSonuc = {
  mesh: BaklaMesh;
  hacimMm3: number;
  olculer: {
    boyMm: number;        // zincir yönü (x)
    enMm: number;         // bilek ekseni (y)
    yukseklikMm: number;  // z
    adimMm: number;       // taş merkezi → taş merkezi (pitch)
    tasArasiMm: number;   // girdle-girdle boşluk (S11 denetimi)
    duvarMm: number;      // kanal duvarı (S4)
    pimCapMm: number;
    knuckleCapMm: number;
  };
};

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

/** Bakla ölçülerini (mesh üretmeden) hesaplar — rapor ve N-taş hesabı için. */
export function baklaOlc(tasCapMm: number) {
  const D = tasCapMm;
  const duvar = kanalDuvariMm(D);
  const knuckleCap = MAFSAL.pimCapMm + 2 * MAFSAL.knuckleEtMm;
  const boy = OTURTMA.kanalAciklikOran * D + 2 * Math.max(0.8, knuckleCap / 2); // uçlarda kulak eti
  const en = D + 2 * duvar;
  const tas = tasOlc(D);
  // yükseklik: taş gereksinimi VE menteşe bölgesi (kulak + 0.6 tavan — çatal
  // boşluğu üst yüzeyi delmesin)
  const yukseklik = Math.max(tas.yukseklikMm + OTURTMA.pavyonBoslukMm + DOKUM.tabanEtMm, knuckleCap + 0.6);
  const adim = boy + MAFSAL.eklemBoslukMm;
  return {
    boyMm: boy, enMm: en, yukseklikMm: yukseklik, adimMm: adim,
    tasArasiMm: adim - D, duvarMm: duvar,
    pimCapMm: MAFSAL.pimCapMm, knuckleCapMm: knuckleCap,
  };
}

/** Tek bakla üretim mesh'i (CSG). Taş tablası üst yüzeyle aynı hizada (S5). */
export async function baklaUret(tasCapMm: number): Promise<BaklaSonuc> {
  const w = await getWasm();
  const { Manifold } = w;
  const D = tasCapMm;
  const o = baklaOlc(D);
  const tas = tasOlc(D);
  const seg = 48;

  const cyl = (h: number, r: number, r2 = r) => Manifold.cylinder(h, r, r2, seg, true);

  // gövde kutusu (merkez orijinde; z merkez = H/2 yukarı taşınır)
  let govde = Manifold.cube([o.boyMm, o.enMm, o.yukseklikMm], true)
    .translate([0, 0, o.yukseklikMm / 2]);

  // kulaklar: silindir ekseni y; menteşe bölgesi ALTTA (z 0'dan başlar),
  // üstte ≥0.6 tavan kalır
  const zk = o.knuckleCapMm / 2;
  const kulakTekBoy = o.enMm / 3;
  const kulakCatalBoy = (o.enMm - kulakTekBoy - 2 * MAFSAL.kulakBoslukMm) / 2;
  const kulak = (x: number, y: number, boyY: number) => {
    const c = cyl(boyY, o.knuckleCapMm / 2).rotate([90, 0, 0]).translate([x, y, zk]);
    const g2 = govde.add(c);
    govde.delete(); c.delete();
    govde = g2;
  };
  // -x ucu: tek kulak ortada; +x ucu: çatal (iki kulak kenarlarda)
  kulak(-o.boyMm / 2, 0, kulakTekBoy);
  kulak(o.boyMm / 2, (o.enMm - kulakCatalBoy) / 2 - 0, kulakCatalBoy);
  kulak(o.boyMm / 2, -((o.enMm - kulakCatalBoy) / 2), kulakCatalBoy);

  // çatalın iç boşluğu: +x ucunda komşu baklanın tek kulağı girecek yuva.
  // ALTTAN açık, ÜSTTEN kapalı (bakla üst yüzeyi delinmez): z −0.2 .. kulak üstü +0.1
  const catalZBoy = o.knuckleCapMm + 0.3;
  const catalBosluk = Manifold.cube(
    [o.knuckleCapMm + 0.6, kulakTekBoy + 2 * MAFSAL.kulakBoslukMm, catalZBoy], true,
  ).translate([o.boyMm / 2, 0, catalZBoy / 2 - 0.2]);
  {
    const g2 = govde.subtract(catalBosluk);
    govde.delete(); catalBosluk.delete();
    govde = g2;
  }

  // ---- taş yuvası (üstten): kanal açıklığı + seat konisi + azure
  const H = o.yukseklikMm;
  const zGirdleUst = H - tas.tacMm;                  // tabla flush (S5)
  const zGirdleAlt = zGirdleUst - tas.girdleMm;
  // 1) üst cep: %95 açıklık (girdle üstü metal %2.5/taraf taşa biner)
  const cepUst = cyl(tas.tacMm + 0.2, (OTURTMA.kanalAciklikOran * D) / 2)
    .translate([0, 0, zGirdleUst + (tas.tacMm + 0.2) / 2]);
  // 2) seat: %98 girdle çapında kısa silindir + pavyon konisi
  const seatSil = cyl(tas.girdleMm + 0.05, (OTURTMA.seatGirdleOran * D) / 2)
    .translate([0, 0, (zGirdleUst + zGirdleAlt) / 2]);
  const pavyonBoy = zGirdleAlt; // girdle altından tabana kadar boşluk açacağız (koni)
  const rAzure = (OTURTMA.azureOran * D) / 2;
  const koniBoy = Math.max(0.1, tas.pavyonMm + OTURTMA.pavyonBoslukMm * 0.5);
  const koni = cyl(koniBoy, rAzure, (OTURTMA.seatGirdleOran * D) / 2)
    .translate([0, 0, zGirdleAlt - koniBoy / 2]);
  void pavyonBoy;
  // 3) azure: tabana kadar delik
  const azure = cyl(H, rAzure).translate([0, 0, H / 2 - 0.01]);

  for (const kes of [cepUst, seatSil, koni, azure]) {
    const g2 = govde.subtract(kes);
    govde.delete(); kes.delete();
    govde = g2;
  }

  // ---- pim delikleri (iki uçta, eksen y, tüm en boyunca)
  const rPim = (MAFSAL.pimCapMm + MAFSAL.pimBoslukMm) / 2;
  for (const x of [-o.boyMm / 2, o.boyMm / 2]) {
    const delik = cyl(o.enMm + 2, rPim).rotate([90, 0, 0]).translate([x, 0, zk]);
    const g2 = govde.subtract(delik);
    govde.delete(); delik.delete();
    govde = g2;
  }

  const out = govde.getMesh();
  const hacim: number = typeof govde.volume === "function" ? govde.volume() : govde.getProperties().volume;
  const mesh: BaklaMesh = {
    positions: Float64Array.from(out.vertProperties as Float32Array),
    indices: Uint32Array.from(out.triVerts as Uint32Array),
  };
  govde.delete();
  return { mesh, hacimMm3: hacim, olculer: o };
}

/** Taşın bakla içindeki konumu: tabla üst yüzeyle hizalı (S5). */
export function tasKonumZ(tasCapMm: number): number {
  return baklaOlc(tasCapMm).yukseklikMm; // tasMesh z=0 tabla → bakla üstüne oturt
}

/** Pavyon açısı bilgisi (rapor) */
export const PAVYON_ACI_DEG = TAS_ORAN.pavyonAciDeg;
