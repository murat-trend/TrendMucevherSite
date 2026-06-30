// cutAndCap kontur mantığını minimal porte → gerçek STL'de 3 eksende kontur çıkıyor mu?
// node scripts/diagnose-ajur.mjs <stl>
import fs from "fs";

const path = process.argv[2] || "C:\\Users\\Murat\\Downloads\\remaura-clean-mesh-20260629-211203.stl";
const raw = fs.readFileSync(path);
const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
const n = dv.getUint32(80, true);
const P = new Float32Array(n * 9); let o = 84, pp = 0;
for (let i = 0; i < n; i++) { o += 12; for (let k = 0; k < 9; k++) { P[pp++] = dv.getFloat32(o, true); o += 4; } o += 2; }
console.log(`${path.split(/[\\/]/).pop()} · ${n.toLocaleString()} üçgen`);

// bbox
let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < n * 3; i++) for (let a = 0; a < 3; a++) { const v = P[i * 3 + a]; if (v < mn[a]) mn[a] = v; if (v > mx[a]) mx[a] = v; }
const size = [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]];
const diag = Math.hypot(...size);
console.log(`bbox ${size.map((s) => s.toFixed(2)).join(" × ")} mm · diag ${diag.toFixed(2)}`);

const basisFor = (ai) => ai === 2 ? [0, 1] : ai === 0 ? [1, 2] : [2, 0];

function sliceContour(ai, position) {
  const lo = mn[ai], hi = mx[ai];
  const px = lo + (hi - lo) * position;
  const eps = diag * 1e-7;
  const keepDist = (x, y, z) => ([x, y, z][ai] - px); // keepSign=+1
  const segs = [];
  const vx = [0, 0, 0], vy = [0, 0, 0], vz = [0, 0, 0], vd = [0, 0, 0];
  for (let t = 0; t < n; t++) {
    const base = t * 9;
    for (let k = 0; k < 3; k++) {
      vx[k] = P[base + k * 3]; vy[k] = P[base + k * 3 + 1]; vz[k] = P[base + k * 3 + 2];
      vd[k] = keepDist(vx[k], vy[k], vz[k]);
    }
    const inAll = vd[0] >= -eps && vd[1] >= -eps && vd[2] >= -eps;
    const outAll = vd[0] < eps && vd[1] < eps && vd[2] < eps;
    if (inAll || outAll) continue;
    const isct = [];
    for (let k = 0; k < 3; k++) {
      const nk = (k + 1) % 3, dk = vd[k], dn = vd[nk];
      if ((dk >= -eps) !== (dn >= -eps)) {
        const f = dk / (dk - dn);
        isct.push(vx[k] + (vx[nk] - vx[k]) * f, vy[k] + (vy[nk] - vy[k]) * f, vz[k] + (vz[nk] - vz[k]) * f);
      }
    }
    if (isct.length >= 6) segs.push(isct[0], isct[1], isct[2], isct[3], isct[4], isct[5]);
  }
  if (segs.length < 6) return { loops: 0, maxArea: 0, segs: segs.length / 6, open: 0 };

  const [ui, vi] = basisFor(ai);
  const weld = diag * 1e-5;
  const keyOf = (u, v) => `${Math.round(u / weld)},${Math.round(v / weld)}`;
  const ptU = [], ptV = [], idx = new Map();
  const addPt = (u, v) => { const k = keyOf(u, v); const e = idx.get(k); if (e !== undefined) return e; const id = ptU.length; ptU.push(u); ptV.push(v); idx.set(k, id); return id; };
  const adj = new Map();
  const link = (a, b) => { (adj.get(a) ?? adj.set(a, []).get(a)).push(b); };
  const segCount = segs.length / 6;
  for (let s = 0; s < segCount; s++) {
    const off = s * 6;
    const a = addPt(segs[off + ui], segs[off + vi]);
    const b = addPt(segs[off + 3 + ui], segs[off + 3 + vi]);
    if (a === b) continue; link(a, b); link(b, a);
  }
  const usedEdge = new Set();
  const ekey = (a, b) => a < b ? `${a}|${b}` : `${b}|${a}`;
  const loops = []; let open = 0;
  for (let start = 0; start < ptU.length; start++) {
    const neigh0 = adj.get(start); if (!neigh0) continue;
    for (const first of neigh0) {
      if (usedEdge.has(ekey(start, first))) continue;
      const loop = [start]; let prev = start, cur = first; usedEdge.add(ekey(prev, cur)); let closed = false;
      for (let guard = 0; guard < ptU.length + 2; guard++) {
        loop.push(cur);
        if (cur === start) { closed = true; break; }
        const ns = adj.get(cur) ?? []; let next = -1;
        for (const cand of ns) { if (cand === prev) continue; if (usedEdge.has(ekey(cur, cand))) continue; next = cand; break; }
        if (next === -1) break;
        usedEdge.add(ekey(cur, next)); prev = cur; cur = next;
      }
      if (closed) { loop.pop(); if (loop.length >= 3) loops.push(loop); } else open++;
    }
  }
  let maxArea = 0;
  for (const l of loops) { let a = 0; for (let i = 0; i < l.length; i++) { const p = l[i], q = l[(i + 1) % l.length]; a += ptU[p] * ptV[q] - ptU[q] * ptV[p]; } maxArea = Math.max(maxArea, Math.abs(a / 2)); }
  return { loops: loops.length, maxArea, segs: segCount, open };
}

const AX = ["X", "Y", "Z"];
function probeAll(label) {
  for (let ai = 0; ai < 3; ai++) {
    let best = -1, bestPos = 0;
    for (const pos of [0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9]) {
      const r = sliceContour(ai, pos);
      if (r.maxArea > best) { best = r.maxArea; bestPos = pos; }
    }
    console.log(`  [${label}] Eksen ${AX[ai]} (${size[ai].toFixed(1)}mm): en iyi kontur maxArea=${best.toFixed(1)}mm² @pos ${bestPos}`);
  }
}
probeAll("RAW");

// --- Decimate (app pipeline ile aynı: weld + meshopt 150K) sonra tekrar dene ---
const { MeshoptSimplifier } = await import("meshoptimizer");
await MeshoptSimplifier.ready;
// weld
const Q = 100000; const map = new Map(); const verts = []; const idxArr = new Uint32Array(n * 3);
for (let t = 0; t < n * 3; t++) {
  const x = P[t * 3], y = P[t * 3 + 1], z = P[t * 3 + 2];
  const key = Math.round(x * Q) + "_" + Math.round(y * Q) + "_" + Math.round(z * Q);
  let id = map.get(key); if (id === undefined) { id = verts.length / 3; verts.push(x, y, z); map.set(key, id); }
  idxArr[t] = id;
}
const vpos = new Float32Array(verts);
const target = 150000 * 3;
const [newIdx, err] = MeshoptSimplifier.simplify(idxArr, vpos, 3, target, 1.0, ["Prune"]);
const decTris = newIdx.length / 3;
console.log(`\nDecimate: ${n.toLocaleString()} → ${decTris.toLocaleString()} üçgen · hata ${err.toExponential(2)}`);
// indexed → soup (P'yi decimated ile değiştir)
const decN = decTris;
const decP = new Float32Array(decN * 9);
for (let f = 0; f < decN; f++) {
  for (let k = 0; k < 3; k++) { const vi2 = newIdx[f * 3 + k] * 3; decP[f * 9 + k * 3] = vpos[vi2]; decP[f * 9 + k * 3 + 1] = vpos[vi2 + 1]; decP[f * 9 + k * 3 + 2] = vpos[vi2 + 2]; }
}
// global P/n yerine geçici olarak decP/decN kullanan slice — sliceContour global P,n okuyor; geçici sarmal:
globalThis.__dec = { P: decP, n: decN };
// sliceContour'u decimated üzerinde çalıştırmak için P,n'i yeniden bağla
runOn(decP, decN, "DEC-150K");

function runOn(PP, nn, label) {
  // sliceContour global P,n kullanıyor; küçük kopyayla yeniden tanımla
  const oldP = P, oldN = n;
  // JS closure: P,n const → reassign edemeyiz. Bu yüzden inline yeniden hesap:
  for (let ai = 0; ai < 3; ai++) {
    let best = -1, bestPos = 0, bestLoops = 0;
    for (const pos of [0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9]) {
      const r = sliceContourOn(PP, nn, ai, pos);
      if (r.maxArea > best) { best = r.maxArea; bestPos = pos; bestLoops = r.loops; }
    }
    console.log(`  [${label}] Eksen ${AX[ai]} (${size[ai].toFixed(1)}mm): en iyi maxArea=${best.toFixed(1)}mm² · loop=${bestLoops} @pos ${bestPos}`);
  }
}

function sliceContourOn(PP, nn, ai, position) {
  const lo = mn[ai], hi = mx[ai];
  const px = lo + (hi - lo) * position;
  const eps = diag * 1e-7;
  const segs = [];
  const vx = [0, 0, 0], vy = [0, 0, 0], vz = [0, 0, 0], vd = [0, 0, 0];
  for (let t = 0; t < nn; t++) {
    const base = t * 9;
    for (let k = 0; k < 3; k++) { vx[k] = PP[base + k * 3]; vy[k] = PP[base + k * 3 + 1]; vz[k] = PP[base + k * 3 + 2]; vd[k] = [vx[k], vy[k], vz[k]][ai] - px; }
    const inAll = vd[0] >= -eps && vd[1] >= -eps && vd[2] >= -eps;
    const outAll = vd[0] < eps && vd[1] < eps && vd[2] < eps;
    if (inAll || outAll) continue;
    const isct = [];
    for (let k = 0; k < 3; k++) { const nk = (k + 1) % 3, dk = vd[k], dn = vd[nk]; if ((dk >= -eps) !== (dn >= -eps)) { const f = dk / (dk - dn); isct.push(vx[k] + (vx[nk] - vx[k]) * f, vy[k] + (vy[nk] - vy[k]) * f, vz[k] + (vz[nk] - vz[k]) * f); } }
    if (isct.length >= 6) segs.push(isct[0], isct[1], isct[2], isct[3], isct[4], isct[5]);
  }
  if (segs.length < 6) return { loops: 0, maxArea: 0 };
  const [ui, vi] = basisFor(ai);
  const weld = diag * 1e-5;
  const keyOf = (u, v) => `${Math.round(u / weld)},${Math.round(v / weld)}`;
  const ptU = [], ptV = [], idx = new Map();
  const addPt = (u, v) => { const k = keyOf(u, v); const e = idx.get(k); if (e !== undefined) return e; const id = ptU.length; ptU.push(u); ptV.push(v); idx.set(k, id); return id; };
  const adj = new Map(); const link = (a, b) => { (adj.get(a) ?? adj.set(a, []).get(a)).push(b); };
  for (let s = 0; s < segs.length / 6; s++) { const off = s * 6; const a = addPt(segs[off + ui], segs[off + vi]); const b = addPt(segs[off + 3 + ui], segs[off + 3 + vi]); if (a === b) continue; link(a, b); link(b, a); }
  const usedEdge = new Set(); const ekey = (a, b) => a < b ? `${a}|${b}` : `${b}|${a}`;
  const loops = [];
  for (let start = 0; start < ptU.length; start++) { const neigh0 = adj.get(start); if (!neigh0) continue; for (const first of neigh0) { if (usedEdge.has(ekey(start, first))) continue; const loop = [start]; let prev = start, cur = first; usedEdge.add(ekey(prev, cur)); let closed = false; for (let g = 0; g < ptU.length + 2; g++) { loop.push(cur); if (cur === start) { closed = true; break; } const ns = adj.get(cur) ?? []; let next = -1; for (const cand of ns) { if (cand === prev) continue; if (usedEdge.has(ekey(cur, cand))) continue; next = cand; break; } if (next === -1) break; usedEdge.add(ekey(cur, next)); prev = cur; cur = next; } if (closed) { loop.pop(); if (loop.length >= 3) loops.push(loop); } } }
  let maxArea = 0; for (const l of loops) { let a = 0; for (let i = 0; i < l.length; i++) { const p = l[i], q = l[(i + 1) % l.length]; a += ptU[p] * ptV[q] - ptU[q] * ptV[p]; } maxArea = Math.max(maxArea, Math.abs(a / 2)); }
  return { loops: loops.length, maxArea };
}
