import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";
// @ts-expect-error - isosurface tip tanımı yok
import { surfaceNets } from "isosurface";

// ---------------------------------------------------------------------------
// Tipler
// ---------------------------------------------------------------------------
export type MeshAnalysis = {
  triangleCount: number;
  vertexCount: number;
  dimensions: [number, number, number];
  shellCount: number;
  boundaryEdges: number;
  nonManifoldEdges: number;
  flippedEdges: number;       // ters normal kaynaklı tutarsız kenar sayısı
  windingConsistent: boolean; // tüm normaller tutarlı mı (Magics 'ters normal')
  watertight: boolean;        // kapalı + tek parça + non-manifold yok
  productionReady: boolean;   // watertight VE winding tutarlı
  shellFaceGroups: Map<number, number[]>;
};

export type MetalWeight = {
  volumeMm3: number;
  volumeCm3: number;
  weights: { key: string; label: string; density: number; grams: number }[];
};

// Metal yoğunlukları (g/cm³)
export const METALS = [
  { key: "ag925", label: "925 ayar gümüş", density: 10.36 },
  { key: "au14", label: "14 ayar altın", density: 13.07 },
  { key: "au18", label: "18 ayar altın", density: 15.58 },
  { key: "au22", label: "22 ayar altın", density: 17.7 },
  { key: "pt", label: "Platin", density: 21.45 },
] as const;

// ---------------------------------------------------------------------------
// Yardımcı: konumdan vertex anahtarı (kaynak/weld için)
// ---------------------------------------------------------------------------
const keyOf = (pos: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, i: number, p = 4) =>
  `${pos.getX(i).toFixed(p)},${pos.getY(i).toFixed(p)},${pos.getZ(i).toFixed(p)}`;

const edgeKeyStr = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const edgeKeyNum = (a: number, b: number) => (a < b ? `${a}|${b}` : `${b}|${a}`);

// ---------------------------------------------------------------------------
// Analiz: shell / açık kenar / non-manifold / watertight
// ---------------------------------------------------------------------------
export function analyzeGeometry(geometry: THREE.BufferGeometry): MeshAnalysis {
  const source = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const position = source.attributes.position;
  const triangleCount = Math.floor(position.count / 3);

  const parent = Array.from({ length: triangleCount }, (_, i) => i);
  const find = (v: number): number => {
    while (parent[v] !== v) {
      parent[v] = parent[parent[v]];
      v = parent[v];
    }
    return v;
  };
  const union = (a: number, b: number) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };

  const edgeOwners = new Map<string, number[]>();
  // yön takibi (winding): her kenar için yarı-kenarın "a<b" yönü
  const edgeDirs = new Map<string, boolean[]>();
  const addEdge = (a: string, b: string, f: number) => {
    const k = edgeKeyStr(a, b);
    const o = edgeOwners.get(k);
    if (o) o.push(f); else edgeOwners.set(k, [f]);
    const d = a < b; // bu yüzün kenarı geçiş yönü
    const dd = edgeDirs.get(k);
    if (dd) dd.push(d); else edgeDirs.set(k, [d]);
  };

  for (let f = 0; f < triangleCount; f += 1) {
    const base = f * 3;
    const a = keyOf(position, base), b = keyOf(position, base + 1), c = keyOf(position, base + 2);
    addEdge(a, b, f); addEdge(b, c, f); addEdge(c, a, f);
  }

  let boundaryEdges = 0, nonManifoldEdges = 0, flippedEdges = 0;
  edgeOwners.forEach((owners) => {
    if (owners.length === 1) boundaryEdges += 1;
    if (owners.length > 2) nonManifoldEdges += 1;
    for (let i = 1; i < owners.length; i += 1) union(owners[0], owners[i]);
  });
  // tutarlı winding: bir kenarı paylaşan 2 yüz, kenarı TERS yönde geçmeli.
  // aynı yönde geçiyorsa biri ters normalli demektir.
  edgeDirs.forEach((dirs) => {
    if (dirs.length === 2 && dirs[0] === dirs[1]) flippedEdges += 1;
  });

  const shellFaceGroups = new Map<number, number[]>();
  for (let f = 0; f < triangleCount; f += 1) {
    const r = find(f);
    const g = shellFaceGroups.get(r);
    if (g) g.push(f); else shellFaceGroups.set(r, [f]);
  }

  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const dimensions: [number, number, number] = box
    ? [box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z]
    : [0, 0, 0];

  // weld sonrası gerçek vertex sayısı
  const uniq = new Set<string>();
  for (let i = 0; i < position.count; i += 1) uniq.add(keyOf(position, i));

  const watertight = boundaryEdges === 0 && nonManifoldEdges === 0;
  const windingConsistent = flippedEdges === 0;
  return {
    triangleCount,
    vertexCount: uniq.size,
    dimensions,
    shellCount: shellFaceGroups.size,
    boundaryEdges,
    nonManifoldEdges,
    flippedEdges,
    windingConsistent,
    watertight,
    productionReady: watertight && windingConsistent,
    shellFaceGroups,
  };
}

// ---------------------------------------------------------------------------
// En büyük shell'i tut (izole çöp parçaları sil)
// ---------------------------------------------------------------------------
export function keepLargestShell(geometry: THREE.BufferGeometry, analysis: MeshAnalysis): THREE.BufferGeometry {
  const source = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const position = source.attributes.position;
  const largest = Array.from(analysis.shellFaceGroups.values()).sort((a, b) => b.length - a.length)[0] || [];
  const out: number[] = [];
  largest.forEach((f) => {
    for (let c = 0; c < 3; c += 1) {
      const vi = f * 3 + c;
      out.push(position.getX(vi), position.getY(vi), position.getZ(vi));
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------------------
// Temel topoloji temizliği: weld + duplicate/degenerate face temizle
// ---------------------------------------------------------------------------
export function basicCleanup(geometry: THREE.BufferGeometry, precision = 5): THREE.BufferGeometry {
  const source = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const position = source.attributes.position;
  const vmap = new Map<string, number>();
  const verts: THREE.Vector3[] = [];
  const faces: [number, number, number][] = [];
  const faceSet = new Set<string>();

  const vid = (i: number) => {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    const k = `${x.toFixed(precision)},${y.toFixed(precision)},${z.toFixed(precision)}`;
    const ex = vmap.get(k);
    if (ex !== undefined) return ex;
    const id = verts.length;
    vmap.set(k, id);
    verts.push(new THREE.Vector3(x, y, z));
    return id;
  };

  for (let i = 0; i < position.count; i += 3) {
    const a = vid(i), b = vid(i + 1), c = vid(i + 2);
    if (a === b || b === c || c === a) continue;
    const area = new THREE.Vector3().subVectors(verts[b], verts[a])
      .cross(new THREE.Vector3().subVectors(verts[c], verts[a])).lengthSq();
    if (area < 1e-16) continue;
    const fk = [a, b, c].sort((l, r) => l - r).join("|");
    if (faceSet.has(fk)) continue;
    faceSet.add(fk);
    faces.push([a, b, c]);
  }

  const out: number[] = [];
  faces.forEach((f) => f.forEach((v) => out.push(verts[v].x, verts[v].y, verts[v].z)));
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------------------
// Non-manifold yüzleri sil (komşu halka genişletmeli) — "yeşil çöp temizliği"
// ---------------------------------------------------------------------------
export function deleteNonManifoldFaces(geometry: THREE.BufferGeometry, expandRings = 1): THREE.BufferGeometry {
  const source = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const position = source.attributes.position;
  const faces = Math.floor(position.count / 3);
  const edgeOwners = new Map<string, number[]>();
  const neighbors = new Map<number, Set<number>>();

  const addEdge = (ia: number, ib: number, f: number) => {
    const k = edgeKeyStr(keyOf(position, ia), keyOf(position, ib));
    const o = edgeOwners.get(k);
    if (o) o.push(f); else edgeOwners.set(k, [f]);
  };
  for (let f = 0; f < faces; f += 1) {
    const base = f * 3;
    addEdge(base, base + 1, f); addEdge(base + 1, base + 2, f); addEdge(base + 2, base, f);
  }

  const bad = new Set<number>();
  edgeOwners.forEach((owners) => {
    for (let i = 0; i < owners.length; i += 1) {
      for (let j = i + 1; j < owners.length; j += 1) {
        const a = owners[i], b = owners[j];
        if (!neighbors.has(a)) neighbors.set(a, new Set());
        if (!neighbors.has(b)) neighbors.set(b, new Set());
        neighbors.get(a)!.add(b);
        neighbors.get(b)!.add(a);
      }
    }
    if (owners.length > 2) owners.forEach((o) => bad.add(o));
  });

  let frontier = new Set(bad);
  for (let r = 0; r < expandRings; r += 1) {
    const next = new Set<number>();
    frontier.forEach((f) => (neighbors.get(f) || new Set()).forEach((n) => { if (!bad.has(n)) next.add(n); }));
    next.forEach((f) => bad.add(f));
    frontier = next;
  }

  const out: number[] = [];
  for (let f = 0; f < faces; f += 1) {
    if (bad.has(f)) continue;
    const base = f * 3;
    for (let c = 0; c < 3; c += 1) {
      const vi = base + c;
      out.push(position.getX(vi), position.getY(vi), position.getZ(vi));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
  g.computeVertexNormals();
  return basicCleanup(g, 5);
}

// ---------------------------------------------------------------------------
// Kenar onarımı: non-manifold yüzleri at + küçük/orta açık kenar deliklerini kapat
// ---------------------------------------------------------------------------
export function repairEdgesAndSmallHoles(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const source = basicCleanup(geometry, 5);
  const position = source.attributes.position;
  const vmap = new Map<string, number>();
  const verts: THREE.Vector3[] = [];
  const faces: [number, number, number][] = [];

  const vid = (i: number) => {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    const k = `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
    const ex = vmap.get(k);
    if (ex !== undefined) return ex;
    const id = verts.length;
    vmap.set(k, id);
    verts.push(new THREE.Vector3(x, y, z));
    return id;
  };
  for (let i = 0; i < position.count; i += 3) faces.push([vid(i), vid(i + 1), vid(i + 2)]);

  const buildEdges = (list: [number, number, number][]) => {
    const m = new Map<string, number[]>();
    list.forEach((f, fi) => {
      ([[f[0], f[1]], [f[1], f[2]], [f[2], f[0]]] as [number, number][]).forEach(([a, b]) => {
        const k = edgeKeyNum(a, b);
        const o = m.get(k);
        if (o) o.push(fi); else m.set(k, [fi]);
      });
    });
    return m;
  };

  // 1) non-manifold yaratan yüzleri at (sonraki kapatma daha güvenli olur)
  const e1 = buildEdges(faces);
  const bad = new Set<number>();
  e1.forEach((o) => { if (o.length > 2) o.forEach((x) => bad.add(x)); });
  const kept = faces.filter((_f, i) => !bad.has(i));

  // 2) açık kenar döngülerini bul
  const out: [number, number, number][] = [...kept];
  const e2 = buildEdges(kept);
  const boundary: [number, number][] = [];
  e2.forEach((o, k) => { if (o.length === 1) { const [a, b] = k.split("|").map(Number); boundary.push([a, b]); } });

  const adj = new Map<number, number[]>();
  boundary.forEach(([a, b]) => {
    adj.set(a, [...(adj.get(a) || []), b]);
    adj.set(b, [...(adj.get(b) || []), a]);
  });
  const remaining = new Set(boundary.map(([a, b]) => edgeKeyNum(a, b)));
  const take = (a: number, b: number) => remaining.delete(edgeKeyNum(a, b));

  // 3) döngüleri yürü, küçük/orta delikleri merkeze üçgenleyerek kapat
  boundary.forEach(([start, next]) => {
    if (!remaining.has(edgeKeyNum(start, next))) return;
    const loop = [start, next];
    take(start, next);
    let prev = start, cur = next;
    for (let g = 0; g < 1000; g += 1) {
      const cand = (adj.get(cur) || []).filter((c) => remaining.has(edgeKeyNum(cur, c)) && c !== prev)[0];
      if (cand === undefined) break;
      take(cur, cand);
      if (cand === start) break;
      loop.push(cand);
      prev = cur; cur = cand;
    }
    // sadece küçük/orta delik: büyük açık sınırlar genelde kasıtlı kesik
    if (loop.length >= 3 && loop.length <= 160) {
      const center = new THREE.Vector3();
      loop.forEach((v) => center.add(verts[v]));
      center.multiplyScalar(1 / loop.length);
      const cid = verts.length;
      verts.push(center);
      for (let i = 0; i < loop.length; i += 1) out.push([cid, loop[i], loop[(i + 1) % loop.length]]);
    }
  });

  const arr: number[] = [];
  out.forEach((f) => f.forEach((v) => arr.push(verts[v].x, verts[v].y, verts[v].z)));
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------------------
// Non-manifold kenarları çizgi geometrisi olarak çıkar (yeşil görselleştirme)
// ---------------------------------------------------------------------------
export function nonManifoldEdgeLines(geometry: THREE.BufferGeometry | null): THREE.BufferGeometry | null {
  if (!geometry) return null;
  const source = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const position = source.attributes.position;
  const edges = new Map<string, { n: number; ax: number; ay: number; az: number; bx: number; by: number; bz: number }>();

  const addEdge = (ia: number, ib: number) => {
    const k = edgeKeyStr(keyOf(position, ia), keyOf(position, ib));
    const ex = edges.get(k);
    if (ex) { ex.n += 1; return; }
    edges.set(k, {
      n: 1,
      ax: position.getX(ia), ay: position.getY(ia), az: position.getZ(ia),
      bx: position.getX(ib), by: position.getY(ib), bz: position.getZ(ib),
    });
  };
  for (let f = 0; f < Math.floor(position.count / 3); f += 1) {
    const base = f * 3;
    addEdge(base, base + 1); addEdge(base + 1, base + 2); addEdge(base + 2, base);
  }

  const out: number[] = [];
  edges.forEach((e) => { if (e.n > 2) out.push(e.ax, e.ay, e.az, e.bx, e.by, e.bz); });
  if (out.length === 0) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
  return g;
}

// ---------------------------------------------------------------------------
// Normalleri/winding'i düzelt: tüm yüzleri tutarlı yöne çevir + dışa baktır.
// (Magics'in '139 ters normal / 278 bad edge / 38 shell' dediği sorunu çözer.)
// ---------------------------------------------------------------------------
export function fixWinding(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const src = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const pos = src.attributes.position;
  const triCount = Math.floor(pos.count / 3);

  // weld
  const vmap = new Map<string, number>();
  const verts: number[] = [];
  const vid = (i: number) => {
    const k = keyOf(pos, i);
    const ex = vmap.get(k);
    if (ex !== undefined) return ex;
    const id = verts.length / 3;
    vmap.set(k, id);
    verts.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    return id;
  };
  const faces: number[][] = [];
  for (let i = 0; i < pos.count; i += 3) faces.push([vid(i), vid(i + 1), vid(i + 2)]);

  // kenar -> yüz listesi
  const e2f = new Map<string, number[]>();
  faces.forEach((f, fi) => {
    for (let e = 0; e < 3; e += 1) {
      const k = edgeKeyNum(f[e], f[(e + 1) % 3]);
      const o = e2f.get(k);
      if (o) o.push(fi); else e2f.set(k, [fi]);
    }
  });

  const flip = new Uint8Array(triCount);
  const visited = new Uint8Array(triCount);

  // bir yüzün (flip uygulanmış) sıralı vertexleri
  const ov = (fi: number) => {
    const f = faces[fi];
    return flip[fi] ? [f[0], f[2], f[1]] : [f[0], f[1], f[2]];
  };

  for (let s = 0; s < triCount; s += 1) {
    if (visited[s]) continue;
    visited[s] = 1;
    const stack = [s];
    while (stack.length) {
      const cf = stack.pop()!;
      const v = ov(cf);
      for (let e = 0; e < 3; e += 1) {
        const p = v[e], q = v[(e + 1) % 3];
        const k = edgeKeyNum(p, q);
        const fl = e2f.get(k);
        if (!fl) continue;
        for (const nf of fl) {
          if (nf === cf || visited[nf]) continue;
          // nf'nin doğal (flip=false) bu kenardaki yönü p->q mı?
          const f = faces[nf];
          let samep = false;
          for (let g = 0; g < 3; g += 1) {
            if (f[g] === p && f[(g + 1) % 3] === q) { samep = true; break; }
          }
          // cf bu kenarı p->q geçiyor; nf TERS (q->p) geçmeli.
          // nf doğal yönü de p->q ise (samep) → flip gerek.
          flip[nf] = samep ? 1 : 0;
          visited[nf] = 1;
          stack.push(nf);
        }
      }
    }
  }

  // dışa baktır: işaretli hacim negatifse hepsini ters çevir
  let vol6 = 0;
  for (let fi = 0; fi < triCount; fi += 1) {
    const [a, b, c] = ov(fi);
    const ax = verts[a*3], ay = verts[a*3+1], az = verts[a*3+2];
    const bx = verts[b*3], by = verts[b*3+1], bz = verts[b*3+2];
    const cx = verts[c*3], cy = verts[c*3+1], cz = verts[c*3+2];
    vol6 += ax*(by*cz - bz*cy) - ay*(bx*cz - bz*cx) + az*(bx*cy - by*cx);
  }
  const globalFlip = vol6 < 0;

  const out: number[] = [];
  for (let fi = 0; fi < triCount; fi += 1) {
    let [a, b, c] = ov(fi);
    if (globalFlip) { const t = b; b = c; c = t; }
    out.push(verts[a*3], verts[a*3+1], verts[a*3+2]);
    out.push(verts[b*3], verts[b*3+1], verts[b*3+2]);
    out.push(verts[c*3], verts[c*3+1], verts[c*3+2]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------------------
// Geometriyi sabit oranda ölçekle (birim düzeltme: cm→mm ×10, inch→mm ×25.4)
// ---------------------------------------------------------------------------
export function scaleGeometry(geometry: THREE.BufferGeometry, factor: number): THREE.BufferGeometry {
  const g = geometry.clone();
  g.scale(factor, factor, factor);
  g.computeVertexNormals();
  return g;
}

// Eksen-bazlı (non-uniform) ölçek — X/Y/Z ayrı (kalınlık vb. manuel düzeltme)
export function scaleGeometryXYZ(geometry: THREE.BufferGeometry, fx: number, fy: number, fz: number): THREE.BufferGeometry {
  const g = geometry.clone();
  g.scale(fx, fy, fz);
  g.computeVertexNormals();
  return g;
}

// En büyük boyut (mm) — ölçek mantık kontrolü için
export function maxDimension(geometry: THREE.BufferGeometry): number {
  geometry.computeBoundingBox();
  const b = geometry.boundingBox;
  if (!b) return 0;
  return Math.max(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z);
}

// ---------------------------------------------------------------------------
// İç boşaltma (fast-shell): dış yüzey korunur + içe ofset ters kabuk eklenir.
// Detay dış yüzeyde kalır; slicer iki iç içe kabuğu boşluk olarak basar.
// Döndürür: { shell, cavityMm3 } (cavityMm3 = oluşan iç boşluk hacmi)
// ---------------------------------------------------------------------------
export function hollowShell(geometry: THREE.BufferGeometry, wallMm: number): { shell: THREE.BufferGeometry; cavityMm3: number } {
  // normaller tutarlı + dışa bakmalı (offset yönü doğru olsun)
  const fixed = fixWinding(geometry);
  const pos = fixed.attributes.position;

  // weld → indeksli (yumuşak vertex normali için)
  const vmap = new Map<string, number>();
  const vx: number[] = [];
  const vid = (i: number) => {
    const k = keyOf(pos, i);
    const ex = vmap.get(k);
    if (ex !== undefined) return ex;
    const id = vx.length / 3;
    vmap.set(k, id);
    vx.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    return id;
  };
  const faces: [number, number, number][] = [];
  for (let i = 0; i < pos.count; i += 3) faces.push([vid(i), vid(i + 1), vid(i + 2)]);

  const nv = vx.length / 3;
  const nrm = new Float32Array(nv * 3);
  // yumuşak vertex normali: yüz normallerini vertekslere topla
  for (const [a, b, c] of faces) {
    const ax = vx[a*3], ay = vx[a*3+1], az = vx[a*3+2];
    const bx = vx[b*3], by = vx[b*3+1], bz = vx[b*3+2];
    const cx = vx[c*3], cy = vx[c*3+1], cz = vx[c*3+2];
    const ux = bx-ax, uy = by-ay, uz = bz-az;
    const wx = cx-ax, wy = cy-ay, wz = cz-az;
    const nx = uy*wz - uz*wy, ny = uz*wx - ux*wz, nz = ux*wy - uy*wx;
    for (const v of [a, b, c]) { nrm[v*3]+=nx; nrm[v*3+1]+=ny; nrm[v*3+2]+=nz; }
  }
  for (let v = 0; v < nv; v += 1) {
    const x=nrm[v*3], y=nrm[v*3+1], z=nrm[v*3+2];
    const l = Math.hypot(x,y,z) || 1;
    nrm[v*3]=x/l; nrm[v*3+1]=y/l; nrm[v*3+2]=z/l;
  }

  // iç vertexler: dış − normal*wall, ama CLAMP: ince bölgede karşı duvarı geçme
  // Her vertex'te içe ışın at → yerel kalınlık T → offset ≤ T/2 (orta çizgiyi aşma)
  const idxGeo = new THREE.BufferGeometry();
  idxGeo.setAttribute("position", new THREE.Float32BufferAttribute(Array.from(vx), 3));
  idxGeo.setIndex(faces.flat());
  const bvh = new MeshBVH(idxGeo);
  const ray = new THREE.Ray();
  const EPS = 1e-3;

  const ix = new Float32Array(nv * 3);
  for (let v = 0; v < nv; v += 1) {
    const nx = nrm[v*3], ny = nrm[v*3+1], nz = nrm[v*3+2];
    // başlangıcı hafif içeri al (kendine çarpmasın), içe doğru ışın
    ray.origin.set(vx[v*3] - nx*EPS, vx[v*3+1] - ny*EPS, vx[v*3+2] - nz*EPS);
    ray.direction.set(-nx, -ny, -nz);
    const hit = bvh.raycastFirst(ray, THREE.DoubleSide);
    let off = wallMm;
    if (hit) {
      const halfT = (hit.distance + EPS) * 0.5 - EPS; // orta çizgi (güvenli)
      if (halfT < off) off = halfT;
    }
    if (off < 0) off = 0;
    ix[v*3]   = vx[v*3]   - nx*off;
    ix[v*3+1] = vx[v*3+1] - ny*off;
    ix[v*3+2] = vx[v*3+2] - nz*off;
  }

  // İÇ YÜZEY YUMUŞATMA (Laplacian): detaylı/konkav bölgelerde kendi üstüne
  // katlanan iç kabuğu gevşet. İç yüzey gizli olduğu için yumuşatma sorun değil.
  {
    const adj: number[][] = Array.from({ length: nv }, () => []);
    for (const [a, b, c] of faces) {
      adj[a].push(b, c); adj[b].push(a, c); adj[c].push(a, b);
    }
    const LAMBDA = 0.5, ITERS = 6;
    let cur = ix;
    for (let it = 0; it < ITERS; it += 1) {
      const next = new Float32Array(nv * 3);
      for (let v = 0; v < nv; v += 1) {
        const ns = adj[v];
        if (ns.length === 0) { next[v*3]=cur[v*3]; next[v*3+1]=cur[v*3+1]; next[v*3+2]=cur[v*3+2]; continue; }
        let sx=0, sy=0, sz=0;
        for (const n of ns) { sx+=cur[n*3]; sy+=cur[n*3+1]; sz+=cur[n*3+2]; }
        const inv = 1 / ns.length;
        next[v*3]   = cur[v*3]   * (1-LAMBDA) + (sx*inv) * LAMBDA;
        next[v*3+1] = cur[v*3+1] * (1-LAMBDA) + (sy*inv) * LAMBDA;
        next[v*3+2] = cur[v*3+2] * (1-LAMBDA) + (sz*inv) * LAMBDA;
      }
      cur = next;
    }
    ix.set(cur);
  }

  const out: number[] = [];
  // dış yüzey (orijinal winding)
  for (const [a, b, c] of faces) {
    out.push(vx[a*3],vx[a*3+1],vx[a*3+2], vx[b*3],vx[b*3+1],vx[b*3+2], vx[c*3],vx[c*3+1],vx[c*3+2]);
  }
  // iç yüzey (ters winding → normaller içe baksın)
  let cav6 = 0;
  for (const [a, b, c] of faces) {
    out.push(ix[a*3],ix[a*3+1],ix[a*3+2], ix[c*3],ix[c*3+1],ix[c*3+2], ix[b*3],ix[b*3+1],ix[b*3+2]);
    // iç boşluk hacmi (orijinal winding ile)
    const ax=ix[a*3],ay=ix[a*3+1],az=ix[a*3+2];
    const bx=ix[b*3],by=ix[b*3+1],bz=ix[b*3+2];
    const cx=ix[c*3],cy=ix[c*3+1],cz=ix[c*3+2];
    cav6 += ax*(by*cz-bz*cy) - ay*(bx*cz-bz*cx) + az*(bx*cy-by*cx);
  }

  const shell = new THREE.BufferGeometry();
  shell.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
  shell.computeVertexNormals();
  return { shell, cavityMm3: Math.abs(cav6) / 6 };
}

// ---------------------------------------------------------------------------
// İç boşaltma (SDF + Surface Nets) — endüstri standardı, self-intersection YOK.
// Dış yüzey korunur; iç yüzey mesafe alanından üretilir (dar bölgeyi dolu bırakır).
// ---------------------------------------------------------------------------
export function hollowShellSDF(
  geometry: THREE.BufferGeometry,
  wallMm: number,
  opts?: { maxGrid?: number; onProgress?: (p: number) => void },
): { shell: THREE.BufferGeometry; cavityMm3: number; resolutionMm: number; trappedRemoved: number } {
  const maxGrid = opts?.maxGrid ?? 80; // eksen başına maksimum örnek (hız/bellek dengesi)

  // dış: normaller tutarlı + dışa
  const fixed = fixWinding(geometry);
  const fpos = fixed.attributes.position;

  // weld → indeksli (BVH + yüz normalleri için)
  const vmap = new Map<string, number>();
  const vx: number[] = [];
  const vid = (i: number) => {
    const k = keyOf(fpos, i);
    const ex = vmap.get(k);
    if (ex !== undefined) return ex;
    const id = vx.length / 3; vmap.set(k, id);
    vx.push(fpos.getX(i), fpos.getY(i), fpos.getZ(i)); return id;
  };
  const fidx: number[] = [];
  for (let i = 0; i < fpos.count; i += 3) { fidx.push(vid(i), vid(i + 1), vid(i + 2)); }

  const idxGeo = new THREE.BufferGeometry();
  idxGeo.setAttribute("position", new THREE.Float32BufferAttribute(Array.from(vx), 3));
  idxGeo.setIndex(fidx);
  const bvh = new MeshBVH(idxGeo);

  // sınır kutusu + pay (wall + birkaç voxel)
  idxGeo.computeBoundingBox();
  const bb = idxGeo.boundingBox!;
  const ext = new THREE.Vector3().subVectors(bb.max, bb.min);
  const maxExt = Math.max(ext.x, ext.y, ext.z);
  // çözünürlük: maxGrid örneğe sığacak pitch
  let pitch = maxExt / (maxGrid - 6);
  const pad = wallMm + pitch * 3;
  const minB = [bb.min.x - pad, bb.min.y - pad, bb.min.z - pad];
  const maxB = [bb.max.x + pad, bb.max.y + pad, bb.max.z + pad];
  const M = [
    Math.max(8, Math.ceil((maxB[0]-minB[0]) / pitch)),
    Math.max(8, Math.ceil((maxB[1]-minB[1]) / pitch)),
    Math.max(8, Math.ceil((maxB[2]-minB[2]) / pitch)),
  ];
  const scale = [(maxB[0]-minB[0])/M[0], (maxB[1]-minB[1])/M[1], (maxB[2]-minB[2])/M[2]];

  // SDF örnekle: mesafe = en yakın nokta; İŞARET = ışın-parite (iç/dış).
  // Tek yüz normali kenar/köşede gürültülü → watertight mesh'te ışın sayımı güvenilir.
  const sdf = new Float32Array(M[0]*M[1]*M[2]);
  const q = new THREE.Vector3();
  const tgt: { point: THREE.Vector3; distance: number; faceIndex: number } = { point: new THREE.Vector3(), distance: 0, faceIndex: 0 };
  const ray = new THREE.Ray();
  const rayDir = new THREE.Vector3(1, 0.1234, 0.0717).normalize(); // eksen-hizasından kaçın
  let idx = 0;
  for (let kz = 0; kz < M[2]; kz += 1) {
    for (let ky = 0; ky < M[1]; ky += 1) {
      for (let kx = 0; kx < M[0]; kx += 1, idx += 1) {
        q.set(minB[0]+kx*scale[0], minB[1]+ky*scale[1], minB[2]+kz*scale[2]);
        bvh.closestPointToPoint(q, tgt);
        const d = tgt.distance;
        ray.origin.copy(q); ray.direction.copy(rayDir);
        const hits = bvh.raycast(ray, THREE.DoubleSide);
        const inside = (hits.length & 1) === 1;
        sdf[idx] = inside ? -d : d;
      }
    }
    opts?.onProgress?.(kz / M[2]);
  }

  // KÖR HAVUZ TEMİZLİĞİ (Flood-Fill): kaviteyi bağlı bileşenlere ayır,
  // ana boşluğa açılmayan küçük adacıkları (trapped voids) dolu bırak.
  let trappedRemoved = 0;
  {
    const total = M[0]*M[1]*M[2];
    const comp = new Int32Array(total).fill(-1);
    const voxVol = scale[0]*scale[1]*scale[2];
    const minVox = Math.max(2, Math.floor(2.0 / voxVol)); // <2 mm³ = kör havuz
    const sizes: number[] = [];
    const stack: number[] = [];
    const isCav = (i: number) => sdf[i] < -wallMm;
    let cid = 0;
    for (let s = 0; s < total; s += 1) {
      if (comp[s] !== -1 || !isCav(s)) continue;
      comp[s] = cid; let cnt = 0; stack.length = 0; stack.push(s);
      while (stack.length) {
        const c = stack.pop()!; cnt += 1;
        const ix = c % M[0], iy = ((c / M[0]) | 0) % M[1], iz = (c / (M[0]*M[1])) | 0;
        if (ix > 0)        { const n = c-1;          if (comp[n]===-1 && isCav(n)) { comp[n]=cid; stack.push(n); } }
        if (ix < M[0]-1)   { const n = c+1;          if (comp[n]===-1 && isCav(n)) { comp[n]=cid; stack.push(n); } }
        if (iy > 0)        { const n = c-M[0];       if (comp[n]===-1 && isCav(n)) { comp[n]=cid; stack.push(n); } }
        if (iy < M[1]-1)   { const n = c+M[0];       if (comp[n]===-1 && isCav(n)) { comp[n]=cid; stack.push(n); } }
        if (iz > 0)        { const n = c-M[0]*M[1];  if (comp[n]===-1 && isCav(n)) { comp[n]=cid; stack.push(n); } }
        if (iz < M[2]-1)   { const n = c+M[0]*M[1];  if (comp[n]===-1 && isCav(n)) { comp[n]=cid; stack.push(n); } }
      }
      sizes[cid] = cnt; cid += 1;
    }
    const removedComps = new Set<number>();
    for (let c = 0; c < cid; c += 1) if (sizes[c] < minVox) removedComps.add(c);
    if (removedComps.size) {
      for (let i = 0; i < total; i += 1) {
        if (comp[i] !== -1 && removedComps.has(comp[i])) { sdf[i] = 0; } // dolu bırak
      }
      trappedRemoved = removedComps.size;
    }
  }

  // İç yüzey: sdf = -wall eş-yüzeyi (potential = sdf + wall, 0-geçişi)
  const lookup = (wx: number, wy: number, wz: number) => {
    let ix = Math.round((wx-minB[0])/scale[0]); if (ix<0) ix=0; else if (ix>=M[0]) ix=M[0]-1;
    let iy = Math.round((wy-minB[1])/scale[1]); if (iy<0) iy=0; else if (iy>=M[1]) iy=M[1]-1;
    let iz = Math.round((wz-minB[2])/scale[2]); if (iz<0) iz=0; else if (iz>=M[2]) iz=M[2]-1;
    return sdf[ix + iy*M[0] + iz*M[0]*M[1]] + wallMm;
  };
  const res = surfaceNets(M, lookup, [minB, maxB]) as { positions: number[][]; cells: number[][] };

  const P: number[][] = res.positions;
  const cells: number[][] = res.cells;

  // KÜÇÜK ARTIK (yeşil floater) TEMİZLİĞİ: iç yüzeyi bağlı bileşenlere ayır,
  // en büyüğün %2'sinden küçük kopuk parçaları at. (Kesitte görünen yeşil çöpler)
  const keptCells: number[][] = (() => {
    const np = P.length;
    const par = new Int32Array(np); for (let i = 0; i < np; i += 1) par[i] = i;
    const find = (x: number): number => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
    const uni = (a: number, b: number) => { const ra = find(a), rb = find(b); if (ra !== rb) par[rb] = ra; };
    for (const t of cells) { uni(t[0], t[1]); uni(t[1], t[2]); }
    const cnt = new Map<number, number>();
    for (const t of cells) { const r = find(t[0]); cnt.set(r, (cnt.get(r) ?? 0) + 1); }
    let maxC = 0; cnt.forEach((v) => { if (v > maxC) maxC = v; });
    const thr = Math.max(8, maxC * 0.02);
    return cells.filter((t) => (cnt.get(find(t[0])) ?? 0) >= thr);
  })();

  // iç yüzey üçgenleri (ters winding → normaller kaviteye baksın) + kavite hacmi
  const out: number[] = [];
  // dış yüzey (orijinal detay)
  for (let i = 0; i < fpos.count; i += 1) out.push(fpos.getX(i), fpos.getY(i), fpos.getZ(i));

  let cav6 = 0;
  for (const t of keptCells) {
    const a = P[t[0]], b = P[t[1]], c = P[t[2]];
    // ters winding (a,c,b)
    out.push(a[0],a[1],a[2], c[0],c[1],c[2], b[0],b[1],b[2]);
    cav6 += a[0]*(b[1]*c[2]-b[2]*c[1]) - a[1]*(b[0]*c[2]-b[2]*c[0]) + a[2]*(b[0]*c[1]-b[1]*c[0]);
  }

  const shell = new THREE.BufferGeometry();
  shell.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
  shell.computeVertexNormals();
  return { shell, cavityMm3: Math.abs(cav6) / 6, resolutionMm: Math.max(scale[0], scale[1], scale[2]), trappedRemoved };
}

// ---------------------------------------------------------------------------
// Metal ağırlığı: işaretli hacim (divergence teoremi) → mm³ → gram
// ---------------------------------------------------------------------------
export function computeWeight(geometry: THREE.BufferGeometry): MetalWeight {
  const source = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const position = source.attributes.position;
  let vol6 = 0; // 6× hacim
  const ax = new THREE.Vector3(), bx = new THREE.Vector3(), cx = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 3) {
    ax.set(position.getX(i), position.getY(i), position.getZ(i));
    bx.set(position.getX(i + 1), position.getY(i + 1), position.getZ(i + 1));
    cx.set(position.getX(i + 2), position.getY(i + 2), position.getZ(i + 2));
    vol6 += ax.dot(new THREE.Vector3().crossVectors(bx, cx));
  }
  const volumeMm3 = Math.abs(vol6) / 6;
  const volumeCm3 = volumeMm3 / 1000;
  return {
    volumeMm3,
    volumeCm3,
    weights: METALS.map((m) => ({ key: m.key, label: m.label, density: m.density, grams: volumeCm3 * m.density })),
  };
}
