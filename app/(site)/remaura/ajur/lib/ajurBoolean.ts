import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { MeshBVH } from "three-mesh-bvh";
import { cutAndCap, type CapContour, type CutPlane, type PatternType } from "./ajurOps";
// manifold-3d dinamik yüklenir (wasm; "import" koşulu + tembel bundle)

// ---------------------------------------------------------------------------
// V3 — Gerçek arka ajur: desen deliklerini gövdeye BOOLEAN ile delmek.
// manifold-3d garantili-manifold → sonuç inşa gereği watertight.
// Derinlik kısmi = kör oyuk (ön korunur), tam = baştan sona ajur (ışık geçer).
// ---------------------------------------------------------------------------

export type AjurDrillOpts = {
  pattern: PatternType;
  cell: number;        // göz merkez-merkez (mm)
  holeScale: number;   // 0..1 delik/göz oranı
  border: number;      // kenardan pay (mm)
  through: boolean;    // baştan sona mı
  drillMm: number;     // kör derinlik (mm) — through=false iken
  fromMax: boolean;    // yüksek-uçtan mı delsin (yoksa alçak uç)
  footprintPlane: CutPlane; // silüet konturu (analizden gelen en geniş kesit)
  /** önceden TEMİZ geometriden hesaplanmış kontur — verilirse `geometry` kesilmez
   *  (SDF kabuğunun kesiti loop vermeyebilir; solid kontur sağlamdır). */
  footprintContour?: CapContour;
};

export type AjurDrillResult = {
  geometry: THREE.BufferGeometry;
  holes: number;     // açılan delik adedi
  strutMm: number;   // köprü kalınlığı
  ms: number;
};

// ---- manifold lazy init (wasm tek sefer) ----
type ManifoldWasm = Awaited<ReturnType<(typeof import("manifold-3d/manifold"))["default"]>>;
type ManifoldT = InstanceType<ManifoldWasm["Manifold"]>;
let _wasm: ManifoldWasm | null = null;
async function wasm(): Promise<ManifoldWasm> {
  if (_wasm) return _wasm;
  const mod = await import("manifold-3d/manifold");
  const w = await mod.default();
  w.setup();
  _wasm = w;
  return w;
}

// BufferGeometry → Manifold (weld → indexed → Mesh → Manifold). Paylaşılan helper.
function geoToManifold(w: ManifoldWasm, geometry: THREE.BufferGeometry): ManifoldT {
  const { Manifold, Mesh } = w;
  // normalleri sil → mergeVertices pozisyona göre kaynasın (per-face normal weld'i bozar)
  const src = geometry.clone();
  src.deleteAttribute("normal");
  src.deleteAttribute("uv");
  const indexed = mergeVertices(src);
  const pos = indexed.attributes.position.array as ArrayLike<number>;
  const idx = indexed.index!.array as ArrayLike<number>;
  const mesh = new Mesh({ numProp: 3, vertProperties: new Float32Array(pos), triVerts: new Uint32Array(idx) });
  mesh.merge();
  return new Manifold(mesh);
}

// Manifold → İNDEKSLİ BufferGeometry (manifold topolojisini koru). Paylaşılan helper.
function manifoldToGeo(result: ManifoldT): THREE.BufferGeometry {
  const out = result.getMesh();
  const np = out.numProp;
  const vp = out.vertProperties;
  const tv = out.triVerts;
  const nv = Math.floor(vp.length / np);
  const positions = new Float32Array(nv * 3);
  for (let i = 0; i < nv; i += 1) {
    positions[i * 3] = vp[i * np]; positions[i * 3 + 1] = vp[i * np + 1]; positions[i * 3 + 2] = vp[i * np + 2];
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(new THREE.Uint32BufferAttribute(new Uint32Array(tv), 1));
  geo.computeVertexNormals();
  return geo;
}

// İki watertight mesh'i manifold union ile TEK parça yap (kabuk + desenli slab kaynağı).
// Sonuç inşa gereği watertight. B modeli Stage 5 "single-piece" çıktısı.
export async function manifoldUnion(
  a: THREE.BufferGeometry,
  b: THREE.BufferGeometry,
): Promise<{ geometry: THREE.BufferGeometry; ms: number }> {
  const t0 = Date.now();
  const w = await wasm();
  const ma = geoToManifold(w, a);
  const mb = geoToManifold(w, b);
  const res = ma.add(mb);
  const geometry = manifoldToGeo(res);
  ma.delete?.(); mb.delete?.(); res.delete?.();
  return { geometry, ms: Date.now() - t0 };
}

// ---- 2D yardımcılar ----
function pointInLoop(px: number, py: number, u: number[], v: number[]): boolean {
  let inside = false;
  for (let i = 0, j = u.length - 1; i < u.length; j = i, i += 1) {
    const xi = u[i], yi = v[i], xj = u[j], yj = v[j];
    if (((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
function minDistToLoop(px: number, py: number, u: number[], v: number[]): number {
  let best = Infinity;
  for (let i = 0, j = u.length - 1; i < u.length; j = i, i += 1) {
    const ax = u[j], ay = v[j], bx = u[i], by = v[i];
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy || 1e-9;
    let t = ((px - ax) * dx + (py - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx, cy = ay + t * dy;
    const d = Math.hypot(px - cx, py - cy);
    if (d < best) best = d;
  }
  return best;
}
// CCW (pozitif alan) garanti — manifold extrude için katı prizma
function holePoly(type: PatternType, cx: number, cy: number, r: number): [number, number][] {
  const pts: [number, number][] = [];
  if (type === "yuvarlak") {
    for (let i = 0; i < 18; i += 1) { const a = (i / 18) * Math.PI * 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  } else if (type === "petek") {
    for (let i = 0; i < 6; i += 1) { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  } else { // baklava
    pts.push([cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]);
  }
  // alan işareti — negatifse ters çevir (CCW yap)
  let s = 0; for (let i = 0; i < pts.length; i += 1) { const p = pts[i], q = pts[(i + 1) % pts.length]; s += p[0] * q[1] - q[0] * p[1]; }
  if (s < 0) pts.reverse();
  return pts;
}

// Desen gözlerini footprint içine üret (poligon + merkez + köprü). Paylaşılan.
function genHoles(
  cont: CapContour,
  opts: { pattern: PatternType; cell: number; holeScale: number; border: number },
): { ai: 0 | 1 | 2; ui: 0 | 1 | 2; vi: 0 | 1 | 2; holes: [number, number][][]; centers: [number, number][]; strut: number } {
  const ai = cont.ai, ui = cont.ui, vi = cont.vi;
  const outer = [...cont.loops].sort((a, b) => Math.abs(b.area) - Math.abs(a.area))[0];
  const cell = Math.max(opts.cell, 1e-3);
  const r = (cell / 2) * Math.min(0.95, Math.max(0.05, opts.holeScale));
  const strut = cell * (1 - Math.min(0.95, Math.max(0.05, opts.holeScale)));
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  for (let i = 0; i < outer.u.length; i += 1) {
    if (outer.u[i] < minU) minU = outer.u[i]; if (outer.u[i] > maxU) maxU = outer.u[i];
    if (outer.v[i] < minV) minV = outer.v[i]; if (outer.v[i] > maxV) maxV = outer.v[i];
  }
  const holes: [number, number][][] = [];
  const centers: [number, number][] = [];
  const rowStep = opts.pattern === "petek" ? cell * (Math.sqrt(3) / 2) : cell;
  let row = 0;
  for (let cy = minV + r; cy <= maxV - r; cy += rowStep, row += 1) {
    const xOff = opts.pattern === "petek" && row % 2 === 1 ? cell / 2 : 0;
    for (let cx = minU + r + xOff; cx <= maxU - r; cx += cell) {
      const clr = opts.border + r;
      if (!pointInLoop(cx, cy, outer.u, outer.v)) continue;
      if (minDistToLoop(cx, cy, outer.u, outer.v) < clr) continue;
      holes.push(holePoly(opts.pattern, cx, cy, r));
      centers.push([cx, cy]);
    }
  }
  return { ai, ui, vi, holes, centers, strut };
}

// Sabit-derinlik prizmalar (buildAjurDifference için): tüm delikler aynı yükseklik.
function buildHolePrisms(
  w: ManifoldWasm,
  cont: CapContour,
  bb: THREE.Box3,
  opts: { pattern: PatternType; cell: number; holeScale: number; border: number; through: boolean; drillMm: number; fromMax: boolean },
): { prisms: ManifoldT; holeCount: number; strutMm: number } {
  const { Manifold } = w;
  const { ai, ui, vi, holes, strut } = genHoles(cont, opts);
  if (holes.length === 0) throw new Error("Footprint'e desen sığmadı");

  const lo = bb.min.getComponent(ai), hi = bb.max.getComponent(ai);
  const span = hi - lo || 1;
  const margin = span * 0.03 + 1e-3;
  const height = opts.through ? span + 2 * margin : opts.drillMm + margin;
  const drillSign = opts.fromMax ? -1 : 1;
  const startCoord = opts.fromMax ? hi + margin : lo - margin;

  let prisms = Manifold.extrude(holes, height); // local +Z, taban XY
  const m: number[] = new Array(16).fill(0);
  m[ui] = 1; m[4 + vi] = 1; m[8 + ai] = drillSign; m[12 + ai] = startCoord; m[15] = 1;
  prisms = prisms.transform(m as unknown as Parameters<typeof prisms.transform>[0]);
  return { prisms, holeCount: holes.length, strutMm: strut };
}

export async function buildAjurDifference(
  geometry: THREE.BufferGeometry,
  opts: AjurDrillOpts,
): Promise<AjurDrillResult> {
  const t0 = Date.now();
  const w = await wasm();
  const cont = opts.footprintContour ?? cutAndCap(geometry, opts.footprintPlane).contour;
  if (!cont) throw new Error("Footprint konturu çıkmadı");
  geometry.computeBoundingBox();
  const { prisms, holeCount, strutMm } = buildHolePrisms(w, cont, geometry.boundingBox!, opts);
  const body = geoToManifold(w, geometry);
  const result = body.subtract(prisms);
  const geo = manifoldToGeo(result);
  body.delete?.(); prisms.delete?.(); result.delete?.();
  return { geometry: geo, holes: holeCount, strutMm, ms: Date.now() - t0 };
}

// ---------------------------------------------------------------------------
// İÇİ BOŞ AJUR — solid'i içeriden boşalt (Manifold.levelSet ile garantili-manifold
// kavite) + arka duvarı KISA deliklerle del. Delikler kaviteye açılır, ÖN figüre
// asla ulaşmaz (kısa). SDF kabuğunu boolean'a sokma sorununu (Not manifold) çözer.
// ---------------------------------------------------------------------------
export type HollowAjurOpts = {
  pattern: PatternType;
  cell: number;
  holeScale: number;
  border: number;
  wallMm: number;            // duvar kalınlığı (iç boşluk için)
  frontSkinMm: number;       // ÖN yüzde korunacak min et — delik bunu asla ihlal etmez
  fromMax: boolean;          // arka yüz hangi uçta
  footprintPlane: CutPlane;
  footprintContour?: CapContour;
  gridMax?: number;          // SDF örnek/eksen (default 80)
  onProgress?: (p: number) => void; // 0..1 grid örnekleme
};

// İşaretli mesafe gridini kur (negatif=iç) + trilineer örnekleyici döndür.
function buildSignedGrid(geometry: THREE.BufferGeometry, gridMax: number, onProgress?: (p: number) => void) {
  const src = geometry.clone(); src.deleteAttribute("normal"); src.deleteAttribute("uv");
  const indexed = mergeVertices(src);
  const bvh = new MeshBVH(indexed);
  indexed.computeBoundingBox();
  const bb = indexed.boundingBox!;
  const ext = new THREE.Vector3().subVectors(bb.max, bb.min);
  const maxExt = Math.max(ext.x, ext.y, ext.z);
  const pitch = maxExt / (gridMax - 6);
  const pad = pitch * 3;
  const minB: [number, number, number] = [bb.min.x - pad, bb.min.y - pad, bb.min.z - pad];
  const maxB: [number, number, number] = [bb.max.x + pad, bb.max.y + pad, bb.max.z + pad];
  const M = [
    Math.max(8, Math.ceil((maxB[0] - minB[0]) / pitch)),
    Math.max(8, Math.ceil((maxB[1] - minB[1]) / pitch)),
    Math.max(8, Math.ceil((maxB[2] - minB[2]) / pitch)),
  ];
  const scale = [(maxB[0] - minB[0]) / M[0], (maxB[1] - minB[1]) / M[1], (maxB[2] - minB[2]) / M[2]];
  const sdf = new Float32Array(M[0] * M[1] * M[2]);
  const q = new THREE.Vector3();
  const tgt = { point: new THREE.Vector3(), distance: 0, faceIndex: 0 };
  const ray = new THREE.Ray();
  const rayDir = new THREE.Vector3(1, 0.1234, 0.0717).normalize();
  let idx = 0;
  for (let kz = 0; kz < M[2]; kz += 1) {
    for (let ky = 0; ky < M[1]; ky += 1) {
      for (let kx = 0; kx < M[0]; kx += 1, idx += 1) {
        q.set(minB[0] + kx * scale[0], minB[1] + ky * scale[1], minB[2] + kz * scale[2]);
        bvh.closestPointToPoint(q, tgt);
        const d = tgt.distance;
        ray.origin.copy(q); ray.direction.copy(rayDir);
        const inside = (bvh.raycast(ray, THREE.DoubleSide).length & 1) === 1;
        sdf[idx] = inside ? -d : d;
      }
    }
    onProgress?.((kz + 1) / M[2]);
  }
  // trilineer örnekle
  const sample = (x: number, y: number, z: number): number => {
    const gx = (x - minB[0]) / scale[0], gy = (y - minB[1]) / scale[1], gz = (z - minB[2]) / scale[2];
    const x0 = Math.max(0, Math.min(M[0] - 1, Math.floor(gx)));
    const y0 = Math.max(0, Math.min(M[1] - 1, Math.floor(gy)));
    const z0 = Math.max(0, Math.min(M[2] - 1, Math.floor(gz)));
    const x1 = Math.min(M[0] - 1, x0 + 1), y1 = Math.min(M[1] - 1, y0 + 1), z1 = Math.min(M[2] - 1, z0 + 1);
    const fx = Math.max(0, Math.min(1, gx - x0)), fy = Math.max(0, Math.min(1, gy - y0)), fz = Math.max(0, Math.min(1, gz - z0));
    const at = (a: number, b: number, c: number) => sdf[a + b * M[0] + c * M[0] * M[1]];
    const c00 = at(x0, y0, z0) * (1 - fx) + at(x1, y0, z0) * fx;
    const c10 = at(x0, y1, z0) * (1 - fx) + at(x1, y1, z0) * fx;
    const c01 = at(x0, y0, z1) * (1 - fx) + at(x1, y0, z1) * fx;
    const c11 = at(x0, y1, z1) * (1 - fx) + at(x1, y1, z1) * fx;
    const c0 = c00 * (1 - fy) + c10 * fy, c1 = c01 * (1 - fy) + c11 * fy;
    return c0 * (1 - fz) + c1 * fz;
  };
  return { minB, maxB, pitch, sample, bvh };
}

export async function buildHollowAjurDifference(
  geometry: THREE.BufferGeometry,
  opts: HollowAjurOpts,
): Promise<AjurDrillResult & { cavityMm3: number }> {
  const t0 = Date.now();
  const w = await wasm();
  const { Manifold } = w;
  const cont = opts.footprintContour ?? cutAndCap(geometry, opts.footprintPlane).contour;
  if (!cont) throw new Error("Footprint konturu çıkmadı");

  // 1) İşaretli mesafe gridi (negatif=iç)
  geometry.computeBoundingBox();
  const grid = buildSignedGrid(geometry, opts.gridMax ?? 80, opts.onProgress);

  // 2) Kavite manifoldu — levelSet (iç = duvardan derin). Pozitif-içeri konvansiyonu.
  const wall = Math.max(0.3, opts.wallMm);
  const cavity = Manifold.levelSet(
    (p: number[]) => -(grid.sample(p[0], p[1], p[2]) + wall),
    { min: grid.minB, max: grid.maxB },
    grid.pitch,
  );

  // 3) Gövde + kavite çıkar → içi boş kabuk (manifold)
  const body = geoToManifold(w, geometry);
  const hollow = body.subtract(cavity);

  // 4) FRONT-SKIN DELME: her delik kendi sütununda ışınlanır, o noktadaki ÖN yüze
  // (frontSkin payı kalacak şekilde) kadar iner. İnce bölgede sığ, kalın bölgede
  // derin → ön yüz ASLA delinmez. Sabit derinlik yerine yere-duyarlı derinlik.
  const { ai, ui, vi, holes, centers, strut } = genHoles(cont, opts);
  if (holes.length === 0) throw new Error("Footprint'e desen sığmadı");
  const bb = geometry.boundingBox!;
  const lo = bb.min.getComponent(ai), hi = bb.max.getComponent(ai);
  const span = hi - lo || 1;
  const margin = span * 0.03 + 1e-3;
  const drillSign = opts.fromMax ? -1 : 1;
  const startCoord = opts.fromMax ? hi + margin : lo - margin;
  const frontSkin = Math.max(0.3, opts.frontSkinMm);
  const minDepth = wall * 1.2; // en az kaviteye değecek kadar (duvarı geç)

  const rayOrigin = new THREE.Vector3();
  const rayDir = new THREE.Vector3().setComponent(ai, drillSign);
  let prismsAcc: ManifoldT | null = null;
  let drilled = 0, skipped = 0;
  for (let h = 0; h < holes.length; h += 1) {
    const [cx, cy] = centers[h];
    rayOrigin.set(0, 0, 0); rayOrigin.setComponent(ui, cx); rayOrigin.setComponent(vi, cy); rayOrigin.setComponent(ai, startCoord);
    const ray = new THREE.Ray(rayOrigin.clone(), rayDir);
    const hits = grid.bvh.raycast(ray, THREE.DoubleSide) as { distance: number }[];
    if (!hits.length) { skipped += 1; continue; }
    let dFront = 0; for (const ht of hits) if (ht.distance > dFront) dFront = ht.distance; // ön yüz çıkışı
    const height = dFront - frontSkin; // sütun boyu: ön ete frontSkin kala dur
    if (height <= margin + minDepth) { skipped += 1; continue; } // çok ince → deleme (ön güvenliği öncelikli)
    const m: number[] = new Array(16).fill(0);
    m[ui] = 1; m[4 + vi] = 1; m[8 + ai] = drillSign; m[12 + ai] = startCoord; m[15] = 1;
    const prism = Manifold.extrude([holes[h]], height).transform(m as unknown as Parameters<ManifoldT["transform"]>[0]);
    prismsAcc = prismsAcc ? prismsAcc.add(prism) : prism;
    drilled += 1;
  }
  if (!prismsAcc) throw new Error("Hiçbir delik açılamadı — model çok ince ya da ön et çok yüksek.");

  const result = hollow.subtract(prismsAcc);
  const geo = manifoldToGeo(result);
  let cavityMm3 = 0;
  try { cavityMm3 = Math.abs((cavity as unknown as { volume: () => number }).volume()); } catch { /* yok */ }

  body.delete?.(); cavity.delete?.(); hollow.delete?.(); prismsAcc.delete?.(); result.delete?.();
  return { geometry: geo, holes: drilled, strutMm: strut, ms: Date.now() - t0, cavityMm3 };
}
