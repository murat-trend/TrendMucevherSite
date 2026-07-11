import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";
import { METALS } from "../../mesh-temizle/lib/meshOps";

// ---------------------------------------------------------------------------
// Senaryo tahminleri (PRD §4.3) — kaba ama hızlı (±%10 hedefi):
//   - hollow kazanç tahmini: voxel doluluk (scanline ışın paritesi) + chamfer
//     mesafe dönüşümü → duvardan derin voxeller = kavite
//   - metal gram hesabı (METALS yoğunlukları — mesh-temizle ile ortak)
// Gerçek sayılar "Uygula" sonrası Manifold hacminden gelir; bunlar karttaki
// yönlendirme tahminidir.
// ---------------------------------------------------------------------------

export type MetalGram = { key: string; label: string; density: number; grams: number };

export function gramsForVolume(volumeMm3: number): MetalGram[] {
  const cm3 = volumeMm3 / 1000;
  return METALS.map((m) => ({ ...m, grams: cm3 * m.density }));
}

export function gramForMetal(volumeMm3: number, metalKey: string): number {
  const m = METALS.find((x) => x.key === metalKey) ?? METALS[0];
  return (volumeMm3 / 1000) * m.density;
}

/** Kaba iç boşaltma tahmini — 64³ voxel. Dönen değer: kavite hacmi (mm³). */
export function estimateHollowCavity(
  geometry: THREE.BufferGeometry,
  bvh: MeshBVH,
  wallMm: number,
  gridMax = 64,
): number {
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox!;
  const size = bb.getSize(new THREE.Vector3());
  const maxExt = Math.max(size.x, size.y, size.z) || 1;
  const minExt = Math.min(size.x, size.y, size.z) || 1;
  // en ince eksende ≥12 voxel olsun — ince plakalarda nicemleme kavite
  // kalınlığını yutuyor/şişiriyordu (±%10 hedefi için şart)
  const pitch = Math.min(maxExt / gridMax, minExt / 12);
  // 1 voxel PADDING şart: her yönde "dışarısı" katmanı olmalı ki mesafe
  // dönüşümü tüm yüzeylere uzaklığı görsün (yoksa ince plakada kavite şişer)
  const gx0 = bb.min.x - pitch, gy0 = bb.min.y - pitch, gz0 = bb.min.z - pitch;
  const nx = Math.max(6, Math.ceil(size.x / pitch) + 2);
  const ny = Math.max(6, Math.ceil(size.y / pitch) + 2);
  const nz = Math.max(6, Math.ceil(size.z / pitch) + 2);

  // 1) scanline parite doldurma — her (y,z) kolonu için TEK ışın
  const inside = new Uint8Array(nx * ny * nz);
  const dir = new THREE.Vector3(1, 0, 0);
  const origin = new THREE.Vector3();
  const startX = gx0 - pitch;
  // 0.5 yerine hafif kaçık örnekleme: ızgara-hizalı yüzeylerde (kutu vb.) ışının
  // tam üçgen KENARINDAN geçmesi çift/tek vuruş üretip doldurmayı şeritliyordu
  const offY = 0.4871, offZ = 0.5129;
  for (let kz = 0; kz < nz; kz += 1) {
    for (let ky = 0; ky < ny; ky += 1) {
      origin.set(startX, gy0 + (ky + offY) * pitch, gz0 + (kz + offZ) * pitch);
      const raw = bvh
        .raycast(new THREE.Ray(origin, dir), THREE.DoubleSide)
        .map((h) => h.distance)
        .sort((a, b) => a - b);
      // kenar paylaşan üçgenlerin çift vuruşlarını tekle
      const hits: number[] = [];
      for (const d of raw) {
        if (hits.length === 0 || d - hits[hits.length - 1] > pitch * 1e-3) hits.push(d);
      }
      // çift indeks aralıkları (giriş-çıkış) içeride
      for (let h = 0; h + 1 < hits.length; h += 2) {
        const x0 = hits[h] + startX, x1 = hits[h + 1] + startX;
        const k0 = Math.max(0, Math.ceil((x0 - gx0) / pitch - 0.5));
        const k1 = Math.min(nx - 1, Math.floor((x1 - gx0) / pitch - 0.5));
        for (let kx = k0; kx <= k1; kx += 1) {
          inside[kx + ky * nx + kz * nx * ny] = 1;
        }
      }
    }
  }

  // 2) chamfer mesafe dönüşümü (voxel cinsinden, dışa uzaklık) — iki geçiş
  const INF = 1e9;
  const dist = new Float32Array(nx * ny * nz);
  for (let i = 0; i < dist.length; i += 1) dist[i] = inside[i] ? INF : 0;
  const at = (x: number, y: number, z: number) => x + y * nx + z * nx * ny;
  const relax = (i: number, j: number, w: number) => {
    if (dist[j] + w < dist[i]) dist[i] = dist[j] + w;
  };
  // ileri geçiş
  for (let z = 0; z < nz; z += 1)
    for (let y = 0; y < ny; y += 1)
      for (let x = 0; x < nx; x += 1) {
        const i = at(x, y, z);
        if (dist[i] === 0) continue;
        if (x > 0) relax(i, at(x - 1, y, z), 1);
        if (y > 0) relax(i, at(x, y - 1, z), 1);
        if (z > 0) relax(i, at(x, y, z - 1), 1);
        if (x > 0 && y > 0) relax(i, at(x - 1, y - 1, z), 1.414);
        if (x > 0 && z > 0) relax(i, at(x - 1, y, z - 1), 1.414);
        if (y > 0 && z > 0) relax(i, at(x, y - 1, z - 1), 1.414);
      }
  // geri geçiş
  for (let z = nz - 1; z >= 0; z -= 1)
    for (let y = ny - 1; y >= 0; y -= 1)
      for (let x = nx - 1; x >= 0; x -= 1) {
        const i = at(x, y, z);
        if (dist[i] === 0) continue;
        if (x < nx - 1) relax(i, at(x + 1, y, z), 1);
        if (y < ny - 1) relax(i, at(x, y + 1, z), 1);
        if (z < nz - 1) relax(i, at(x, y, z + 1), 1);
        if (x < nx - 1 && y < ny - 1) relax(i, at(x + 1, y + 1, z), 1.414);
        if (x < nx - 1 && z < nz - 1) relax(i, at(x + 1, y, z + 1), 1.414);
        if (y < ny - 1 && z < nz - 1) relax(i, at(x, y + 1, z + 1), 1.414);
      }

  // 3) duvardan derin voxeller = kavite
  // mesafe voxel MERKEZLERİ arasında sayılır; dış voxel merkezi yüzeyin
  // ~yarım voxel dışında, iç merkez ~yarım voxel içinde → net sapma ≈ 0.
  const wallVox = wallMm / pitch;
  let cavityVox = 0;
  for (let i = 0; i < dist.length; i += 1) {
    if (inside[i] && dist[i] > wallVox) cavityVox += 1;
  }
  return cavityVox * pitch * pitch * pitch;
}
