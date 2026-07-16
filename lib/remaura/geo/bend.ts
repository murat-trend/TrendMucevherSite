// Geometri çekirdeği — SİLİNDİR SARMA (bileklik/yüzük bükümü)
// TELKARI.md §1.7'nin bant hali: form OMURGAYA uygulanır, mesh'e değil.
// Bant düz uzayda tasarlanır (x = çevre yönünde yay uzunluğu, y = bilek
// ekseni, z = radyal dışa), omurga noktaları silindire haritalanır ve
// süpürme haritalanmış omurga üzerinde koşar — tel kesiti dairesel ve
// mikron-sabit kalır. Z-displacement yasak kuralının olumlu hali budur.
//
// Mikron sözü: sarmadan önce yol, kiriş sapması tolMm altında kalacak
// sıklıkta yeniden örneklenir (sagitta ≈ s²/8R  =>  s ≤ √(8·R·tol)).
import { V3 } from "./vec3";
import { Polyline, resampleMaxSpacing } from "./wire";
import { TOL_MEASURE_MM } from "./units";

/** Düz-uzay noktası -> silindir yüzeyi. x, R yarıçaplı merkez hattında yay
 *  uzunluğudur; y eksenel kalır; z radyal dışa eklenir. Silindir ekseni Y,
 *  merkezi orijin: x=0 noktası +Z'ye bakar (viewer kadrajı için öne). */
export function cylPoint(p: V3, R: number): V3 {
  const th = p[0] / R;
  return [(R + p[2]) * Math.sin(th), p[1], (R + p[2]) * Math.cos(th)];
}

/** Yolu silindire sarar. Kiriş sapması sözü için önce yoğunlaştırır. */
export function bendPath(path: Polyline, R: number, tolMm = TOL_MEASURE_MM): Polyline {
  const maxSeg = Math.sqrt(8 * R * tolMm);
  const dense = resampleMaxSpacing(path, maxSeg);
  return { pts: dense.pts.map((p) => cylPoint(p, R)), closed: dense.closed };
}
