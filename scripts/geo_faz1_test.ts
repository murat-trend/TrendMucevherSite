// Faz 1 KANIT koşusu: burgu tel + kırılganlık analizi + tek gövde birleşim
// npx tsx scripts/geo_faz1_test.ts
import { UM, mmToUm } from "../lib/remaura/geo/units";
import { V3 } from "../lib/remaura/geo/vec3";
import { sweepWire, sweepTwistedWire } from "../lib/remaura/geo/wire";
import { measureWire, meshVolumeMm3, edgeManifoldReport } from "../lib/remaura/geo/measure";
import { analyzeSpans } from "../lib/remaura/geo/analyze";
import { unionMeshes } from "../lib/remaura/geo/union";

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail: string) {
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}\n      ${detail}`);
}

(async () => {
  // ---- 1. BURGU: düz omurga, 0.60mm toplam çap, 2 damar
  {
    const D = 0.6;
    const path = { pts: [[0, 0, 0], [12, 0, 0]] as V3[], closed: false };
    const strands = sweepTwistedWire(path, D, { pitchMm: 1.8 });
    const rBek = D / 4; // 2 damar: r = D/(2(1+1/sin(π/2))) = D/4
    let worstErr = 0, manOk = true, maxOrbit = 0, minZ = 0, maxZ = 0;
    for (const st of strands) {
      const meas = measureWire(st.mesh, st.path);
      worstErr = Math.max(worstErr, Math.abs(meas.requestedDiaMm - 2 * rBek), meas.worstCircumErrUm / 1000);
      if (!edgeManifoldReport(st.mesh.indices).ok) manOk = false;
      for (const p of st.path.pts) {
        maxOrbit = Math.max(maxOrbit, Math.hypot(p[1], p[2]));
        minZ = Math.min(minZ, p[2]); maxZ = Math.max(maxZ, p[2]);
      }
    }
    check("burgu: 2 damar, damar çapı birebir + manifold", manOk && worstErr < 1e-6,
      `damar çapı ${2 * rBek}mm (=D/2), en kötü sapma ${mmToUm(worstErr).toExponential(2)}µm`);
    // örnekler tepe noktasına tam oturmayabilir (yay-adımı ≠ faz tepesi) — tolerans örnekleme payı
    const orn = (D / 4) * (1 - Math.cos(Math.PI / 16)); // ~örnekleme sapması üst sınırı
    check("burgu: yörünge yarıçapı = a = D/4 ve z salınımı tam",
      Math.abs(maxOrbit - D / 4) < 1e-9 && D / 4 - maxZ < orn + 1e-9 && D / 4 + minZ < orn + 1e-9,
      `yörünge ${maxOrbit.toFixed(4)}mm (beklenen ${(D / 4).toFixed(4)}), z ∈ [${minZ.toFixed(4)}, ${maxZ.toFixed(4)}] (örnekleme payı ${orn.toFixed(4)})`);
    // pitch doğrulaması: damar z'si pitch başına bir tam salınım yapar
    const st0 = strands[0].path.pts;
    let crossings = 0;
    for (let i = 1; i < st0.length; i++) if (st0[i - 1][2] * st0[i][2] < 0) crossings++;
    const beklenen = Math.round((12 / 1.8) * 2); // tur başına 2 sıfır geçişi
    check("burgu: pitch yay uzunluğuna sadık (sıfır geçiş sayımı)",
      Math.abs(crossings - beklenen) <= 1,
      `z sıfır geçişi ${crossings} (beklenen ~${beklenen}, pitch 1.8mm / 12mm omurga)`);
  }

  // ---- 2. YASSILAŞTIRMA: flattenZ=0.5 -> z amplitüdü yarıya iner
  {
    const path = { pts: [[0, 0, 0], [12, 0, 0]] as V3[], closed: false };
    const strands = sweepTwistedWire(path, 0.6, { pitchMm: 1.8, flattenZ: 0.5 });
    let maxZ = 0, maxY = 0;
    for (const p of strands[0].path.pts) {
      maxZ = Math.max(maxZ, Math.abs(p[2]));
      maxY = Math.max(maxY, Math.abs(p[1]));
    }
    check("yassılaştırma: z amplitüdü yarıya indi, genişlik korundu",
      Math.abs(maxZ - 0.075) < 3e-3 && Math.abs(maxY - 0.15) < 3e-3,
      `z ${maxZ.toFixed(4)}mm (beklenen 0.0750), y ${maxY.toFixed(4)}mm (beklenen 0.1500)`);
  }

  // ---- 3. KIRILGANLIK: temassız tel = riskli; çapraz temaslı tel = güvenli
  {
    const uzun = { pts: [[0, 0, 0], [10, 0, 0]] as V3[], radiusMm: 0.35 };   // havada (0.7mm çap — çap kuralı temiz)
    const uzak = { pts: [[0, 5, 0], [10, 5, 0]] as V3[], radiusMm: 0.35 };   // o da havada
    const { verdicts: v1 } = analyzeSpans([uzun, uzak]);
    // aynı teller + onları 1mm'de bir kesen 11 destek teli
    const destekler = Array.from({ length: 11 }, (_, i) => ({
      pts: [[i, -1, 0], [i, 6, 0]] as V3[], radiusMm: 0.35,
    }));
    const { verdicts: v2 } = analyzeSpans([uzun, uzak, ...destekler]);
    check("analiz: havada tel RİSKLİ, desteklenince GÜVENLİ",
      v1[0].level === 2 && v1[1].level === 2 && v2[0].level === 0 && v2[1].level === 0,
      `havada: L/d ${v1[0].ratio.toFixed(0)} (seviye ${v1[0].level}) -> destekli: L/d ${v2[0].ratio.toFixed(1)} (seviye ${v2[0].level}, ${v2[0].supports} temas)`);
  }

  // ---- 4. UNION: kesişen iki dik tüp -> tek manifold gövde, hacim < toplam
  {
    const t1 = sweepWire({ pts: [[-3, 0, 0], [3, 0, 0]] as V3[], closed: false }, 0.4);
    const t2 = sweepWire({ pts: [[0, -3, 0], [0, 3, 0]] as V3[], closed: false }, 0.4);
    const vAyri = meshVolumeMm3(t1.positions, t1.indices) + meshVolumeMm3(t2.positions, t2.indices);
    const u = await unionMeshes([t1, t2]);
    const man = edgeManifoldReport(u.indices);
    const vUnionMesh = meshVolumeMm3(u.positions, u.indices);
    check("union: tek gövde manifold + hacim kesişim kadar azaldı",
      man.ok && u.atlanan === 0 && u.volumeMm3 < vAyri - 0.05 && Math.abs(vUnionMesh - u.volumeMm3) < 0.01,
      `ayrı ${vAyri.toFixed(3)}mm³ -> birleşik ${u.volumeMm3.toFixed(3)}mm³ (mesh'ten ${vUnionMesh.toFixed(3)}), açık kenar ${man.boundaryEdges}`);
  }

  console.log(`\n${pass} PASS / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();

void UM;
