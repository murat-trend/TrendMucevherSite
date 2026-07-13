// Geometri çekirdeği — TEL MOTORU
// Dairesel profili bir eğri boyunca süpürerek tel mesh'i üretir.
//
// Mikron sözünün iki bacağı:
//  1. RADYAL yoğunluk keyfi değil: segment sayısı toleranstan TÜRER —
//     çokgenin iç yarıçapı istenen yarıçaptan en fazla tolMm eksik kalır
//     (yani telin "en ince noktası" bile söz verilen kalınlığın tolMm yakınında).
//  2. YOL örneklemesi keyfi değil: eğri, kiriş sapması tolMm altına inene
//     kadar uyarlanabilir bölünür (silüet sadakati).
//
// Çerçeveler paralel taşıma ile ilerler (planar eğrilerde burulmasız;
// kapalı planar halkalarda dikiş uyumu otomatik sağlanır).
import { TOL_MEASURE_MM } from "./units";
import { V3, sub, scale, dot, cross, norm, dist, pointSegDist } from "./vec3";

export type Polyline = { pts: V3[]; closed: boolean };

export type WireMesh = {
  positions: Float64Array; // ring-major: [ring0 x n vertex][ring1 x n]... (+ açık uçta 2 kapak merkezi)
  indices: Uint32Array;
  radialSegments: number;
  ringCount: number;
  closed: boolean;
  requestedRadiusMm: number;
  lengthMm: number; // omurga uzunluğu
};

/** Tolerans-güdümlü radyal segment: inradius = r·cos(π/n) >= r - tolMm garantisi. */
export function radialSegmentsFor(radiusMm: number, tolMm = TOL_MEASURE_MM): number {
  if (radiusMm <= 0) throw new Error("geo/wire: yarıçap > 0 olmalı");
  if (tolMm >= radiusMm) return 8;
  const n = Math.ceil(Math.PI / Math.acos(1 - tolMm / radiusMm));
  return Math.min(256, Math.max(8, n));
}

/** Parametrik eğriyi kiriş sapması tolMm altında kalacak şekilde örnekler.
 *  closed=true ise fn(t1)=fn(t0) varsayılır ve kapanış noktası tekrarlanmaz. */
export function adaptiveSample(
  fn: (t: number) => V3, t0: number, t1: number, tolMm = TOL_MEASURE_MM, closed = false,
): Polyline {
  const out: V3[] = [fn(t0)];
  const refine = (ta: number, pa: V3, tb: number, pb: V3, depth: number) => {
    const tm = (ta + tb) / 2;
    const pm = fn(tm);
    if (depth >= 24 || pointSegDist(pm, pa, pb) <= tolMm) {
      out.push(pb);
      return;
    }
    refine(ta, pa, tm, pm, depth + 1);
    refine(tm, pm, tb, pb, depth + 1);
  };
  // ilk bölme 16 dilim: simetrik eğrilerde (tam çember gibi) kirişin
  // orta noktadan geçip "düz" sanılmasına karşı emniyet
  const N0 = 16;
  let prevT = t0, prevP = out[0];
  for (let i = 1; i <= N0; i++) {
    const t = t0 + ((t1 - t0) * i) / N0;
    const p = fn(t);
    refine(prevT, prevP, t, p, 0);
    prevT = t; prevP = p;
  }
  // sıfır-uzunluk segmentleri ayıkla (tanjant hesabını bozar)
  const pts: V3[] = [out[0]];
  for (const p of out.slice(1)) if (dist(p, pts[pts.length - 1]) > 1e-9) pts.push(p);
  if (closed && dist(pts[0], pts[pts.length - 1]) <= 1e-9) pts.pop();
  return { pts, closed };
}

function initialNormal(t: V3): V3 {
  // tanjanta en az hizalı eksenden dik doğrultu üret
  const ax: V3 = Math.abs(t[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  return norm(sub(ax, scale(t, dot(ax, t))));
}

/** Dairesel profili yol boyunca süpürür. Açık yollar disk kapaklarla kapatılır;
 *  çıkan yüzey her zaman kapalı (hacmi ölçülebilir) bir mesh'tir. */
export function sweepWire(path: Polyline, radiusMm: number, tolMm = TOL_MEASURE_MM): WireMesh {
  const P = path.pts;
  const m = P.length;
  if (m < 2) throw new Error("geo/wire: yol en az 2 nokta ister");
  const n = radialSegmentsFor(radiusMm, tolMm);

  // tanjantlar (merkezi fark; açık uçlarda tek yönlü)
  const tangents: V3[] = [];
  for (let i = 0; i < m; i++) {
    const prev = path.closed ? P[(i - 1 + m) % m] : P[Math.max(0, i - 1)];
    const next = path.closed ? P[(i + 1) % m] : P[Math.min(m - 1, i + 1)];
    tangents.push(norm(sub(next, prev)));
  }

  // paralel taşıma çerçeveleri
  const Ns: V3[] = [initialNormal(tangents[0])];
  for (let i = 1; i < m; i++) {
    const t = tangents[i];
    const proj = sub(Ns[i - 1], scale(t, dot(Ns[i - 1], t)));
    Ns.push(norm(proj));
  }

  const capVerts = path.closed ? 0 : 2;
  const positions = new Float64Array((m * n + capVerts) * 3);
  for (let i = 0; i < m; i++) {
    const N = Ns[i];
    const B = cross(tangents[i], N); // birim (t ⟂ N, ikisi de birim)
    for (let j = 0; j < n; j++) {
      const phi = (2 * Math.PI * j) / n;
      const c = Math.cos(phi) * radiusMm, s = Math.sin(phi) * radiusMm;
      const k = (i * n + j) * 3;
      positions[k] = P[i][0] + N[0] * c + B[0] * s;
      positions[k + 1] = P[i][1] + N[1] * c + B[1] * s;
      positions[k + 2] = P[i][2] + N[2] * c + B[2] * s;
    }
  }

  const tris: number[] = [];
  const ringPairs = path.closed ? m : m - 1;
  for (let i = 0; i < ringPairs; i++) {
    const i2 = (i + 1) % m;
    for (let j = 0; j < n; j++) {
      const j2 = (j + 1) % n;
      const a = i * n + j, b = i * n + j2, c = i2 * n + j2, d = i2 * n + j;
      tris.push(a, b, c, a, c, d);
    }
  }
  if (!path.closed) {
    const c0 = m * n, c1 = m * n + 1;
    positions.set(P[0], c0 * 3);
    positions.set(P[m - 1], c1 * 3);
    for (let j = 0; j < n; j++) {
      const j2 = (j + 1) % n;
      tris.push(c0, j2, j);                                 // baş kapak (dışa: -t yönü)
      tris.push(c1, (m - 1) * n + j, (m - 1) * n + j2);     // son kapak (+t yönü)
    }
  }
  const indices = new Uint32Array(tris);

  // yönelim garantisi: işaretli hacim negatifse tüm üçgenleri çevir
  if (signedVolume(positions, indices) < 0) {
    for (let k = 0; k < indices.length; k += 3) {
      const tmp = indices[k + 1];
      indices[k + 1] = indices[k + 2];
      indices[k + 2] = tmp;
    }
  }

  let lengthMm = 0;
  for (let i = 0; i < ringPairs; i++) lengthMm += dist(P[i], P[(i + 1) % m]);

  return {
    positions, indices, radialSegments: n, ringCount: m,
    closed: path.closed, requestedRadiusMm: radiusMm, lengthMm,
  };
}

/** Diverjans teoremiyle işaretli hacim (mm³) — float64. */
export function signedVolume(positions: Float64Array, indices: Uint32Array): number {
  let v = 0;
  for (let k = 0; k < indices.length; k += 3) {
    const a = indices[k] * 3, b = indices[k + 1] * 3, c = indices[k + 2] * 3;
    const ax = positions[a], ay = positions[a + 1], az = positions[a + 2];
    const bx = positions[b], by = positions[b + 1], bz = positions[b + 2];
    const cx = positions[c], cy = positions[c + 1], cz = positions[c + 2];
    v += ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx);
  }
  return v / 6;
}
