// Geometri çekirdeği — GERİ ÖLÇÜM ve DENETİM
// İlke: "istedik" değil "ölçtük". Üretilen her mesh'in ölçüsü ÇIKTIDAN geri
// okunur; rapor istenen ile ölçülen arasındaki farkı mikron cinsinden söyler.
import { UM } from "./units";
import { V3, dist, pointSegDist } from "./vec3";
import { WireMesh, Polyline, signedVolume } from "./wire";

export const meshVolumeMm3 = (positions: Float64Array, indices: Uint32Array): number =>
  Math.abs(signedVolume(positions, indices));

export type WireMeasurement = {
  /** İstenen çap (mm) */ requestedDiaMm: number;
  /** Ring vertexlerinden ölçülen çap sapması: en kötü |ölçülen−istenen| (µm) */ worstCircumErrUm: number;
  /** En ince nokta: çokgen kenar ortası (inradius) çapı, en küçük ring (mm) */ minInscribedDiaMm: number;
  /** Söz: minInscribedDia >= istenen − 2·tol. Bu farkın en kötüsü (µm) */ worstInradiusDeficitUm: number;
};

/** Tel mesh'inin yarıçapını ÇIKTI pozisyonlarından geri ölçer (ring yapısı bilinir). */
export function measureWire(mesh: WireMesh, path: Polyline): WireMeasurement {
  const { positions, radialSegments: n, ringCount: m, requestedRadiusMm: r } = mesh;
  let worstCircum = 0;
  let minInradius = Infinity;
  const v = (idx: number): V3 => [positions[idx * 3], positions[idx * 3 + 1], positions[idx * 3 + 2]];
  for (let i = 0; i < m; i++) {
    const c = path.pts[i];
    for (let j = 0; j < n; j++) {
      const a = v(i * n + j);
      worstCircum = Math.max(worstCircum, Math.abs(dist(a, c) - r));
      const b = v(i * n + ((j + 1) % n));
      minInradius = Math.min(minInradius, pointSegDist(c, a, b));
    }
  }
  return {
    requestedDiaMm: 2 * r,
    worstCircumErrUm: worstCircum / UM,
    minInscribedDiaMm: 2 * minInradius,
    worstInradiusDeficitUm: (r - minInradius) / UM,
  };
}

export type ManifoldReport = { edges: number; boundaryEdges: number; nonManifoldEdges: number; ok: boolean };

/** Her kenar tam 2 üçgene ait mi? (kapalı, üretilebilir yüzeyin ön şartı) */
export function edgeManifoldReport(indices: Uint32Array): ManifoldReport {
  const count = new Map<number, number>();
  // kenar anahtarı: küçük<<32 | büyük (vertex sayısı < 2^32 varsayımıyla güvenli)
  const key = (a: number, b: number) => (a < b ? a * 4294967296 + b : b * 4294967296 + a);
  for (let k = 0; k < indices.length; k += 3) {
    const a = indices[k], b = indices[k + 1], c = indices[k + 2];
    for (const e of [key(a, b), key(b, c), key(c, a)]) count.set(e, (count.get(e) ?? 0) + 1);
  }
  let boundary = 0, nonManifold = 0;
  for (const c of count.values()) {
    if (c === 1) boundary++;
    else if (c > 2) nonManifold++;
  }
  return { edges: count.size, boundaryEdges: boundary, nonManifoldEdges: nonManifold, ok: boundary === 0 && nonManifold === 0 };
}
