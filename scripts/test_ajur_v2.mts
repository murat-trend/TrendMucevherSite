// Ajur v2 (PRD yeniden yapım) headless smoke testi
// Çalıştır: node --experimental-strip-types --import ./scripts/ts-register.mjs scripts/test_ajur_v2.mts
import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { validateOnLoad, detectShell, scanMinWall } from "../app/(site)/remaura/ajur/lib/validate.ts";
import { detectModelKind, autoMaskRing, autoMaskMedallion, maskedCount } from "../app/(site)/remaura/ajur/lib/mask.ts";
import { planHoles, applyAjur } from "../app/(site)/remaura/ajur/lib/applyAjur.ts";
import { PATTERNS } from "../app/(site)/remaura/ajur/lib/patterns.ts";
import { estimateHollowCavity } from "../app/(site)/remaura/ajur/lib/estimate.ts";

function topoCheck(geo: THREE.BufferGeometry): { open: number; nonManifold: number } {
  const g = geo.index ? geo : mergeVertices(geo);
  const idx = g.index!.array;
  const counts = new Map<string, number>();
  for (let t = 0; t < idx.length; t += 3) {
    for (let k = 0; k < 3; k += 1) {
      const a = idx[t + k], b = idx[t + ((k + 1) % 3)];
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  let open = 0, nm = 0;
  for (const c of counts.values()) {
    if (c === 1) open += 1;
    else if (c > 2) nm += 1;
  }
  return { open, nonManifold: nm };
}

function indexed(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  geo.deleteAttribute("normal");
  geo.deleteAttribute("uv");
  const g = mergeVertices(geo);
  g.computeVertexNormals();
  g.computeBoundingBox();
  return g;
}

async function testRing() {
  console.log("\n=== YÜZÜK (torus, eksen Z) ===");
  // gerçekçi şank: merkez R=10, tüp r=3 → iç yüzey bandı ~5mm genişlik
  const geo = indexed(new THREE.TorusGeometry(10, 3, 28, 96));
  const val = await validateOnLoad(geo);
  console.log("validate:", val.ok, "tris:", val.tris, "vol:", val.volumeMm3.toFixed(1), "mm³");
  if (!val.ok) throw new Error(val.error);

  const bvh = new MeshBVH(geo);
  console.log("shell?", detectShell(bvh, geo));
  const det = detectModelKind(geo, bvh);
  console.log("kind:", det.kind, "ringAxis:", det.ringAxis);
  if (det.kind !== "ring") throw new Error("yüzük tespit edilemedi");

  const { mask, frame } = autoMaskRing(geo, det.ringAxis!);
  console.log("mask verts:", maskedCount(mask), "/", mask.length, "innerR:", (frame as { innerRadius: number }).innerRadius.toFixed(2));

  const ctx = { geometry: geo, bvh, mask, frame, isShell: false };
  const plan = planHoles(ctx, { patternId: "oval", cellMm: 2.5, holeScale: 0.6, rotationDeg: 0, marginMm: 1.0, frontSkinMm: 1 });
  console.log("plan: holes:", plan.placements.length, "skipped:", plan.skipped, "bridge:", plan.bridgeMm.toFixed(2), "removed:", plan.removedMm3.toFixed(1));
  if (plan.placements.length === 0) throw new Error("yüzükte delik planlanamadı");

  const res = await applyAjur(ctx, plan);
  const topo = topoCheck(res.geometry);
  console.log("apply:", res.holes, "delik,", res.ms, "ms · vol", res.volumeBeforeMm3.toFixed(1), "→", res.volumeAfterMm3.toFixed(1));
  console.log("topo: açık:", topo.open, "nm:", topo.nonManifold);
  if (topo.open !== 0 || topo.nonManifold !== 0) throw new Error("yüzük sonucu watertight değil");
  if (!(res.volumeAfterMm3 < res.volumeBeforeMm3)) throw new Error("hacim düşmedi");

  // min-et taraması — sahte sıyırma okumaları elendi mi? (tüp duvarı ~6mm dolu)
  const scan = scanMinWall(res.geometry, new MeshBVH(res.geometry), 0.7);
  console.log("minWall: ince:", scan.thinCount, "/", scan.sampled, "enİnce:", scan.minFoundMm.toFixed(3), "mm");
  if (scan.minFoundMm > 0 && scan.minFoundMm < 0.2) throw new Error("min-et hâlâ sıyırma gürültüsü okuyor");
}

async function testMedallion(patternId: string) {
  console.log(`\n=== MADALYON (kutu 24×30×3, desen: ${patternId}) ===`);
  const geo = indexed(new THREE.BoxGeometry(24, 30, 3, 24, 30, 3));
  const val = await validateOnLoad(geo);
  console.log("validate:", val.ok, "tris:", val.tris, "vol:", val.volumeMm3.toFixed(1));
  if (!val.ok) throw new Error(val.error);

  const bvh = new MeshBVH(geo);
  const det = detectModelKind(geo, bvh);
  console.log("kind:", det.kind);
  const { mask, frame } = autoMaskMedallion(geo);
  console.log("mask verts:", maskedCount(mask), "/", mask.length);
  if (maskedCount(mask) === 0) throw new Error("madalyon maskesi boş");

  // kaba hollow tahmini de dumanlansın
  const cav = estimateHollowCavity(geo, bvh, 1.0);
  console.log("hollow tahmini kavite:", cav.toFixed(1), "mm³ (gerçek ~", (22 * 28 * 1).toFixed(0), ")");

  const ctx = { geometry: geo, bvh, mask, frame, isShell: false };
  const plan = planHoles(ctx, { patternId, cellMm: 5, holeScale: 0.6, rotationDeg: 0, marginMm: 1.5, frontSkinMm: 1 });
  console.log("plan: holes:", plan.placements.length, "skipped:", plan.skipped, "bridge:", plan.bridgeMm.toFixed(2));
  if (plan.placements.length === 0) throw new Error("madalyonda delik planlanamadı");

  const res = await applyAjur(ctx, plan);
  const topo = topoCheck(res.geometry);
  console.log("apply:", res.holes, "delik,", res.ms, "ms · vol", res.volumeBeforeMm3.toFixed(1), "→", res.volumeAfterMm3.toFixed(1));
  console.log("topo: açık:", topo.open, "nm:", topo.nonManifold);
  if (topo.open !== 0 || topo.nonManifold !== 0) throw new Error("madalyon sonucu watertight değil");
  // kör delik: kalınlık 3, frontSkin 1 → derinlik ~2, hacim azalmalı ama delinip geçmemeli
  if (!(res.volumeAfterMm3 < res.volumeBeforeMm3)) throw new Error("hacim düşmedi");
}

async function main() {
  console.log("desen sayısı:", PATTERNS.length);
  await testRing();
  await testMedallion("gotik-trellis");
  await testMedallion("fleur");
  await testMedallion("gul-penceresi");
  console.log("\n✓ TÜM SMOKE TESTLER GEÇTİ");
}

main().catch((e) => { console.error("\n✗ TEST HATASI:", e.message); process.exit(1); });
