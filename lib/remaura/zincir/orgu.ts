// ZİNCİR MOTORU — ÖRGÜ SÜPÜRME (K5: halat/spiga masif yorumu)
// Damarlar zincir ekseni (x) etrafında helis sarar; damarlar birbirine
// TELKARI §1.6 gömme oranıyla gömülüdür → union'da tek gövde, döküm sağlam.
// Gerçek örme halat/spiga makine işidir (K2) — bu, burma geleneğindeki
// MASİF döküm yorumudur; UI rozetle belirtir.
//
// Damar yolu (halat):  P(s) = [s, rH·cos(θ+φk), rH·sin(θ+φk)], θ = 2πs/P
// Damar yolu (spiga):  ana helise İKİNCİL kıvrım eklenir (süper-helis) —
//                      başak dokusunun CAD yaklaşığı (S/K5, KALİBRE).
import { BaklaMesh, isaretliHacim } from "./bakla";
import { ORGU } from "./kurallar";

export type OrguTip = keyof typeof ORGU; // "halat" | "spiga"

export type OrguBilgi = {
  damarCapMm: number;
  damarSayisi: number;
  pitchMm: number;
  disCapMm: number;    // gerçekleşen dış çap
  damarBoyMm: number;  // tek damar yay uzunluğu (gram tahmini için)
};

const TOL_MM = 0.03;

/** Örgü ölçüleri: W dış görünüm çapıdır; damar çapı ve sarım yarıçapı türer. */
export function orguOlc(tip: OrguTip, disCapMm: number, uzunlukMm: number): OrguBilgi {
  const k = ORGU[tip];
  // n damar çevrede dizilir: yerleşim yarıçapı rH'de merkezler; komşu
  // damarlar gömme kadar iç içe: merkez aralığı = dd·(1−gömme).
  // Dış çap sözü: 2·(rH + dd/2) = W  ve  2·rH·sin(π/n) = dd·(1−gömme)
  const sinN = Math.sin(Math.PI / k.damar);
  // rH = dd(1−g)/(2 sin(π/n))  ve  W = 2rH + dd  →  dd = W / (1 + (1−g)/sin(π/n))
  const damarCap = disCapMm / (1 + (1 - k.gomme) / sinN);
  const rH = (disCapMm - damarCap) / 2;
  const pitch = k.pitchOran * disCapMm;
  // helis yay boyu: L·√(1 + (2π·rH/P)²)
  const damarBoy = uzunlukMm * Math.sqrt(1 + Math.pow((2 * Math.PI * rH) / pitch, 2));
  return { damarCapMm: damarCap, damarSayisi: k.damar, pitchMm: pitch, disCapMm, damarBoyMm: damarBoy };
}

/** Tek damar tüp mesh'i (kapalı uçlu — uçlarda yarım küre kapak yerine
 *  disk fan; hacim için yeterli, uçlar kilit bölgesinde kesilecek). */
function damarTube(
  uzunlukMm: number, rH: number, pitchMm: number, rTel: number,
  fazRad: number, ikincil: { oran: number; tur: number } | null,
): BaklaMesh {
  // örnekleme: helis eğrilik yarıçapı ρ = rH·(1+(P/2πrH)²); kiriş ≤ tol
  const omega = (2 * Math.PI) / pitchMm;
  const rho = rH > 1e-9 ? rH * (1 + Math.pow(1 / (omega * rH), 2)) : 1e9;
  const hAdim = Math.sqrt(8 * Math.max(0.2, rho) * TOL_MM);
  const N = Math.max(48, Math.ceil(uzunlukMm / Math.min(hAdim, pitchMm / 16)));
  const nC = Math.max(12, Math.min(24, Math.ceil(Math.PI / Math.acos(Math.max(-1, 1 - TOL_MM / rTel)))));
  const rP = rTel * Math.sqrt((2 * Math.PI / nC) / Math.sin((2 * Math.PI) / nC));

  // yol noktaları + analitik teğet çerçevesi
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const x = (i / N) * uzunlukMm;
    const th = omega * x + fazRad;
    let y = rH * Math.cos(th), z = rH * Math.sin(th);
    if (ikincil) {
      // süper-helis: ana yol üstüne küçük ikincil kıvrım (spiga başağı)
      const th2 = ikincil.tur * th;
      y += ikincil.oran * rTel * Math.cos(th2);
      z += ikincil.oran * rTel * Math.sin(th2);
    }
    pts.push([x, y, z]);
  }

  const rings = N + 1;
  const positions = new Float64Array((rings * nC + 2) * 3);
  for (let i = 0; i <= N; i++) {
    const im = Math.max(0, i - 1), ip = Math.min(N, i + 1);
    let tx = pts[ip][0] - pts[im][0], ty = pts[ip][1] - pts[im][1], tz = pts[ip][2] - pts[im][2];
    const tl = Math.hypot(tx, ty, tz) || 1;
    tx /= tl; ty /= tl; tz /= tl;
    // çerçeve: radyal-yakın normal (helis için kararlı): n0 = radyal (0,y,z)
    let ny = pts[i][1], nz = pts[i][2];
    const nl = Math.hypot(ny, nz) || 1;
    ny /= nl; nz /= nl;
    // Gram-Schmidt: n = n0 − (n0·t)t
    const dt = ny * ty + nz * tz;
    let ux = -dt * tx, uy = ny - dt * ty, uz = nz - dt * tz;
    const ul = Math.hypot(ux, uy, uz) || 1;
    ux /= ul; uy /= ul; uz /= ul;
    // b = t × u
    const bx = ty * uz - tz * uy, by = tz * ux - tx * uz, bz = tx * uy - ty * ux;
    for (let j = 0; j < nC; j++) {
      const ph = (j / nC) * 2 * Math.PI;
      const cu = Math.cos(ph) * rP, cv = Math.sin(ph) * rP;
      const k = (i * nC + j) * 3;
      positions[k] = pts[i][0] + ux * cu + bx * cv;
      positions[k + 1] = pts[i][1] + uy * cu + by * cv;
      positions[k + 2] = pts[i][2] + uz * cu + bz * cv;
    }
  }
  // uç kapak merkezleri
  const c0 = rings * nC, c1 = rings * nC + 1;
  positions[c0 * 3] = pts[0][0]; positions[c0 * 3 + 1] = pts[0][1]; positions[c0 * 3 + 2] = pts[0][2];
  positions[c1 * 3] = pts[N][0]; positions[c1 * 3 + 1] = pts[N][1]; positions[c1 * 3 + 2] = pts[N][2];

  const indices = new Uint32Array(N * nC * 6 + 2 * nC * 3);
  let w = 0;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < nC; j++) {
      const jp = (j + 1) % nC;
      const a = i * nC + j, b = (i + 1) * nC + j, c = (i + 1) * nC + jp, e = i * nC + jp;
      indices[w++] = a; indices[w++] = b; indices[w++] = c;
      indices[w++] = a; indices[w++] = c; indices[w++] = e;
    }
  }
  for (let j = 0; j < nC; j++) {
    const jp = (j + 1) % nC;
    // kapak sarımı duvarla ZIT yönde olmalı (paylaşılan kenar iki üçgende
    // ters yönde gezilir — manifold şartı)
    indices[w++] = c0; indices[w++] = j; indices[w++] = jp;                       // baş kapak
    indices[w++] = c1; indices[w++] = N * nC + jp; indices[w++] = N * nC + j;     // son kapak
  }
  const mesh: BaklaMesh = { positions, indices };
  if (isaretliHacim(mesh) < 0) {
    for (let t = 0; t < indices.length; t += 3) {
      const tmp = indices[t + 1];
      indices[t + 1] = indices[t + 2];
      indices[t + 2] = tmp;
    }
  }
  return mesh;
}

/** Tüm damarların mesh'leri (union islem.ts'te — WASM oradan yönetilir). */
export function buildOrguDamarlar(tip: OrguTip, disCapMm: number, uzunlukMm: number): {
  damarlar: BaklaMesh[];
  bilgi: OrguBilgi;
} {
  const k = ORGU[tip];
  const o = orguOlc(tip, disCapMm, uzunlukMm);
  const rH = (o.disCapMm - o.damarCapMm) / 2;
  const damarlar: BaklaMesh[] = [];
  for (let s = 0; s < k.damar; s++) {
    const faz = (s / k.damar) * 2 * Math.PI;
    const ikincil = tip === "spiga" ? { oran: ORGU.spiga.ikincilOran, tur: 3 } : null;
    damarlar.push(damarTube(uzunlukMm, rH, o.pitchMm, o.damarCapMm / 2, faz, ikincil));
  }
  return { damarlar, bilgi: o };
}
