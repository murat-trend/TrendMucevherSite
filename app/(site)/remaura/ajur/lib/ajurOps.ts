import * as THREE from "three";

// ---------------------------------------------------------------------------
// Ajur / Arka Kesim — MVP çekirdeği
// ---------------------------------------------------------------------------
// Bir mesh'i eksen-hizalı bir düzlemle keser (üçgen-seviye Sutherland–Hodgman)
// ve oluşan açıklığı DÜZ bir cap (kapak) ile kapatır. Cap, kesim sınır loop'u
// chain'lenip 2D'de triangulate edilerek üretilir (delik/çukur destekli).
//
// Pipeline'daki yeri: import → arka yön → [plane cut + flat cap] → repair/export.
// Sonraki adımlar (V2 desenli insert, V3 gerçek ajur boolean) bu cap konturunu
// girdi olarak kullanacak. Bkz. project_ajour_feature notu.
// ---------------------------------------------------------------------------

export type Axis = "x" | "y" | "z";

export type CutPlane = {
  axis: Axis;
  /** bbox içinde 0..1 kesim konumu (viewer clip ile birebir aynı anlam) */
  position: number;
  /** false → yüksek yarıyı tut (alçak/arka tarafı kes); true → ters */
  flip: boolean;
};

/** Kesim düzlemindeki kapak konturu — desen paneli (V2) için girdi. */
export type CapContour = {
  ai: 0 | 1 | 2;   // kesilen eksen
  ui: 0 | 1 | 2;   // düzlem 2D u ekseni
  vi: 0 | 1 | 2;   // düzlem 2D v ekseni
  px: number;      // kesim eksenindeki düzlem konumu
  keepSign: number; // +1 yüksek tutuldu, -1 alçak
  /** sınır loop'ları (ham, işaretli alanla; en büyük = dış kontur) */
  loops: { u: number[]; v: number[]; area: number }[];
};

export type CutResult = {
  geometry: THREE.BufferGeometry;
  /** cap'i oluşturan üçgen sayısı (0 ise sınır kapatılamadı = açık kaldı) */
  capTriangles: number;
  /** kesilen düzlemdeki sınır loop sayısı (delikli kesitlerde >1) */
  loopCount: number;
  /** kapatılamayan (açık) sınır kenarı sayısı — 0 ideal */
  openEdges: number;
  /** kapak konturu (desen paneli için); kesim olmadıysa null */
  contour: CapContour | null;
};

export type PatternType = "petek" | "yuvarlak" | "baklava";

export type PanelOpts = {
  pattern: PatternType;
  /** göz merkez-merkez aralığı (mm) */
  cell: number;
  /** delik boyutu / göz oranı (0..1); strut = cell*(1-holeScale) */
  holeScale: number;
  /** panel kalınlığı (mm) */
  thickness: number;
  /** kenardan ve cap deliklerinden minimum pay (mm) */
  border: number;
};

export type PanelResult = {
  geometry: THREE.BufferGeometry;
  holes: number;      // açılan desen deliği sayısı
  strutMm: number;    // köprü kalınlığı (mm)
};

const axisIndex = (a: Axis): 0 | 1 | 2 => (a === "x" ? 0 : a === "y" ? 1 : 2);

// Eksen-hizalı düzlem için 2D taban: kesilen eksen düşürülür, kalan iki eksen
// (u,v) olur. Winding'i sonradan işaretli alanla düzelttiğimiz için sıra serbest.
const basisFor = (ai: 0 | 1 | 2): [0 | 1 | 2, 0 | 1 | 2] =>
  ai === 2 ? [0, 1] : ai === 0 ? [1, 2] : [2, 0];

// ---------------------------------------------------------------------------
// Ana fonksiyon: kes + düz kapat
// ---------------------------------------------------------------------------
export function cutAndCap(geometry: THREE.BufferGeometry, plane: CutPlane): CutResult {
  const src = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const pos = src.attributes.position;
  const ai = axisIndex(plane.axis);

  src.computeBoundingBox();
  const box = src.boundingBox!;
  const lo = box.min.getComponent(ai);
  const hi = box.max.getComponent(ai);
  const px = lo + (hi - lo) * plane.position;
  // flip=false → yüksek yarıyı tut (keepSign=+1); flip=true → alçak yarıyı tut.
  const keepSign = plane.flip ? -1 : 1;
  const diag = box.getSize(new THREE.Vector3()).length() || 1;
  const eps = diag * 1e-7;

  // keep tarafı işaretli mesafe: >=0 tutulur
  const keepDist = (x: number, y: number, z: number) =>
    keepSign * ([x, y, z][ai] - px);

  const out: number[] = []; // tutulan + cap üçgenleri (flat array, 9'lu)
  const segs: number[] = []; // cap sınır segmentleri: [ax,ay,az, bx,by,bz, ...]

  const triCount = Math.floor(pos.count / 3);
  const vx = [0, 0, 0], vy = [0, 0, 0], vz = [0, 0, 0], vd = [0, 0, 0];

  for (let t = 0; t < triCount; t += 1) {
    const base = t * 3;
    for (let k = 0; k < 3; k += 1) {
      const i = base + k;
      vx[k] = pos.getX(i); vy[k] = pos.getY(i); vz[k] = pos.getZ(i);
      vd[k] = keepDist(vx[k], vy[k], vz[k]);
    }

    const inAll = vd[0] >= -eps && vd[1] >= -eps && vd[2] >= -eps;
    const outAll = vd[0] < eps && vd[1] < eps && vd[2] < eps;
    if (outAll) continue;          // tamamen kesilen tarafta → at
    if (inAll) {                   // tamamen tutulan tarafta → aynen al
      for (let k = 0; k < 3; k += 1) out.push(vx[k], vy[k], vz[k]);
      continue;
    }

    // Karışık → düzleme göre clip (keepDist>=0 yarısını tut)
    const polyX: number[] = [], polyY: number[] = [], polyZ: number[] = [];
    const isct: number[] = []; // bu üçgenin ürettiği kesişim noktaları (cap segment)
    for (let k = 0; k < 3; k += 1) {
      const n = (k + 1) % 3;
      const dk = vd[k], dn = vd[n];
      const kin = dk >= -eps;
      if (kin) { polyX.push(vx[k]); polyY.push(vy[k]); polyZ.push(vz[k]); }
      // kenar düzlemi gerçekten kesiyorsa kesişim ekle
      if ((dk >= -eps) !== (dn >= -eps)) {
        const f = dk / (dk - dn);
        const ix = vx[k] + (vx[n] - vx[k]) * f;
        const iy = vy[k] + (vy[n] - vy[k]) * f;
        const iz = vz[k] + (vz[n] - vz[k]) * f;
        polyX.push(ix); polyY.push(iy); polyZ.push(iz);
        isct.push(ix, iy, iz);
      }
    }

    // Tutulan poligonu (3 ya da 4 köşe) fan ile üçgenle
    for (let k = 1; k + 1 < polyX.length; k += 1) {
      out.push(polyX[0], polyY[0], polyZ[0]);
      out.push(polyX[k], polyY[k], polyZ[k]);
      out.push(polyX[k + 1], polyY[k + 1], polyZ[k + 1]);
    }
    // Tam bir kesişim → cap sınır segmenti (iki nokta)
    if (isct.length >= 6) segs.push(isct[0], isct[1], isct[2], isct[3], isct[4], isct[5]);
  }

  // -------- Cap üret --------
  const cap = buildCap(segs, ai, px, keepSign, diag);
  for (let i = 0; i < cap.tris.length; i += 1) out.push(cap.tris[i]);

  const result = new THREE.BufferGeometry();
  result.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
  result.computeVertexNormals();

  const [ui, vi] = basisFor(ai);
  const contour: CapContour | null = cap.loops2d.length
    ? { ai, ui, vi, px, keepSign, loops: cap.loops2d }
    : null;

  return {
    geometry: result,
    capTriangles: cap.tris.length / 9,
    loopCount: cap.loopCount,
    openEdges: cap.openEdges,
    contour,
  };
}

// ---------------------------------------------------------------------------
// Cap: sınır segment çorbası → loop'lara chain → 2D triangulate → 3D üçgenler
// ---------------------------------------------------------------------------
type Loop2D = { u: number[]; v: number[]; area: number };

function buildCap(
  segs: number[],
  ai: 0 | 1 | 2,
  px: number,
  keepSign: number,
  diag: number,
): { tris: number[]; loopCount: number; openEdges: number; loops2d: Loop2D[] } {
  const tris: number[] = [];
  if (segs.length < 6) return { tris, loopCount: 0, openEdges: 0, loops2d: [] };

  const [ui, vi] = basisFor(ai);
  const weld = diag * 1e-5;
  const keyOf = (u: number, v: number) =>
    `${Math.round(u / weld)},${Math.round(v / weld)}`;

  // Noktaları weld'le; segmentleri kenar indekslerine çevir
  const ptU: number[] = [], ptV: number[] = [];
  const idx = new Map<string, number>();
  const addPt = (u: number, v: number) => {
    const k = keyOf(u, v);
    const e = idx.get(k);
    if (e !== undefined) return e;
    const id = ptU.length;
    ptU.push(u); ptV.push(v); idx.set(k, id);
    return id;
  };

  const adj = new Map<number, number[]>();
  const link = (a: number, b: number) => {
    (adj.get(a) ?? adj.set(a, []).get(a)!).push(b);
  };
  const segCount = segs.length / 6;
  for (let s = 0; s < segCount; s += 1) {
    const o = s * 6;
    const a = addPt(segs[o + ui], segs[o + vi]);
    const b = addPt(segs[o + 3 + ui], segs[o + 3 + vi]);
    if (a === b) continue;
    link(a, b); link(b, a);
  }

  // Kullanılmış kenarları takip ederek loop'ları yürü
  const usedEdge = new Set<string>();
  const ekey = (a: number, b: number) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const loops: number[][] = [];
  let openEdges = 0;

  for (let start = 0; start < ptU.length; start += 1) {
    const neigh0 = adj.get(start);
    if (!neigh0) continue;
    for (const first of neigh0) {
      if (usedEdge.has(ekey(start, first))) continue;
      // start → first ile yeni loop dene
      const loop = [start];
      let prev = start, cur = first;
      usedEdge.add(ekey(prev, cur));
      let closed = false;
      for (let guard = 0; guard < ptU.length + 2; guard += 1) {
        loop.push(cur);
        if (cur === start) { closed = true; break; }
        const ns = adj.get(cur) ?? [];
        let next = -1;
        for (const cand of ns) {
          if (cand === prev) continue;
          if (usedEdge.has(ekey(cur, cand))) continue;
          next = cand; break;
        }
        if (next === -1) break; // zincir açık kaldı
        usedEdge.add(ekey(cur, next));
        prev = cur; cur = next;
      }
      if (closed) {
        loop.pop(); // son tekrar eden start'ı at
        if (loop.length >= 3) loops.push(loop);
      } else {
        openEdges += 1;
      }
    }
  }

  if (loops.length === 0) return { tris, loopCount: 0, openEdges, loops2d: [] };

  // İşaretli alan → en büyük loop dış kontur, kalanlar delik
  const signedArea = (loop: number[]) => {
    let a = 0;
    for (let i = 0; i < loop.length; i += 1) {
      const p = loop[i], q = loop[(i + 1) % loop.length];
      a += ptU[p] * ptV[q] - ptU[q] * ptV[p];
    }
    return a / 2;
  };
  const withArea = loops.map((l) => ({ loop: l, area: Math.abs(signedArea(l)), raw: signedArea(l) }));
  withArea.sort((x, y) => y.area - x.area);
  const outer = withArea[0];
  const holes = withArea.slice(1);

  // Desen paneli için ham loop koordinatları (büyükten küçüğe sıralı)
  const loops2d: Loop2D[] = withArea.map((w) => ({
    u: w.loop.map((i) => ptU[i]),
    v: w.loop.map((i) => ptV[i]),
    area: w.raw,
  }));

  const toVec2 = (loop: number[], ccw: boolean) => {
    const pts = loop.map((i) => new THREE.Vector2(ptU[i], ptV[i]));
    const a = (() => { let s = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; s += p.x * q.y - q.x * p.y; } return s; })();
    const isCcw = a > 0;
    if (isCcw !== ccw) pts.reverse();
    return pts;
  };

  const contour = toVec2(outer.loop, true);   // dış kontur CCW
  const holePolys = holes.map((h) => toVec2(h.loop, false)); // delikler CW

  let faces: number[][] = [];
  try {
    faces = THREE.ShapeUtils.triangulateShape(contour, holePolys);
  } catch {
    return { tris, loopCount: loops.length, openEdges, loops2d };
  }

  // Birleşik nokta listesi: [contour..., ...holes]
  const all = [...contour, ...holePolys.flat()];

  // 2D → 3D (kesilen eksen = px). Cap dış normali kesim tarafına bakmalı.
  // flip=false → yüksek tutulur, açıklık alçak tarafa bakar → dış normal -e_ai.
  const capOutward = keepSign < 0 ? 1 : -1; // keepSign=-1 (flip) ise +, değilse -
  const to3D = (p: THREE.Vector2): [number, number, number] => {
    const c: [number, number, number] = [0, 0, 0];
    c[ui] = p.x; c[vi] = p.y; c[ai] = px;
    return c;
  };

  for (const f of faces) {
    const A = to3D(all[f[0]]);
    const B = to3D(all[f[1]]);
    const C = to3D(all[f[2]]);
    // üçgen normalinin eksen bileşeni dış yöne ters ise winding'i çevir
    const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2];
    const wx = C[0] - A[0], wy = C[1] - A[1], wz = C[2] - A[2];
    const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    const nAxis = [nx, ny, nz][ai];
    if (nAxis * capOutward >= 0) {
      tris.push(A[0], A[1], A[2], B[0], B[1], B[2], C[0], C[1], C[2]);
    } else {
      tris.push(A[0], A[1], A[2], C[0], C[1], C[2], B[0], B[1], B[2]);
    }
  }

  return { tris, loopCount: loops.length, openEdges, loops2d };
}

// ---------------------------------------------------------------------------
// V2 — Desenli panel: cap konturunu al, desenle delik aç, kalınlık ver.
// Boolean YOK; ExtrudeGeometry ile inşa gereği watertight (Strateji A, güvenli).
// ---------------------------------------------------------------------------

// 2D nokta-poligon içi (ray casting)
function pointInLoop(px: number, py: number, u: number[], v: number[]): boolean {
  let inside = false;
  for (let i = 0, j = u.length - 1; i < u.length; j = i, i += 1) {
    const xi = u[i], yi = v[i], xj = u[j], yj = v[j];
    if (((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

// Nokta → loop kenarlarına minimum mesafe
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

function windFix(pts: THREE.Vector2[], ccw: boolean): THREE.Vector2[] {
  let s = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    s += p.x * q.y - q.x * p.y;
  }
  if ((s > 0) !== ccw) pts.reverse();
  return pts;
}

// Tek bir desen gözü poligonu (merkez cx,cy; "yarıçap" r)
function holePolygon(type: PatternType, cx: number, cy: number, r: number): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  if (type === "yuvarlak") {
    const n = 18;
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * Math.PI * 2;
      pts.push(new THREE.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
    }
  } else if (type === "petek") {
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      pts.push(new THREE.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
    }
  } else { // baklava — eşkenar dörtgen
    pts.push(new THREE.Vector2(cx, cy - r), new THREE.Vector2(cx + r, cy),
      new THREE.Vector2(cx, cy + r), new THREE.Vector2(cx - r, cy));
  }
  return pts;
}

export function buildPatternPanel(contour: CapContour, opts: PanelOpts): PanelResult {
  const { ai, ui, vi, px, keepSign } = contour;
  const cell = Math.max(opts.cell, 1e-4);
  const r = (cell / 2) * Math.min(0.95, Math.max(0.05, opts.holeScale));
  const strut = cell * (1 - Math.min(0.95, Math.max(0.05, opts.holeScale)));
  const border = Math.max(0, opts.border);
  const thickness = Math.max(1e-3, opts.thickness);

  // En büyük loop = dış kontur, kalanlar mevcut cap delikleri
  const sorted = [...contour.loops].sort((a, b) => Math.abs(b.area) - Math.abs(a.area));
  const outerL = sorted[0];
  const capHoleLs = sorted.slice(1);

  // Dış kontur bbox
  let minU = Infinity, minV = Infinity, maxU = -Infinity, maxV = -Infinity;
  for (let i = 0; i < outerL.u.length; i += 1) {
    if (outerL.u[i] < minU) minU = outerL.u[i]; if (outerL.u[i] > maxU) maxU = outerL.u[i];
    if (outerL.v[i] < minV) minV = outerL.v[i]; if (outerL.v[i] > maxV) maxV = outerL.v[i];
  }

  // Desen gözlerini üret + filtrele (kontur içi, kenar payı, cap deliklerinden uzak)
  const patternHoles: THREE.Vector2[][] = [];
  const rowStep = opts.pattern === "petek" ? cell * (Math.sqrt(3) / 2) : cell;
  let row = 0;
  for (let cy = minV + r; cy <= maxV - r; cy += rowStep, row += 1) {
    const xOff = opts.pattern === "petek" && row % 2 === 1 ? cell / 2 : 0;
    for (let cx = minU + r + xOff; cx <= maxU - r; cx += cell) {
      const clearance = border + r;
      if (!pointInLoop(cx, cy, outerL.u, outerL.v)) continue;
      if (minDistToLoop(cx, cy, outerL.u, outerL.v) < clearance) continue;
      let blocked = false;
      for (const h of capHoleLs) {
        if (pointInLoop(cx, cy, h.u, h.v) || minDistToLoop(cx, cy, h.u, h.v) < clearance) { blocked = true; break; }
      }
      if (blocked) continue;
      patternHoles.push(holePolygon(opts.pattern, cx, cy, r));
    }
  }

  // Shape: dış kontur (CCW) + tüm delikler (CW)
  const outerPts = windFix(outerL.u.map((u, i) => new THREE.Vector2(u, outerL.v[i])), true);
  const shape = new THREE.Shape(outerPts);
  const holePaths: THREE.Path[] = [];
  for (const h of capHoleLs) {
    holePaths.push(new THREE.Path(windFix(h.u.map((u, i) => new THREE.Vector2(u, h.v[i])), false)));
  }
  for (const ph of patternHoles) {
    holePaths.push(new THREE.Path(windFix(ph, false)));
  }
  shape.holes = holePaths;

  // Kalınlık ver — XY düzleminde extrude, sonra kesim düzlemine yerleştir
  const eg0 = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, steps: 1 });
  const eg = eg0.index ? eg0.toNonIndexed() : eg0;
  const epos = eg.attributes.position;
  const n = epos.count;
  const arr = new Float32Array(n * 3);
  // (x,y) → (ui,vi); extrude z (0..thickness) kesim ekseninde KALDIRILAN tarafa doğru
  for (let i = 0; i < n; i += 1) {
    const x = epos.getX(i), y = epos.getY(i), z = epos.getZ(i);
    const b = i * 3;
    const w: [number, number, number] = [0, 0, 0];
    w[ui] = x; w[vi] = y; w[ai] = px - keepSign * z;
    arr[b] = w[0]; arr[b + 1] = w[1]; arr[b + 2] = w[2];
  }
  // Koordinat eşlemesi yansıma içeriyorsa (det<0) winding'i çevir → normaller dışa
  const reflected = keepSign > 0;
  if (reflected) {
    for (let t = 0; t < n; t += 3) {
      const b1 = (t + 1) * 3, b2 = (t + 2) * 3;
      for (let k = 0; k < 3; k += 1) { const tmp = arr[b1 + k]; arr[b1 + k] = arr[b2 + k]; arr[b2 + k] = tmp; }
    }
  }
  eg.dispose();

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
  geometry.computeVertexNormals();

  return { geometry, holes: patternHoles.length, strutMm: strut };
}

// ---------------------------------------------------------------------------
// Yükleme analizi — model arka ajura uygun mu? (düz-arka → panel, kavisli → boolean)
// ---------------------------------------------------------------------------
export type AjurAdvice = {
  thinAxis: Axis;
  dims: [number, number, number];
  /** arka yüz düz mü (kesitten panel çıkar mı) */
  backFlat: boolean;
  /** panel için önerilen kesim düzlemi */
  suggest: { axis: Axis; flip: boolean; position: number };
  /** önerilen düzlemdeki sınır loop sayısı (çok = parçalı/detaylı) */
  loops: number;
  /** "panel" → düz-arka, kesitten panel uygun; "boolean" → kavisli, gerçek delme gerekir */
  recommendation: "panel" | "boolean";
};

export function analyzeModelForAjur(geometry: THREE.BufferGeometry): AjurAdvice {
  geometry.computeBoundingBox();
  const s = geometry.boundingBox!.getSize(new THREE.Vector3());
  const dims: [number, number, number] = [s.x, s.y, s.z];
  const axes: Axis[] = ["x", "y", "z"];
  // en ince eksen = relief/arka-ön ekseni
  const thinIdx = dims.indexOf(Math.min(s.x, s.y, s.z));
  const axis = axes[thinIdx];

  const sample = (position: number) => {
    const c = cutAndCap(geometry, { axis, position, flip: false }).contour;
    if (!c) return { area: 0, loops: 0 };
    const area = Math.max(...c.loops.map((l) => Math.abs(l.area)), 0);
    return { area, loops: c.loops.length };
  };

  const probes = [0.06, 0.18, 0.32, 0.5, 0.68, 0.82, 0.94];
  const res = probes.map((p) => ({ p, ...sample(p) }));
  const maxA = Math.max(...res.map((r) => r.area), 1e-6);
  const peak = res.reduce((a, b) => (b.area > a.area ? b : a), res[0]);

  // Bir uç "düz yüz" mü: o uçtaki kesit zaten ~tam silüet VE az parçalı
  const low = res[0], high = res[res.length - 1];
  const flatLow = low.area >= 0.6 * maxA && low.loops <= 3;
  const flatHigh = high.area >= 0.6 * maxA && high.loops <= 3;

  let backFlat = false;
  let suggest: { axis: Axis; flip: boolean; position: number };
  let loops: number;
  if (flatLow || flatHigh) {
    backFlat = true;
    // daha düz olan ucu (yüksek alan / az loop) seç
    const pickLow = flatLow && (!flatHigh || low.area >= high.area);
    suggest = pickLow
      ? { axis, flip: false, position: 0.05 }
      : { axis, flip: true, position: 0.95 };
    loops = pickLow ? low.loops : high.loops;
  } else {
    // kavisli/detaylı — en geniş kesit düzlemi (panel yine de istenirse)
    suggest = { axis, flip: false, position: peak.p };
    loops = peak.loops;
  }
  return { thinAxis: axis, dims, backFlat, suggest, loops, recommendation: backFlat ? "panel" : "boolean" };
}

// ---------------------------------------------------------------------------
// Otomatik hizalama — eğik gelen modeli PCA ile eksenlere oturt
// (en kalın yön → Z dik, orta → X, en ince → Y). Eğik kesim sorununu çözer.
// ---------------------------------------------------------------------------
function jacobiEigen(a: number[][]): { vecs: number[][]; vals: number[] } {
  const A = a.map((r) => r.slice());
  const V = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let iter = 0; iter < 60; iter += 1) {
    let p = 0, q = 1, max = Math.abs(A[0][1]);
    if (Math.abs(A[0][2]) > max) { max = Math.abs(A[0][2]); p = 0; q = 2; }
    if (Math.abs(A[1][2]) > max) { max = Math.abs(A[1][2]); p = 1; q = 2; }
    if (max < 1e-12) break;
    const phi = 0.5 * Math.atan2(2 * A[p][q], A[q][q] - A[p][p]);
    const c = Math.cos(phi), s = Math.sin(phi);
    for (let k = 0; k < 3; k += 1) {
      const akp = A[k][p], akq = A[k][q];
      A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq;
    }
    for (let k = 0; k < 3; k += 1) {
      const apk = A[p][k], aqk = A[q][k];
      A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk;
    }
    for (let k = 0; k < 3; k += 1) {
      const vkp = V[k][p], vkq = V[k][q];
      V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq;
    }
  }
  return { vecs: V, vals: [A[0][0], A[1][1], A[2][2]] };
}

export function autoLevelGeometry(geometry: THREE.BufferGeometry): { geometry: THREE.BufferGeometry; changed: boolean } {
  const pos = geometry.attributes.position;
  const n = pos.count || 1;
  let mx = 0, my = 0, mz = 0;
  for (let i = 0; i < n; i += 1) { mx += pos.getX(i); my += pos.getY(i); mz += pos.getZ(i); }
  mx /= n; my /= n; mz /= n;
  let cxx = 0, cyy = 0, czz = 0, cxy = 0, cxz = 0, cyz = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = pos.getX(i) - mx, dy = pos.getY(i) - my, dz = pos.getZ(i) - mz;
    cxx += dx * dx; cyy += dy * dy; czz += dz * dz;
    cxy += dx * dy; cxz += dx * dz; cyz += dy * dz;
  }
  const { vecs, vals } = jacobiEigen([[cxx, cxy, cxz], [cxy, cyy, cyz], [cxz, cyz, czz]]);
  const order = [0, 1, 2].sort((a, b) => vals[b] - vals[a]); // büyükten küçüğe
  const col = (j: number): [number, number, number] => [vecs[0][j], vecs[1][j], vecs[2][j]];
  const vBig = col(order[0]), vMid = col(order[1]), vThin = col(order[2]);

  // İnce eksen herhangi bir dünya eksenine ne kadar yakın → eğiklik ölçüsü
  const maxComp = Math.max(Math.abs(vThin[0]), Math.abs(vThin[1]), Math.abs(vThin[2]));
  const changed = maxComp < 0.985; // ~>10° eğik

  // Satırlar: worldX=vMid, worldY=vThin(ince), worldZ=vBig(dik)
  const m = new THREE.Matrix4();
  m.set(
    vMid[0], vMid[1], vMid[2], 0,
    vThin[0], vThin[1], vThin[2], 0,
    vBig[0], vBig[1], vBig[2], 0,
    0, 0, 0, 1,
  );
  if (m.determinant() < 0) {
    m.set(
      vMid[0], vMid[1], vMid[2], 0,
      vThin[0], vThin[1], vThin[2], 0,
      -vBig[0], -vBig[1], -vBig[2], 0,
      0, 0, 0, 1,
    );
  }
  const g = geometry.clone();
  g.applyMatrix4(m);
  g.computeVertexNormals();
  return { geometry: g, changed };
}

// ---------------------------------------------------------------------------
// Düz arka yüz tespiti — relief yüzü engebeli, arka düz. Hangi uçtan delmeli?
// Verilen eksende +/- bakan üçgenlerin yüzey yayılımını ölç; az yayılan = düz arka.
// ---------------------------------------------------------------------------
export function detectFlatFace(geometry: THREE.BufferGeometry, axis: Axis): {
  fromMax: boolean; areaMax: number; areaMin: number;
} {
  const ai = axisIndex(axis);
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = g.attributes.position;
  const tri = Math.floor(pos.count / 3);
  // + bakan (max uç) ve − bakan (min uç) yüzeylerin TOPLAM ALANI.
  // Relief yüzü detay yüzünden çok alanlı; sade arka az alanlı → arka = AZ alan.
  let pArea = 0, mArea = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), nrm = new THREE.Vector3();
  for (let t = 0; t < tri; t += 1) {
    const i = t * 3;
    a.set(pos.getX(i), pos.getY(i), pos.getZ(i));
    b.set(pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1));
    c.set(pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2));
    ab.subVectors(b, a); ac.subVectors(c, a); nrm.crossVectors(ab, ac);
    const len = nrm.length(); if (len < 1e-12) continue;
    const nai = nrm.getComponent(ai) / len;
    const area = len / 2;
    if (nai > 0.5) pArea += area;
    else if (nai < -0.5) mArea += area;
  }
  // arka = AZ alanlı (sade) yüz → o uçtan del
  return { fromMax: pArea < mArea, areaMax: pArea, areaMin: mArea };
}
