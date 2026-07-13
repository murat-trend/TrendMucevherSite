// Geometri çekirdeği — SERBEST EĞRİ (Catmull-Rom zinciri)
// Gerçek modellerden kopyalanan hatlar formülle değil kontrol noktalarıyla
// çizilir; noktaların arasını pürüzsüz geçen eğri buradan örneklenir.
// Örnekleme yine tolerans-güdümlü (wire.adaptiveSample) — mikron sözü korunur.
import { V3 } from "./vec3";
import { Polyline, adaptiveSample } from "./wire";
import { TOL_MEASURE_MM } from "./units";

/** Centripetal Catmull-Rom (alpha=0.5) — kontrol noktalarından GEÇER,
 *  kendini kesme/salınım yapmaz (uniform CR'nin bilinen kusuru). */
function crSegment(p0: V3, p1: V3, p2: V3, p3: V3): (t: number) => V3 {
  const alpha = 0.5;
  const tj = (ti: number, a: V3, b: V3) =>
    ti + Math.pow(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), alpha);
  const t0 = 0, t1 = tj(t0, p0, p1), t2 = tj(t1, p1, p2), t3 = tj(t2, p2, p3);
  return (u: number): V3 => {
    const t = t1 + (t2 - t1) * u;
    const out: number[] = [];
    for (let i = 0; i < 3; i++) {
      const a1 = (t1 - t) / (t1 - t0) * p0[i] + (t - t0) / (t1 - t0) * p1[i];
      const a2 = (t2 - t) / (t2 - t1) * p1[i] + (t - t1) / (t2 - t1) * p2[i];
      const a3 = (t3 - t) / (t3 - t2) * p2[i] + (t - t2) / (t3 - t2) * p3[i];
      const b1 = (t2 - t) / (t2 - t0) * a1 + (t - t0) / (t2 - t0) * a2;
      const b2 = (t3 - t) / (t3 - t1) * a2 + (t - t1) / (t3 - t1) * a3;
      out.push((t2 - t) / (t2 - t1) * b1 + (t - t1) / (t2 - t1) * b2);
    }
    return out as unknown as V3;
  };
}

/** Kontrol noktalarından geçen pürüzsüz AÇIK zincir (uçlar sabit).
 *  Uç tanjantları uç segmentin yansımasıyla türetilir. */
export function smoothChain(points: V3[], tolMm = TOL_MEASURE_MM): Polyline {
  if (points.length < 2) throw new Error("geo/curves: en az 2 nokta");
  if (points.length === 2) return { pts: [points[0], points[1]], closed: false };
  const mirror = (a: V3, b: V3): V3 => [2 * a[0] - b[0], 2 * a[1] - b[1], 2 * a[2] - b[2]];
  const ext = [mirror(points[0], points[1]), ...points, mirror(points[points.length - 1], points[points.length - 2])];
  const pts: V3[] = [points[0]];
  for (let s = 0; s < points.length - 1; s++) {
    const fn = crSegment(ext[s], ext[s + 1], ext[s + 2], ext[s + 3]);
    const seg = adaptiveSample(fn, 0, 1, tolMm, false);
    pts.push(...seg.pts.slice(1)); // segment başı bir önceki sonla aynı
  }
  return { pts, closed: false };
}

/** Kontrol noktalarından geçen pürüzsüz KAPALI halka (kanat çerçevesi gibi). */
export function smoothLoop(points: V3[], tolMm = TOL_MEASURE_MM): Polyline {
  const n = points.length;
  if (n < 3) throw new Error("geo/curves: kapalı halka en az 3 nokta ister");
  const pts: V3[] = [points[0]];
  for (let s = 0; s < n; s++) {
    const fn = crSegment(
      points[(s - 1 + n) % n], points[s], points[(s + 1) % n], points[(s + 2) % n]);
    const seg = adaptiveSample(fn, 0, 1, tolMm, false);
    pts.push(...seg.pts.slice(1));
  }
  pts.pop(); // kapanış noktası ilk noktayla aynı
  return { pts, closed: true };
}

/** Açık zincirleri uç uca ekleyip KAPALI hat yapar (köşeler/cusp'lar korunur —
 *  her zincir kendi içinde pürüzsüz, birleşim noktaları keskin kalabilir). */
export function joinLoop(chains: Polyline[]): Polyline {
  const pts: V3[] = [];
  for (const c of chains) {
    const seg = c.pts;
    const start = pts.length &&
      Math.hypot(seg[0][0] - pts[pts.length - 1][0], seg[0][1] - pts[pts.length - 1][1], seg[0][2] - pts[pts.length - 1][2]) < 1e-9
      ? 1 : 0;
    pts.push(...seg.slice(start));
  }
  // kapanış: son nokta = ilk nokta ise at
  const last = pts[pts.length - 1], first = pts[0];
  if (Math.hypot(last[0] - first[0], last[1] - first[1], last[2] - first[2]) < 1e-9) pts.pop();
  return { pts, closed: true };
}

/** x -> -x aynası (sol-sağ simetrik modeller için). Yol yönü korunur. */
export function mirrorX(p: Polyline): Polyline {
  return { pts: p.pts.map((q): V3 => [-q[0], q[1], q[2]]).reverse(), closed: p.closed };
}

/** Arşimet spirali üreteci: merkez (cx,cy), açı a0'dan dir yönünde turns tur,
 *  yarıçap r0 -> r1 lineer. t=0 dış uç (komşuya lehimlenir), t=1 göbek. */
export function spiralFn(
  cx: number, cy: number, r0: number, r1: number, turns: number, a0: number, dir: 1 | -1,
): (t: number) => V3 {
  return (t: number): V3 => {
    const th = a0 + dir * 2 * Math.PI * turns * t;
    const r = r0 + (r1 - r0) * t;
    return [cx + r * Math.cos(th), cy + r * Math.sin(th), 0];
  };
}
