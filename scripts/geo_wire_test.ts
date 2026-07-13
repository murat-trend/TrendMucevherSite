// Tel motoru + telkari — KANIT koşusu
// npx tsx scripts/geo_wire_test.ts
//
// Söz: istenen tel çapı ile mesh'ten GERİ ÖLÇÜLEN çap arasındaki fark mikron
// sınırında kalır — 30 µm'lik telde bile. Her mesh kapalı-manifold çıkar.
import { UM, TOL_MEASURE_MM, mmToUm } from "../lib/remaura/geo/units";
import { V3 } from "../lib/remaura/geo/vec3";
import { adaptiveSample, sweepWire } from "../lib/remaura/geo/wire";
import { measureWire, meshVolumeMm3, edgeManifoldReport } from "../lib/remaura/geo/measure";
import { buildTelkariDrop } from "../lib/remaura/geo/telkari";

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail: string) {
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}\n      ${detail}`);
}

// ---- 1. DÜZ TEL, GERÇEK 30 MİKRON ÇAP (r=0.015mm), 10mm boy
{
  const r = 0.015;
  const path = { pts: [[0, 0, 0], [10, 0, 0]] as V3[], closed: false };
  const w = sweepWire(path, r);
  const meas = measureWire(w, path);
  const man = edgeManifoldReport(w.indices);
  // analitik hacim: çokgen alanı × boy (aynı ayrıklaştırma — birebir tutmalı)
  const polyArea = 0.5 * w.radialSegments * r * r * Math.sin((2 * Math.PI) / w.radialSegments);
  const vol = meshVolumeMm3(w.positions, w.indices);
  check("30µm tel: çap geri-ölçüm birebir", meas.worstCircumErrUm < 1e-6,
    `istenen ${mmToUm(meas.requestedDiaMm)}µm, en kötü sapma ${meas.worstCircumErrUm.toExponential(2)}µm, ` +
    `radyal segment ${w.radialSegments} (toleranstan türedi)`);
  check("30µm tel: en ince nokta sözü (inradius >= r - tol)",
    meas.worstInradiusDeficitUm <= TOL_MEASURE_MM / UM + 1e-9,
    `en ince çap ${mmToUm(meas.minInscribedDiaMm).toFixed(2)}µm (açık kalan ${meas.worstInradiusDeficitUm.toFixed(3)}µm <= 1µm)`);
  check("30µm tel: kapalı-manifold + hacim analitik birebir",
    man.ok && Math.abs(vol - polyArea * 10) < 1e-12,
    `kenar ${man.edges}, açık ${man.boundaryEdges}, hacim ${vol.toExponential(6)} mm³ (analitik ${(polyArea * 10).toExponential(6)})`);
}

// ---- 2. KAPALI HALKA (R=5mm, tel 0.3mm) — kavisli yol + kapalı topoloji
{
  const r = 0.15;
  const path = adaptiveSample((t) => [5 * Math.cos(t), 5 * Math.sin(t), 0], 0, 2 * Math.PI, TOL_MEASURE_MM, true);
  const w = sweepWire(path, r);
  const meas = measureWire(w, path);
  const man = edgeManifoldReport(w.indices);
  const vol = meshVolumeMm3(w.positions, w.indices);
  const pappus = Math.PI * r * r * 2 * Math.PI * 5; // pürüzsüz torus referansı
  check("halka: kavis üstünde çap sapmasız + manifold", meas.worstCircumErrUm < 1e-6 && man.ok,
    `ring ${w.ringCount} (kiriş toleransından türedi), en kötü çap sapması ${meas.worstCircumErrUm.toExponential(2)}µm, açık kenar ${man.boundaryEdges}`);
  check("halka: hacim torus referansına yakınsıyor", Math.abs(vol - pappus) / pappus < 0.01,
    `mesh ${vol.toFixed(4)} mm³ vs torus ${pappus.toFixed(4)} mm³ (fark %${(100 * Math.abs(vol - pappus) / pappus).toFixed(3)} — faceting, tolerans gereği)`);
}

// ---- 3. FLOAT32 (STL) YUVARLAMASI SONRASI GERİ ÖLÇÜM
{
  const r = 0.015;
  const path = { pts: [[0, 0, 0], [10, 0, 0]] as V3[], closed: false };
  const w = sweepWire(path, r);
  const p32 = new Float64Array(Float32Array.from(w.positions)); // STL'e yaz-oku simülasyonu
  const meas = measureWire({ ...w, positions: p32 }, path);
  check("STL float32 sonrası 30µm tel hâlâ mikron içinde", meas.worstCircumErrUm < 0.05,
    `float32 sonrası en kötü çap sapması ${meas.worstCircumErrUm.toFixed(5)}µm`);
}

// ---- 4. TELKARİ DAMLA (h=30mm, ince tel 0.30mm, çerçeve 0.80mm)
{
  const wires = buildTelkariDrop({ heightMm: 30, fineDiaMm: 0.3, frameDiaMm: 0.8 });
  let tris = 0, totalLen = 0, totalVol = 0, worstErr = 0, allManifold = true;
  for (const tw of wires) {
    const mesh = sweepWire(tw.path, tw.radiusMm);
    const meas = measureWire(mesh, tw.path);
    const man = edgeManifoldReport(mesh.indices);
    tris += mesh.indices.length / 3;
    totalLen += mesh.lengthMm;
    totalVol += meshVolumeMm3(mesh.positions, mesh.indices);
    worstErr = Math.max(worstErr, meas.worstCircumErrUm, meas.worstInradiusDeficitUm - TOL_MEASURE_MM / UM);
    if (!man.ok) { allManifold = false; console.log(`      !! ${tw.name}: açık ${man.boundaryEdges} nonmanifold ${man.nonManifoldEdges}`); }
  }
  const gram = totalVol * 0.01036; // ag925 döküm yaklaşık yoğunluk (g/mm³)
  check(`telkari: ${wires.length} tel, hepsi manifold + mikron içinde`, allManifold && worstErr <= 1e-6,
    `toplam tel ${totalLen.toFixed(1)}mm, ${tris.toLocaleString()} üçgen, hacim ${totalVol.toFixed(2)} mm³ ~ ${gram.toFixed(3)}g gümüş (lehim kesişimleri çift sayılır, yaklaşık)`);

  // gerçek 30 MİKRON versiyonu — Murat'ın sorusunun harfiyen hali
  const wires30 = buildTelkariDrop({ heightMm: 30, fineDiaMm: 0.03, frameDiaMm: 0.8 });
  let worst30 = 0;
  for (const tw of wires30.filter((x) => x.name.startsWith("spiral"))) {
    const mesh = sweepWire(tw.path, tw.radiusMm);
    worst30 = Math.max(worst30, measureWire(mesh, tw.path).worstCircumErrUm);
  }
  check("telkari GERÇEK 30µm ince telle de üretilebiliyor", worst30 < 1e-6,
    `spiral telleri çap 30.000µm, en kötü sapma ${worst30.toExponential(2)}µm (geometri motoru sınır tanımıyor; döküm ayrı konu)`);
}

console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
