import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";
import { geoToManifold, loadManifold, manifoldVolume } from "./manifoldKit";
import { MIN_WALL_FLOOR_MM } from "./castingRules";

// ---------------------------------------------------------------------------
// Yükleme + sonuç doğrulama (PRD §8)
//   - poligon ≤ 250k (üstü reddedilir → Mesh Temizleme'ye yönlendirme)
//   - watertight zorunlu (Manifold kabul etmezse reddedilir)
//   - kabuk/dolu tespiti (ışın paritesi)
//   - minimum et kalınlığı taraması (< 0.6 mm kırmızı highlight)
// ---------------------------------------------------------------------------

export const MAX_TRIS = 250_000;
/** mutlak taban — metal seçilince castingRules'taki metal eşiği kullanılır */
export const MIN_WALL_MM = MIN_WALL_FLOOR_MM;

export const triCount = (g: THREE.BufferGeometry): number =>
  (g.index ? g.index.count : g.attributes.position.count) / 3;

export type LoadValidation = {
  ok: boolean;
  tris: number;
  watertight: boolean;
  volumeMm3: number;
  /** kullanıcıya gösterilecek Türkçe hata (ok=false ise) */
  error?: string;
};

/** Yükleme kontrolü: poligon limiti + watertight (Manifold kabulü) + hacim. */
export async function validateOnLoad(geometry: THREE.BufferGeometry): Promise<LoadValidation> {
  const tris = triCount(geometry);
  if (tris > MAX_TRIS) {
    return {
      ok: false, tris, watertight: false, volumeMm3: 0,
      error: `Model ${(tris / 1000).toFixed(0)}K poligon — sınır ${(MAX_TRIS / 1000).toFixed(0)}K. Mesh Temizleme aracıyla sadeleştirip tekrar deneyin.`,
    };
  }
  try {
    const w = await loadManifold();
    const m = geoToManifold(w, geometry);
    const volumeMm3 = manifoldVolume(m);
    m.delete?.();
    if (!(volumeMm3 > 0)) {
      return {
        ok: false, tris, watertight: false, volumeMm3: 0,
        error: "Model kapalı (watertight) değil. Mesh Temizleme aracıyla onarıp tekrar deneyin.",
      };
    }
    return { ok: true, tris, watertight: true, volumeMm3 };
  } catch {
    return {
      ok: false, tris, watertight: false, volumeMm3: 0,
      error: "Model kapalı (watertight) değil. Mesh Temizleme aracıyla onarıp tekrar deneyin.",
    };
  }
}

/** Kabuk (içi boş) mu dolu mu? — merkezden 3 eksende ışın paritesi.
 *  Kabukta merkez hattı ≥4 yüzey keser; dolu modelde 2. */
export function detectShell(bvh: MeshBVH, geometry: THREE.BufferGeometry): boolean {
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox!;
  const c = bb.getCenter(new THREE.Vector3());
  const size = bb.getSize(new THREE.Vector3());
  const dirs = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
  for (let a = 0; a < 3; a += 1) {
    const start = c.clone().setComponent(a, bb.min.getComponent(a) - size.getComponent(a) * 0.1 - 1);
    const ray = new THREE.Ray(start, dirs[a]);
    const hits = bvh.raycast(ray, THREE.DoubleSide);
    if (hits.length >= 4) return true;
  }
  return false;
}

export type MinWallScan = {
  /** taranan vertex indeksleri içinden İNCE bulunanlar */
  thinVerts: Uint32Array;
  /** ince bölge sayısı / taranan örnek */
  thinCount: number;
  sampled: number;
  minFoundMm: number;
};

/** Min et kalınlığı taraması — örneklenen vertexlerden içeri ışın atıp karşı
 *  yüzeye mesafeyi ölçer. threshold altı vertexler kırmızı highlight için döner. */
export function scanMinWall(
  geometry: THREE.BufferGeometry,
  bvh: MeshBVH,
  thresholdMm = MIN_WALL_MM,
  maxSamples = 24_000,
): MinWallScan {
  const pos = geometry.attributes.position;
  if (!geometry.attributes.normal) geometry.computeVertexNormals();
  const nrm = geometry.attributes.normal;
  const n = pos.count;
  const step = Math.max(1, Math.floor(n / maxSamples));
  const thin: number[] = [];
  const origin = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const hitNrm = new THREE.Vector3();
  const eps = 0.02;
  let minFound = Infinity;
  let sampled = 0;
  for (let i = 0; i < n; i += step) {
    origin.fromBufferAttribute(pos, i);
    dir.fromBufferAttribute(nrm, i).normalize().multiplyScalar(-1);
    origin.addScaledVector(dir, eps); // yüzeyin hemen içinden başla
    const ray = new THREE.Ray(origin, dir);
    sampled += 1;
    // sıyıran çarpmalar (delik yan duvarı, keskin köşe) sahte 0.0x mm okur —
    // sadece ışına KARŞI duran yüzeyler gerçek "karşı et"tir
    const hits = bvh.raycast(ray, THREE.DoubleSide) as {
      distance: number;
      face?: { normal?: THREE.Vector3 } | null;
    }[];
    hits.sort((a, b) => a.distance - b.distance);
    let t = -1;
    for (const h of hits) {
      const fn = h.face?.normal;
      if (!fn) continue;
      hitNrm.copy(fn);
      if (Math.abs(hitNrm.dot(dir)) < 0.35) continue; // sıyırma → atla
      t = h.distance + eps;
      break;
    }
    if (t < 0) continue;
    if (t < minFound) minFound = t;
    if (t < thresholdMm) thin.push(i);
  }
  return {
    thinVerts: new Uint32Array(thin),
    thinCount: thin.length,
    sampled,
    minFoundMm: Number.isFinite(minFound) ? minFound : 0,
  };
}
