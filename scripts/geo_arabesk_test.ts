// Telkari Arabesk (gerçek model kopyası) — KANIT koşusu
// npx tsx scripts/geo_arabesk_test.ts
import { UM } from "../lib/remaura/geo/units";
import { sweepWire } from "../lib/remaura/geo/wire";
import { sphereMesh, measureSphere } from "../lib/remaura/geo/granule";
import { measureWire, meshVolumeMm3, edgeManifoldReport } from "../lib/remaura/geo/measure";
import { buildTelkariArabesk } from "../lib/remaura/geo/telkariArabesk";

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail: string) {
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}\n      ${detail}`);
}

const { wires, granules } = buildTelkariArabesk({
  heightMm: 36, widthMm: 26, fineDiaMm: 0.4, frameDiaMm: 0.7,
});

// teller
let worstErrUm = 0, totalVol = 0, totalLen = 0, badManifold: string[] = [];
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
for (const tw of wires) {
  const mesh = sweepWire(tw.path, tw.radiusMm);
  const meas = measureWire(mesh, tw.path);
  worstErrUm = Math.max(worstErrUm, meas.worstCircumErrUm);
  totalVol += meshVolumeMm3(mesh.positions, mesh.indices);
  totalLen += mesh.lengthMm;
  if (!edgeManifoldReport(mesh.indices).ok) badManifold.push(tw.name);
  if (tw.name === "çerçeve") {
    for (const [x, y] of tw.path.pts) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  }
}
// granüller
let worstGranUm = 0;
for (const g of granules) {
  const mesh = sphereMesh(g.center, g.radiusMm);
  worstGranUm = Math.max(worstGranUm, measureSphere(mesh) / UM);
  totalVol += meshVolumeMm3(mesh.positions, mesh.indices);
  if (!edgeManifoldReport(mesh.indices).ok) badManifold.push(g.name);
}

check("tüm parçalar kapalı-manifold", badManifold.length === 0,
  badManifold.length ? `sorunlu: ${badManifold.join(", ")}` : `${wires.length} tel + ${granules.length} granül`);
check("tel çapları mikron içinde geri ölçüldü", worstErrUm < 1e-6,
  `en kötü tel sapması ${worstErrUm.toExponential(2)}µm, granül ${worstGranUm.toExponential(2)}µm`);
check("çerçeve ölçüsü referans: 36.00 × 26.00 mm",
  Math.abs(maxY - minY - 36) < 1e-6 && Math.abs(maxX - minX - 26) < 1e-6,
  `ölçülen ${(maxY - minY).toFixed(4)} × ${(maxX - minX).toFixed(4)} mm (çerçeve omurgasından)`);
const gram14 = totalVol * 0.01358;
console.log(`      toplam tel ${totalLen.toFixed(1)}mm · hacim ${totalVol.toFixed(1)}mm³ · 14K ~${gram14.toFixed(2)}g (hedef 2.80g — bombe+yoğunluk/çap kalibrasyonu bekliyor)`);

console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
