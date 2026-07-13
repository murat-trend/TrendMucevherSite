// Geometri çekirdeği — GRANÜL (küre primitifi)
// Telkari'nin top boncukları. Enlem-boylam küresi; segment sayısı tel
// motorundaki kuralla TOLERANSTAN türer (kiriş açığı <= tolMm).
import { TOL_MEASURE_MM } from "./units";
import { V3 } from "./vec3";
import { radialSegmentsFor, signedVolume } from "./wire";

export type GranuleMesh = {
  positions: Float64Array;
  indices: Uint32Array;
  center: V3;
  requestedRadiusMm: number;
};

export function sphereMesh(center: V3, radiusMm: number, tolMm = TOL_MEASURE_MM): GranuleMesh {
  const n = radialSegmentsFor(radiusMm, tolMm);      // boylam
  const rows = Math.max(4, Math.ceil(n / 2));        // enlem (kutuplar hariç)
  // vertexler: kuzey kutbu + (rows-1) enlem halkası + güney kutbu
  const ringCount = rows - 1;
  const positions = new Float64Array((ringCount * n + 2) * 3);
  positions.set([center[0], center[1] + radiusMm, center[2]], 0); // kuzey
  for (let i = 1; i < rows; i++) {
    const th = (Math.PI * i) / rows;                 // kutuptan açı
    const y = center[1] + radiusMm * Math.cos(th);
    const rr = radiusMm * Math.sin(th);
    for (let j = 0; j < n; j++) {
      const phi = (2 * Math.PI * j) / n;
      const k = (1 + (i - 1) * n + j) * 3;
      positions[k] = center[0] + rr * Math.cos(phi);
      positions[k + 1] = y;
      positions[k + 2] = center[2] + rr * Math.sin(phi);
    }
  }
  const south = ringCount * n + 1;
  positions.set([center[0], center[1] - radiusMm, center[2]], south * 3);

  const tris: number[] = [];
  const ring = (i: number, j: number) => 1 + i * n + (j % n);
  for (let j = 0; j < n; j++) tris.push(0, ring(0, j), ring(0, j + 1));            // kuzey fan
  for (let i = 0; i < ringCount - 1; i++) {
    for (let j = 0; j < n; j++) {
      const a = ring(i, j), b = ring(i, j + 1), c = ring(i + 1, j + 1), d = ring(i + 1, j);
      tris.push(a, c, b, a, d, c);
    }
  }
  for (let j = 0; j < n; j++) tris.push(south, ring(ringCount - 1, j + 1), ring(ringCount - 1, j)); // güney fan
  const indices = new Uint32Array(tris);
  if (signedVolume(positions, indices) < 0) {
    for (let k = 0; k < indices.length; k += 3) {
      const tmp = indices[k + 1]; indices[k + 1] = indices[k + 2]; indices[k + 2] = tmp;
    }
  }
  return { positions, indices, center, requestedRadiusMm: radiusMm };
}

/** TORNA (lathe): (r, y) profilini Y ekseni etrafında döndürüp katı gövde üretir.
 *  Profil ilk ve son noktada r=0 olmalı (kutuplar) — çıkan yüzey kapalıdır.
 *  Granül damla, koni askı gibi dönel gövdeler için. */
export function latheMesh(
  profile: [number, number][], center: V3 = [0, 0, 0], tolMm = TOL_MEASURE_MM,
): GranuleMesh {
  if (profile[0][0] > 1e-9 || profile[profile.length - 1][0] > 1e-9)
    throw new Error("geo/lathe: profil r=0 ile başlayıp bitmeli (kutuplar)");
  const rings = profile.slice(1, -1);
  const maxR = Math.max(...rings.map(([r]) => r));
  const n = radialSegmentsFor(maxR, tolMm);
  const positions = new Float64Array((rings.length * n + 2) * 3);
  positions.set([center[0], center[1] + profile[0][1], center[2]], 0);
  rings.forEach(([r, y], i) => {
    for (let j = 0; j < n; j++) {
      const phi = (2 * Math.PI * j) / n;
      const k = (1 + i * n + j) * 3;
      positions[k] = center[0] + r * Math.cos(phi);
      positions[k + 1] = center[1] + y;
      positions[k + 2] = center[2] + r * Math.sin(phi);
    }
  });
  const south = rings.length * n + 1;
  positions.set([center[0], center[1] + profile[profile.length - 1][1], center[2]], south * 3);
  const tris: number[] = [];
  const ring = (i: number, j: number) => 1 + i * n + (j % n);
  for (let j = 0; j < n; j++) tris.push(0, ring(0, j), ring(0, j + 1));
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < n; j++) {
      tris.push(ring(i, j), ring(i + 1, j + 1), ring(i, j + 1));
      tris.push(ring(i, j), ring(i + 1, j), ring(i + 1, j + 1));
    }
  }
  for (let j = 0; j < n; j++) tris.push(south, ring(rings.length - 1, j + 1), ring(rings.length - 1, j));
  const indices = new Uint32Array(tris);
  if (signedVolume(positions, indices) < 0) {
    for (let k = 0; k < indices.length; k += 3) {
      const tmp = indices[k + 1]; indices[k + 1] = indices[k + 2]; indices[k + 2] = tmp;
    }
  }
  return { positions, indices, center, requestedRadiusMm: maxR };
}

/** Küre vertexlerinin merkeze uzaklığı = r olmalı — geri ölçüm (en kötü sapma, mm). */
export function measureSphere(g: GranuleMesh): number {
  let worst = 0;
  for (let k = 0; k < g.positions.length; k += 3) {
    const d = Math.hypot(
      g.positions[k] - g.center[0], g.positions[k + 1] - g.center[1], g.positions[k + 2] - g.center[2]);
    worst = Math.max(worst, Math.abs(d - g.requestedRadiusMm));
  }
  return worst;
}
