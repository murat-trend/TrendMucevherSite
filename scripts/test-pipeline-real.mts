// Tüm runAjurPipeline'ı headless çalıştır — app ile birebir, nerede patlıyor gör.
// node --experimental-strip-types scripts/test-pipeline-real.mts <stl>
import fs from "fs";
import * as THREE from "three";
import { autoLevelGeometry, analyzeModelForAjur, detectFlatFace } from "../app/(site)/remaura/ajur/lib/ajurOps.ts";
import { runAjurPipeline } from "../app/(site)/remaura/ajur/lib/ajurPipeline.ts";

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
const g = autoLevelGeometry(g0).geometry;
const adv = analyzeModelForAjur(g);
const flat = detectFlatFace(g, adv.thinAxis);
const dir = { axis: adv.thinAxis, flip: flat.fromMax }; // app ile aynı: düz arka
console.log(`öneri: axis=${dir.axis} flip=${dir.flip} (areaMax=${flat.areaMax.toFixed(0)} areaMin=${flat.areaMin.toFixed(0)})`);

try {
  const res = await runAjurPipeline(
    {
      geometry: g,
      backPlane: { axis: dir.axis, position: 0.2, flip: dir.flip },
      wallMm: 1.0, pattern: "petek", cellsAcross: 10, holeScale: 0.6,
      thickness: 1.0, border: 1.0, decimateTarget: 150000, compose: "drill-back",
      frontSkinMm: Number(process.argv[3]) || 1.0,
    },
    {
      mode: "single", execution: "main-thread",
      onProgress: (p) => console.log(`  [${p.stage}] %${p.percent} ${p.message}`),
    },
  );
  console.log(`\nSONUÇ: ${res.geometry ? "geometri VAR" : "geometri YOK"} · delik=${res.stats.holes} · köprü=${res.stats.strutMm.toFixed(2)} · ${(res.stats.ms / 1000).toFixed(1)}s`);
  // kenar sayımı (indeksli topoloji)
  if (res.geometry) {
    const idx = res.geometry.index!; const em = new Map<string, number>();
    const ek = (a: number, b: number) => a < b ? `${a}_${b}` : `${b}_${a}`;
    for (let i = 0; i < idx.count; i += 3) { const a = idx.getX(i), b = idx.getX(i + 1), c = idx.getX(i + 2); for (const [x, y] of [[a, b], [b, c], [c, a]]) { const k = ek(x, y); em.set(k, (em.get(k) || 0) + 1); } }
    let open = 0, nm = 0; em.forEach((v) => { if (v === 1) open++; if (v > 2) nm++; });
    console.log(`watertight kontrol: açık kenar=${open} · non-manifold=${nm} ${open === 0 && nm === 0 ? "✓ TEMİZ" : "⚠"}`);

    // Binary STL yaz → ZBrush'ta kontrol için
    const pos = res.geometry.attributes.position;
    const ix = res.geometry.index!;
    const nTri = ix.count / 3;
    const buf = Buffer.alloc(84 + nTri * 50);
    buf.writeUInt32LE(nTri, 80);
    let off = 84;
    const ga = (i: number, c: number) => pos.getComponent(i, c) as number;
    for (let f = 0; f < nTri; f++) {
      const a = ix.getX(f * 3), b = ix.getX(f * 3 + 1), c = ix.getX(f * 3 + 2);
      off += 12; // normal 0
      for (const vi of [a, b, c]) { buf.writeFloatLE(ga(vi, 0), off); buf.writeFloatLE(ga(vi, 1), off + 4); buf.writeFloatLE(ga(vi, 2), off + 8); off += 12; }
      off += 2;
    }
    const out = path.replace(/\.stl$/i, "_HOLLOWTEST.stl");
    fs.writeFileSync(out, buf);
    console.log(`→ STL yazıldı: ${out}`);
  }
} catch (e) {
  console.log(`\nPATLADI: ${(e as Error).message}`);
  console.log((e as Error).stack);
}
