// SUYOLU MOTORU kanıt koşusu: ct↔mm, bakla CSG (manifold+hacim), kural
// denetimleri (S11 taş arası, S4 duvar), rapor, montaj, STL boyutu.
// npx tsx scripts/suyolu_test.ts
import { caratToCapMm, capToCaratMm, kanalDuvariMm, MADENLER } from "../lib/remaura/suyolu/kurallar";
import { tasMesh, tasOlc } from "../lib/remaura/suyolu/tas";
import { baklaUret, baklaOlc } from "../lib/remaura/suyolu/bakla";
import { baklaSayisi, dizilim, rapor, montajMesh } from "../lib/remaura/suyolu/bileklik";
import { toBinarySTL } from "../lib/remaura/suyolu/stl";
import { mumaAt, duzSiraKonumlar } from "../lib/remaura/suyolu/mum";

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail: string) {
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}\n      ${detail}`);
}

function manifoldOk(indices: Uint32Array): boolean {
  const count = new Map<number, number>();
  const key = (a: number, b: number) => (a < b ? a * 4294967296 + b : b * 4294967296 + a);
  for (let k = 0; k < indices.length; k += 3) {
    const a = indices[k], b = indices[k + 1], c = indices[k + 2];
    for (const e of [key(a, b), key(b, c), key(c, a)]) count.set(e, (count.get(e) ?? 0) + 1);
  }
  for (const c of count.values()) if (c !== 2) return false;
  return true;
}

(async () => {
  // 1. ct↔mm: Stuller çapaları birebir + gidiş-dönüş
  {
    const c1 = caratToCapMm(0.5), c2 = caratToCapMm(1.0), c3 = caratToCapMm(0.03);
    const rt = capToCaratMm(caratToCapMm(0.25));
    check("ct→mm Stuller çapaları", Math.abs(c1 - 5.2) < 1e-9 && Math.abs(c2 - 6.4) < 1e-9 && Math.abs(c3 - 2.0) < 1e-9,
      `0.50ct→${c1}mm (5.2) · 1.00ct→${c2}mm (6.4) · 0.03ct→${c3}mm (2.0)`);
    check("ct↔mm gidiş-dönüş", Math.abs(rt - 0.25) < 1e-9, `0.25ct→mm→${rt}ct`);
  }

  // 2. taş mesh: manifold + ölçü (T1)
  {
    const D = 3.0;
    const m = tasMesh(D);
    const o = tasOlc(D);
    let minZ = Infinity, maxR = 0;
    for (let i = 0; i < m.positions.length; i += 3) {
      minZ = Math.min(minZ, m.positions[i + 2]);
      maxR = Math.max(maxR, Math.hypot(m.positions[i], m.positions[i + 1]));
    }
    check("taş: manifold + T1 oranları", manifoldOk(m.indices)
      && Math.abs(-minZ - 0.61 * D) < 1e-9 && Math.abs(2 * maxR - D) < 1e-9,
      `yükseklik ${(-minZ).toFixed(3)} (0.61D=${(0.61 * D).toFixed(3)}) · çap ${(2 * maxR).toFixed(3)}`);
    check("taş ölçüleri", Math.abs(o.tacMm - 0.45) < 1e-9 && Math.abs(o.girdleMm - 0.09) < 1e-9,
      `taç ${o.tacMm}mm · girdle ${o.girdleMm}mm @3mm taş`);
  }

  // 3. bakla CSG: üç taş boyunda manifold + hacim + kural denetimi
  for (const ct of [0.03, 0.10, 0.50]) {
    const D = caratToCapMm(ct);
    const t0 = Date.now();
    const b = await baklaUret(D);
    const o = b.olculer;
    const okMan = manifoldOk(b.mesh.indices);
    const okS11 = o.tasArasiMm >= 0.15;
    const okS4 = Math.abs(o.duvarMm - kanalDuvariMm(D)) < 1e-9;
    const okHacim = b.hacimMm3 > 0 && b.hacimMm3 < o.boyMm * o.enMm * o.yukseklikMm;
    check(`bakla ${ct}ct (D=${D.toFixed(2)}mm): manifold + kurallar`,
      okMan && okS11 && okS4 && okHacim,
      `hacim ${b.hacimMm3.toFixed(2)}mm³ · ${o.boyMm.toFixed(2)}×${o.enMm.toFixed(2)}×${o.yukseklikMm.toFixed(2)} · ` +
      `adım ${o.adimMm.toFixed(2)} · taş arası ${o.tasArasiMm.toFixed(2)} (S11≥0.15 ${okS11 ? "✓" : "✗"}) · ` +
      `duvar ${o.duvarMm} (S4) · pim ${o.pimCapMm} · ${Date.now() - t0}ms`);
  }

  // 4. bileklik: N hesabı + rapor + gram
  {
    const D = caratToCapMm(0.1); // 3.0mm
    const b = await baklaUret(D);
    const r = rapor(178, D, b.hacimMm3, "au14", "pirlanta");
    const beklenenN = Math.round(178 / b.olculer.adimMm);
    check("bileklik raporu (7\", 0.10ct, 14K)",
      r.tasSayisi === beklenenN && r.tasArasiOk && r.metalGram > 1 && r.metalGram < 40
      && Math.abs(r.toplamCt - r.tasSayisi * 0.1) < 1e-9,
      `${r.tasSayisi} taş · toplam ${r.toplamCt.toFixed(2)}ct · metal ${r.metalGram.toFixed(2)}g ` +
      `(${MADENLER.au14.ad}) · uzunluk ${r.uzunlukMm.toFixed(1)}mm · adım ${r.adimMm.toFixed(2)}mm`);
    const rCz = rapor(178, D, b.hacimMm3, "ag925", "cz");
    check("CZ gerçek gram (T4)", rCz.czGercekGram !== null && rCz.czGercekGram! > 0,
      `CZ ${rCz.tasSayisi} taş gerçek ${rCz.czGercekGram?.toFixed(2)}g · gümüş ${rCz.metalGram.toFixed(2)}g`);
  }

  // 5. montaj + STL
  {
    const D = caratToCapMm(0.1);
    const b = await baklaUret(D);
    const { yer, rMm, n } = dizilim(178, D);
    const mont = montajMesh(b.mesh, yer);
    // montaj yarıçap denetimi: tüm vertexlerin radyal mesafesi r..r+H bandında
    let minRad = Infinity, maxRad = 0;
    for (let i = 0; i < mont.positions.length; i += 3) {
      const rad = Math.hypot(mont.positions[i], mont.positions[i + 2]);
      minRad = Math.min(minRad, rad); maxRad = Math.max(maxRad, rad);
    }
    const H = b.olculer.yukseklikMm;
    // bakla köşeleri teğet düzlemde olduğundan minRad r'den biraz küçük olabilir (kiriş) — pay boy/2 kadar
    const pay = b.olculer.boyMm;
    check("montaj: daire bandında + STL",
      n === yer.length && minRad > rMm - pay && maxRad < rMm + H + pay,
      `${n} bakla · r=${rMm.toFixed(1)}mm · radyal bant [${minRad.toFixed(1)}, ${maxRad.toFixed(1)}]`);
    const stl1 = toBinarySTL([b.mesh]);
    const stlN = toBinarySTL([mont]);
    check("STL boyutları", stl1.byteLength === 84 + (b.mesh.indices.length / 3) * 50
      && stlN.byteLength === 84 + (mont.indices.length / 3) * 50,
      `tek bakla ${(stl1.byteLength / 1024).toFixed(0)}KB · komple ${(stlN.byteLength / 1024 / 1024).toFixed(1)}MB`);
  }

  // 6. baklaOlc tutarlılık: mesh üretmeden ölçüler üretimle aynı
  {
    const D = 2.4;
    const o1 = baklaOlc(D);
    const b = await baklaUret(D);
    check("baklaOlc = baklaUret.olculer", JSON.stringify(o1) === JSON.stringify(b.olculer),
      `adım ${o1.adimMm.toFixed(3)}mm`);
  }

  // 7. muma at: grid + saport + raf tek gövde; z bandı doğru
  {
    const D = caratToCapMm(0.1);
    const b = await baklaUret(D);
    const m = mumaAt(b.mesh, b.olculer.boyMm, b.olculer.enMm, 32);
    let minZ = Infinity, maxZ = -Infinity;
    for (let i = 2; i < m.mesh.positions.length; i += 3) {
      minZ = Math.min(minZ, m.mesh.positions[i]);
      maxZ = Math.max(maxZ, m.mesh.positions[i]);
    }
    // raf altı −1.4 · bakla üstü = saport 3.0 + H
    // bakla vertexleri manifold-3d'den float32 gelir — tolerans ona göre
    const okZ = Math.abs(minZ - -1.4) < 1e-4 && Math.abs(maxZ - (3.0 + b.olculer.yukseklikMm)) < 1e-4;
    const stl = toBinarySTL([m.mesh]);
    check("muma at: 32 bakla grid + saport + raf",
      okZ && m.sutun * m.satir >= 32 && m.rafMm[0] > 30 && stl.byteLength > 100000,
      `${m.sutun}×${m.satir} grid · raf ${m.rafMm[0].toFixed(0)}×${m.rafMm[1].toFixed(0)}mm · ` +
      `z [${minZ.toFixed(1)}, ${maxZ.toFixed(1)}] · STL ${(stl.byteLength / 1024 / 1024).toFixed(1)}MB`);
    const duz = duzSiraKonumlar(5, 6);
    check("düz seriliş konumları", duz.length === 5 && duz[0][0] === -12 && duz[4][0] === 12,
      `5 bakla x: ${duz.map((k) => k[0]).join(", ")}`);
  }

  console.log(`\nSONUÇ: ${pass} PASS, ${fail} FAIL`);
  if (fail > 0) process.exitCode = 1;
})();
