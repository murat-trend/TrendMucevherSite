import * as THREE from "three";

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
  watertight: boolean;
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
  const addEdge = (a: string, b: string, f: number) => {
    const k = edgeKeyStr(a, b);
    const o = edgeOwners.get(k);
    if (o) o.push(f); else edgeOwners.set(k, [f]);
  };

  for (let f = 0; f < triangleCount; f += 1) {
    const base = f * 3;
    const a = keyOf(position, base), b = keyOf(position, base + 1), c = keyOf(position, base + 2);
    addEdge(a, b, f); addEdge(b, c, f); addEdge(c, a, f);
  }

  let boundaryEdges = 0, nonManifoldEdges = 0;
  edgeOwners.forEach((owners) => {
    if (owners.length === 1) boundaryEdges += 1;
    if (owners.length > 2) nonManifoldEdges += 1;
    for (let i = 1; i < owners.length; i += 1) union(owners[0], owners[i]);
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

  return {
    triangleCount,
    vertexCount: uniq.size,
    dimensions,
    shellCount: shellFaceGroups.size,
    boundaryEdges,
    nonManifoldEdges,
    watertight: boundaryEdges === 0 && nonManifoldEdges === 0,
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
