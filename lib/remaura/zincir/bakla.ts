// ZİNCİR MOTORU — BAKLA GEOMETRİSİ (saf süpürme, WASM yok)
// Tek bakla = stadyum (oval) omurga üzerinde dairesel kesit süpürmesi +
// isteğe bağlı CURB BÜKÜMÜ (uçlar zıt yönde döner — zincir düz yatar).
// Kurallar lib/remaura/zincir/ZINCIR.md'den gelir; bu dosya sayı içermez,
// tüm ölçüler parametredir. Örnekleme toleranstan türer (keyfi sayı yok).
//
// Eksenler (bakla yerel): x = zincir ekseni (boy), y = en, z = kalınlık.
// Büküm x eksenine GÖREDİR: α(x) = büküm/2 · x/xMax (uçlar ±büküm/2, merkez 0).

export type BaklaMesh = { positions: Float64Array; indices: Uint32Array };

export type BaklaGeoParams = {
  telCapMm: number;   // d — tel çapı
  icBoyMm: number;    // Li — iç uzunluk (zincir yönü). Şart: Li ≥ Wi
  icEnMm: number;     // Wi — iç genişlik
  bukumDeg: number;   // uçlar arası toplam büküm (curb/cuban); 0 = cable
  tolMm?: number;     // kiriş sapması toleransı (örnekleme buradan türer)
};

export type BaklaOlcum = {
  disBoyMm: number;      // dış zarf x
  disEnMm: number;       // dış zarf y
  kalinlikMm: number;    // büküm sonrası z zarfı (kesimsiz)
  duzBoyMm: number;      // düz segment boyu S = Li − Wi
  omurgaYariEnMm: number; // Rc — omurga merkez hattı yarı-genişliği
};

const TOL_VARSAYILAN_MM = 0.02; // measure.ts toleransıyla aynı mertebe

export function baklaOlc(p: BaklaGeoParams): BaklaOlcum {
  const d = p.telCapMm;
  const Rc = (p.icEnMm + d) / 2;
  const S = p.icBoyMm - p.icEnMm;
  const xMax = S / 2 + Rc;
  const yMax = Rc + d / 2;
  // büküm sonrası z zarfı: uçta (x=±xMax) y=±yMax noktası α=büküm/2 döner
  const a = (Math.abs(p.bukumDeg) * Math.PI) / 180 / 2;
  const kalinlik = 2 * Math.max(d / 2, yMax * Math.sin(a) + (d / 2) * Math.cos(a));
  return {
    disBoyMm: 2 * (xMax + d / 2),
    disEnMm: 2 * yMax,
    kalinlikMm: kalinlik,
    duzBoyMm: S,
    omurgaYariEnMm: Rc,
  };
}

/** Stadyum omurga üzerinde nokta: s ∈ [0,L) yay uzunluğu. */
function stadyumNokta(s: number, S: number, Rc: number): [number, number] {
  const arc = Math.PI * Rc; // yarım daire boyu
  let t = s;
  if (t < S) return [-S / 2 + t, Rc];                    // üst düz →
  t -= S;
  if (t < arc) {                                          // sağ yarım daire (üstten alta)
    const th = Math.PI / 2 - t / Rc;
    return [S / 2 + Rc * Math.cos(th), Rc * Math.sin(th)];
  }
  t -= arc;
  if (t < S) return [S / 2 - t, -Rc];                     // alt düz ←
  t -= S;
  const th = -Math.PI / 2 - t / Rc;                       // sol yarım daire (alttan üste)
  return [-S / 2 + Rc * Math.cos(th), Rc * Math.sin(th)];
}

/**
 * Tek bakla süpürme mesh'i. Kapalı halka (torus topolojisi) → her zaman
 * su geçirmez; manifold denetimi islem.ts'te Manifold kurulumunda yapılır.
 */
export function buildBaklaTube(p: BaklaGeoParams): BaklaMesh {
  if (p.icBoyMm < p.icEnMm) throw new Error("zincir/bakla: iç boy iç enden küçük olamaz");
  if (p.telCapMm <= 0 || p.icEnMm <= 0) throw new Error("zincir/bakla: ölçüler pozitif olmalı");
  const tol = p.tolMm ?? TOL_VARSAYILAN_MM;
  const d = p.telCapMm;
  const r = d / 2;
  const Rc = (p.icEnMm + d) / 2;
  const S = p.icBoyMm - p.icEnMm;
  const L = 2 * S + 2 * Math.PI * Rc;
  const xMax = S / 2 + Rc;

  // ---- örnekleme yoğunluğu toleranstan türer
  // omurga: yay kirişi sapması ≤ tol → adım ≤ √(8·Rc·tol); büküm deformasyonu
  // düz segmentleri helise büker → adım ayrıca bükümden sınırlanır.
  const bukumRad = (Math.abs(p.bukumDeg) * Math.PI) / 180;
  const hYay = Math.sqrt(8 * Rc * tol);
  // büküm: adım başına dönme ≤ ~4.5° → yüzey kirişi telde tol mertebesinde kalır
  const hBukum = bukumRad > 1e-6 ? (L * (Math.PI / 40)) / bukumRad : Infinity;
  const N = Math.max(64, Math.ceil(L / Math.min(hYay, hBukum)));
  // kesit çemberi: kiriş sapması ≤ tol → nC = π / acos(1 − tol/r)
  const nC = Math.min(64, Math.max(16, Math.ceil(Math.PI / Math.acos(Math.max(-1, 1 - tol / r)))));
  // alan-koruyan yarıçap: çokgen kesit alanı = daire alanı (gramaj yansız;
  // yüzey nominalin ±tol/2 bandında salınır — mikron sözü korunur)
  const rP = r * Math.sqrt((2 * Math.PI / nC) / Math.sin((2 * Math.PI) / nC));

  // ---- omurga noktaları + teğetten kesit çerçevesi (düzlemsel eğri: B = +z)
  const cx = new Float64Array(N), cy = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const [x, y] = stadyumNokta((i / N) * L, S, Rc);
    cx[i] = x; cy[i] = y;
  }

  const positions = new Float64Array(N * nC * 3);
  const kOf = (i: number, j: number) => (i * nC + j) * 3;
  for (let i = 0; i < N; i++) {
    const ip = (i + 1) % N, im = (i - 1 + N) % N;
    let tx = cx[ip] - cx[im], ty = cy[ip] - cy[im];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl; ty /= tl;
    // düzlem içi normal: N = T × z = (ty, −tx, 0)
    const nx = ty, ny = -tx;
    for (let j = 0; j < nC; j++) {
      const ph = (j / nC) * 2 * Math.PI;
      const co = Math.cos(ph) * rP, si = Math.sin(ph) * rP;
      const X = cx[i] + nx * co;
      let Y = cy[i] + ny * co;
      let Z = si;
      // ---- curb bükümü: x'e orantılı x-ekseni dönmesi (uçlar ±büküm/2)
      if (bukumRad > 1e-9) {
        const al = (bukumRad / 2) * (X / xMax) * Math.sign(p.bukumDeg || 1);
        const ca = Math.cos(al), sa = Math.sin(al);
        const Y2 = Y * ca - Z * sa;
        Z = Y * sa + Z * ca;
        Y = Y2;
      }
      const k = kOf(i, j);
      positions[k] = X; positions[k + 1] = Y; positions[k + 2] = Z;
    }
  }

  // ---- torus indeksleri (her iki yönde sarmal kapanış)
  const indices = new Uint32Array(N * nC * 6);
  let w = 0;
  for (let i = 0; i < N; i++) {
    const ip = (i + 1) % N;
    for (let j = 0; j < nC; j++) {
      const jp = (j + 1) % nC;
      const a = i * nC + j, b = ip * nC + j, c = ip * nC + jp, e = i * nC + jp;
      indices[w++] = a; indices[w++] = b; indices[w++] = c;
      indices[w++] = a; indices[w++] = c; indices[w++] = e;
    }
  }

  const mesh: BaklaMesh = { positions, indices };
  // ---- yönelim garantisi: işaretli hacim negatifse sarımı çevir
  if (isaretliHacim(mesh) < 0) {
    for (let t = 0; t < indices.length; t += 3) {
      const tmp = indices[t + 1];
      indices[t + 1] = indices[t + 2];
      indices[t + 2] = tmp;
    }
  }
  return mesh;
}

/** İşaretli hacim (diverjans teoremi) — dış normal denetimi + gramaj çekirdeği. */
export function isaretliHacim(m: BaklaMesh): number {
  const p = m.positions, ix = m.indices;
  let v6 = 0;
  for (let t = 0; t < ix.length; t += 3) {
    const a = ix[t] * 3, b = ix[t + 1] * 3, c = ix[t + 2] * 3;
    v6 +=
      p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) -
      p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) +
      p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c]);
  }
  return v6 / 6;
}
