import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";

// ---------------------------------------------------------------------------
// Güvenli bölge maskesi (PRD §4.4 Adım 3)
//   - Otomatik tespit: yüzük → iç şank yüzeyi; madalyon → düz arka yüzey
//   - Per-vertex maske (Uint8Array) + fırça ekle/çıkar
//   - Maske → UV çerçevesi (silindirik ya da düzlemsel) — patern yerleşimi
//     bu çerçevede yapılır, delikler maske dışına ASLA taşmaz.
// ---------------------------------------------------------------------------

export type ModelKind = "ring" | "medallion";

export type MaskFrame =
  | {
      kind: "cylindrical";
      axisIndex: 0 | 1 | 2;
      center: THREE.Vector3;   // eksen üzerinden geçen nokta (bbox merkezi)
      innerRadius: number;      // maskelenen iç yüzey medyan yarıçapı
    }
  | {
      kind: "planar";
      origin: THREE.Vector3;
      normal: THREE.Vector3;    // arka yüzden DIŞARI bakan normal
      u: THREE.Vector3;
      v: THREE.Vector3;
    };

// ---- model tipi tespiti -----------------------------------------------------

/** Yüzük mü madalyon mu? Merkezden eksen boyunca ışın: hiç yüzey kesmiyorsa
 *  o eksende parmak deliği var → yüzük. Hiçbir eksende delik yoksa madalyon. */
export function detectModelKind(
  geometry: THREE.BufferGeometry,
  bvh: MeshBVH,
): { kind: ModelKind; ringAxis: 0 | 1 | 2 | null } {
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox!;
  const c = bb.getCenter(new THREE.Vector3());
  const size = bb.getSize(new THREE.Vector3());
  for (let a = 0 as 0 | 1 | 2; a < 3; a = (a + 1) as 0 | 1 | 2) {
    const start = c.clone().setComponent(a, bb.min.getComponent(a) - size.getComponent(a) * 0.2 - 1);
    const dir = new THREE.Vector3().setComponent(a, 1);
    const hits = bvh.raycast(new THREE.Ray(start, dir), THREE.DoubleSide);
    if (hits.length === 0) return { kind: "ring", ringAxis: a };
  }
  return { kind: "medallion", ringAxis: null };
}

// ---- otomatik maske ---------------------------------------------------------

const AXES: [THREE.Vector3, THREE.Vector3, THREE.Vector3] = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, 0, 1),
];

/** Yüzük: normali eksene (içe) bakan İÇ ŞANK yüzeyi. bvh verilirse GÖRÜNÜRLÜK
 *  testi yapılır: eksenden vertexe ışın atılır; ilk vuruş o vertex değilse
 *  (içi boş modelde KAVİTE duvarı gibi gizli yüzey) maskeye ALINMAZ. Yoksa
 *  medyan iç yarıçap kaviteye kayar → ark ölçeği ve köprü hesabı bozulur. */
export function autoMaskRing(
  geometry: THREE.BufferGeometry,
  ringAxis: 0 | 1 | 2,
  bvh?: MeshBVH,
): { mask: Uint8Array; frame: MaskFrame } {
  const pos = geometry.attributes.position;
  if (!geometry.attributes.normal) geometry.computeVertexNormals();
  const nrm = geometry.attributes.normal;
  geometry.computeBoundingBox();
  const center = geometry.boundingBox!.getCenter(new THREE.Vector3());
  const n = pos.count;
  const mask = new Uint8Array(n);
  const p = new THREE.Vector3();
  const nv = new THREE.Vector3();
  const radial = new THREE.Vector3();
  const rayO = new THREE.Vector3();
  const radii: number[] = [];
  for (let i = 0; i < n; i += 1) {
    p.fromBufferAttribute(pos, i).sub(center);
    const axial = p.getComponent(ringAxis);
    p.setComponent(ringAxis, 0);
    const r = p.length();
    if (r < 1e-6) continue;
    radial.copy(p).normalize();
    nv.fromBufferAttribute(nrm, i);
    // iç yüzey: normal eksene doğru (radyal dışın tersi)
    if (radial.dot(nv) >= -0.45) continue;
    if (bvh) {
      rayO.copy(center).setComponent(ringAxis, center.getComponent(ringAxis) + axial);
      const hit = bvh.raycastFirst(new THREE.Ray(rayO, radial), THREE.DoubleSide);
      if (!hit || Math.abs(hit.distance - r) > 0.05) continue; // gizli yüzey
    }
    mask[i] = 1;
    radii.push(r);
  }
  radii.sort((a, b) => a - b);
  const innerRadius = radii.length ? radii[Math.floor(radii.length / 2)] : 1;
  return { mask, frame: { kind: "cylindrical", axisIndex: ringAxis, center, innerRadius } };
}

/** Madalyon: en ince eksenin AZ yüzey alanlı (sade/düz) ucu = arka plaka.
 *  bvh verilirse görünürlük testi: arkadan bakınca ilk görünen yüzey olmayan
 *  (kavite duvarı gibi gizli) vertexler maskeye alınmaz. */
export function autoMaskMedallion(geometry: THREE.BufferGeometry, bvh?: MeshBVH): { mask: Uint8Array; frame: MaskFrame } {
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox!;
  const size = bb.getSize(new THREE.Vector3());
  const dims = [size.x, size.y, size.z];
  const a = dims.indexOf(Math.min(...dims)) as 0 | 1 | 2;

  // hangi uç arka? — +/- bakan yüzeylerin toplam alanı; AZ olan sade/düz arka
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  const tpos = g.attributes.position;
  const tri = Math.floor(tpos.count / 3);
  const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), cross = new THREE.Vector3();
  let pArea = 0, mArea = 0;
  for (let t = 0; t < tri; t += 1) {
    const i = t * 3;
    va.fromBufferAttribute(tpos, i);
    vb.fromBufferAttribute(tpos, i + 1);
    vc.fromBufferAttribute(tpos, i + 2);
    ab.subVectors(vb, va); ac.subVectors(vc, va); cross.crossVectors(ab, ac);
    const len = cross.length();
    if (len < 1e-12) continue;
    const nai = cross.getComponent(a) / len;
    if (nai > 0.5) pArea += len / 2;
    else if (nai < -0.5) mArea += len / 2;
  }
  const backSign = pArea < mArea ? 1 : -1; // az alanlı uç arka
  const backCoord = backSign > 0 ? bb.max.getComponent(a) : bb.min.getComponent(a);
  const thickness = dims[a];

  const pos = geometry.attributes.position;
  if (!geometry.attributes.normal) geometry.computeVertexNormals();
  const nrm = geometry.attributes.normal;
  const n = pos.count;
  const mask = new Uint8Array(n);
  const nv = new THREE.Vector3();
  const rayO = new THREE.Vector3();
  const rayD = AXES[a].clone().multiplyScalar(-backSign); // arkadan içeri bakış
  const vtx = new THREE.Vector3();
  for (let i = 0; i < n; i += 1) {
    nv.fromBufferAttribute(nrm, i);
    const alongBack = nv.getComponent(a) * backSign;
    const dist = Math.abs(pos.getComponent(i, a as 0 | 1 | 2) - backCoord);
    if (!(alongBack > 0.6 && dist < thickness * 0.3)) continue;
    if (bvh) {
      vtx.fromBufferAttribute(pos, i);
      rayO.copy(vtx).setComponent(a, backCoord + backSign * (thickness * 0.5 + 1));
      const hit = bvh.raycastFirst(new THREE.Ray(rayO, rayD), THREE.DoubleSide);
      const expect = Math.abs(rayO.getComponent(a) - vtx.getComponent(a));
      if (!hit || Math.abs(hit.distance - expect) > 0.05) continue; // gizli yüzey
    }
    mask[i] = 1;
  }

  const normal = AXES[a].clone().multiplyScalar(backSign);
  // (u, v, normal) HER ZAMAN sağ-elli olmalı — prizma extrude determinantı
  // pozitif kalsın (ayna/ters katı üretmesin). backSign<0 ise u↔v takas.
  let u = AXES[(a + 1) % 3].clone();
  let v = AXES[(a + 2) % 3].clone();
  if (backSign < 0) { const tmp = u; u = v; v = tmp; }
  const origin = bb.getCenter(new THREE.Vector3()).setComponent(a, backCoord);
  return { mask, frame: { kind: "planar", origin, normal, u, v } };
}

// ---- fırça -------------------------------------------------------------------

/** Fırça: merkez etrafındaki vertexleri maskeye ekler/çıkarır. Değişen sayısı döner. */
export function applyBrush(
  geometry: THREE.BufferGeometry,
  mask: Uint8Array,
  center: THREE.Vector3,
  radiusMm: number,
  mode: "add" | "remove",
): number {
  const pos = geometry.attributes.position;
  const n = pos.count;
  const r2 = radiusMm * radiusMm;
  const val = mode === "add" ? 1 : 0;
  let changed = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = pos.getX(i) - center.x;
    const dy = pos.getY(i) - center.y;
    const dz = pos.getZ(i) - center.z;
    if (dx * dx + dy * dy + dz * dz > r2) continue;
    if (mask[i] !== val) {
      mask[i] = val;
      changed += 1;
    }
  }
  return changed;
}

export const maskedCount = (mask: Uint8Array): number => {
  let c = 0;
  for (let i = 0; i < mask.length; i += 1) c += mask[i];
  return c;
};

// ---- UV eşleme ----------------------------------------------------------------

/** Noktanın UV koordinatı (mm). Silindirik: u = θ·rIç (yay uzunluğu), v = eksen. */
export function uvOfPoint(frame: MaskFrame, p: THREE.Vector3): [number, number] {
  if (frame.kind === "planar") {
    const d = new THREE.Vector3().subVectors(p, frame.origin);
    return [d.dot(frame.u), d.dot(frame.v)];
  }
  const a = frame.axisIndex;
  const d = new THREE.Vector3().subVectors(p, frame.center);
  const axial = d.getComponent(a);
  d.setComponent(a, 0);
  const theta = Math.atan2(d.getComponent((a + 2) % 3), d.getComponent((a + 1) % 3));
  return [theta * frame.innerRadius, axial];
}

/** UV → delme ışını: origin (yüzeyin gerisinden) + yön. Silindirikte eksenden
 *  DIŞARI radyal; düzlemselde arka normalden İÇERİ. */
export function drillRayOfUV(
  frame: MaskFrame,
  u: number,
  v: number,
): { origin: THREE.Vector3; dir: THREE.Vector3 } {
  if (frame.kind === "planar") {
    const origin = frame.origin
      .clone()
      .addScaledVector(frame.u, u)
      .addScaledVector(frame.v, v)
      .addScaledVector(frame.normal, 5); // yüzeyin 5mm dışından başla
    return { origin, dir: frame.normal.clone().multiplyScalar(-1) };
  }
  const a = frame.axisIndex;
  const theta = u / frame.innerRadius;
  const radial = new THREE.Vector3();
  radial.setComponent((a + 1) % 3, Math.cos(theta));
  radial.setComponent((a + 2) % 3, Math.sin(theta));
  const origin = frame.center.clone();
  origin.setComponent(a, origin.getComponent(a) + v);
  // eksenden (parmak boşluğundan) dışarı doğru delinir
  return { origin, dir: radial };
}

export type UVBounds = { minU: number; maxU: number; minV: number; maxV: number; fullCircle: boolean };

/** Maskelenen vertexlerin UV sınırları. Silindirikte tam tur kontrolü + sarım
 *  (en büyük boşluğa göre aralığı yeniden merkezler). */
export function maskUVBounds(
  geometry: THREE.BufferGeometry,
  mask: Uint8Array,
  frame: MaskFrame,
): UVBounds | null {
  const pos = geometry.attributes.position;
  const p = new THREE.Vector3();
  if (frame.kind === "planar") {
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (let i = 0; i < pos.count; i += 1) {
      if (!mask[i]) continue;
      p.fromBufferAttribute(pos, i);
      const [uu, vv] = uvOfPoint(frame, p);
      if (uu < minU) minU = uu; if (uu > maxU) maxU = uu;
      if (vv < minV) minV = vv; if (vv > maxV) maxV = vv;
    }
    if (!Number.isFinite(minU)) return null;
    return { minU, maxU, minV, maxV, fullCircle: false };
  }

  // silindirik: θ dağılımına bak
  const thetas: number[] = [];
  let minV = Infinity, maxV = -Infinity;
  const a = frame.axisIndex;
  const d = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    if (!mask[i]) continue;
    p.fromBufferAttribute(pos, i);
    d.subVectors(p, frame.center);
    const axial = d.getComponent(a);
    d.setComponent(a, 0);
    thetas.push(Math.atan2(d.getComponent((a + 2) % 3), d.getComponent((a + 1) % 3)));
    if (axial < minV) minV = axial; if (axial > maxV) maxV = axial;
  }
  if (thetas.length === 0) return null;
  thetas.sort((x, y) => x - y);
  // en büyük açısal boşluk
  let maxGap = 2 * Math.PI - (thetas[thetas.length - 1] - thetas[0]);
  let gapEnd = thetas[0]; // boşluğun bittiği yer = aralığın başı
  for (let i = 1; i < thetas.length; i += 1) {
    const gap = thetas[i] - thetas[i - 1];
    if (gap > maxGap) { maxGap = gap; gapEnd = thetas[i]; }
  }
  const fullCircle = maxGap < (Math.PI / 180) * 15; // <15° boşluk → tam tur
  if (fullCircle) {
    return {
      minU: -Math.PI * frame.innerRadius,
      maxU: Math.PI * frame.innerRadius,
      minV, maxV, fullCircle,
    };
  }
  const start = gapEnd;
  const span = 2 * Math.PI - maxGap;
  return { minU: start * frame.innerRadius, maxU: (start + span) * frame.innerRadius, minV, maxV, fullCircle };
}
