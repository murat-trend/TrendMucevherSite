import * as THREE from "three";
import { loadManifold, geoToManifold, manifoldToGeo, manifoldVolume } from "./manifoldKit";
import { buildSignedGrid } from "./ajurBoolean";

// ---------------------------------------------------------------------------
// Sayfa içi iç boşaltma — Manifold.levelSet kavitesi (garantili-manifold).
// NOT: hollowShellSDF/surfaceNets çıktısı boolean'a girmez ("Not manifold"
// dersi); bu yol buildHollowAjurDifference'ta kanıtlanmış olanın aynısı.
// Ana thread'de çalışır; grid örnekleme sırasında UI donabilir (V2: worker).
// ---------------------------------------------------------------------------

export type HollowResult = {
  geometry: THREE.BufferGeometry;
  volumeAfterMm3: number;
  cavityMm3: number;
  ms: number;
};

export async function hollowModel(
  geometry: THREE.BufferGeometry,
  wallMm: number,
  opts: { onProgress?: (p: number) => void; gridMax?: number } = {},
): Promise<HollowResult> {
  const t0 = Date.now();
  const w = await loadManifold();
  const { Manifold } = w;

  const grid = buildSignedGrid(geometry, opts.gridMax ?? 80, (p) => opts.onProgress?.(p * 0.7));
  const wall = Math.max(0.5, wallMm);
  const cavity = Manifold.levelSet(
    (p: number[]) => -(grid.sample(p[0], p[1], p[2]) + wall),
    { min: grid.minB, max: grid.maxB },
    grid.pitch,
  );
  opts.onProgress?.(0.8);

  const body = geoToManifold(w, geometry);
  const volBefore = manifoldVolume(body);
  const result = body.subtract(cavity);
  const volumeAfterMm3 = manifoldVolume(result);
  const geo = manifoldToGeo(result);
  body.delete?.(); cavity.delete?.(); result.delete?.();
  opts.onProgress?.(1);

  if (!(volumeAfterMm3 > 0) || volumeAfterMm3 >= volBefore - 1e-6) {
    geo.dispose();
    throw new Error("İç boşluk oluşturulamadı — duvar kalınlığı model için çok büyük olabilir.");
  }
  return { geometry: geo, volumeAfterMm3, cavityMm3: volBefore - volumeAfterMm3, ms: Date.now() - t0 };
}
