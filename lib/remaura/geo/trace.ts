// geo/trace.ts — raster görüntüden kapalı kontur çıkarma
//
// Amaç: nakkaş/isim-kolye gibi PİKSEL üreten kaynakları geo motoruna bağlamak.
// Çıkan konturlar doğrudan smoothLoop -> sweepWire ve latticeFill'e verilebilir.
//
// Yöntem: marching squares + kenar üzerinde DOĞRUSAL ARA DEĞER.
// Ara değer şart: eşiğe göre sadece "içeride/dışarıda" dersek kontur piksel
// merdiveni olur; tel süpürülünce tırtıklı çıkar. Ara değerle alt-piksel
// hassasiyet elde edilir, üstüne simplifyLoop merdiven artıklarını temizler.
//
// Bağımlılık yok.

import type { V3 } from "./vec3";
import type { Polyline } from "./wire";

/** Gri tonlamalı raster. data[y * width + x] = 0..255 */
export type Raster = { data: Uint8Array | Uint8ClampedArray; width: number; height: number };

/** Piksel uzayında kapalı kontur (x sağa, y AŞAĞI — görüntü yönü). */
export type PixelLoop = { x: number; y: number }[];

/** Dış hat + içindeki delikler. latticeFill'in beklediği ayrımın aynısı. */
export type Region = { outer: V3[]; holes: V3[][] };

// ---------------------------------------------------------------- 1) izleme

// Hücre köşe bitleri:  TL=8  TR=4  BR=2  BL=1
// Hücre kenarları:     top=H(x,y)  right=V(x+1,y)  bottom=H(x,y+1)  left=V(x,y)
// Her kenar iki hücre tarafından paylaşılır; kenar KİMLİĞİ ile eşleştirince
// uç noktalar kayan nokta karşılaştırması olmadan birebir birleşir.
const TOP = 0, RIGHT = 1, BOTTOM = 2, LEFT = 3;

// case -> bağlanacak kenar çiftleri
const CASES: number[][][] = [
  [],                                   // 0
  [[LEFT, BOTTOM]],                     // 1  BL
  [[BOTTOM, RIGHT]],                    // 2  BR
  [[LEFT, RIGHT]],                      // 3  BL+BR
  [[TOP, RIGHT]],                       // 4  TR
  [[LEFT, TOP], [BOTTOM, RIGHT]],       // 5  TR+BL (semer)
  [[TOP, BOTTOM]],                      // 6  TR+BR
  [[LEFT, TOP]],                        // 7  TR+BR+BL
  [[TOP, LEFT]],                        // 8  TL
  [[TOP, BOTTOM]],                      // 9  TL+BL
  [[TOP, RIGHT], [LEFT, BOTTOM]],       // 10 TL+BR (semer)
  [[TOP, RIGHT]],                       // 11 TL+BL+BR
  [[LEFT, RIGHT]],                      // 12 TL+TR
  [[BOTTOM, RIGHT]],                    // 13 TL+TR+BL
  [[LEFT, BOTTOM]],                     // 14 TL+TR+BR
  [],                                   // 15
];

/**
 * Marching squares ile kapalı konturlar çıkarır.
 * @param thr  eşik (0..255). value >= thr => "içeride"
 * @returns piksel uzayında kapalı halkalar
 */
export function traceContours(img: Raster, thr = 128): PixelLoop[] {
  const { data, width: W, height: H } = img;
  const at = (x: number, y: number) => data[y * W + x];

  // kenar kimlikleri: yatay = y*(W) + x, dikey = OFF + y*(W+1) + x
  const OFF = (H + 1) * (W + 1);
  const hid = (x: number, y: number) => y * (W + 1) + x;
  const vid = (x: number, y: number) => OFF + y * (W + 1) + x;

  const ptOf = new Map<number, { x: number; y: number }>();
  // kenar kimliği -> bağlı olduğu diğer kenar kimlikleri (en fazla 2)
  const link = new Map<number, number[]>();

  const lerp = (a: number, b: number) => {
    const d = b - a;
    return Math.abs(d) < 1e-9 ? 0.5 : (thr - a) / d;
  };

  const edgeInfo = (x: number, y: number, e: number): { id: number; x: number; y: number } => {
    switch (e) {
      case TOP:    { const t = lerp(at(x, y),     at(x + 1, y));     return { id: hid(x, y),     x: x + t, y }; }
      case BOTTOM: { const t = lerp(at(x, y + 1), at(x + 1, y + 1)); return { id: hid(x, y + 1), x: x + t, y: y + 1 }; }
      case LEFT:   { const t = lerp(at(x, y),     at(x, y + 1));     return { id: vid(x, y),     x, y: y + t }; }
      default:     { const t = lerp(at(x + 1, y), at(x + 1, y + 1)); return { id: vid(x + 1, y), x: x + 1, y: y + t }; }
    }
  };

  const connect = (a: number, b: number) => {
    const la = link.get(a); la ? la.push(b) : link.set(a, [b]);
    const lb = link.get(b); lb ? lb.push(a) : link.set(b, [a]);
  };

  for (let y = 0; y < H - 1; y++) {
    for (let x = 0; x < W - 1; x++) {
      const tl = at(x, y) >= thr ? 8 : 0;
      const tr = at(x + 1, y) >= thr ? 4 : 0;
      const br = at(x + 1, y + 1) >= thr ? 2 : 0;
      const bl = at(x, y + 1) >= thr ? 1 : 0;
      let c = tl | tr | br | bl;
      if (c === 0 || c === 15) continue;

      // semer belirsizliği: 4 köşe ortalaması merkezin hangi tarafta olduğunu söyler
      if (c === 5 || c === 10) {
        const avg = (at(x, y) + at(x + 1, y) + at(x + 1, y + 1) + at(x, y + 1)) / 4;
        if (avg >= thr) c = c === 5 ? 10 : 5;
      }

      for (const [e0, e1] of CASES[c]) {
        const A = edgeInfo(x, y, e0), B = edgeInfo(x, y, e1);
        if (!ptOf.has(A.id)) ptOf.set(A.id, { x: A.x, y: A.y });
        if (!ptOf.has(B.id)) ptOf.set(B.id, { x: B.x, y: B.y });
        connect(A.id, B.id);
      }
    }
  }

  // --- zincirleme: her kenar kimliğinden komşusuna yürüyerek halka kapat
  const loops: PixelLoop[] = [];
  const seen = new Set<number>();

  for (const start of link.keys()) {
    if (seen.has(start)) continue;
    const loop: PixelLoop = [];
    let cur = start, prev = -1;
    let guard = 0;
    const limit = link.size + 4;

    while (guard++ < limit) {
      seen.add(cur);
      const p = ptOf.get(cur)!;
      loop.push({ x: p.x, y: p.y });
      const nbrs = link.get(cur);
      if (!nbrs) break;
      const next = nbrs.find((n) => n !== prev && !seen.has(n));
      if (next === undefined) {
        // başlangıca dönebiliyorsak halka kapandı
        break;
      }
      prev = cur;
      cur = next;
    }
    if (loop.length >= 3) loops.push(loop);
  }

  return loops;
}

// ------------------------------------------------------- 2) sadeleştirme (DP)

function perpDist(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-12) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  const tc = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(p.x - (a.x + tc * dx), p.y - (a.y + tc * dy));
}

/** Douglas-Peucker — AÇIK dizi için. */
function dpOpen(pts: PixelLoop, eps: number): PixelLoop {
  if (pts.length < 3) return pts.slice();
  let maxD = -1, idx = -1;
  const a = pts[0], b = pts[pts.length - 1];
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDist(pts[i], a, b);
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD <= eps) return [a, b];
  const left = dpOpen(pts.slice(0, idx + 1), eps);
  const right = dpOpen(pts.slice(idx), eps);
  return left.slice(0, -1).concat(right);
}

/**
 * KAPALI halka için Douglas-Peucker.
 * Halkayı birbirine en uzak iki noktadan ikiye bölüp her yarıyı ayrı sadeleştirir;
 * yoksa başlangıç noktası keyfi biçimde korunur ve şekil kayar.
 * @param epsPx  piksel cinsinden tolerans (0.6-1.2 arası iyi çalışır)
 */
export function simplifyLoop(loop: PixelLoop, epsPx = 0.8): PixelLoop {
  const n = loop.length;
  if (n < 4) return loop.slice();

  // 0'a en uzak nokta -> bölme noktası
  let far = 0, fd = -1;
  for (let i = 1; i < n; i++) {
    const d = (loop[i].x - loop[0].x) ** 2 + (loop[i].y - loop[0].y) ** 2;
    if (d > fd) { fd = d; far = i; }
  }
  const half1 = loop.slice(0, far + 1);
  const half2 = loop.slice(far).concat([loop[0]]);
  const s1 = dpOpen(half1, epsPx);
  const s2 = dpOpen(half2, epsPx);
  const out = s1.slice(0, -1).concat(s2.slice(0, -1));
  return out.length >= 3 ? out : loop.slice();
}

// ------------------------------------------------- 3) piksel -> mm + sınıflama

/** Kapalı poligonun işaretli alanı (piksel uzayı). */
function signedArea(loop: PixelLoop): number {
  let s = 0;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
    s += (loop[j].x - loop[i].x) * (loop[j].y + loop[i].y);
  }
  return s / 2;
}

function inside(pt: { x: number; y: number }, loop: PixelLoop): boolean {
  let hit = false;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
    const a = loop[i], b = loop[j];
    if ((a.y > pt.y) !== (b.y > pt.y) &&
        pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

/**
 * Piksel halkalarını mm'ye taşır ve dış hat / delik olarak ayırır.
 *
 * - Y ekseni ÇEVRİLİR (görüntüde y aşağı, geometride yukarı).
 * - Model X-Y düzleminde ORTALANIR, z = 0.
 * - İç içe geçme sayısı TEK olan halka DELİKTİR (even-odd).
 *
 * @param widthMm  parçanın hedef genişliği (mm) — ölçek bundan çıkar
 * @param minAreaMm2  bundan küçük halkalar atılır (raster gürültüsü)
 */
export function loopsToRegions(
  loops: PixelLoop[], imgW: number, imgH: number, widthMm: number, minAreaMm2 = 0.05,
): Region[] {
  const s = widthMm / imgW;
  const cx = imgW / 2, cy = imgH / 2;
  const toV3 = (l: PixelLoop): V3[] => l.map((p): V3 => [(p.x - cx) * s, (cy - p.y) * s, 0]);

  const kept = loops.filter((l) => l.length >= 3 && Math.abs(signedArea(l)) * s * s >= minAreaMm2);
  // büyükten küçüğe: kapsayan her zaman önce gelir
  kept.sort((a, b) => Math.abs(signedArea(b)) - Math.abs(signedArea(a)));

  const depth = kept.map((l, i) => {
    let d = 0;
    for (let j = 0; j < i; j++) if (inside(l[0], kept[j])) d++;
    return d;
  });

  const regions: Region[] = [];
  const ownerOf = new Map<number, number>(); // delik index -> ait olduğu dış hat index

  kept.forEach((l, i) => {
    if (depth[i] % 2 === 0) {
      ownerOf.set(i, regions.length);
      regions.push({ outer: toV3(l), holes: [] });
    }
  });
  kept.forEach((l, i) => {
    if (depth[i] % 2 === 1) {
      // en yakın kapsayıcı dış hattı bul (en küçük alanlı kapsayan)
      let best = -1;
      for (let j = i - 1; j >= 0; j--) {
        if (depth[j] % 2 === 0 && inside(l[0], kept[j])) { best = j; break; }
      }
      const r = best >= 0 ? ownerOf.get(best) : undefined;
      if (r !== undefined) regions[r].holes.push(toV3(l));
    }
  });

  return regions;
}

// --------------------------------------------------------------- 4) kolaylık

/**
 * Tek çağrıda: raster -> sadeleştirilmiş, mm ölçekli, dış/delik ayrılmış bölgeler.
 *
 * Tipik kullanım:
 *   const regions = imageToRegions({data, width, height}, { widthMm: 42 });
 *   const wires = regions.flatMap(r => [
 *     sweepWire(smoothLoop(r.outer, 0.02), 0.8, 0.02),
 *     ...r.holes.map(h => sweepWire(smoothLoop(h, 0.02), 0.6, 0.02)),
 *     ...latticeFill(r.outer, r.holes, 1.2, 45).map(p => sweepWire(p, 0.35, 0.02)),
 *   ]);
 */
export function imageToRegions(
  img: Raster,
  opts: { widthMm: number; threshold?: number; epsPx?: number; minAreaMm2?: number } ,
): Region[] {
  const loops = traceContours(img, opts.threshold ?? 128)
    .map((l) => simplifyLoop(l, opts.epsPx ?? 0.8));
  return loopsToRegions(loops, img.width, img.height, opts.widthMm, opts.minAreaMm2 ?? 0.05);
}

/** Bölgenin dış hattını Polyline'a çevirir (smoothLoop'a vermeden hızlı yol). */
export function regionOuterPolyline(r: Region): Polyline {
  return { pts: r.outer, closed: true };
}
