// Gerçek TS cutAndCap/autoLevel/analyze ile app yolunu birebir test et.
// node --experimental-strip-types scripts/test-ajur-real.mts <stl>
import fs from "fs";
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { autoLevelGeometry, analyzeModelForAjur, cutAndCap } from "../app/(site)/remaura/ajur/lib/ajurOps.ts";

const path = process.argv[2] || "C:\\Users\\Murat\\Downloads\\remaura-clean-mesh-20260629-211203.stl";
const raw = fs.readFileSync(path);
const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
const n = dv.getUint32(80, true);
const soup = new Float32Array(n * 9); let o = 84, pp = 0;
for (let i = 0; i < n; i++) { o += 12; for (let k = 0; k < 9; k++) { soup[pp++] = dv.getFloat32(o, true); o += 4; } o += 2; }
console.log(`${path.split(/[\\/]/).pop()} · ${n.toLocaleString()} üçgen`);

const g0 = new THREE.BufferGeometry();
g0.setAttribute("position", new THREE.Float32BufferAttribute(soup, 3));
g0.computeVertexNormals();

// 1) autoLevel (app yükleme adımı)
const { geometry: g, changed } = autoLevelGeometry(g0);
g.computeBoundingBox();
const s = g.boundingBox!.getSize(new THREE.Vector3());
console.log(`autoLevel changed=${changed} · bbox ${s.x.toFixed(2)} × ${s.y.toFixed(2)} × ${s.z.toFixed(2)}`);

// 2) analyze (app öneri)
const adv = analyzeModelForAjur(g);
console.log(`analyze: thinAxis=${adv.thinAxis} suggest=${JSON.stringify(adv.suggest)} reco=${adv.recommendation} loops=${adv.loops}`);

// 3) Gerçek cutAndCap — her eksen, probe pozisyonları
const AX = ["x", "y", "z"] as const;
for (const axis of AX) {
  let best = -1, bestPos = 0, bestLoops = 0;
  for (const position of [0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9]) {
    try {
      const c = cutAndCap(g, { axis, position, flip: false }).contour;
      if (!c) continue;
      const area = Math.max(...c.loops.map((l) => Math.abs(l.area)), 0);
      if (area > best) { best = area; bestPos = position; bestLoops = c.loops.length; }
    } catch (e) { console.log(`  ${axis}@${position} THREW: ${(e as Error).message}`); }
  }
  console.log(`  cutAndCap eksen ${axis} (${s[axis].toFixed(1)}mm): en iyi contour area=${best.toFixed(1)} loop=${bestLoops} @pos ${bestPos} ${best < 0 ? "→ KONTUR YOK!" : ""}`);
}

// 4) DECIMATE (app pipeline) sonra tekrar cutAndCap — asıl şüpheli
const gPos = g.clone(); gPos.deleteAttribute("normal"); gPos.deleteAttribute("uv");
const indexed = mergeVertices(gPos);
const idxA = indexed.index!.array as ArrayLike<number>;
const posA = indexed.attributes.position.array as Float32Array;
console.log(`\nweld sonrası: ${(idxA.length / 3).toLocaleString()} üçgen, ${posA.length / 3} vertex`);
const { MeshoptSimplifier } = await import("meshoptimizer");
await MeshoptSimplifier.ready;
const iU = idxA instanceof Uint32Array ? idxA : new Uint32Array(idxA);
const [newIdx, err] = MeshoptSimplifier.simplify(iU, posA, 3, 150000 * 3, 1.0, ["Prune"]);
const dec = new THREE.BufferGeometry();
dec.setAttribute("position", new THREE.Float32BufferAttribute(posA, 3));
dec.setIndex(new THREE.Uint32BufferAttribute(new Uint32Array(newIdx), 1));
dec.computeVertexNormals();
console.log(`decimate: ${(newIdx.length / 3).toLocaleString()} üçgen · hata ${err.toExponential(2)}`);

for (const axis of AX) {
  let best = -1, bestPos = 0, bestLoops = 0;
  for (const position of [0.25, 0.4, 0.5, 0.6, 0.75]) {
    try {
      const c = cutAndCap(dec, { axis, position, flip: false }).contour;
      if (!c) continue;
      const area = Math.max(...c.loops.map((l) => Math.abs(l.area)), 0);
      if (area > best) { best = area; bestPos = position; bestLoops = c.loops.length; }
    } catch (e) { console.log(`  DEC ${axis}@${position} THREW: ${(e as Error).message}`); }
  }
  console.log(`  [DECIMATED] cutAndCap eksen ${axis}: en iyi area=${best.toFixed(1)} loop=${bestLoops} @pos ${bestPos} ${best < 0 ? "→ KONTUR YOK!" : ""}`);
}
