// SUYOLU MOTORU — BİLEKLİK MONTAJI + RAPOR
// Üretim birimi TEK BAKLA'dır (STL o); montaj, önizleme ve rapor içindir.
// Baklalar bilek dairesine (R = uzunluk/2π) adım açısıyla dizilir; taş yüzü
// dışa bakar (taban iç yüzey).
import { MADENLER, MadenId, TAS_CINSLERI, TasCinsiId, capToCaratMm, OTURTMA, DOKUM } from "./kurallar";
import { baklaOlc, BaklaMesh } from "./bakla";

export type Yerlestirme = { aciRad: number; rMm: number };

export type BilekRapor = {
  tasSayisi: number;
  tasCapMm: number;
  tasBasinaCt: number;
  toplamCt: number;
  czGercekGram: number | null;   // CZ ise gerçek taş gramı (T4: yoğunluk ~1.65×)
  metalGram: number;             // CAD hacmi × yoğunluk (polisaj öncesi model)
  cekmePayiYuzde: number;        // D1-D4 başlangıç katsayısı — [KALİBRE]
  uzunlukMm: number;             // gerçekleşen (N × adım)
  adimMm: number;
  baklaBoyMm: number;
  baklaEnMm: number;
  baklaYukseklikMm: number;
  duvarMm: number;               // S4
  pimCapMm: number;              // B1
  tasArasiMm: number;
  tasArasiOk: boolean;           // S11 ≥ 0.15
  maden: MadenId;
  tasCinsi: TasCinsiId;
};

/** İstenen uzunluğa sığan bakla sayısı + gerçekleşen uzunluk. */
export function baklaSayisi(uzunlukMm: number, tasCapMm: number): { n: number; gercekMm: number; adimMm: number } {
  const { adimMm } = baklaOlc(tasCapMm);
  const n = Math.max(3, Math.round(uzunlukMm / adimMm));
  return { n, gercekMm: n * adimMm, adimMm };
}

/** Önizleme dizilimi: daire üzerinde N baklanın açıları. */
export function dizilim(uzunlukMm: number, tasCapMm: number): { yer: Yerlestirme[]; rMm: number; n: number } {
  const { n, gercekMm, adimMm } = baklaSayisi(uzunlukMm, tasCapMm);
  const r = gercekMm / (2 * Math.PI);
  const yer: Yerlestirme[] = [];
  for (let i = 0; i < n; i++) yer.push({ aciRad: (i * adimMm) / r, rMm: r });
  return { yer, rMm: r, n };
}

export function rapor(
  uzunlukMm: number, tasCapMm: number, baklaHacimMm3: number,
  maden: MadenId, tasCinsi: TasCinsiId,
): BilekRapor {
  const { n, gercekMm, adimMm } = baklaSayisi(uzunlukMm, tasCapMm);
  const o = baklaOlc(tasCapMm);
  const ct = capToCaratMm(tasCapMm);
  const cekme = maden === "ag925" ? DOKUM.cekmePayi.ag
    : maden === "pt950" ? DOKUM.cekmePayi.pt : DOKUM.cekmePayi.au;
  // taş hacmi yaklaşığı (torna: girdle silindiri + taç/pavyon konileri ≈ 0.29·d³)
  const tasHacimMm3 = 0.29 * tasCapMm ** 3;
  return {
    tasSayisi: n,
    tasCapMm,
    tasBasinaCt: ct,
    toplamCt: n * ct,
    czGercekGram: tasCinsi === "cz" ? n * tasHacimMm3 * TAS_CINSLERI.cz.yogunlukGmm3 : null,
    metalGram: n * baklaHacimMm3 * MADENLER[maden].yogunlukGmm3,
    cekmePayiYuzde: cekme * 100,
    uzunlukMm: gercekMm,
    adimMm,
    baklaBoyMm: o.boyMm,
    baklaEnMm: o.enMm,
    baklaYukseklikMm: o.yukseklikMm,
    duvarMm: o.duvarMm,
    pimCapMm: o.pimCapMm,
    tasArasiMm: o.tasArasiMm,
    tasArasiOk: o.tasArasiMm >= OTURTMA.tasArasiMinMm,
    maden,
    tasCinsi,
  };
}

/** Bir mesh'i bilek dairesi üzerinde çoğaltır (komple montaj STL'i / önizleme).
 *  Yerel eksenler: x = zincir (teğet), y = bilek ekseni, z = yükseklik
 *  (z=0 taban → iç yüzey; z=H üst → dışa bakar). */
export function montajMesh(mesh: BaklaMesh, yer: Yerlestirme[]): BaklaMesh {
  const vLen = mesh.positions.length;
  const iLen = mesh.indices.length;
  const positions = new Float64Array(vLen * yer.length);
  const indices = new Uint32Array(iLen * yer.length);
  yer.forEach((y, k) => {
    for (let i = 0; i < vLen; i += 3) {
      const x = mesh.positions[i];
      const ax = mesh.positions[i + 1];
      const z = mesh.positions[i + 2];
      const rad = y.rMm + z;               // taban silindir yüzeyinde, üst dışarıda
      const th = y.aciRad + x / y.rMm;
      positions[k * vLen + i] = rad * Math.sin(th);
      positions[k * vLen + i + 1] = ax;
      positions[k * vLen + i + 2] = rad * Math.cos(th);
    }
    const vOff = (k * vLen) / 3;
    for (let i = 0; i < iLen; i++) indices[k * iLen + i] = mesh.indices[i] + vOff;
  });
  return { positions, indices };
}
