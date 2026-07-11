import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";
import { geoToManifold, loadManifold, manifoldToGeo, manifoldVolume, type ManifoldT } from "./manifoldKit";
import { drillRayOfUV, maskUVBounds, type MaskFrame } from "./mask";
import { patternById, polyArea, type Poly } from "./patterns";

// ---------------------------------------------------------------------------
// Ajur motoru (PRD §4.5) — maske içine patern yerleşimi + per-delik yönlü
// prizma + Manifold difference.
//   - Delik merkezleri UV'de üretilir (tile/central), maske kapsaması ve
//     kenar payı (margin) ışın örnekleriyle doğrulanır → maske dışına taşmaz.
//   - Derinlik per-delik ışınla ölçülür: kabukta delik kaviteye açılır;
//     dolu modelde ön et (frontSkin) korunarak kör biter.
//   - Yüzükte (silindirik) delik şankı boydan boya deler; yerel duvar medyanın
//     2.5 katından kalınsa (heykel/kafa bölgesi) delik ATLANIR.
// ---------------------------------------------------------------------------

export type AjurParams = {
  patternId: string;
  /** hücre/ölçek (mm) */
  cellMm: number;
  /** delik/göz oranı 0.2..0.92 (yoğunluk) */
  holeScale: number;
  /** desen döndürme (derece, UV düzleminde) */
  rotationDeg: number;
  /** kenar payı — delik maske kenarına bundan fazla yaklaşmaz (mm) */
  marginMm: number;
  /** dolu modelde ön yüzde korunacak et (mm) */
  frontSkinMm: number;
  /** kabuk modelde deliğin dibinde bırakılacak KAPALI ZEMİN (mm; 0 = kaviteye
   *  açık). Kapaklı-ajur görünümü: desen okunur, arkası kapalı. */
  floorMm?: number;
};

export type HolePlacement = {
  /** merkeze göre poligon (UV mm) */
  poly: Poly;
  /** dünya: yüzey giriş noktası */
  entry: THREE.Vector3;
  /** dünya: delme yönü */
  dir: THREE.Vector3;
  /** ışın orijininden prizma başlangıcı */
  startDist: number;
  depth: number;
  areaMm2: number;
  /** yerel duvar kalınlığı (giriş→ilk çıkış) */
  wallMm: number;
  /** delik sütunundaki tekilleştirilmiş yüzey mesafeleri (ilk 4) —
   *  ≥3 vuruş = duvar arkasında KAVİTE var; 2 vuruş = dolu kesit */
  dists: number[];
  /** ayak izi örnekleri: [merkez, 8 çevre] — her biri dedup'lı mesafe listesi */
  samples?: number[][];
};

export type HolePlan = {
  placements: HolePlacement[];
  skipped: number;
  /** desen köprüsü tahmini (mm) — komşu delikler arası en dar et */
  bridgeMm: number;
  /** tahmini çıkarılan hacim (mm³) — canlı gram sayacı için */
  removedMm3: number;
};

type PlanCtx = {
  geometry: THREE.BufferGeometry;
  bvh: MeshBVH;
  mask: Uint8Array;
  frame: MaskFrame;
  /** model kabuk mu (içi boş)? — derinlik stratejisini belirler */
  isShell: boolean;
};

const rot2 = (p: [number, number], c: number, s: number): [number, number] =>
  [p[0] * c - p[1] * s, p[0] * s + p[1] * c];

const centroid = (poly: Poly): [number, number] => {
  let u = 0, v = 0;
  for (const [x, y] of poly) { u += x; v += y; }
  return [u / poly.length, v / poly.length];
};

const maxRadius = (poly: Poly, c: [number, number]): number => {
  let r = 0;
  for (const [x, y] of poly) r = Math.max(r, Math.hypot(x - c[0], y - c[1]));
  return r;
};

/** hit yüzü maskeli mi (3 vertexten ≥2'si) */
function faceMasked(mask: Uint8Array, face: { a: number; b: number; c: number } | null | undefined): boolean {
  if (!face) return false;
  return mask[face.a] + mask[face.b] + mask[face.c] >= 2;
}

type RayHit = { distance: number; face?: { a: number; b: number; c: number } | null };

function castUV(ctx: PlanCtx, u: number, v: number): { hits: RayHit[]; origin: THREE.Vector3; dir: THREE.Vector3 } {
  const { origin, dir } = drillRayOfUV(ctx.frame, u, v);
  const hits = ctx.bvh
    .raycast(new THREE.Ray(origin, dir), THREE.DoubleSide)
    .sort((a, b) => a.distance - b.distance) as unknown as RayHit[];
  return { hits, origin, dir };
}

/** Delik yerleşim planı — boolean çalıştırmadan (canlı önizleme + sayaç). */
export function planHoles(ctx: PlanCtx, params: AjurParams): HolePlan {
  const pattern = patternById(params.patternId);
  if (!pattern) throw new Error("Desen bulunamadı.");
  const bounds = maskUVBounds(ctx.geometry, ctx.mask, ctx.frame);
  if (!bounds) throw new Error("Güvenli bölge boş — önce bölge seçin.");

  const rotRad = (params.rotationDeg * Math.PI) / 180;
  const rc = Math.cos(rotRad), rs = Math.sin(rotRad);
  const cu0 = (bounds.minU + bounds.maxU) / 2;
  const cv0 = (bounds.minV + bounds.maxV) / 2;
  const margin = Math.max(0.5, params.marginMm);

  // aday delikler: [merkez-göreli poly, UV merkez]
  const candidates: { poly: Poly; cu: number; cv: number }[] = [];
  let bridgeMm = Infinity;

  if (pattern.layout === "central" && pattern.central) {
    const R = Math.max(1, Math.min(bounds.maxU - bounds.minU, bounds.maxV - bounds.minV) / 2 - margin);
    for (const poly of pattern.central(R, params.holeScale)) {
      const rotated = poly.map((p) => rot2(p, rc, rs)) as Poly;
      const c = centroid(rotated);
      candidates.push({
        poly: rotated.map(([x, y]) => [x - c[0], y - c[1]]) as Poly,
        cu: cu0 + c[0],
        cv: cv0 + c[1],
      });
    }
    bridgeMm = R * 0.08; // rozet içi köprüler tasarımda sabit orana yakın
  } else if (pattern.tile) {
    const spec = pattern.tile(params.cellMm, params.holeScale);
    // köprü tahmini: hücre adımı − desen genişliği
    let polyW = 0, polyH = 0;
    for (const poly of spec.polys) {
      let mnU = Infinity, mxU = -Infinity, mnV = Infinity, mxV = -Infinity;
      for (const [x, y] of poly) {
        if (x < mnU) mnU = x; if (x > mxU) mxU = x;
        if (y < mnV) mnV = y; if (y > mxV) mxV = y;
      }
      polyW = Math.max(polyW, mxU - mnU);
      polyH = Math.max(polyH, mxV - mnV);
    }
    bridgeMm = Math.max(0.05, Math.min(spec.strideU - polyW, spec.strideV - polyH));

    // döndürülmüş kafes tüm sınırları kapsasın → genişletilmiş yarıçap.
    // Kafes MERKEZE hizalı başlar (lv=0 satırı bant ortasında) — dar bantlarda
    // yarım-adım kayma tüm satırı kenar payına düşürüp deliksiz bırakıyordu.
    const spanU = bounds.maxU - bounds.minU;
    const spanV = bounds.maxV - bounds.minV;
    const half = Math.hypot(spanU, spanV) / 2 + params.cellMm;
    const v0 = -Math.floor(half / spec.strideV) * spec.strideV;
    const u0 = -Math.floor(half / spec.strideU) * spec.strideU;
    let row = Math.round(-v0 / spec.strideV) % 2; // stagger parite merkeze göre sabit
    for (let lv = v0; lv <= half; lv += spec.strideV, row += 1) {
      const off = row % 2 === 1 ? spec.staggerU : 0;
      for (let lu = u0 + off; lu <= half; lu += spec.strideU) {
        const [ru, rvv] = rot2([lu, lv], rc, rs);
        const cu = cu0 + ru, cv = cv0 + rvv;
        if (cu < bounds.minU - 0.01 || cu > bounds.maxU + 0.01) continue;
        if (cv < bounds.minV - 0.01 || cv > bounds.maxV + 0.01) continue;
        for (const poly of spec.polys) {
          const rotated = poly.map((p) => rot2(p, rc, rs)) as Poly;
          const c = centroid(rotated);
          candidates.push({
            poly: rotated.map(([x, y]) => [x - c[0], y - c[1]]) as Poly,
            cu: cu + c[0],
            cv: cv + c[1],
          });
        }
      }
    }
  }

  // ışın doğrulaması: maske kapsaması + kenar payı + derinlik
  const pre: (HolePlacement & { cu: number; cv: number })[] = [];
  let skipped = 0;
  for (const cand of candidates) {
    const r = maxRadius(cand.poly, [0, 0]);
    const { hits, origin, dir } = castUV(ctx, cand.cu, cand.cv);
    if (hits.length < 2 || !faceMasked(ctx.mask, hits[0].face)) { skipped += 1; continue; }

    // kenar payı: delik çevresi + margin halkası tamamen maskede olmalı
    let ok = true;
    const ring = r + margin;
    for (let k = 0; k < 8; k += 1) {
      const a = (k / 8) * Math.PI * 2;
      const s = castUV(ctx, cand.cu + Math.cos(a) * ring, cand.cv + Math.sin(a) * ring);
      if (s.hits.length === 0 || !faceMasked(ctx.mask, s.hits[0].face)) { ok = false; break; }
    }
    if (!ok) { skipped += 1; continue; }

    // sütun profili: yakın çift vuruşları tekle (kenar paylaşan üçgenler)
    const dedup = (hs: RayHit[]): number[] => {
      const out: number[] = [];
      for (const h of hs) {
        if (out.length === 0 || h.distance - out[out.length - 1] > 1e-4) out.push(h.distance);
        if (out.length >= 4) break;
      }
      return out;
    };
    const dists = dedup(hits);
    if (dists.length < 2) { skipped += 1; continue; }
    const wall = dists[1] - dists[0];
    if (wall <= 0.05) { skipped += 1; continue; }

    // AYAK İZİ PROFİLİ: yüksek rölyefte yüzey delik içinde >1mm dalgalanır —
    // derinlik yalnız merkezden ölçülürse delik kenarı ön/dış eti deler.
    // Poligonun kendi noktalarından 8 örnek (0.8 ölçekli) + merkez birlikte
    // değerlendirilir; derinlik EN KÖTÜ örneğe göre sınırlanır.
    const samples: number[][] = [dists];
    let footprintOk = true;
    const nPts = cand.poly.length;
    for (let k = 0; k < 8; k += 1) {
      const [pu, pv] = cand.poly[Math.floor((k * nPts) / 8)];
      const s = castUV(ctx, cand.cu + pu * 0.8, cand.cv + pv * 0.8);
      const sd = dedup(s.hits);
      if (sd.length < 2) { footprintOk = false; break; }
      samples.push(sd);
    }
    if (!footprintOk) { skipped += 1; continue; }

    const entry = origin.clone().addScaledVector(dir, dists[0]);
    pre.push({
      poly: cand.poly, cu: cand.cu, cv: cand.cv,
      entry, dir, startDist: dists[0] - 0.5, depth: 0, wallMm: wall,
      areaMm2: polyArea(cand.poly), dists, samples,
    });
  }

  // derinlik stratejisi — KURAL: dış/ön sculpt yüzeyi ASLA delinmez.
  // Her delik KENDİ sütun profiline bakar (isShell tek başına yetmez — kabuk
  // modelde de tabla altı gibi kavitesiz DOLU kesitler vardır):
  //   sütunda ≥3 yüzey (duvar + kavite): boşluğa açıl, karşı duvara DEĞME
  //   sütunda 2 yüzey (dolu kesit): kör — dış/ön yüze frontSkin payı kala dur
  const walls = pre.map((p) => p.wallMm).sort((a, b) => a - b);
  const medianWall = walls.length ? walls[Math.floor(walls.length / 2)] : 0;
  const frontSkin = Math.max(0.3, params.frontSkinMm);
  const placements: HolePlacement[] = [];
  for (const p of pre) {
    const hasCavity = ctx.isShell && p.dists.length >= 3;
    if (ctx.frame.kind === "cylindrical" && !hasCavity) {
      // heykel/kafa bölgesi (aşırı kalın dolu kesit) tamamen atlanır
      if (p.wallMm > Math.max(medianWall * 2.5, medianWall + 2)) { skipped += 1; continue; }
    }
    // ayak izinin HER örneğinde güvenli kalan azami derinlik (o örneğin kendi
    // girişine göre; paralel ışınlar → giriş yüzeyi farkları kendiliğinden düşer)
    const floor = Math.max(0, params.floorMm ?? 0);
    let allowed = Infinity;   // hiçbir örnekte dış/ön ihlali veya karşı duvar teması olmasın
    let needed = 0;           // kavite örneklerinde tam açılmak için gereken
    for (const s of p.samples ?? [p.dists]) {
      const w = s[1] - s[0];
      if (ctx.isShell && s.length >= 3) {
        // zeminli mod: delik kaviteye AÇILMAZ, dibinde floor kadar et kalır
        allowed = Math.min(allowed, floor > 0 ? w - floor : (s[2] - s[0]) - 0.3);
        if (floor <= 0) needed = Math.max(needed, w + 0.3);
      } else {
        allowed = Math.min(allowed, w - frontSkin);
      }
    }
    if (hasCavity && floor > 0) {
      if (allowed < 0.3) { skipped += 1; continue; }
      p.depth = 0.5 + allowed;
    } else if (hasCavity) {
      const d = Math.min(allowed, Math.max(needed, 0.4));
      if (d < 0.4) { skipped += 1; continue; }
      p.depth = 0.5 + d;
    } else {
      if (allowed < 0.4) { skipped += 1; continue; }
      p.depth = 0.5 + allowed;
    }
    placements.push(p);
  }

  const removedMm3 = placements.reduce((s, p) => s + p.areaMm2 * Math.max(0, p.depth - 0.5), 0);
  return { placements, skipped, bridgeMm, removedMm3 };
}

export type AjurApplyResult = {
  geometry: THREE.BufferGeometry;
  holes: number;
  volumeBeforeMm3: number;
  volumeAfterMm3: number;
  ms: number;
};

/** Gerçek boolean — plan edilen delikleri Manifold difference ile deler. */
export async function applyAjur(
  ctx: PlanCtx,
  plan: HolePlan,
  opts: { onProgress?: (p: number) => void; signal?: AbortSignal } = {},
): Promise<AjurApplyResult> {
  const t0 = Date.now();
  if (plan.placements.length === 0) throw new Error("Desen bu bölgeye sığmadı — ölçeği ya da kenar payını değiştirin.");
  const w = await loadManifold();
  const { Manifold } = w;

  const aVec = new THREE.Vector3();
  const uVec = new THREE.Vector3();
  let prisms: ManifoldT | null = null;
  let done = 0;
  for (const p of plan.placements) {
    if (opts.signal?.aborted) throw new DOMException("Ajur iptal edildi.", "AbortError");
    // yerel taban — determinant POZİTİF kalmalı (ayna katı yasak):
    //   silindirik: X=teğet(â×d̂), Y=eksen, Z=d̂ → det=+1
    //   düzlemsel: X=u, Y=v, Z=+normal (det=+1); prizma dıştan içe indiği için
    //   taban uzak uçtan başlar, +normal yönünde geri extrude edilir.
    let zVec: THREE.Vector3;
    let base: THREE.Vector3;
    if (ctx.frame.kind === "cylindrical") {
      aVec.set(0, 0, 0).setComponent(ctx.frame.axisIndex, 1);
      uVec.crossVectors(aVec, p.dir).normalize();
      zVec = p.dir;
      base = p.entry.clone().addScaledVector(p.dir, -0.5); // girişten 0.5 önce
    } else {
      uVec.copy(ctx.frame.u);
      aVec.copy(ctx.frame.v);
      zVec = ctx.frame.normal;
      base = p.entry.clone().addScaledVector(p.dir, p.depth - 0.5); // dipten geriye
    }
    const m: number[] = [
      uVec.x, uVec.y, uVec.z, 0,
      aVec.x, aVec.y, aVec.z, 0,
      zVec.x, zVec.y, zVec.z, 0,
      base.x, base.y, base.z, 1,
    ];
    const prism = Manifold.extrude([p.poly], p.depth).transform(m as unknown as Parameters<ManifoldT["transform"]>[0]);
    prisms = prisms ? prisms.add(prism) : prism;
    done += 1;
    if (done % 12 === 0) {
      opts.onProgress?.((done / plan.placements.length) * 0.6);
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  opts.onProgress?.(0.65);
  const body = geoToManifold(w, ctx.geometry);
  const volumeBeforeMm3 = manifoldVolume(body);
  const result = body.subtract(prisms!);
  opts.onProgress?.(0.9);
  const volumeAfterMm3 = manifoldVolume(result);
  const geometry = manifoldToGeo(result);
  body.delete?.(); prisms!.delete?.(); result.delete?.();
  opts.onProgress?.(1);

  return { geometry, holes: plan.placements.length, volumeBeforeMm3, volumeAfterMm3, ms: Date.now() - t0 };
}
