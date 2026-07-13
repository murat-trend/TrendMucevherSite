// Geometri çekirdeği — ÖZGÜN TELKARİ KELEBEK (kırlangıç kuyruklu)
// Fotoğraf kopyası DEĞİL — kendi tasarımımız (2026-07-13, Murat kararları:
// tam açık simetrik duruş · swallowtail · karışık dolgu · sade).
//
// Tasarım ilkesi: kelebek ANATOMİSİ telkari iskeletidir.
//  - Dış hat: gerçek kırlangıç kanat silüeti (costa/termen fistolu/dorsum + kuyruk)
//  - Damarlar: kök (discal) hücresinden yelpaze gibi açılan gerçek damar deseni
//  - Damar arası hücreler: DÖNÜŞÜMLÜ kafes / kendine-uyan spiral (karışık dolgu)
//  - Gövde: baş + thorax + boğumlu karın (torna) · anten: spiral uçlu tel
// Koordinatlar: kanat açıklığı = 1.0 birim (x ±0.5), y yukarı; sağ taraf çizilir,
// sol ayna. Ölçek: wingspanMm.
import { V3, pointSegDist } from "./vec3";
import { Polyline, adaptiveSample } from "./wire";
import { smoothChain, smoothLoop, joinLoop, mirrorX, spiralFn } from "./curves";
import { latticeFill, insetLoops, pointInPoly } from "./fill";
import { latheMesh, GranuleMesh } from "./granule";
import { TOL_MEASURE_MM } from "./units";

export type KelebekOzgunParams = {
  wingspanMm: number;   // kanat açıklığı (soldan sağa)
  fineDiaMm: number;    // dolgu teli (T2); kafes T3 = 0.6×
  frameDiaMm: number;   // çerçeve (T0); damar T1 = 0.73×
  tolMm?: number;
};
export type OzgunWire = { name: string; radiusMm: number; path: Polyline };

type Pt = [number, number];

// ---- ANATOMİK KONTROL NOKTALARI (sağ kanatlar, birim uzay) ----
// Hakem turu 1 (2026-07-13): costa ~20° yukarı + ön kanat baskın · arka kanat
// küçültüldü + ön kanadın altına bindirildi · kuyruk %40 kısa + dışa açık ·
// karın %25 kısa yuvarlak uçlu.
// Ön kanat (forewing) — baskın kanat, apex kökün net üstünde
const FW_ROOT: Pt = [0.030, 0.265];
const FW_COSTA: Pt[] = [FW_ROOT, [0.11, 0.348], [0.24, 0.428], [0.36, 0.472], [0.435, 0.468]]; // -> apex
const FW_MARGIN: Pt[] = [[0.435, 0.468], [0.428, 0.372], [0.402, 0.280], [0.356, 0.192], [0.292, 0.122]]; // apex -> tornus (fisto düğümleri)
const FW_DORSUM: Pt[] = [[0.292, 0.122], [0.16, 0.138], [0.062, 0.190], [0.028, 0.232]]; // tornus -> kök altı
const FW_CELL: Pt[] = [[0.035, 0.265], [0.112, 0.312], [0.185, 0.295], [0.108, 0.245]]; // discal hücre halkası
const FW_CELL_END: Pt = [0.185, 0.295];
// damar: hücre ucundan fisto düğümlerine (ara kontrol noktalı hafif kavis)
const FW_VEINS: Pt[][] = [
  [FW_CELL_END, [0.295, 0.400], [0.435, 0.468]],
  [FW_CELL_END, [0.305, 0.345], [0.428, 0.372]],
  [FW_CELL_END, [0.300, 0.290], [0.402, 0.280]],
  [FW_CELL_END, [0.278, 0.228], [0.356, 0.192]],
  [FW_CELL_END, [0.245, 0.172], [0.292, 0.122]],
];

// Arka kanat (hindwing) — ön kanadın altına bindirir, kırlangıç kuyruklu
const HW_ROOT: Pt = [0.030, 0.168];
const HW_COSTA: Pt[] = [HW_ROOT, [0.11, 0.182], [0.21, 0.158], [0.278, 0.096]]; // -> omuz (ön kanat dorsumuna değer)
const HW_MARGIN: Pt[] = [[0.278, 0.096], [0.305, 0.018], [0.288, -0.058], [0.245, -0.122], [0.186, -0.166]]; // omuz -> kuyruk kökü (fisto)
const HW_TAIL_OUT: Pt[] = [[0.186, -0.166], [0.214, -0.216], [0.235, -0.270]]; // kuyruk: dışa açık, kavisli
const HW_TAIL_IN: Pt[] = [[0.235, -0.270], [0.190, -0.230], [0.155, -0.178]];
const HW_DORSUM: Pt[] = [[0.155, -0.178], [0.072, -0.115], [0.030, -0.012], HW_ROOT];
const HW_CELL: Pt[] = [[0.038, 0.152], [0.105, 0.128], [0.140, 0.058], [0.060, 0.070]];
const HW_CELL_END: Pt = [0.140, 0.058];
const HW_VEINS: Pt[][] = [
  [HW_CELL_END, [0.208, 0.090], [0.278, 0.096]],
  [HW_CELL_END, [0.220, 0.048], [0.305, 0.018]],
  [HW_CELL_END, [0.208, -0.010], [0.288, -0.058]],
  [HW_CELL_END, [0.185, -0.058], [0.245, -0.122]],
  [HW_CELL_END, [0.168, -0.128], [0.235, -0.270]],  // KUYRUK DAMARI (uca kadar iner)
  [HW_CELL_END, [0.096, -0.092], [0.155, -0.178]],
];

// gövde (torna profilleri, [r, y]) — karın kısa, ucu yuvarlak
const ABDOMEN: Pt[] = [[0, 0.195], [0.022, 0.168], [0.026, 0.125], [0.020, 0.058], [0.013, 0.000], [0.008, -0.038], [0, -0.058]];
const THORAX: Pt[] = [[0, 0.315], [0.028, 0.285], [0.031, 0.245], [0.024, 0.205], [0, 0.188]];

export function buildKelebekOzgun(p: KelebekOzgunParams) {
  const S = p.wingspanMm;
  const tol = p.tolMm ?? TOL_MEASURE_MM;
  const P = ([x, y]: Pt): V3 => [x * S, y * S, 0];
  const rT0 = p.frameDiaMm / 2, rT1 = rT0 * 0.73;
  const rT2 = p.fineDiaMm / 2, rT3 = rT2 * 0.6;

  const wires: OzgunWire[] = [];
  const granules: { name: string; center: V3; radiusMm: number }[] = [];
  const solids: { name: string; mesh: GranuleMesh }[] = [];
  const addMirror = (w: OzgunWire) =>
    wires.push(w, { ...w, name: w.name + "-L", path: mirrorX(w.path) });
  const addGranMirror = (name: string, center: V3, r: number) => {
    granules.push({ name, center, radiusMm: r });
    granules.push({ name: name + "-L", center: [-center[0], center[1], center[2]], radiusMm: r });
  };

  // BAĞLANTI BONCUKLARI (v2, Murat: "iç içe döngüler bağlı değil — yerçekimi
  // kanunu"): iç içe halkaların arasına, iki halkaya da gömülen küçük küreler.
  const linkRings = (tag: string, base: Polyline, factors: number[]) => {
    let cx = 0, cy = 0;
    for (const q of base.pts) { cx += q[0]; cy += q[1]; }
    cx /= base.pts.length; cy /= base.pts.length;
    const fs = [1, ...factors];
    for (let k = 0; k + 1 < fs.length; k++) {
      const fmid = (fs[k] + fs[k + 1]) / 2;
      for (const frac of [0.08, 0.41, 0.74]) { // halka çevresinde 3 boncuk
        const q = base.pts[Math.floor(frac * base.pts.length)];
        const dx = q[0] - cx, dy = q[1] - cy;
        const gap = Math.hypot(dx, dy) * (fs[k] - fs[k + 1]);
        addGranMirror(`${tag}-boncuk${k}.${frac}`,
          [cx + dx * fmid, cy + dy * fmid, 0], gap / 2 + rT2 * 0.7);
      }
    }
  };

  // fisto kenarları: düğümler arası hafif dışa tombul ayrı yaylar (hem görsel
  // fisto, hem hücre poligonları için hazır alt-yay)
  const scallopArcs = (nodes: Pt[], bulge: number): Polyline[] => {
    const arcs: Polyline[] = [];
    for (let i = 0; i + 1 < nodes.length; i++) {
      const a = nodes[i], b = nodes[i + 1];
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const L = Math.hypot(dx, dy) || 1;
      const mid: Pt = [mx + (dy / L) * bulge, my - (dx / L) * bulge]; // sağ kanatta dışa
      arcs.push(smoothChain([P(a), P(mid), P(b)], tol));
    }
    return arcs;
  };

  const buildWing = (
    tag: string, costa: Pt[], marginNodes: Pt[], tailOut: Pt[] | null, tailIn: Pt[] | null,
    dorsum: Pt[], cell: Pt[], veins: Pt[][],
  ) => {
    const costaC = smoothChain(costa.map(P), tol);
    const marginArcs = scallopArcs(marginNodes, 0.012);
    const tailChains = tailOut && tailIn
      ? [smoothChain(tailOut.map(P), tol), smoothChain(tailIn.map(P), tol)] : [];
    const dorsumC = smoothChain(dorsum.map(P), tol);
    const outline = joinLoop([costaC, ...marginArcs, ...tailChains, dorsumC]);
    addMirror({ name: `${tag}-çerçeve`, radiusMm: rT0, path: outline });

    // discal hücre + konsantrik içler
    const cellLoop = smoothLoop(cell.map(P), tol);
    addMirror({ name: `${tag}-hücre`, radiusMm: rT1, path: cellLoop });
    insetLoops(cellLoop, [0.62, 0.30]).forEach((l, i) =>
      addMirror({ name: `${tag}-hücre-iç${i + 1}`, radiusMm: rT2, path: l }));
    linkRings(`${tag}-hücre`, cellLoop, [0.62, 0.30]); // halkalar boncukla bağlanır

    // damarlar
    const veinChains = veins.map((v) => smoothChain(v.map(P), tol));
    veinChains.forEach((vc, i) => addMirror({ name: `${tag}-damar${i + 1}`, radiusMm: rT1, path: vc }));

    // hücre poligonları: damar_i + kenar yayı + ters(damar_{i+1})
    const marginAll = [...marginArcs, ...tailChains];
    for (let i = 0; i + 1 < veinChains.length && i < marginAll.length; i++) {
      const poly: V3[] = [
        ...veinChains[i].pts,
        ...marginAll[i].pts.slice(1),
        ...[...veinChains[i + 1].pts].reverse().slice(1),
      ];
      fillCell(`${tag}-hücre${i + 1}`, poly, i % 2 === 0);
    }
    // costa bandı (üst kenar ile ilk damar arası) — kafes, discal hücre delik
    fillCell(`${tag}-costa`,
      [...costaC.pts, ...[...veinChains[0].pts].reverse().slice(1)], true, [cellLoop.pts]);
    // dorsum bandı (son damar ile iç kenar arası) — spiral (discal hücre delik:
    // kapanış kenarı hücreden geçer, spiral ona çarpmasın)
    fillCell(`${tag}-dorsum`,
      [...veinChains[veinChains.length - 1].pts, ...dorsumC.pts.slice(1)], false, [cellLoop.pts]);
  };

  // hücre dolgusu: dönüşümlü kafes / kendine-uyan spiral (karışık dolgu kararı)
  const fillCell = (tag: string, poly: V3[], useLattice: boolean, holes: V3[][] = []) => {
    if (useLattice) {
      latticeFill(poly, holes, 0.021 * S, 45, 0.5).forEach((seg, i) =>
        addMirror({ name: `${tag}-kafes${i}`, radiusMm: rT3, path: seg }));
    } else {
      // AKILLI YERLEŞİM (v2, Murat: "parçalar birbirini kesmiş"): hücre bbox'ında
      // ızgara araması — tüm kenarlara VE deliklere en uzak nokta spiral merkezi
      // olur; yarıçap o mesafeyi aşamaz -> kesişme kökten imkânsız.
      const edgeDist = (x: number, y: number): number => {
        let d = Infinity;
        const rings = [poly, ...holes];
        for (const ring of rings)
          for (let i = 0; i < ring.length; i++)
            d = Math.min(d, pointSegDist([x, y, 0], ring[i], ring[(i + 1) % ring.length]));
        return d;
      };
      const xsAll = poly.map((q) => q[0]), ysAll = poly.map((q) => q[1]);
      const x0 = Math.min(...xsAll), x1 = Math.max(...xsAll);
      const y0 = Math.min(...ysAll), y1 = Math.max(...ysAll);
      let cx = 0, cy = 0, best = -1;
      const N = 18;
      for (let i = 1; i < N; i++) {
        for (let j = 1; j < N; j++) {
          const x = x0 + ((x1 - x0) * i) / N, y = y0 + ((y1 - y0) * j) / N;
          if (!pointInPoly(x, y, poly)) continue;
          if (holes.some((h) => pointInPoly(x, y, h))) continue;
          const d = edgeDist(x, y);
          if (d > best) { best = d; cx = x; cy = y; }
        }
      }
      const r = best - rT2 * 0.2; // yakın kenarlara hafif gömülür (1. lehim teması)
      if (r < 0.006 * S) return;
      // dış uç, hücrenin en uzak köşesine baksın; oradan LEHİM KUYRUĞU çekilir
      // (2. temas — hakem kuralı: havada spiral yasak, üretilemez)
      let far = poly[0], fd = 0;
      for (const q of poly) {
        const dd = Math.hypot(q[0] - cx, q[1] - cy);
        if (dd > fd) { fd = dd; far = q; }
      }
      const a0 = Math.atan2(far[1] - cy, far[0] - cx);
      addMirror({
        name: `${tag}-spiral`, radiusMm: rT2,
        path: adaptiveSample(spiralFn(cx, cy, r, 0.16 * r, 2.2, a0, 1), 0, 1, tol, false),
      });
      addMirror({
        name: `${tag}-spiral-kuyruk`, radiusMm: rT2,
        path: { pts: [[cx + r * Math.cos(a0), cy + r * Math.sin(a0), 0], far], closed: false },
      });
    }
  };

  buildWing("ön", FW_COSTA, FW_MARGIN, null, null, FW_DORSUM, FW_CELL, FW_VEINS);
  buildWing("arka", HW_COSTA, HW_MARGIN, HW_TAIL_OUT, HW_TAIL_IN, HW_DORSUM, HW_CELL, HW_VEINS);

  // ZAR YAMALARI (v2, Murat: "kanat arası boşluklar göze hitap etmez") —
  // kelebek zarının olduğu boşluklara ince, farklı açılı kafes gerilir
  const MEMBRANES: Pt[][] = [
    [[0.225, 0.140], [0.292, 0.122], [0.278, 0.096], [0.21, 0.158]],   // koltukaltı: ön-arka kanat arası
    [[0.020, 0.015], [0.034, -0.012], [0.078, -0.118], [0.012, -0.055]], // gövde yanı: karın-arka kanat arası
  ];
  MEMBRANES.forEach((ptsN, mi) => {
    latticeFill(ptsN.map(P), [], 0.011 * S, 0, 0.3).forEach((seg, i) =>
      addMirror({ name: `zar${mi + 1}-${i}`, radiusMm: rT3, path: seg }));
  });

  // gövde: baş (küre) + thorax + boğumlu karın (torna)
  solids.push({ name: "karın", mesh: latheMesh(ABDOMEN.map(([r, y]) => [r * S, y * S] as Pt), [0, 0, 0], tol) });
  solids.push({ name: "thorax", mesh: latheMesh(THORAX.map(([r, y]) => [r * S, y * S] as Pt), [0, 0, 0], tol) });
  granules.push({ name: "baş", center: [0, 0.335 * S, 0], radiusMm: 0.024 * S });

  // gizli askı halkaları: costa üzerinde simetrik iki nokta (hakem #4 —
  // geniş parça iki-nokta askıyla düz durur); halka düzlemi yz (kordon x yönünde geçer)
  for (const side of [1, -1] as const) {
    const bx = 0.145 * side * S, by = 0.383 * S, br = 0.016 * S;
    wires.push({
      name: `askı-halka${side > 0 ? "R" : "L"}`, radiusMm: rT1,
      path: adaptiveSample(
        (t) => [bx, by + br * Math.cos(t), br * Math.sin(t)], 0, 2 * Math.PI, tol, true),
    });
  }

  // antenler: baştan yukarı-dışa hafif S-kavisli tel + uçta spiral topuz
  for (const side of [1, -1] as const) {
    wires.push({
      name: `anten${side > 0 ? "R" : "L"}`, radiusMm: rT2,
      path: smoothChain([
        [0.010 * side * S, 0.345 * S, 0], [0.030 * side * S, 0.392 * S, 0],
        [0.062 * side * S, 0.422 * S, 0], [0.095 * side * S, 0.452 * S, 0],
      ], tol),
    });
    wires.push({
      name: `anten-topuz${side > 0 ? "R" : "L"}`, radiusMm: rT2,
      path: adaptiveSample(
        spiralFn(0.104 * side * S, 0.462 * S, 0.014 * S, 0.003 * S, 1.6, side > 0 ? Math.PI * 1.25 : -Math.PI * 0.25, side), 0, 1, tol, false),
    });
  }

  return { wires, granules, solids };
}
