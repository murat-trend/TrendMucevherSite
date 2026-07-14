// Geometri çekirdeği — TEL MOTORU
// Dairesel profili bir eğri boyunca süpürerek tel mesh'i üretir.
//
// Mikron sözünün iki bacağı:
//  1. RADYAL yoğunluk keyfi değil: segment sayısı toleranstan TÜRER —
//     çokgenin iç yarıçapı istenen yarıçaptan en fazla tolMm eksik kalır
//     (yani telin "en ince noktası" bile söz verilen kalınlığın tolMm yakınında).
//  2. YOL örneklemesi keyfi değil: eğri, kiriş sapması tolMm altına inene
//     kadar uyarlanabilir bölünür (silüet sadakati).
//
// Çerçeveler paralel taşıma ile ilerler (planar eğrilerde burulmasız;
// kapalı planar halkalarda dikiş uyumu otomatik sağlanır).
import { TOL_MEASURE_MM } from "./units";
import { V3, sub, scale, dot, cross, norm, dist, pointSegDist } from "./vec3";

export type Polyline = { pts: V3[]; closed: boolean };

export type WireMesh = {
  positions: Float64Array; // ring-major: [ring0 x n vertex][ring1 x n]... (+ açık uçta 2 kapak merkezi)
  indices: Uint32Array;
  radialSegments: number;
  ringCount: number;
  closed: boolean;
  requestedRadiusMm: number;
  lengthMm: number; // omurga uzunluğu
};

/** Tolerans-güdümlü radyal segment: inradius = r·cos(π/n) >= r - tolMm garantisi. */
export function radialSegmentsFor(radiusMm: number, tolMm = TOL_MEASURE_MM): number {
  if (radiusMm <= 0) throw new Error("geo/wire: yarıçap > 0 olmalı");
  if (tolMm >= radiusMm) return 8;
  const n = Math.ceil(Math.PI / Math.acos(1 - tolMm / radiusMm));
  return Math.min(256, Math.max(8, n));
}

/** Parametrik eğriyi kiriş sapması tolMm altında kalacak şekilde örnekler.
 *  closed=true ise fn(t1)=fn(t0) varsayılır ve kapanış noktası tekrarlanmaz. */
export function adaptiveSample(
  fn: (t: number) => V3, t0: number, t1: number, tolMm = TOL_MEASURE_MM, closed = false,
): Polyline {
  const out: V3[] = [fn(t0)];
  const refine = (ta: number, pa: V3, tb: number, pb: V3, depth: number) => {
    const tm = (ta + tb) / 2;
    const pm = fn(tm);
    if (depth >= 24 || pointSegDist(pm, pa, pb) <= tolMm) {
      out.push(pb);
      return;
    }
    refine(ta, pa, tm, pm, depth + 1);
    refine(tm, pm, tb, pb, depth + 1);
  };
  // ilk bölme 16 dilim: simetrik eğrilerde (tam çember gibi) kirişin
  // orta noktadan geçip "düz" sanılmasına karşı emniyet
  const N0 = 16;
  let prevT = t0, prevP = out[0];
  for (let i = 1; i <= N0; i++) {
    const t = t0 + ((t1 - t0) * i) / N0;
    const p = fn(t);
    refine(prevT, prevP, t, p, 0);
    prevT = t; prevP = p;
  }
  // sıfır-uzunluk segmentleri ayıkla (tanjant hesabını bozar)
  const pts: V3[] = [out[0]];
  for (const p of out.slice(1)) if (dist(p, pts[pts.length - 1]) > 1e-9) pts.push(p);
  if (closed && dist(pts[0], pts[pts.length - 1]) <= 1e-9) pts.pop();
  return { pts, closed };
}

function initialNormal(t: V3): V3 {
  // tanjanta en az hizalı eksenden dik doğrultu üret
  const ax: V3 = Math.abs(t[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  return norm(sub(ax, scale(t, dot(ax, t))));
}

/** Tanjantlar + paralel-taşıma çerçeveleri (RMF ailesi — burgu ve süpürme
 *  aynı çerçeveyi paylaşır; Frenet KULLANILMAZ, düz segmentte patlar). */
function transportFrames(P: V3[], closed: boolean): { T: V3[]; N: V3[]; B: V3[] } {
  const m = P.length;
  const T: V3[] = [];
  for (let i = 0; i < m; i++) {
    const prev = closed ? P[(i - 1 + m) % m] : P[Math.max(0, i - 1)];
    const next = closed ? P[(i + 1) % m] : P[Math.min(m - 1, i + 1)];
    T.push(norm(sub(next, prev)));
  }
  const N: V3[] = [initialNormal(T[0])];
  for (let i = 1; i < m; i++) {
    N.push(norm(sub(N[i - 1], scale(T[i], dot(N[i - 1], T[i])))));
  }
  const B = T.map((t, i) => cross(t, N[i]));
  return { T, N, B };
}

/** Segmentleri maxMm'den uzun olmayacak şekilde ara nokta ekleyerek yoğunlaştırır
 *  (burgu için halka sıklığı: aralık <= pitch/16 şartı). */
export function resampleMaxSpacing(path: Polyline, maxMm: number): Polyline {
  const P = path.pts;
  const out: V3[] = [P[0]];
  const segs = path.closed ? P.length : P.length - 1;
  for (let i = 0; i < segs; i++) {
    const a = P[i], b = P[(i + 1) % P.length];
    const L = dist(a, b);
    const n = Math.max(1, Math.ceil(L / maxMm));
    for (let k = 1; k <= n; k++) {
      if (path.closed && i === segs - 1 && k === n) break; // kapanış noktası tekrarlanmaz
      out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n, a[2] + ((b[2] - a[2]) * k) / n]);
    }
  }
  return { pts: out, closed: path.closed };
}

export type TwistOpts = {
  strands?: number;   // damar sayısı (varsayılan 2 — klasik telkari çifti)
  pitchMm?: number;   // bir tam turun yay uzunluğu (varsayılan 3 × toplam çap)
  flattenZ?: number;  // hadde yassılaştırması: damar yörüngesinin z bileşeni çarpanı (1 = yok)
  phaseRad?: number;  // başlangıç fazı
  tolMm?: number;
  /** halka aralığı tabanı (mm): pitch/16 çok küçükse mesh patlamasın (viewer dengesi) */
  minRingSpacingMm?: number;
  /** sarma (kazaziye) gibi özel dokular için: damar yarıçapı + yörünge yarıçapını
   *  formül yerine doğrudan ver (strands=1 ile çekirdek üstüne tek sargı olur) */
  strandRadiusMm?: number;
  orbitMm?: number;
};

/** BURGU TEL: omurga etrafında dönen N damar (gerçek telkari teli = 2 damar
 *  burgu + yassılaştırma). Her damar için ofset omurga üretilir ve mevcut
 *  süpürme motoru o omurga üzerinde koşar — mikron sözü damar bazında korunur.
 *  Döner: damar başına { mesh, path } (ölçüm/analiz için ofset omurga da verilir). */
export function sweepTwistedWire(
  path: Polyline, totalDiaMm: number, opts: TwistOpts = {},
): { mesh: WireMesh; path: Polyline }[] {
  const strands = opts.strands ?? 2;
  // N damar merkezleri a yarıçaplı çemberde, komşular temas eder:
  // 2a·sin(π/N) = 2r ve toplam çap = 2(a+r)  =>  r = D / (2(1+1/sin(π/N)))
  const sinp = Math.sin(Math.PI / Math.max(2, strands));
  const rStrand = opts.strandRadiusMm ?? totalDiaMm / (2 * (1 + 1 / sinp));
  const a = opts.orbitMm ?? rStrand / sinp;
  const pitch = opts.pitchMm ?? totalDiaMm * 3; // negatif pitch = ters yön burma (S/Z)
  const flatten = opts.flattenZ ?? 1;
  const tol = opts.tolMm ?? TOL_MEASURE_MM;

  const base = resampleMaxSpacing(path, Math.max(Math.abs(pitch) / 16, opts.minRingSpacingMm ?? 0.1));
  const P = base.pts;
  const { N, B } = transportFrames(P, base.closed);
  // yay uzunluğu (t parametresi DEĞİL — burgu sıklığı sabit kalsın)
  const s: number[] = [0];
  for (let i = 1; i < P.length; i++) s.push(s[i - 1] + dist(P[i], P[i - 1]));

  const out: { mesh: WireMesh; path: Polyline }[] = [];
  for (let k = 0; k < strands; k++) {
    const phase = (opts.phaseRad ?? 0) + (2 * Math.PI * k) / strands;
    const pts: V3[] = P.map((c, i) => {
      const th = phase + (2 * Math.PI * s[i]) / pitch;
      const ox = a * (Math.cos(th) * N[i][0] + Math.sin(th) * B[i][0]);
      const oy = a * (Math.cos(th) * N[i][1] + Math.sin(th) * B[i][1]);
      const oz = a * (Math.cos(th) * N[i][2] + Math.sin(th) * B[i][2]) * flatten;
      return [c[0] + ox, c[1] + oy, c[2] + oz];
    });
    const strandPath: Polyline = { pts, closed: base.closed };
    out.push({ mesh: sweepWire(strandPath, rStrand, tol), path: strandPath });
  }
  return out;
}

/** Dairesel profili yol boyunca süpürür. Açık yollar disk kapaklarla kapatılır;
 *  çıkan yüzey her zaman kapalı (hacmi ölçülebilir) bir mesh'tir. */
export function sweepWire(path: Polyline, radiusMm: number, tolMm = TOL_MEASURE_MM): WireMesh {
  const P = path.pts;
  const m = P.length;
  if (m < 2) throw new Error("geo/wire: yol en az 2 nokta ister");
  const n = radialSegmentsFor(radiusMm, tolMm);

  const { N: Ns, B: Bs } = transportFrames(P, path.closed);

  const capVerts = path.closed ? 0 : 2;
  const positions = new Float64Array((m * n + capVerts) * 3);
  for (let i = 0; i < m; i++) {
    const N = Ns[i];
    const B = Bs[i]; // birim (t ⟂ N, ikisi de birim)
    for (let j = 0; j < n; j++) {
      const phi = (2 * Math.PI * j) / n;
      const c = Math.cos(phi) * radiusMm, s = Math.sin(phi) * radiusMm;
      const k = (i * n + j) * 3;
      positions[k] = P[i][0] + N[0] * c + B[0] * s;
      positions[k + 1] = P[i][1] + N[1] * c + B[1] * s;
      positions[k + 2] = P[i][2] + N[2] * c + B[2] * s;
    }
  }

  const tris: number[] = [];
  const ringPairs = path.closed ? m : m - 1;
  for (let i = 0; i < ringPairs; i++) {
    const i2 = (i + 1) % m;
    for (let j = 0; j < n; j++) {
      const j2 = (j + 1) % n;
      const a = i * n + j, b = i * n + j2, c = i2 * n + j2, d = i2 * n + j;
      tris.push(a, b, c, a, c, d);
    }
  }
  if (!path.closed) {
    const c0 = m * n, c1 = m * n + 1;
    positions.set(P[0], c0 * 3);
    positions.set(P[m - 1], c1 * 3);
    for (let j = 0; j < n; j++) {
      const j2 = (j + 1) % n;
      tris.push(c0, j2, j);                                 // baş kapak (dışa: -t yönü)
      tris.push(c1, (m - 1) * n + j, (m - 1) * n + j2);     // son kapak (+t yönü)
    }
  }
  const indices = new Uint32Array(tris);

  // yönelim garantisi: işaretli hacim negatifse tüm üçgenleri çevir
  if (signedVolume(positions, indices) < 0) {
    for (let k = 0; k < indices.length; k += 3) {
      const tmp = indices[k + 1];
      indices[k + 1] = indices[k + 2];
      indices[k + 2] = tmp;
    }
  }

  let lengthMm = 0;
  for (let i = 0; i < ringPairs; i++) lengthMm += dist(P[i], P[(i + 1) % m]);

  return {
    positions, indices, radialSegments: n, ringCount: m,
    closed: path.closed, requestedRadiusMm: radiusMm, lengthMm,
  };
}

export type BeadOpts = {
  pitchMm?: number;   // boncuk adımı (varsayılan 0.92 × çap — hafif gömülü dizi)
  neck?: number;      // boğaz oranı (0-1): boncuklar arası bağlantı kalınlığı / yarıçap
  tolMm?: number;
};

/** BONCUK TEL (miligren): omurga boyunca birbirine değen küre dizisi görünümü —
 *  tek parça, değişken yarıçaplı süpürme (küreler ince boğazlarla bağlı: hem
 *  mesh hafif hem manifold garantili, dökümde de boğaz lehim görevi görür). */
export function sweepBeadedWire(
  path: Polyline, beadDiaMm: number, opts: BeadOpts = {},
): { mesh: WireMesh; path: Polyline; minNeckDiaMm: number; worstErrMm: number } {
  const r = beadDiaMm / 2;
  const neck = opts.neck ?? 0.32;
  const tol = opts.tolMm ?? TOL_MEASURE_MM;
  let pitch = opts.pitchMm ?? beadDiaMm * 0.92;

  const base0 = resampleMaxSpacing(path, Math.max(pitch / 10, 0.04));
  // kapalı halkada boncuk fazı dikişte kopmasın: pitch toplam uzunluğa bölünsün
  let total = 0;
  const Pp = base0.pts;
  const segs = base0.closed ? Pp.length : Pp.length - 1;
  for (let i = 0; i < segs; i++) total += dist(Pp[i], Pp[(i + 1) % Pp.length]);
  if (base0.closed) pitch = total / Math.max(2, Math.round(total / pitch));

  const base = base0;
  const P = base.pts;
  const m = P.length;
  const { N: Ns, B: Bs } = transportFrames(P, base.closed);
  const s: number[] = [0];
  for (let i = 1; i < m; i++) s.push(s[i - 1] + dist(P[i], P[i - 1]));
  const radii = s.map((si) => r * Math.max(neck, Math.abs(Math.sin((Math.PI * si) / pitch))));

  const n = radialSegmentsFor(r, Math.max(tol, 0.003));
  const capVerts = base.closed ? 0 : 2;
  const positions = new Float64Array((m * n + capVerts) * 3);
  for (let i = 0; i < m; i++) {
    const N = Ns[i], B = Bs[i], rr = radii[i];
    for (let j = 0; j < n; j++) {
      const phi = (2 * Math.PI * j) / n;
      const c = Math.cos(phi) * rr, sn = Math.sin(phi) * rr;
      const k = (i * n + j) * 3;
      positions[k] = P[i][0] + N[0] * c + B[0] * sn;
      positions[k + 1] = P[i][1] + N[1] * c + B[1] * sn;
      positions[k + 2] = P[i][2] + N[2] * c + B[2] * sn;
    }
  }
  const tris: number[] = [];
  const ringPairs = base.closed ? m : m - 1;
  for (let i = 0; i < ringPairs; i++) {
    const i2 = (i + 1) % m;
    for (let j = 0; j < n; j++) {
      const j2 = (j + 1) % n;
      const a = i * n + j, b = i * n + j2, c = i2 * n + j2, d = i2 * n + j;
      tris.push(a, b, c, a, c, d);
    }
  }
  if (!base.closed) {
    const c0 = m * n, c1 = m * n + 1;
    positions.set(P[0], c0 * 3);
    positions.set(P[m - 1], c1 * 3);
    for (let j = 0; j < n; j++) {
      const j2 = (j + 1) % n;
      tris.push(c0, j2, j);
      tris.push(c1, (m - 1) * n + j, (m - 1) * n + j2);
    }
  }
  const indices = new Uint32Array(tris);
  if (signedVolume(positions, indices) < 0) {
    for (let k = 0; k < indices.length; k += 3) {
      const tmp = indices[k + 1]; indices[k + 1] = indices[k + 2]; indices[k + 2] = tmp;
    }
  }
  // dürüst geri-ölçüm: vertexler tasarım yarıçapına birebir mi?
  let worstErrMm = 0;
  for (let i = 0; i < m; i += Math.max(1, Math.floor(m / 50))) {
    const k = i * n * 3;
    const d = Math.hypot(positions[k] - P[i][0], positions[k + 1] - P[i][1], positions[k + 2] - P[i][2]);
    worstErrMm = Math.max(worstErrMm, Math.abs(d - radii[i]));
  }
  const mesh: WireMesh = {
    positions, indices, radialSegments: n, ringCount: m,
    closed: base.closed, requestedRadiusMm: r, lengthMm: s[m - 1] + (base.closed ? dist(P[m - 1], P[0]) : 0),
  };
  return { mesh, path: base, minNeckDiaMm: 2 * r * neck, worstErrMm };
}

/** Omurgayı düzlem-içi sabit mesafeyle ofsetler (çift burma yan yana dizilimi için). */
export function offsetPathN(path: Polyline, dMm: number): Polyline {
  const base = resampleMaxSpacing(path, 0.5);
  const { N } = transportFrames(base.pts, base.closed);
  return {
    pts: base.pts.map((p, i): V3 => [p[0] + N[i][0] * dMm, p[1] + N[i][1] * dMm, p[2] + N[i][2] * dMm]),
    closed: base.closed,
  };
}

/** ONDÜLE (dalgalı/zigzag tel): omurgayı düzlem-içi sinüs dalgasıyla ofsetler;
 *  sonuç yine normal süpürmeyle tel olur (telkari dolgu klasiği). */
export function makeWavyPath(path: Polyline, ampMm: number, pitchMm: number): Polyline {
  const base = resampleMaxSpacing(path, pitchMm / 8);
  const P = base.pts;
  const { N } = transportFrames(P, base.closed);
  let total = 0;
  const segs = base.closed ? P.length : P.length - 1;
  for (let i = 0; i < segs; i++) total += dist(P[i], P[(i + 1) % P.length]);
  const pitch = base.closed ? total / Math.max(2, Math.round(total / pitchMm)) : pitchMm;
  const s: number[] = [0];
  for (let i = 1; i < P.length; i++) s.push(s[i - 1] + dist(P[i], P[i - 1]));
  const pts: V3[] = P.map((p, i) => {
    const a = ampMm * Math.sin((2 * Math.PI * s[i]) / pitch);
    return [p[0] + N[i][0] * a, p[1] + N[i][1] * a, p[2] + N[i][2] * a];
  });
  return { pts, closed: base.closed };
}

/** Diverjans teoremiyle işaretli hacim (mm³) — float64. */
export function signedVolume(positions: Float64Array, indices: Uint32Array): number {
  let v = 0;
  for (let k = 0; k < indices.length; k += 3) {
    const a = indices[k] * 3, b = indices[k + 1] * 3, c = indices[k + 2] * 3;
    const ax = positions[a], ay = positions[a + 1], az = positions[a + 2];
    const bx = positions[b], by = positions[b + 1], bz = positions[b + 2];
    const cx = positions[c], cy = positions[c + 1], cz = positions[c + 2];
    v += ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx);
  }
  return v / 6;
}
