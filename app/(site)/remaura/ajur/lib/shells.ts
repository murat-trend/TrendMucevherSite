import * as THREE from "three";

// ---------------------------------------------------------------------------
// İç içe kabuk yönlendirme — hollow STL'lerde kavite kabuğu sıkça DIŞA dönük
// sarımla gelir; o zaman diverjans/Manifold hacmi = dış + kavite (yanlış) olur
// ve kavite "katı" muamelesi görür. Kural: en büyük |hacim|li kabuk DIŞA (+),
// diğer tüm kabuklar İÇE (−) bakar. Tek kabuklu ters (inside-out) modeli de
// düzeltir. İNDEKSLİ geometri ister; index'i yerinde günceller (klon döner).
// ---------------------------------------------------------------------------

export function orientNestedShells(geometry: THREE.BufferGeometry): {
  geometry: THREE.BufferGeometry;
  shells: number;
  flipped: number;
} {
  const geo = geometry.clone();
  const index = geo.index!;
  const idx = index.array as Uint32Array | Uint16Array;
  const pos = geo.attributes.position;
  const nVerts = pos.count;

  // union-find (vertex bağlantısı üzerinden kabuk bileşenleri)
  const parent = new Int32Array(nVerts);
  for (let i = 0; i < nVerts; i += 1) parent[i] = i;
  const find = (x: number): number => {
    let r = x;
    while (parent[r] !== r) r = parent[r];
    while (parent[x] !== r) { const n = parent[x]; parent[x] = r; x = n; }
    return r;
  };
  const union = (a: number, b: number) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };
  for (let t = 0; t < idx.length; t += 3) {
    union(idx[t], idx[t + 1]);
    union(idx[t], idx[t + 2]);
  }

  // kabuk başına işaretli hacim (diverjans)
  const volByRoot = new Map<number, number>();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const cross = new THREE.Vector3();
  for (let t = 0; t < idx.length; t += 3) {
    a.fromBufferAttribute(pos, idx[t]);
    b.fromBufferAttribute(pos, idx[t + 1]);
    c.fromBufferAttribute(pos, idx[t + 2]);
    const v6 = a.dot(cross.crossVectors(b, c));
    const r = find(idx[t]);
    volByRoot.set(r, (volByRoot.get(r) ?? 0) + v6);
  }
  const shells = volByRoot.size;
  if (shells === 0) return { geometry: geo, shells: 0, flipped: 0 };

  // en büyük |hacim| = dış kabuk → pozitif; diğerleri → negatif
  let outerRoot = -1, outerAbs = -1;
  for (const [r, v] of volByRoot) {
    if (Math.abs(v) > outerAbs) { outerAbs = Math.abs(v); outerRoot = r; }
  }
  const needFlip = new Set<number>();
  for (const [r, v] of volByRoot) {
    const wantPositive = r === outerRoot;
    if ((v > 0) !== wantPositive) needFlip.add(r);
  }
  if (needFlip.size === 0) return { geometry: geo, shells, flipped: 0 };

  for (let t = 0; t < idx.length; t += 3) {
    if (needFlip.has(find(idx[t]))) {
      const tmp = idx[t + 1];
      idx[t + 1] = idx[t + 2];
      idx[t + 2] = tmp;
    }
  }
  index.needsUpdate = true;
  geo.computeVertexNormals();
  return { geometry: geo, shells, flipped: needFlip.size };
}
