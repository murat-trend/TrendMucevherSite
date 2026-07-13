// Geometri çekirdeği — TELKARİ KELEBEK (gerçek model, koç reçetesinden)
// Girdi: Desktop/Telkari/kelebek_recete.md (koç ajanı analizi, 2026-07-13)
// + kelebek_dishat.json (piksel silüet). Koordinatlar reçetenin normalize
// uzayından ([-0.5,0.5]², y yukarı; x genişlikle, y boyla ölçeklenir).
//
// v1 SADELEŞTİRMELERİ (adım adım ilkesi — Murat 2026-07-13): yassı şerit yerine
// yuvarlak tel · yelpaze-ilmek dizileri yok · damla pavé yerine düz torna gövde ·
// dut-rozetler tek granül · kanca yok. Koç hakemliğinde turlarla zenginleşecek.
import { V3 } from "./vec3";
import { Polyline, adaptiveSample } from "./wire";
import { smoothChain, smoothLoop, mirrorX, spiralFn } from "./curves";
import { latticeFill, insetLoops } from "./fill";
import { latheMesh, GranuleMesh } from "./granule";
import { TOL_MEASURE_MM } from "./units";

export type KelebekParams = {
  heightMm: number;    // gövde boyu (damla dahil), genişlik = boy × 1.0305
  fineDiaMm: number;   // T2 dolgu teli (T1/T3 bundan türer)
  frameDiaMm: number;  // T0 çerçeve
  tolMm?: number;
};
export type KelebekWire = { name: string; radiusMm: number; path: Polyline };

const ASPECT = 1.0305; // piksel silüetten (kelebek_dishat.json)

// --- reçete kontrol noktaları (normalize; SOL taraf otorite, sağ ayna) ---
const CROWN: [number, number][] = [
  [0, 0.50], [0.05, 0.46], [0.11, 0.40], [0.14, 0.32], [0.11, 0.26], [0.06, 0.23],
  [0, 0.22], [-0.06, 0.23], [-0.11, 0.26], [-0.14, 0.32], [-0.11, 0.40], [-0.05, 0.46],
];
const FOREWING_L: [number, number][] = [
  [-0.49, 0.36], [-0.40, 0.43], [-0.26, 0.46], [-0.18, 0.44], [-0.12, 0.40],
  [-0.12, 0.27], [-0.20, 0.04], [-0.24, 0.07], [-0.31, 0.05], [-0.37, 0.17],
  [-0.45, 0.11], [-0.47, 0.20], [-0.50, 0.30],
];
const HINDWING_L: [number, number][] = [
  [-0.18, -0.03], [-0.30, -0.07], [-0.36, -0.15], [-0.34, -0.28], [-0.29, -0.38],
  [-0.26, -0.44], [-0.18, -0.40], [-0.12, -0.37], [-0.08, -0.28], [-0.06, -0.22],
  [-0.10, -0.10],
];
const PAISLEY_L: [number, number][] = [
  [-0.40, 0.37], [-0.29, 0.41], [-0.15, 0.34], [-0.08, 0.25], [-0.25, 0.26], [-0.36, 0.31],
];
// [cx, cy, r, tur, a0] — sol taraf spiralleri
const SPIRALS_L: [number, number, number, number, number][] = [
  [-0.05, 0.41, 0.022, 1.5, Math.PI * 0.5],   // taç kalp gözü
  [-0.09, 0.29, 0.022, 2.0, Math.PI * 1.2],   // taç köşe
  [-0.37, 0.17, 0.040, 2.5, Math.PI * 0.9],   // ön kanat büyük
  [-0.26, 0.07, 0.022, 1.5, Math.PI * 1.5],   // ön kanat kök scroll
  [-0.26, -0.10, 0.020, 2.0, Math.PI * 0.3],  // arka kanat üst
  [-0.17, -0.18, 0.025, 2.0, Math.PI * 0.8],  // arka kanat orta
  [-0.11, -0.25, 0.020, 2.0, Math.PI * 1.3],  // arka kanat alt
];

export function buildTelkariKelebek(p: KelebekParams) {
  const H = p.heightMm, W = H * ASPECT;
  const tol = p.tolMm ?? TOL_MEASURE_MM;
  const P = (x: number, y: number): V3 => [x * W, y * H, 0];
  const scalePts = (pts: [number, number][]) => pts.map(([x, y]) => P(x, y));
  // tel kademeleri (reçete oranları: T1=0.73·T0, T3=0.3·T0; T2 kullanıcıda)
  const rT0 = p.frameDiaMm / 2, rT2 = p.fineDiaMm / 2;
  const rT1 = rT0 * 0.73;
  const rT3 = rT0 * 0.3;

  const wires: KelebekWire[] = [];
  const granules: { name: string; center: V3; radiusMm: number }[] = [];
  const solids: { name: string; mesh: GranuleMesh }[] = [];
  const addMirror = (w: KelebekWire) =>
    wires.push(w, { ...w, name: w.name + "-R", path: mirrorX(w.path) });

  // 1) T0 çerçeveler + T1 astar (liner kuralı)
  const crown = smoothLoop(scalePts(CROWN), tol);
  wires.push({ name: "taç", radiusMm: rT0, path: crown });
  wires.push({ name: "taç-astar", radiusMm: rT1, path: insetLoops(crown, [0.90])[0] });
  const foreL = smoothLoop(scalePts(FOREWING_L), tol);
  const hindL = smoothLoop(scalePts(HINDWING_L), tol);
  addMirror({ name: "ön-kanat", radiusMm: rT0, path: foreL });
  addMirror({ name: "ön-kanat-astar", radiusMm: rT1, path: insetLoops(foreL, [0.94])[0] });
  addMirror({ name: "arka-kanat", radiusMm: rT0, path: hindL });
  addMirror({ name: "arka-kanat-astar", radiusMm: rT1, path: insetLoops(hindL, [0.92])[0] });

  // 2) paisley hücresi + iç ilmekleri + göz halkası
  const paisley = smoothLoop(scalePts(PAISLEY_L), tol);
  addMirror({ name: "paisley", radiusMm: rT1, path: paisley });
  insetLoops(paisley, [0.72, 0.47, 0.24]).forEach((loop, i) =>
    addMirror({ name: `paisley-ic${i + 1}`, radiusMm: rT2, path: loop }));
  addMirror({
    name: "göz-halkası", radiusMm: rT2,
    path: adaptiveSample((t) => {
      const c = P(-0.33, 0.34);
      return [c[0] + 0.012 * W * Math.cos(t), c[1] + 0.012 * W * Math.sin(t), 0];
    }, 0, 2 * Math.PI, tol, true),
  });

  // 3) spiraller (sol + ayna)
  for (const [cx, cy, rr, turns, a0] of SPIRALS_L) {
    addMirror({
      name: `spiral(${cx.toFixed(2)},${cy.toFixed(2)})`, radiusMm: rT1,
      path: adaptiveSample(spiralFn(cx * W, cy * H, rr * W, 0.18 * rr * W, turns, a0, -1), 0, 1, tol, false),
    });
  }
  // arka kanat damla hücreleri (spiral eşlikçileri)
  for (const [cx, cy] of [[-0.21, -0.14], [-0.14, -0.22]] as const) {
    const ang = -Math.PI / 4;
    const loop = adaptiveSample((t) => {
      const u = 0.020 * W * Math.cos(t), v = 0.014 * W * Math.sin(t);
      return [cx * W + u * Math.cos(ang) - v * Math.sin(ang), cy * H + u * Math.sin(ang) + v * Math.cos(ang), 0];
    }, 0, 2 * Math.PI, tol, true);
    addMirror({ name: `damla-hücre(${cy})`, radiusMm: rT2, path: loop });
    addMirror({ name: `damla-hücre-iç(${cy})`, radiusMm: rT2, path: insetLoops(loop, [0.5])[0] });
  }

  // 4) kafes dolgular (T3): ön kanat (paisley delikli), arka kanat
  const cellF = 0.014 * H, cellH = 0.017 * H;
  latticeFill(foreL.pts, [paisley.pts], cellF, 45).forEach((seg, i) => {
    addMirror({ name: `ön-kafes${i}`, radiusMm: rT3, path: seg });
  });
  latticeFill(hindL.pts, [], cellH, 45).forEach((seg, i) => {
    addMirror({ name: `arka-kafes${i}`, radiusMm: rT3, path: seg });
  });

  // 5) bib (V-çevron) rayları + iç hatları
  for (const side of [1, -1] as const) {
    wires.push({
      name: `bib-ray${side > 0 ? "R" : "L"}`, radiusMm: rT1,
      path: smoothChain([P(0.09 * side, -0.12), P(0.05 * side, -0.185), P(0, -0.26)], tol),
    });
    wires.push({
      name: `bib-iç${side > 0 ? "R" : "L"}`, radiusMm: rT2,
      path: smoothChain([P(0.06 * side, -0.135), P(0, -0.215)], tol),
    });
  }

  // 6) merkez çiçek (0, +0.02): 2 yaprak halkası + granül/inci halkaları
  const FC = P(0, 0.02);
  const petalRing = (count: number, phase: number, base: number, tip: number, b: number, rWire: number, tag: string) => {
    for (let k = 0; k < count; k++) {
      const ang = phase + (2 * Math.PI * k) / count;
      const mid = ((base + tip) / 2) * H, a = ((tip - base) / 2) * H, bb = b * H;
      const loop = adaptiveSample((t) => {
        const u = mid + a * Math.cos(t), v = bb * Math.sin(t);
        return [FC[0] + u * Math.cos(ang) - v * Math.sin(ang), FC[1] + u * Math.sin(ang) + v * Math.cos(ang), 0];
      }, 0, 2 * Math.PI, tol, true);
      wires.push({ name: `${tag}${k + 1}`, radiusMm: rWire, path: loop });
      wires.push({ name: `${tag}${k + 1}-iç`, radiusMm: rT2, path: insetLoops(loop, [0.55])[0] });
    }
  };
  petalRing(12, Math.PI / 2, 0.10, 0.17, 0.021, rT1, "iç-yaprak");
  petalRing(12, Math.PI / 2 + Math.PI / 12, 0.13, 0.225, 0.028, rT1, "dış-yaprak");
  granules.push({ name: "çiçek-merkez", center: FC, radiusMm: 0.019 * H });
  for (let k = 0; k < 9; k++) {
    const a = (2 * Math.PI * k) / 9;
    granules.push({ name: `granül-halka${k}`, center: [FC[0] + 0.041 * H * Math.cos(a), FC[1] + 0.041 * H * Math.sin(a), 0], radiusMm: 0.012 * H });
  }
  for (let k = 0; k < 12; k++) {
    const a = Math.PI / 2 + (2 * Math.PI * k) / 12;
    granules.push({ name: `rozet${k}`, center: [FC[0] + 0.077 * H * Math.cos(a), FC[1] + 0.077 * H * Math.sin(a), 0], radiusMm: 0.016 * H });
    granules.push({ name: `inci${k}`, center: [FC[0] + 0.155 * H * Math.cos(a), FC[1] + 0.155 * H * Math.sin(a), 0], radiusMm: 0.016 * H });
  }

  // 7) sallantı: halka + torna damla (v1 düz gövde, pavé sonraki tur)
  wires.push({
    name: "sallantı-halka", radiusMm: rT2,
    path: adaptiveSample((t) => [0.025 * W * Math.cos(t), -0.29 * H + 0.025 * W * Math.sin(t), 0], 0, 2 * Math.PI, tol, true),
  });
  solids.push({
    name: "damla",
    mesh: latheMesh([
      [0, -0.352 * H], [0.012 * W, -0.365 * H], [0.030 * W, -0.385 * H],
      [0.052 * W, -0.410 * H], [0.068 * W, -0.435 * H], [0.065 * W, -0.462 * H],
      [0.045 * W, -0.483 * H], [0, -0.5 * H],
    ].map(([r, y]) => [r, y] as [number, number]), [0, 0, 0], tol),
  });

  return { wires, granules, solids };
}
