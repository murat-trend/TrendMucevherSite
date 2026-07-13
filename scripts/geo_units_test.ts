// Geometri çekirdeği — birim/tolerans KANIT koşusu
// npx tsx scripts/geo_units_test.ts
//
// Amaç: "kütüphanemiz mikrona uygun" sözünü ölçerek ispatlamak.
// Her test gerçek sayı basar; PASS/FAIL kararı adlandırılmış toleranslarla verilir.
import {
  UM, JEWELRY_ENVELOPE_MM, EPS_MM, TOL_POINT_MM, TOL_MEASURE_MM,
  umToMm, mmToUm, eqMm, samePoint, snapUm, pointKey, degToRad,
  f32ErrorMm, fmtMm, fmtUm, fmtAuto, parseLengthMm,
} from "../lib/remaura/geo/units";

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail: string) {
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}\n      ${detail}`);
}

// deterministik sözde-rastgele (koşudan koşuya aynı — tekrarlanabilir kanıt)
let seed = 42;
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
const rndMm = () => (rnd() * 2 - 1) * JEWELRY_ENVELOPE_MM;

// ---- 1. birim dönüşümü gidiş-dönüş: mm -> µm -> mm kayıpsız mı?
{
  let worst = 0;
  for (let i = 0; i < 1_000_000; i++) {
    const x = rndMm();
    worst = Math.max(worst, Math.abs(umToMm(mmToUm(x)) - x));
  }
  check("dönüşüm gidiş-dönüş (1M rastgele değer)", worst <= EPS_MM,
    `en kötü sapma ${(worst / UM).toExponential(2)} µm (izin: ${(EPS_MM / UM).toExponential(1)} µm)`);
}

// ---- 2. float32 (STL) zarfı: takı zarfında en kötü koordinat kaybı
{
  let worst = 0, at = 0;
  for (let i = 0; i < 1_000_000; i++) {
    const x = rndMm();
    const e = f32ErrorMm(x);
    if (e > worst) { worst = e; at = x; }
  }
  // teorik en kötü: 500mm'de ulp/2 ≈ 0.015 µm; ölçtüğümüz bunun altında/civarında olmalı
  check("float32 STL zarf denetimi (|x|<=500mm)", worst < 0.05 * UM,
    `en kötü kayıp ${(worst / UM).toFixed(4)} µm (x=${at.toFixed(1)}mm) — mikron sözünün 1/20'sinden küçük`);
}

// ---- 3. döndürme birikimi: 20mm kolda 3600 x 0.1° = tam tur, kayma ne kadar?
{
  let x = 20, y = 0;
  const c = Math.cos(degToRad(0.1)), s = Math.sin(degToRad(0.1));
  for (let i = 0; i < 3600; i++) { const nx = x * c - y * s; y = x * s + y * c; x = nx; }
  const drift = Math.hypot(x - 20, y - 0);
  check("3600 adımlı tam tur döndürme birikimi (r=20mm)", drift < TOL_POINT_MM,
    `kayma ${(drift / UM).toExponential(2)} µm (izin: nokta toleransı ${TOL_POINT_MM / UM} µm)`);
}

// ---- 4. nokta özdeşliği + mikron ızgarası tutarlılığı
{
  const a: [number, number, number] = [12.3456789, -7.7, 3.001];
  const b: [number, number, number] = [12.3456789 + 0.05 * UM, -7.7, 3.001]; // 0.05µm ötede
  const c: [number, number, number] = [12.3456789 + 2 * UM, -7.7, 3.001];    // 2µm ötede
  const okSame = samePoint(a, b) && pointKey(a) === pointKey(b);
  const okDiff = !samePoint(a, c) && pointKey(a) !== pointKey(c);
  check("nokta özdeşliği: 0.05µm=aynı, 2µm=farklı (ölçüm+hash uyumlu)", okSame && okDiff,
    `key(a)=${pointKey(a)}  key(b)=${pointKey(b)}  key(c)=${pointKey(c)}`);
}

// ---- 5. ızgara oturtma
{
  const snapped = snapUm(0.123456789, 1); // 1µm ızgara
  check("snapUm: 0.123456789mm -> 1µm ızgara", eqMm(snapped, 0.123, EPS_MM),
    `sonuç ${snapped} (beklenen 0.123)`);
}

// ---- 6. ayrıştırma/biçimleme: kuyumcunun yazdığı her biçim aynı mm'ye inmeli
{
  const cases: [string, number | null][] = [
    ["1.25mm", 1.25], ["0,8 mm", 0.8], ["250µm", 0.25], ["250 um", 0.25],
    ["0.85", 0.85], ["1 mikron", 0.001], ["2cm", 20], ["100nm", 0.0001],
    ["abc", null], ["", null], ["1.2.3", null],
  ];
  const bad = cases.filter(([s, want]) => {
    const got = parseLengthMm(s);
    return want === null ? got !== null : got === null || !eqMm(got, want, EPS_MM);
  });
  check("parseLengthMm: 8 geçerli + 3 geçersiz biçim", bad.length === 0,
    bad.length ? `hatalı: ${bad.map(([s]) => s).join(", ")}` :
    `örnek: ${fmtMm(parseLengthMm("250µm")!)} | ${fmtUm(0.25)} | fmtAuto(0.0008)=${fmtAuto(0.0008)}`);
}

// ---- 7. manifold-3d mesh çekirdeği mikrona itaat ediyor mu?
//      1×1×1mm küp hacmi + 1µm'lik büyümenin ölçülebilirliği
(async () => {
  try {
    const Module = (await import("manifold-3d")).default;
    const wasm = await Module();
    wasm.setup();
    const { Manifold } = wasm;
    const cube = Manifold.cube([1, 1, 1], false);
    const vol1 = cube.volume(); // mm3
    const grown = Manifold.cube([1 + UM, 1 + UM, 1 + UM], false);
    const dVol = grown.volume() - vol1;
    const dExact = (1 + UM) ** 3 - 1; // 3ε+3ε²+ε³ — tam matematiksel beklenti
    const okVol = Math.abs(vol1 - 1) < 1e-9;
    const okGrow = Math.abs(dVol - dExact) < 1e-9;
    check("manifold-3d: 1mm3 küp hacmi birebir + 1µm büyüme ölçülebilir", okVol && okGrow,
      `hacim=${vol1} mm3, +1µm kenar -> ΔV=${dVol.toExponential(6)} mm3 (tam beklenti ${dExact.toExponential(6)})`);
    cube.delete(); grown.delete();
  } catch (e) {
    check("manifold-3d yüklenemedi (node ortamı)", false, String(e));
  }
  console.log(`\n${pass} PASS / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
