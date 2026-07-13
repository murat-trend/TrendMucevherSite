// Geometri çekirdeği — TELKARİ ARABESK KOLYE UCU
// GERÇEK MODEL yeniden çizimi (referans: GPT konsept görseli, 2026-07-13 —
// 36×26mm, 14K, ~2.8g hedef). Dış hat ve motif yerleşimi referans fotoğraftan
// GÖZLE ANALİZ edilip kontrol noktası olarak kodlandı; formül değil kopya.
//
// Yapı: 4 cusp'lı arabesk çerçeve (tepe/alt sivri + iki yan gaga) · merkez
// 8 yapraklı rozet + granül · çeyreklerde aynalı spiral dolgu · yan/alt granüller
// · dik askı halkası. v1 DÜZ (lens bombesi sonraki adım).
import { V3 } from "./vec3";
import { Polyline, adaptiveSample } from "./wire";
import { smoothChain, joinLoop, mirrorX, spiralFn } from "./curves";
import { TOL_MEASURE_MM } from "./units";

export type ArabeskParams = {
  heightMm: number;    // gövde boyu (askı hariç), referans 36
  widthMm: number;     // gövde eni, referans 26
  fineDiaMm: number;   // dolgu teli çapı
  frameDiaMm: number;  // çerçeve/askı teli çapı
  tolMm?: number;
};

export type ArabeskWire = { name: string; radiusMm: number; path: Polyline };
export type ArabeskGranule = { name: string; center: V3; radiusMm: number };

// Dış hat — çeyrek kontrol noktaları (birim yükseklik; referanstan okundu).
// Yan cusp y=+0.035'te (referansta gagalar ortanın hafif üstünde).
const HALF_W = 0.361; // 26/36 oranında yarı en
const RT: [number, number][] = [
  [0, 0.5], [0.112, 0.448], [0.228, 0.362], [0.308, 0.248], [0.352, 0.140], [HALF_W, 0.035],
];
const RB: [number, number][] = [
  [HALF_W, 0.035], [0.347, -0.090], [0.302, -0.200], [0.218, -0.310], [0.112, -0.418], [0, -0.5],
];

// Dolgu spiralleri — [cx, cy, dışR, tur, başAçı] (birim uzay, sağ yarı; sol ayna).
const SPIRALS: [number, number, number, number, number][] = [
  [0.155,  0.175, 0.085, 1.9, Math.PI * 0.75],  // üst çeyrek büyük scroll
  [0.165, -0.115, 0.090, 1.9, Math.PI * 1.25],  // alt çeyrek büyük scroll
  [0.270,  0.035, 0.055, 1.7, 0],               // yan gaga kıvrımı
  [0.075,  0.330, 0.055, 1.8, Math.PI * 0.5],   // üst boyun
  [0.035,  0.437, 0.026, 1.5, Math.PI * 0.5],   // tepe minik
  [0.240, -0.050, 0.050, 1.7, Math.PI * 1.5],   // yan-alt kıvrım
  [0.115, -0.270, 0.060, 1.8, Math.PI * 1.4],   // alt boyun
  [0.050, -0.390, 0.034, 1.5, Math.PI * 1.5],   // alt minik
  [0.048,  0.155, 0.045, 1.6, Math.PI * 0.9],   // rozet üstü iç kıvrım
  [0.052, -0.105, 0.045, 1.6, Math.PI * 1.1],   // rozet altı iç kıvrım
  // yoğunlaştırma katmanı (referans dolgu sıklığına yaklaşmak için)
  [0.215,  0.105, 0.046, 1.6, Math.PI],          // üst-yan ara kıvrım
  [0.222, -0.028, 0.044, 1.6, 0],                // yan-alt ara kıvrım
  [0.105,  0.248, 0.050, 1.7, Math.PI * 0.6],    // üst orta dolgu
  [0.158, -0.198, 0.050, 1.7, Math.PI * 1.3],    // alt orta dolgu
  [0.032,  0.252, 0.034, 1.5, Math.PI * 0.5],    // eksen üstü minik
  [0.036, -0.208, 0.034, 1.5, Math.PI * 1.5],    // eksen altı minik
  [0.130,  0.078, 0.036, 1.5, Math.PI * 0.8],    // rozet sağ-üst komşu
  [0.132, -0.018, 0.036, 1.5, Math.PI * 1.2],    // rozet sağ-alt komşu
];

export function buildTelkariArabesk(p: ArabeskParams) {
  const h = p.heightMm;
  const tol = p.tolMm ?? TOL_MEASURE_MM;
  const sx = p.widthMm / (2 * HALF_W * p.heightMm); // en ölçeği (referans oranında ~1)
  const P = (x: number, y: number): V3 => [x * h * sx, y * h, 0];
  const rFine = p.fineDiaMm / 2, rFrame = p.frameDiaMm / 2;
  const wires: ArabeskWire[] = [];
  const granules: ArabeskGranule[] = [];

  // 1) çerçeve: iki pürüzsüz çeyrek + aynaları, cusp'lar keskin birleşir
  const rt = smoothChain(RT.map(([x, y]) => P(x, y)), tol);
  const rb = smoothChain(RB.map(([x, y]) => P(x, y)), tol);
  wires.push({
    name: "çerçeve", radiusMm: rFrame,
    path: joinLoop([rt, rb, mirrorX(rb), mirrorX(rt)]),
  });

  // 2) askı halkası (kolyeye dik düzlem)
  const bailR = 0.07 * h;
  const bailCy = 0.5 * h + bailR * 0.55;
  wires.push({
    name: "askı", radiusMm: rFrame,
    path: adaptiveSample(
      (t) => [bailR * Math.cos(t), bailCy + bailR * Math.sin(t) * 0.35, bailR * Math.sin(t)],
      0, 2 * Math.PI, tol, true),
  });

  // 3) merkez rozet: 8 yaprak (radyal elips halkaları) + merkez granül
  const ROS_C: [number, number] = [0, 0.03];
  const petalR = 0.062, petalA = 0.042, petalB = 0.026;
  for (let k = 0; k < 8; k++) {
    const ang = (Math.PI * 2 * k) / 8;
    const cx = ROS_C[0] + petalR * Math.cos(ang), cy = ROS_C[1] + petalR * Math.sin(ang);
    wires.push({
      name: `yaprak${k + 1}`, radiusMm: rFine,
      path: adaptiveSample((t) => {
        const u = petalA * Math.cos(t), v = petalB * Math.sin(t); // radyal elips
        return P(cx + u * Math.cos(ang) - v * Math.sin(ang), cy + u * Math.sin(ang) + v * Math.cos(ang));
      }, 0, 2 * Math.PI, tol, true),
    });
  }
  granules.push({ name: "rozet-göbek", center: P(ROS_C[0], ROS_C[1]), radiusMm: 0.020 * h });

  // 4) çeyrek dolgu spiralleri (sağ + sol ayna)
  for (const [cx, cy, rr, turns, a0] of SPIRALS) {
    for (const side of [1, -1] as const) {
      wires.push({
        name: `spiral(${side > 0 ? "sağ" : "sol"} ${cy.toFixed(2)})`,
        radiusMm: rFine,
        path: adaptiveSample(
          spiralFn(side * cx * h * sx, cy * h, rr * h, 0.18 * rr * h, turns,
            side > 0 ? a0 : Math.PI - a0, side as 1 | -1),
          0, 1, tol, false),
      });
    }
  }

  // 5) granüller: yan gagalar + alt uç (çerçeveye gömük — lehim)
  const gSide = 0.021 * h, gBottom = 0.025 * h;
  granules.push({ name: "gaga-sağ", center: P(HALF_W + 0.012, 0.035), radiusMm: gSide });
  granules.push({ name: "gaga-sol", center: P(-(HALF_W + 0.012), 0.035), radiusMm: gSide });
  granules.push({ name: "alt-damla", center: [0, (-0.5 - 0.014) * h, 0], radiusMm: gBottom });

  return { wires, granules };
}
