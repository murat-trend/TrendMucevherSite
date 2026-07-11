import * as THREE from "three";
import { loadManifold, manifoldToGeo, manifoldVolume, type ManifoldT } from "./manifoldKit";
import type { MaskFrame } from "./mask";

// ---------------------------------------------------------------------------
// KAPAK / İÇ ASTAR (kapaklı ajur, literatür: pierced work + backing) — v1:
// YÜZÜK iç astar bandı. Delikli iç şankın altına ince, pürüzsüz bir tüp:
//   - tek parça (kaynaşık): tüp yüzeye hafif gömülür → union'da kaynar
//   - ayrı parça (lehimlik): tüp her noktada yüzeyden gapMm boşluklu kalır
// Ten teması pürüzsüzleşir, kir girmez; desen delik derinliğinde okunur.
// Madalyon tam arka plakası v2 (gövde-kırpma altyapısı gerekiyor).
// ---------------------------------------------------------------------------

export type LinerOpts = {
  thicknessMm: number;          // astar et kalınlığı
  /** 0 = tek parça (kaynaşık); >0 = ayrı parça, yüzeyle arasındaki boşluk */
  gapMm: number;
  /** bant eksenel uçlarında maske sınırından içeri pay */
  endInsetMm?: number;
  /** verilirse bant bu eksenel aralıkla sınırlanır (ör. deliklerin aralığı) —
   *  yoksa tüm bor bandı kaplanır (taç altına kadar uzayıp gram yer) */
  axialRangeMm?: [number, number];
};

export type LinerResult = {
  geometry: THREE.BufferGeometry;
  volumeMm3: number;
  /** bandın eksenel aralığı + yarıçapları (rapor için) */
  spanMm: number;
  rOuterMm: number;
  rInnerMm: number;
};

/** Maskeli vertexlerin (iç şank) yarıçap ve eksenel dağılımı — SADECE gerçek
 *  silindirik bor bandı: maske, kafaya doğru genişleyen iç yüzeyleri de
 *  içerebilir; medyan yarıçapın ±%12 (min 1mm) dışındakiler bant dışıdır,
 *  astar oraya uzanmamalı (dev tıpa/temas hatası üretir). */
function maskedRadialStats(
  geometry: THREE.BufferGeometry,
  mask: Uint8Array,
  frame: Extract<MaskFrame, { kind: "cylindrical" }>,
) {
  const pos = geometry.attributes.position;
  const a = frame.axisIndex;
  const p = new THREE.Vector3();
  const all: { r: number; v: number }[] = [];
  for (let i = 0; i < pos.count; i += 1) {
    if (!mask[i]) continue;
    p.fromBufferAttribute(pos, i).sub(frame.center);
    const axial = p.getComponent(a);
    p.setComponent(a, 0);
    all.push({ r: p.length(), v: axial });
  }
  all.sort((x, y) => x.r - y.r);
  // bor = EN KÜÇÜK yarıçaplı bant. Medyan güvenilmez: kafa altındaki geniş
  // kemer yüzeyi vertex sayısıyla baskın çıkıp bandı yukarı çeker. Alt uca
  // (2. persentil) demirle, dar toleransla bandı topla.
  const rBase = all[Math.floor(all.length * 0.02)]?.r ?? 1;
  const tol = Math.max(0.8, rBase * 0.1);
  let rMin = Infinity, rMax = -Infinity, minV = Infinity, maxV = -Infinity, n = 0;
  for (const e of all) {
    if (e.r - rBase > tol) continue;
    n += 1;
    if (e.r < rMin) rMin = e.r;
    if (e.r > rMax) rMax = e.r;
    if (e.v < minV) minV = e.v;
    if (e.v > maxV) maxV = e.v;
  }
  return { rMin, rMax, minV, maxV, n };
}

export async function buildRingLiner(
  geometry: THREE.BufferGeometry,
  mask: Uint8Array,
  frame: MaskFrame,
  opts: LinerOpts,
): Promise<LinerResult> {
  if (frame.kind !== "cylindrical") {
    throw new Error("İç astar v1 yalnız yüzük (silindirik bölge) için — madalyon kapağı sırada.");
  }
  const stats = maskedRadialStats(geometry, mask, frame);
  if (stats.n < 50) throw new Error("Güvenli bölge astar için çok küçük.");

  const t = Math.max(0.3, opts.thicknessMm);
  const inset = opts.endInsetMm ?? 0.2;
  let lowV = stats.minV, highV = stats.maxV;
  if (opts.axialRangeMm) {
    lowV = Math.max(lowV, opts.axialRangeMm[0]);
    highV = Math.min(highV, opts.axialRangeMm[1]);
  }
  const span = highV - lowV - 2 * inset;
  if (span < 1) throw new Error("Bölgenin eksenel genişliği astar için yetersiz.");

  // tek parça: bandın EN GİRİNTİLİ noktasını da (gravür dibi) geçip gömülsün —
  //   yoksa astar-yüzey arasında hapsolmuş mikro boşluk = döküm kabarcığı riski
  // ayrı parça: bandın EN ÇIKINTILI noktasından bile gap kadar uzak (mutlak min)
  const rOuter = opts.gapMm <= 0 ? stats.rMax + 0.2 : stats.rMin - opts.gapMm;
  const rInner = rOuter - t;
  if (rInner < 0.5) throw new Error("Astar iç yarıçapı anlamsız — kalınlığı azaltın.");

  const w = await loadManifold();
  const { Manifold } = w;
  const outer = Manifold.cylinder(span, rOuter, rOuter, 128, true);
  const inner = Manifold.cylinder(span + 1, rInner, rInner, 128, true);
  let tube: ManifoldT = outer.subtract(inner);
  outer.delete?.(); inner.delete?.();

  // silindir Z eksenli üretilir → bant eksenine döndür + bant merkezine taşı
  const a = frame.axisIndex;
  const mid = (lowV + highV) / 2;
  const c = frame.center;
  const m: number[] = new Array(16).fill(0);
  // sütunlar = yerel eksenlerin dünya karşılığı; det=+1 kalsın (döngüsel permütasyon)
  if (a === 2) { m[0] = 1; m[5] = 1; m[10] = 1; }           // Z→Z (birim)
  else if (a === 0) { m[1] = 1; m[6] = 1; m[8] = 1; }       // Z→X: X→Y, Y→Z
  else { m[2] = 1; m[4] = 1; m[9] = 1; }                    // Z→Y: X→Z, Y→X
  m[12] = c.x + (a === 0 ? mid : 0);
  m[13] = c.y + (a === 1 ? mid : 0);
  m[14] = c.z + (a === 2 ? mid : 0);
  m[15] = 1;
  tube = tube.transform(m as unknown as Parameters<ManifoldT["transform"]>[0]);

  const volumeMm3 = manifoldVolume(tube);
  const geo = manifoldToGeo(tube);
  tube.delete?.();
  return { geometry: geo, volumeMm3, spanMm: span, rOuterMm: rOuter, rInnerMm: rInner };
}
