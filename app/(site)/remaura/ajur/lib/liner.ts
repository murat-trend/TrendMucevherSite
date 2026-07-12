import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";
import { geometryVolumeMm3 } from "./manifoldKit";
import { orientNestedShells } from "./shells";
import type { MaskFrame } from "./mask";

// ---------------------------------------------------------------------------
// KAPAK / İÇ ASTAR (kapaklı ajur; literatür: pierced work + backing) — v1 yüzük.
//
// YÖNTEM (ışın-ölçümlü parametrik tüp): (θ,v) düğüm ızgarasında her düğümün
// yarıçapı eksenden atılan RADYAL IŞINLA ölçülür — medyan penceresine düşen
// (giriş, çıkış) duvar çifti seçilir:
//   - tek parça: rOut = min(giriş+0.35, çıkış−0.3) → duvara gömülür ama arka
//     yüzü DELEMEZ (matematiksel sınır); union'da kaynar
//   - ayrı parça: rOut = giriş − gap → lehimlik ayrı STL
// Uçlar sektör sektör maskeden ölçülür + ışın-geçerliliğiyle kırpılır;
// geçersiz düğüm komşu yarıçapı KOPYALAMAZ, son geçerli düğüme ÇÖKERTİLİR
// (sarkma/taşma imkânsız). Denenip terk edilenler (bkz. proje notu):
// global/sektörel sabit yarıçap (konik flare deler), vertex-kutulama (komşu
// sızıntısı), SDF levelSet kabuğu (0.35mm gridde 0.5mm kabuk parçalanıyor).
// ---------------------------------------------------------------------------

export type LinerOpts = {
  thicknessMm: number;          // astar et kalınlığı
  /** 0 = tek parça (kaynaşık); >0 = ayrı parça, yüzeyle arasındaki boşluk */
  gapMm: number;
  /** bant eksenel uçlarında maske sınırından içeri pay */
  endInsetMm?: number;
  /** verilirse bant bu eksenel aralıkla sınırlanır (ör. deliklerin aralığı) —
   *  yoksa tüm bor bandı kaplanır (taç altına kadar uzayıp gram yer) */
  axialRangeMm?: [number, number];
};

export type LinerResult = {
  geometry: THREE.BufferGeometry;
  volumeMm3: number;
  /** bandın EN UZUN eksenel aralığı + pencere yarıçapları (rapor için) */
  spanMm: number;
  rOuterMm: number;
  rInnerMm: number;
  spanMinMm?: number;
};

/** Maskeli vertexlerin bor bandı istatistiği. Çapa = MEDYAN yarıçap
 *  (görünürlük-filtreli maskenin baskın kümesi; autoMaskRing.innerRadius ile
 *  aynı tanım). Alt persentil ÇAPA OLAMAZ: sarkan diken uçları borden küçük
 *  yarıçapta olabilir ve astarı parmak boşluğuna asılı tüpe çevirir (yaşandı). */
function maskedRadialStats(
  geometry: THREE.BufferGeometry,
  mask: Uint8Array,
  frame: Extract<MaskFrame, { kind: "cylindrical" }>,
) {
  const pos = geometry.attributes.position;
  const a = frame.axisIndex;
  const p = new THREE.Vector3();
  const radii: number[] = [];
  for (let i = 0; i < pos.count; i += 1) {
    if (!mask[i]) continue;
    p.fromBufferAttribute(pos, i).sub(frame.center);
    p.setComponent(a, 0);
    radii.push(p.length());
  }
  radii.sort((x, y) => x - y);
  const median = radii[Math.floor(radii.length / 2)] ?? 1;
  const tol = Math.max(0.8, median * 0.1);
  return { median, tol, n: radii.length };
}

export async function buildRingLiner(
  geometry: THREE.BufferGeometry,
  mask: Uint8Array,
  frame: MaskFrame,
  opts: LinerOpts,
  bvh?: MeshBVH,
): Promise<LinerResult> {
  if (frame.kind !== "cylindrical") {
    throw new Error("İç astar v1 yalnız yüzük (silindirik bölge) için — madalyon kapağı sırada.");
  }
  const bvhL = bvh ?? new MeshBVH(geometry);
  const stats = maskedRadialStats(geometry, mask, frame);
  if (stats.n < 50) throw new Error("Güvenli bölge astar için çok küçük.");

  const t = Math.max(0.3, opts.thicknessMm);
  const gap = opts.gapMm <= 0 ? 0 : Math.max(0.2, opts.gapMm);
  const inset = opts.endInsetMm ?? 0.25;
  const a = frame.axisIndex;
  const pos = geometry.attributes.position;
  const p = new THREE.Vector3();

  // ---- 1) SEKTÖR UÇLARI: borun eksenel uzunluğu açıya göre değişir ----
  const N = 128;
  const lows = new Array<number>(N).fill(Infinity);
  const highs = new Array<number>(N).fill(-Infinity);
  for (let i = 0; i < pos.count; i += 1) {
    if (!mask[i]) continue;
    p.fromBufferAttribute(pos, i).sub(frame.center);
    const axial = p.getComponent(a);
    p.setComponent(a, 0);
    const r = p.length();
    if (Math.abs(r - stats.median) > stats.tol + 0.4) continue; // yalnız bor bandı
    const th = Math.atan2(p.getComponent((a + 2) % 3), p.getComponent((a + 1) % 3));
    const si = ((Math.round((th / (2 * Math.PI)) * N) % N) + N) % N;
    for (const s of [si, (si + 1) % N, (si + N - 1) % N]) {
      if (axial < lows[s]) lows[s] = axial;
      if (axial > highs[s]) highs[s] = axial;
    }
  }
  const filled = (s: number) => Number.isFinite(lows[s]) && Number.isFinite(highs[s]);
  if (!lows.some((_, s) => filled(s))) throw new Error("Bor bandı bulunamadı — bölgeyi genişletin.");
  for (let s = 0; s < N; s += 1) {
    if (filled(s)) continue;
    let fw = -1, bw = -1;
    for (let k = 1; k < N; k += 1) {
      if (fw < 0 && filled((s + k) % N)) fw = (s + k) % N;
      if (bw < 0 && filled((s - k + N) % N)) bw = (s - k + N) % N;
      if (fw >= 0 && bw >= 0) break;
    }
    lows[s] = Math.max(lows[fw], lows[bw]);
    highs[s] = Math.min(highs[fw], highs[bw]);
  }
  if (opts.axialRangeMm) {
    for (let s = 0; s < N; s += 1) {
      lows[s] = Math.max(lows[s], opts.axialRangeMm[0]);
      highs[s] = Math.min(highs[s], opts.axialRangeMm[1]);
    }
  }
  // dairesel EROZYON (ortalama değil): liner komşu sektörün aralığını aşamaz
  const erode = (arr: number[], pickMax: boolean) => {
    const out = new Array<number>(N);
    for (let s = 0; s < N; s += 1) {
      let v = arr[s];
      for (let k = -2; k <= 2; k += 1) {
        const x = arr[(s + k + N) % N];
        v = pickMax ? Math.max(v, x) : Math.min(v, x);
      }
      out[s] = v;
    }
    return out;
  };
  const lo = erode(lows, true);
  const hi = erode(highs, false);
  for (let s = 0; s < N; s += 1) {
    lo[s] += inset; hi[s] -= inset;
    if (hi[s] - lo[s] < 1.2) {
      const mid = (lo[s] + hi[s]) / 2;
      lo[s] = mid - 0.6; hi[s] = mid + 0.6;
    }
  }

  // ---- 2) DÜĞÜM YARIÇAPLARI: her düğüm kendi ışınıyla ----
  const NV = 16;
  const gi = (s: number, k: number) => s * (NV + 1) + k;
  const ray = new THREE.Ray();
  const win = stats.tol + 0.6;
  const nodeRadius = (s: number, v: number): number => {
    const th = (s / N) * 2 * Math.PI;
    ray.origin.copy(frame.center);
    ray.origin.setComponent(a, ray.origin.getComponent(a) + v);
    ray.direction.set(0, 0, 0);
    ray.direction.setComponent((a + 1) % 3, Math.cos(th));
    ray.direction.setComponent((a + 2) % 3, Math.sin(th));
    const raw = bvhL.raycast(ray, THREE.DoubleSide).map((x) => x.distance).sort((x, y) => x - y);
    const hits: number[] = [];
    for (const d of raw) if (hits.length === 0 || d - hits[hits.length - 1] > 1e-4) hits.push(d);
    let enter = NaN, exit = NaN, best = Infinity;
    for (let h2 = 0; h2 + 1 < hits.length; h2 += 2) {
      const dE = Math.abs(hits[h2] - stats.median);
      if (dE < best && dE <= win) { best = dE; enter = hits[h2]; exit = hits[h2 + 1]; }
    }
    if (!Number.isFinite(enter)) return NaN;
    if (gap <= 0) {
      // tek parça: duvara CÖMERTÇE göm (union affeder — metalle örtüşen kısım
      // gövdeye karışır); tek yasak dış yüzeyden çıkmak → çıkış−0.3 tavanı
      return Math.max(Math.min(enter + 0.6, exit - 0.3), enter + 0.05);
    }
    // ayrı parça: yüzeyden gap uzak (parmak boşluğu tarafı — taşma imkânsız)
    return enter - gap;
  };

  // her sektör: düğümleri ölç; geçersiz uçlar SON GEÇERLİ düğüme çökertilir
  // (komşu yarıçapı kopyalamak sarkma üretir — çökertme üretemez)
  const rOutG = new Array<number>(N * (NV + 1)).fill(NaN);
  const vG = new Array<number>(N * (NV + 1)).fill(NaN);
  const sectorOk = new Array<boolean>(N).fill(false);
  for (let s = 0; s < N; s += 1) {
    const span0 = hi[s] - lo[s];
    const rTmp = new Array<number>(NV + 1).fill(NaN);
    for (let k = 0; k <= NV; k += 1) rTmp[k] = nodeRadius(s, lo[s] + (span0 * k) / NV);
    const midK = Math.floor(NV / 2);
    if (!Number.isFinite(rTmp[midK])) continue; // sektör ölçülemedi
    let kLo = midK, kHi = midK;
    while (kLo > 0 && Number.isFinite(rTmp[kLo - 1])) kLo -= 1;
    while (kHi < NV && Number.isFinite(rTmp[kHi + 1])) kHi += 1;
    if (kHi - kLo < 2) continue;
    sectorOk[s] = true;
    for (let k = 0; k <= NV; k += 1) {
      let kc = k;
      if (!Number.isFinite(rTmp[k]) || k < kLo || k > kHi) {
        kc = Math.max(kLo, Math.min(kHi, k)); // uç dışı → koşu kenarına çökert
      }
      if (!Number.isFinite(rTmp[kc])) kc = midK; // koşu içi tekil boşluk
      rOutG[gi(s, k)] = rTmp[kc];
      vG[gi(s, k)] = lo[s] + (span0 * Math.max(kLo, Math.min(kHi, k))) / NV;
    }
  }
  if (!sectorOk.some(Boolean)) throw new Error("Bor yüzeyi ölçülemedi — bölgeyi kontrol edin.");
  // ölçülemeyen sektör: en yakın geçerli sektörün düğümlerini AYNEN al
  // (yarıçap + v birlikte taşınır → yine ölçülmüş noktalara yapışır)
  for (let s = 0; s < N; s += 1) {
    if (sectorOk[s]) continue;
    let src = -1;
    for (let d = 1; d < N && src < 0; d += 1) {
      if (sectorOk[(s + d) % N]) src = (s + d) % N;
      else if (sectorOk[(s - d + N) % N]) src = (s - d + N) % N;
    }
    for (let k = 0; k <= NV; k += 1) {
      rOutG[gi(s, k)] = rOutG[gi(src, k)];
      vG[gi(s, k)] = vG[gi(src, k)];
    }
  }
  // iç yüzey: tek parçada SABİT silindir (medyan−tol−t) → her delik girişinin
  // altında kalır (kapama garantisi) + yerel et ≥ t; ayrı parçada rOut−t
  const rInFused = stats.median - stats.tol - t;
  const rInG = rOutG.map((r) => (gap <= 0 ? rInFused : r - t));
  for (const r of rInG) {
    if (r < 0.5) throw new Error("Astar iç yarıçapı anlamsız — kalınlığı azaltın.");
  }
  let spanMin = Infinity, spanMax = -Infinity;
  for (let s = 0; s < N; s += 1) {
    const sp = vG[gi(s, NV)] - vG[gi(s, 0)];
    spanMin = Math.min(spanMin, sp);
    spanMax = Math.max(spanMax, sp);
  }

  // ---- 3) WATERTIGHT KABUK: dış/iç yüzey ızgarası + iki uç şeridi ----
  const verts: number[] = [];
  const world = (r: number, th: number, v: number) => {
    const out = [frame.center.x, frame.center.y, frame.center.z];
    out[a] += v;
    out[(a + 1) % 3] += Math.cos(th) * r;
    out[(a + 2) % 3] += Math.sin(th) * r;
    return out;
  };
  const OFF = N * (NV + 1);
  for (let s = 0; s < N; s += 1) {
    const th = (s / N) * 2 * Math.PI;
    for (let k = 0; k <= NV; k += 1) verts.push(...world(rOutG[gi(s, k)], th, vG[gi(s, k)]));
  }
  for (let s = 0; s < N; s += 1) {
    const th = (s / N) * 2 * Math.PI;
    for (let k = 0; k <= NV; k += 1) verts.push(...world(rInG[gi(s, k)], th, vG[gi(s, k)]));
  }
  const idx: number[] = [];
  const quad = (a0: number, b0: number, c0: number, d0: number) => {
    idx.push(a0, b0, c0, a0, c0, d0);
  };
  for (let s = 0; s < N; s += 1) {
    const s2 = (s + 1) % N;
    for (let k = 0; k < NV; k += 1) {
      quad(gi(s, k), gi(s2, k), gi(s2, k + 1), gi(s, k + 1));
      quad(OFF + gi(s, k + 1), OFF + gi(s2, k + 1), OFF + gi(s2, k), OFF + gi(s, k));
    }
    quad(OFF + gi(s, 0), OFF + gi(s2, 0), gi(s2, 0), gi(s, 0));
    quad(gi(s, NV), gi(s2, NV), OFF + gi(s2, NV), OFF + gi(s, NV));
  }
  let geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(verts), 3));
  geo.setIndex(idx);
  geo = orientNestedShells(geo).geometry; // sarım yönü garanti
  geo.computeVertexNormals();
  geo.computeBoundingBox();

  const volumeMm3 = geometryVolumeMm3(geo);
  return {
    geometry: geo,
    volumeMm3,
    spanMm: spanMax,
    rOuterMm: Math.max(...rOutG),
    rInnerMm: Math.min(...rInG),
    spanMinMm: spanMin,
  };
}
