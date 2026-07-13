// Geometri çekirdeği — KAFES DOLGU (telkari grid)
// Bir kapalı bölgeyi (delikler hariç) verilen açıda paralel tel ızgarasıyla
// doldurur. Her tel, bölge sınırına KIRPILMIŞ düz segmenttir — uçları sınıra
// değer (lehim). z=0 düzleminde çalışır (telkari planar).
import { V3 } from "./vec3";
import { Polyline } from "./wire";

export function pointInPoly(x: number, y: number, poly: V3[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function lineHits(ox: number, oy: number, dx: number, dy: number, poly: V3[]): number[] {
  const ts: number[] = [];
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [x1, y1] = poly[j], [x2, y2] = poly[i];
    const ex = x2 - x1, ey = y2 - y1;
    const det = dx * ey - dy * ex;
    if (Math.abs(det) < 1e-12) continue;
    const s = ((x1 - ox) * ey - (y1 - oy) * ex) / det;   // hat parametresi
    const u = ((x1 - ox) * dy - (y1 - oy) * dx) / det;   // kenar parametresi
    if (u >= 0 && u < 1) ts.push(s);
  }
  return ts.sort((a, b) => a - b);
}

/** outer içinde, holes dışında kalan 45°'lik (angleDeg + dikeyi) tel ızgarası.
 *  minLenMm altındaki kırpıntılar atılır. Döner: düz 2-noktalı yollar. */
export function latticeFill(
  outer: V3[], holes: V3[][], cellMm: number, angleDeg: number, minLenMm = 0.4,
): Polyline[] {
  const xs = outer.map((p) => p[0]), ys = outer.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const R = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2 + cellMm;
  const out: Polyline[] = [];
  for (const deg of [angleDeg, angleDeg + 90]) {
    const a = (deg * Math.PI) / 180;
    const dx = Math.cos(a), dy = Math.sin(a);       // hat yönü
    const nx = -dy, ny = dx;                        // hatlar arası adım yönü
    for (let k = Math.ceil(-R / cellMm); k * cellMm <= R; k++) {
      const ox = cx + nx * k * cellMm, oy = cy + ny * k * cellMm;
      const ts = lineHits(ox, oy, dx, dy, outer);
      const holeTs = holes.flatMap((h) => lineHits(ox, oy, dx, dy, h));
      const all = [...ts, ...holeTs].sort((x, y2) => x - y2);
      for (let i = 0; i + 1 < all.length; i++) {
        const t0 = all[i], t1 = all[i + 1];
        if ((t1 - t0) < minLenMm) continue;
        const mx = ox + dx * (t0 + t1) / 2, my = oy + dy * (t0 + t1) / 2;
        if (!pointInPoly(mx, my, outer)) continue;
        if (holes.some((h) => pointInPoly(mx, my, h))) continue;
        out.push({
          pts: [[ox + dx * t0, oy + dy * t0, 0], [ox + dx * t1, oy + dy * t1, 0]],
          closed: false,
        });
      }
    }
  }
  return out;
}

/** Kapalı hattı ağırlık merkezine doğru büzerek iç kopyalar üretir —
 *  paisley/yaprak içi "iç içe ilmek" görünümünün v1 yaklaşımı (gerçek offset değil). */
export function insetLoops(loop: Polyline, factors: number[]): Polyline[] {
  const cx = loop.pts.reduce((s, p) => s + p[0], 0) / loop.pts.length;
  const cy = loop.pts.reduce((s, p) => s + p[1], 0) / loop.pts.length;
  return factors.map((f) => ({
    pts: loop.pts.map((p): V3 => [cx + (p[0] - cx) * f, cy + (p[1] - cy) * f, p[2]]),
    closed: true,
  }));
}
