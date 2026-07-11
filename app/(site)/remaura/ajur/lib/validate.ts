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
  /** thinVerts ile paralel — o noktadaki ölçülen et (mm) */
  thinDepths: Float32Array;
  /** ince bölge sayısı / taranan örnek */
  thinCount: number;
  sampled: number;
  minFoundMm: number;
};

/** Min et kalınlığı taraması — üçgen MERKEZLERİNDEN düz yüzey normaliyle içeri
 *  ışın atıp karşı yüzeye mesafeyi ölçer. (Vertex normali pürüzlü yüzeylerde
 *  — ör. levelSet kavitesi — komşu tümseğe 0.0x mm sahte çarpma üretiyordu;
 *  üçgenin kendi düzlem normali bu artefaktı yapısal olarak engeller.)
 *  threshold altı üçgenlerin vertexleri kırmızı highlight için döner. */
export function scanMinWall(
  geometry: THREE.BufferGeometry,
  bvh: MeshBVH,
  thresholdMm = MIN_WALL_MM,
  maxSamples = 24_000,
): MinWallScan {
  const pos = geometry.attributes.position;
  const idx = geometry.index!.array;
  const triN = idx.length / 3;
  const step = Math.max(1, Math.floor(triN / maxSamples));
  const thinMap = new Map<number, number>(); // vertex → en ince ölçüm
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3();
  const origin = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const hitNrm = new THREE.Vector3();
  const mid = new THREE.Vector3();
  const PARITY_DIR = new THREE.Vector3(1, 0.1234, 0.0717).normalize();
  const eps = 0.02;
  let minFound = Infinity;
  let sampled = 0;
  for (let t3 = 0; t3 < triN; t3 += step) {
    const i0 = idx[t3 * 3], i1 = idx[t3 * 3 + 1], i2 = idx[t3 * 3 + 2];
    a.fromBufferAttribute(pos, i0);
    b.fromBufferAttribute(pos, i1);
    c.fromBufferAttribute(pos, i2);
    // düz yüzey normali (winding'den) — içeri yön = −normal
    dir.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a));
    const len = dir.length();
    if (len < 1e-12) continue;
    dir.multiplyScalar(-1 / len);
    origin.copy(a).add(b).add(c).multiplyScalar(1 / 3).addScaledVector(dir, eps);
    const ray = new THREE.Ray(origin, dir);
    sampled += 1;
    // sıyıran çarpmalar (delik yan duvarı, keskin köşe) sahte okur —
    // sadece ışına KARŞI duran yüzeyler gerçek "karşı et"tir
    const hits = bvh.raycast(ray, THREE.DoubleSide) as {
      distance: number;
      face?: { normal?: THREE.Vector3 } | null;
    }[];
    hits.sort((x, y) => x.distance - y.distance);
    let t = -1;
    for (const h of hits) {
      const fn = h.face?.normal;
      if (!fn) continue;
      hitNrm.copy(fn);
      // Gerçek KARŞI DUVAR: çıkış yüzeyi giriş yüzeyine zıt bakar
      // (dot(nHit, dir) → +1). Keskin tümsek SIRTI (voxel dokusu) dik/dar
      // açılıdır (~0) ve sahte 0.0x mm okutur; sıyırmalar da elenmiş olur.
      if (hitNrm.dot(dir) < 0.55) continue;
      t = h.distance + eps;
      break;
    }
    if (t < 0) continue;
    if (t < thresholdMm) {
      // KIVRIM/FİN ELEMESİ: pürüzlü yüzey (levelSet kavitesi) kendi üstüne
      // katlanınca iki yüz arası HAVA olur — sahte "0.0x mm et" okur. Gerçek
      // ince DUVARDA aralığın orta noktası metalin İÇİNDEDİR (ışın paritesi).
      mid.copy(origin).addScaledVector(dir, Math.max(0, t - eps) / 2);
      const parity = bvh.raycast(new THREE.Ray(mid, PARITY_DIR), THREE.DoubleSide).length;
      if (parity % 2 === 0) continue; // orta nokta dışarıda → kıvrım, et değil
      if (t < minFound) minFound = t;
      for (const iv of [i0, i1, i2]) {
        const prev = thinMap.get(iv);
        if (prev === undefined || t < prev) thinMap.set(iv, t);
      }
    } else if (t < minFound) {
      minFound = t;
    }
  }
  const thin = [...thinMap.keys()];
  const thinDepths = new Float32Array(thin.length);
  for (let k = 0; k < thin.length; k += 1) thinDepths[k] = thinMap.get(thin[k])!;
  return {
    thinVerts: new Uint32Array(thin),
    thinDepths,
    thinCount: thin.length,
    sampled,
    minFoundMm: Number.isFinite(minFound) ? minFound : 0,
  };
}

// ---------------------------------------------------------------------------
// Oto düzelt: ince noktaları delik sütunlarıyla eşle — hangi delikler suçlu?
// Suçlu delikler plandan çıkarılıp boolean orijinalden yeniden koşulur.
// ---------------------------------------------------------------------------
export type ThinBlameInput = {
  entry: THREE.Vector3;
  dir: THREE.Vector3;
  depth: number;
  /** deliğin UV yarıçapı (poligon maks yarıçapı) */
  radiusMm: number;
};

/** Taban çizgisi ince noktaları (delik ÖNCESİ geometri) — xyz üçlüleri. */
export function thinPositions(geometry: THREE.BufferGeometry, thinVerts: Uint32Array): Float32Array {
  const pos = geometry.attributes.position;
  const out = new Float32Array(thinVerts.length * 3);
  for (let k = 0; k < thinVerts.length; k += 1) {
    const i = thinVerts[k];
    out[k * 3] = pos.getX(i);
    out[k * 3 + 1] = pos.getY(i);
    out[k * 3 + 2] = pos.getZ(i);
  }
  return out;
}

/** İnce vertexleri delik sütunlarıyla eşler: hangi delikler suçlu + hangi
 *  ince vertexler AJURDAN kaynaklı (deliğe yakın). Deliğe uzak inceler modelin
 *  kendi detayıdır (sculpt ucu vb.) — oto düzeltin hedefi değildir.
 *  baselinePositions verilirse: delik ÖNCESİNDE de o konum civarı inceyse
 *  (sculpt süslemesi deliğe komşu düşmüş) delik SUÇLANMAZ. */
export function blameThinHoles(
  resultGeometry: THREE.BufferGeometry,
  thinVerts: Uint32Array,
  holes: ThinBlameInput[],
  extraMm = 1.0,
  baselinePositions?: Float32Array,
): { holeIdx: number[]; vertIdx: Uint32Array } {
  const pos = resultGeometry.attributes.position;
  const p = new THREE.Vector3();
  const ap = new THREE.Vector3();
  const closest = new THREE.Vector3();
  const blamed = new Set<number>();
  const nearVerts: number[] = [];
  const baseR2 = 0.35 * 0.35; // taban ince noktasına bu kadar yakınsa "zaten vardı"
  const preexisting = (x: number, y: number, z: number): boolean => {
    if (!baselinePositions) return false;
    for (let b = 0; b < baselinePositions.length; b += 3) {
      const dx = x - baselinePositions[b];
      const dy = y - baselinePositions[b + 1];
      const dz = z - baselinePositions[b + 2];
      if (dx * dx + dy * dy + dz * dz < baseR2) return true;
    }
    return false;
  };
  for (let k = 0; k < thinVerts.length; k += 1) {
    p.fromBufferAttribute(pos, thinVerts[k]);
    let nearHole = -1;
    for (let i = 0; i < holes.length; i += 1) {
      const h = holes[i];
      ap.subVectors(p, h.entry);
      const t = Math.max(0, Math.min(h.depth, ap.dot(h.dir)));
      closest.copy(h.entry).addScaledVector(h.dir, t);
      if (p.distanceTo(closest) < h.radiusMm + extraMm) { nearHole = i; break; }
    }
    if (nearHole < 0) continue;
    if (preexisting(p.x, p.y, p.z)) continue; // delikten önce de inceydi
    blamed.add(nearHole);
    nearVerts.push(thinVerts[k]);
  }
  return { holeIdx: [...blamed].sort((a, b) => a - b), vertIdx: new Uint32Array(nearVerts) };
}
