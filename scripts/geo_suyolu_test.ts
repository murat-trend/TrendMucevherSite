// SUYOLU BİLEKLİK kanıt koşusu: silindir sarma + iç çevre sözü + temas +
// manifold + kırılganlık + gramaj (iki desen: dalga / meander)
// npx tsx scripts/geo_suyolu_test.ts
import { mmToUm } from "../lib/remaura/geo/units";
import { V3, dist, pointSegDist } from "../lib/remaura/geo/vec3";
import { sweepWire } from "../lib/remaura/geo/wire";
import { measureWire, meshVolumeMm3, edgeManifoldReport } from "../lib/remaura/geo/measure";
import { sphereMesh } from "../lib/remaura/geo/granule";
import { analyzeSpans, AnalyzeWire } from "../lib/remaura/geo/analyze";
import { cylPoint } from "../lib/remaura/geo/bend";
import { buildSuyoluBileklik, SuyoluDesen } from "../lib/remaura/geo/suyoluBileklik";

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail: string) {
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}\n      ${detail}`);
}

(async () => {
  const params = { icCevreMm: 170, bantEniMm: 12, fineDiaMm: 0.3, frameDiaMm: 0.6 };
  const rT0 = params.frameDiaMm / 2, rT1 = rT0 * 0.73;
  const contactT1 = 2 * rT1 - 0.12 * 2 * rT1; // omurga-astar gömmeli temas mesafesi

  for (const desen of ["dalga", "meander"] as SuyoluDesen[]) {
    console.log(`\n=== DESEN: ${desen} ===`);
    const t0 = Date.now();
    const b = buildSuyoluBileklik({ ...params, desen });
    const Rin = b.bilgi.icCapMm / 2;
    const Rc = b.bilgi.merkezYaricapMm;

    // ---- 1. tüm parçalar süpürülür: manifold + çap sözü
    let manOk = true, worstDiaErrUm = 0, worstDeficitUm = 0, totalVol = 0, totalLen = 0;
    let minRailRadial = Infinity;
    for (const w of b.wires) {
      const mesh = sweepWire(w.path, w.radiusMm);
      const meas = measureWire(mesh, w.path);
      worstDiaErrUm = Math.max(worstDiaErrUm, meas.worstCircumErrUm);
      worstDeficitUm = Math.max(worstDeficitUm, meas.worstInradiusDeficitUm - mmToUm(0.001));
      if (!edgeManifoldReport(mesh.indices).ok) { manOk = false; console.log(`      !! manifold değil: ${w.name}`); }
      totalVol += meshVolumeMm3(mesh.positions, mesh.indices);
      totalLen += mesh.lengthMm;
      if (w.name.startsWith("ray-")) {
        for (let k = 0; k < mesh.positions.length; k += 3) {
          minRailRadial = Math.min(minRailRadial, Math.hypot(mesh.positions[k], mesh.positions[k + 2]));
        }
      }
    }
    for (const g of b.granules) {
      const mesh = sphereMesh(g.center, g.radiusMm);
      if (!edgeManifoldReport(mesh.indices).ok) manOk = false;
      totalVol += meshVolumeMm3(mesh.positions, mesh.indices);
    }
    check(`${desen}: ${b.wires.length} tel + ${b.granules.length} granül hepsi manifold, çap sözü`,
      manOk && worstDiaErrUm < 0.01 && worstDeficitUm < 0.01,
      `çap sapması ${worstDiaErrUm.toExponential(2)}µm, inradius açığı fazlası ${worstDeficitUm.toFixed(3)}µm`);

    // ---- 2. İÇ ÇEVRE SÖZÜ: ray mesh'inin eksene en yakın vertex'i = Rin
    // (radyal çokgen yüzünden Rin'den en fazla ~2µm uzak olabilir, altına İNEMEZ)
    const errInUm = mmToUm(minRailRadial - Rin);
    check(`${desen}: iç çevre sözü (iç yüzey = ${params.icCevreMm}mm çevre)`,
      errInUm > -0.5 && errInUm < 3,
      `iç yarıçap ${Rin.toFixed(4)}mm, ray iç vertex sapması ${errInUm.toFixed(3)}µm`);

    // ---- 3. yay uzunluğu: bükülmüş ray uzunluğu = düz-bant L (kiriş payı ~2µm)
    const ray = b.wires.find((w) => w.name === "ray-üst")!;
    let rayLen = 0;
    for (let i = 1; i < ray.path.pts.length; i++) rayLen += dist(ray.path.pts[i - 1], ray.path.pts[i]);
    check(`${desen}: sarma yay uzunluğunu korudu`,
      Math.abs(mmToUm(rayLen - b.bilgi.bantYayMm)) < 5,
      `bükülü ray ${rayLen.toFixed(5)}mm vs düz bant ${b.bilgi.bantYayMm.toFixed(5)}mm (fark ${mmToUm(rayLen - b.bilgi.bantYayMm).toFixed(2)}µm)`);

    // ---- 4. açıklık: rayın uç açılarından geri ölçülür
    let maxAng = 0;
    for (const p of ray.path.pts) maxAng = Math.max(maxAng, Math.abs(Math.atan2(p[0], p[2])));
    const gapMeasured = (2 * Math.PI - 2 * maxAng) * Rin;
    check(`${desen}: kelepçe açıklığı geri ölçümü`,
      Math.abs(gapMeasured - b.bilgi.aciklikMm) < 0.01,
      `ölçülen ${gapMeasured.toFixed(4)}mm vs istenen ${b.bilgi.aciklikMm}mm`);

    // ---- 5. omurga-astar teması: tepe noktası astara gömmeli mesafede
    // (düz uzayda tepe (xTepe, A) — bükülmüş astar poliline'ına min mesafe)
    const astar = b.wires.find((w) => w.name === "astar-üst")!;
    const omurga = b.wires.find((w) => w.name === "suyolu-omurga")!;
    let crest: V3 = omurga.path.pts[0];
    for (const p of omurga.path.pts) if (p[1] > crest[1]) crest = p;
    let dMin = Infinity;
    for (let i = 1; i < astar.path.pts.length; i++)
      dMin = Math.min(dMin, pointSegDist(crest, astar.path.pts[i - 1], astar.path.pts[i]));
    check(`${desen}: suyolu tepesi astara gömmeli temasta (§1.6)`,
      Math.abs(mmToUm(dMin - contactT1)) < 3,
      `tepe-astar mesafesi ${dMin.toFixed(4)}mm vs hedef ${contactT1.toFixed(4)}mm (gömme %12)`);

    // ---- 6. kırılganlık: hiçbir tel havada değil (yerçekimi kanunu)
    const anaWires: AnalyzeWire[] = [
      ...b.wires.map((w) => ({ pts: w.path.pts, radiusMm: w.radiusMm })),
      ...b.granules.map((g) => ({ pts: [g.center], radiusMm: g.radiusMm })),
    ];
    const { verdicts, worstRatio } = analyzeSpans(anaWires);
    const havada = verdicts.filter((v) => v.supports === 0).length;
    const riskliSpan = verdicts.filter((v) => v.ratio > 35).length;
    check(`${desen}: yerçekimi kanunu — havada parça yok, açıklıklar sağlam`,
      havada === 0 && riskliSpan === 0,
      `havada ${havada}, L/d>35 olan ${riskliSpan}, en kötü L/d ${worstRatio.toFixed(1)}`);

    // ---- 7. rapor (assert yok): gramaj + envanter
    console.log(`      bilgi: içÇap ${b.bilgi.icCapMm.toFixed(2)}mm · bant yayı ${b.bilgi.bantYayMm.toFixed(1)}mm · ` +
      `açıklık ${b.bilgi.aciklikMm}mm · ${b.bilgi.periyot} periyot · ${b.bilgi.hucre} hücre`);
    console.log(`      tel ${totalLen.toFixed(0)}mm · hacim ${totalVol.toFixed(2)}mm³ · ` +
      `ag925 ${(totalVol * 0.01036).toFixed(2)}g · au14 ${(totalVol * 0.01358).toFixed(2)}g · süre ${Date.now() - t0}ms`);
  }

  // ---- 8. cylPoint birim doğrulaması: yay uzunluğu birebir açıya gider
  {
    const R = 27;
    const p = cylPoint([Math.PI * R, 0, 0], R); // yarım tur
    check("cylPoint: x = π·R tam yarım tura gider",
      Math.abs(p[0]) < 1e-9 && Math.abs(p[2] + R) < 1e-9,
      `[${p[0].toExponential(2)}, ${p[1]}, ${p[2].toFixed(9)}] (beklenen [0, 0, -27])`);
  }

  console.log(`\nSONUÇ: ${pass} PASS, ${fail} FAIL`);
  if (fail > 0) process.exitCode = 1;
})();
