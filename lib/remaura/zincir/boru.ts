// ZİNCİR MOTORU — DOKULU GÖVDE (K5: yılan/balıksırtı boru yorumu)
// Gerçek yılan/balıksırtı esnek makine örgüsüdür (K2) — burada dokulu
// MASİF/BORU gövde üretilir (görsel/koleksiyon yorumu; UI rozetle belirtir).
//
// yılan      — açık uçlu boru: dış yüzeyde helis pul çentiği; iki açık uç
//              döküm drenajıdır (A5). Et kalınlığı C4 tabanından.
// balıksırtı — masif yassı şerit: üst/alt yüzde iki sıra zıt eğik çevron
//              çentiği (herringbone). Esnek değildir.
// Doku displacement olarak mesh'e işlenir (CSG yok — su geçirmez kalır).
import { BaklaMesh, isaretliHacim } from "./bakla";
import { BORU } from "./kurallar";

const TOL_MM = 0.03;

export type BoruBilgi = { kesitAlanMm2: number; disCapMm: number; kalinlikMm: number };

/** Analitik ortalama kesit alanı (mesh kurmadan gram tahmini — B8). */
export function boruKesitAlanMm2(tip: "yilan" | "baliksirti", genislikMm: number): number {
  if (tip === "yilan") {
    const k = BORU.yilan;
    const R = genislikMm / 2;
    const et = Math.min(k.etMm, R * 0.45);
    const rOrt = R - (k.centikDerinlikOran * R) / 2;
    return Math.PI * (rOrt * rOrt - (R - et) * (R - et));
  }
  const k = BORU.baliksirti;
  const t = Math.max(0.8, k.kalinlikOran * genislikMm);
  return genislikMm * (t - k.centikDerinlikOran * t);
}

/** üçgen dalga 0..1 (çentik profili) */
const tri = (u: number): number => {
  const f = u - Math.floor(u);
  return f < 0.5 ? f * 2 : 2 - f * 2;
};

/** YILAN — açık uçlu, helis pullu boru. Eksen x, boy uzunlukMm. */
export function buildYilan(disCapMm: number, uzunlukMm: number): { mesh: BaklaMesh; bilgi: BoruBilgi } {
  const k = BORU.yilan;
  const R = disCapMm / 2;
  const et = Math.min(k.etMm, R * 0.45);
  const rIc = R - et;
  const derin = k.centikDerinlikOran * R;
  const adim = Math.max(0.8, k.centikAdimOran * disCapMm);

  const N = Math.max(96, Math.ceil(uzunlukMm / Math.min(adim / 6, Math.sqrt(8 * R * TOL_MM))));
  const nC = Math.max(24, Math.min(48, Math.ceil(Math.PI / Math.acos(1 - TOL_MM / R)) * 2));

  // dış yüzey yarıçapı: helis pul — x boyunca üçgen dalga, faz çevreyle kayar
  const rDis = (x: number, ph: number): number =>
    R - derin * tri(x / adim + ph / (2 * Math.PI));

  const rings = N + 1;
  const positions = new Float64Array(rings * nC * 2 * 3); // dış + iç duvar
  const disOf = (i: number, j: number) => (i * nC + j) * 3;
  const icOf = (i: number, j: number) => (rings * nC + i * nC + j) * 3;
  for (let i = 0; i <= N; i++) {
    const x = (i / N) * uzunlukMm;
    for (let j = 0; j < nC; j++) {
      const ph = (j / nC) * 2 * Math.PI;
      const rd = rDis(x, ph);
      let o = disOf(i, j);
      positions[o] = x; positions[o + 1] = rd * Math.cos(ph); positions[o + 2] = rd * Math.sin(ph);
      o = icOf(i, j);
      positions[o] = x; positions[o + 1] = rIc * Math.cos(ph); positions[o + 2] = rIc * Math.sin(ph);
    }
  }
  // indeksler: dış duvar + iç duvar (ters yön) + iki uç halka bandı
  const quads = N * nC * 2 + 2 * nC;
  const indices = new Uint32Array(quads * 6);
  let w = 0;
  const quad = (a: number, b: number, c: number, e: number) => {
    indices[w++] = a; indices[w++] = b; indices[w++] = c;
    indices[w++] = a; indices[w++] = c; indices[w++] = e;
  };
  const D = (i: number, j: number) => i * nC + j;
  const I = (i: number, j: number) => rings * nC + i * nC + j;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < nC; j++) {
      const jp = (j + 1) % nC;
      quad(D(i, j), D(i + 1, j), D(i + 1, jp), D(i, jp));       // dış
      quad(I(i, jp), I(i + 1, jp), I(i + 1, j), I(i, j));       // iç (ters)
    }
  }
  for (let j = 0; j < nC; j++) {
    const jp = (j + 1) % nC;
    // uç halka bandı: duvar kenarlarıyla zıt gezinme yönü (manifold şartı)
    quad(D(0, j), D(0, jp), I(0, jp), I(0, j));                            // baş uç halkası
    quad(I(N, j), I(N, jp), D(N, jp), D(N, j));                            // son uç halkası
  }
  const mesh: BaklaMesh = { positions, indices };
  if (isaretliHacim(mesh) < 0) {
    for (let t = 0; t < indices.length; t += 3) {
      const tmp = indices[t + 1]; indices[t + 1] = indices[t + 2]; indices[t + 2] = tmp;
    }
  }
  // ortalama kesit alanı (gram tahmini): halka alanı − çentik payı (ort. derin/2)
  const rOrt = R - derin / 2;
  const alan = Math.PI * (rOrt * rOrt - rIc * rIc);
  return { mesh, bilgi: { kesitAlanMm2: alan, disCapMm, kalinlikMm: disCapMm } };
}

/** BALIKSIRTI — masif yassı şerit + iki sıra zıt çevron çentiği (üst+alt). */
export function buildBaliksirti(genislikMm: number, uzunlukMm: number): { mesh: BaklaMesh; bilgi: BoruBilgi } {
  const k = BORU.baliksirti;
  const W = genislikMm;
  const t = Math.max(0.8, k.kalinlikOran * W); // C4: 0.8 taban
  const derin = k.centikDerinlikOran * t;
  const adim = Math.max(0.7, k.centikAdimOran * W * 0.5);
  const egim = Math.tan((k.aciDeg * Math.PI) / 180);

  const N = Math.max(96, Math.ceil(uzunlukMm / (adim / 4)));
  const M = 24; // en yönü örnekleme (çevron kırığı ortada)

  // çevron: iki sıra zıt eğim — yerel v ∈ [−W/2, W/2]; kırık v=0'da
  const zUst = (x: number, v: number): number => {
    const u = x + Math.abs(v) * egim; // |v|: sırt çizgisi ortada (herringbone)
    return t / 2 - derin * tri(u / adim);
  };

  const rows = N + 1, cols = M + 1;
  // üst yüz + alt yüz + 2 yan + 2 uç: hepsini tek grid'le kur (kutu süpürme)
  // pratik: üst/alt grid + kenar bantları — indeks düzeni basit kalsın diye
  // kapalı "yastık" olarak üretiyoruz: çevre döngüsü (üst kenar → alt kenar)
  const positions = new Float64Array(rows * cols * 2 * 3);
  const uOf = (i: number, j: number) => (i * cols + j) * 3;
  const aOf = (i: number, j: number) => (rows * cols + i * cols + j) * 3;
  for (let i = 0; i < rows; i++) {
    const x = (i / N) * uzunlukMm;
    for (let j = 0; j < cols; j++) {
      const v = (j / M - 0.5) * W;
      const zu = zUst(x, v);
      let o = uOf(i, j);
      positions[o] = x; positions[o + 1] = v; positions[o + 2] = zu;
      o = aOf(i, j);
      positions[o] = x; positions[o + 1] = v; positions[o + 2] = -zu; // alt simetrik
    }
  }
  const quadSay = N * M * 2 + N * 2 + M * 2;
  const indices = new Uint32Array(quadSay * 6);
  let w = 0;
  const quad = (a: number, b: number, c: number, e: number) => {
    indices[w++] = a; indices[w++] = b; indices[w++] = c;
    indices[w++] = a; indices[w++] = c; indices[w++] = e;
  };
  const U = (i: number, j: number) => i * cols + j;
  const A = (i: number, j: number) => rows * cols + i * cols + j;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < M; j++) {
      quad(U(i, j), U(i + 1, j), U(i + 1, j + 1), U(i, j + 1));   // üst
      quad(A(i, j + 1), A(i + 1, j + 1), A(i + 1, j), A(i, j));   // alt (ters)
    }
  }
  for (let i = 0; i < N; i++) {
    quad(A(i, 0), A(i + 1, 0), U(i + 1, 0), U(i, 0));             // −v yanı
    quad(U(i, M), U(i + 1, M), A(i + 1, M), A(i, M));             // +v yanı
  }
  for (let j = 0; j < M; j++) {
    quad(U(0, j), U(0, j + 1), A(0, j + 1), A(0, j));             // baş uç
    quad(A(N, j), A(N, j + 1), U(N, j + 1), U(N, j));             // son uç
  }
  const mesh: BaklaMesh = { positions, indices };
  if (isaretliHacim(mesh) < 0) {
    for (let tt = 0; tt < indices.length; tt += 3) {
      const tmp = indices[tt + 1]; indices[tt + 1] = indices[tt + 2]; indices[tt + 2] = tmp;
    }
  }
  const alan = W * (t - derin); // ort. kesit (üst+alt çentik ort. derin/2 ×2)
  return { mesh, bilgi: { kesitAlanMm2: alan, disCapMm: W, kalinlikMm: t } };
}
