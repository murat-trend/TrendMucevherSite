import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { cutAndCap, type Axis, type CapContour, type CutPlane, type PatternType } from "./ajurOps";
import { buildPatternPanel } from "./ajurOps";
import { manifoldUnion, buildHollowAjurDifference } from "./ajurBoolean";
import { hollowShellSDF } from "../../mesh-temizle/lib/meshOps";

// ---------------------------------------------------------------------------
// Ajur B — orkestratör (V1: ana-thread; imza worker-ready)
// ---------------------------------------------------------------------------
// Kilitli kararlar (project_ajour_feature):
//   1) B modeli: ön korunur → arkadan iç boşluk → desenli slab → union
//   2) V1 ana-thread; V2 worker (aynı imza, execution: 'worker')
//   3) Varsayılan çıktı: single-piece (union)
//   4) wallMm default 1.0 (slider 0.5–2.0)
//   5) slab THROUGH openwork (delikler iç boşluğa açılır)
//   6) frame zorunlu: border >= wallMm (slab konturu taşmaz)
//
// Bugün ana-thread'de çalışır; yarın aynı `runAjurPipeline` imzasıyla worker
// backend'e taşınır. UI'dan bağımsız: saf geometri girer, saf sonuç çıkar.
// ---------------------------------------------------------------------------

export type AjurStage = "prepare" | "cut" | "hollow" | "panel" | "compose" | "finalize";

export type AjurPipelineProgress = {
  stage: AjurStage;
  percent: number;   // 0..100 (genel ilerleme)
  message: string;   // kullanıcıya gösterilecek adım etiketi (servis adı YOK)
};

export type AjurPipelineParams = {
  geometry: THREE.BufferGeometry;
  /** arka kesim düzlemi (yön + derinlik UI'da yöne çevrilir) */
  backPlane: CutPlane;
  /** iç duvar kalınlığı (mm) — default 1.0 */
  wallMm: number;
  /** desen */
  pattern: PatternType;
  /** kontur genişliğine kaç göz sığsın (cell = maxExtent/cellsAcross) */
  cellsAcross: number;
  /** delik/göz oranı 0..1 */
  holeScale: number;
  /** slab kalınlığı (mm) */
  thickness: number;
  /** kenar payı (mm) — frame; otomatik max(border, wallMm) uygulanır */
  border: number;
  /** ön yüzde korunacak min et (mm) — delik bunu asla ihlal etmez */
  frontSkinMm: number;
  /** decimate hedef üçgen (0/undefined = atla) */
  decimateTarget?: number;
  /**
   * Arka geometri stratejisi:
   *  - "drill-back" (varsayılan): hollow + arka duvarı kör-delme → delikler iç
   *    boşluğa açılır (ışık geçer), ön figür delinmez. Tek boolean.
   *  - "slab-union": hollow + ayrı desenli slab + union. Slab delikleri kabuk
   *    arka duvarına çarpar (dekoratif kabartma; ışık geçmez).
   */
  compose?: "drill-back" | "slab-union";
};

export type AjurPipelineOpts = {
  onProgress?: (p: AjurPipelineProgress) => void;
  /** single = union (varsayılan); two-piece = kabuk + slab ayrı */
  mode?: "single" | "two-piece";
  /** V1 'main-thread'; V2 'worker' (henüz uygulanmadı) */
  execution?: "main-thread" | "worker";
  /** iptal — ana-thread'de adımlar arasında kontrol edilir */
  signal?: AbortSignal;
};

export type AjurPipelineResult = {
  mode: "single" | "two-piece";
  /** single → tek parça; two-piece → null (parts kullan) */
  geometry: THREE.BufferGeometry | null;
  /** ara parçalar; panel yalnız slab-union stratejisinde dolu */
  parts: { shell: THREE.BufferGeometry; panel: THREE.BufferGeometry | null };
  stats: {
    inputTris: number;
    workingTris: number;
    holes: number;
    strutMm: number;
    cavityMm3: number;
    wallMm: number;
    ms: number;
  };
};

// Adımlar arası event loop'a nefes ver (overlay boyansın) + iptal kontrolü
function yieldFrame(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}
function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Ajur üretimi iptal edildi.", "AbortError");
}

// Decimate (QEM) — meshoptimizer. STL soup ya da indekslli geometri kabul eder.
async function decimateGeometry(geometry: THREE.BufferGeometry, targetTris: number): Promise<THREE.BufferGeometry> {
  // KRİTİK: normalleri sil, sonra weld. Aksi halde non-indexed soup'ta her üçgenin
  // düz normali farklı → mergeVertices POZİSYON aynı olsa bile birleştirmez →
  // kaynaksız mesh'i meshopt sadeleştiremez → 0 üçgen. (Boudica'da bu çıktı.)
  const src = geometry.clone();
  src.deleteAttribute("normal");
  src.deleteAttribute("uv");
  const indexed = mergeVertices(src);
  const idx = indexed.index!.array as ArrayLike<number>;
  const pos = indexed.attributes.position.array as Float32Array;
  const curTris = idx.length / 3;
  if (curTris <= targetTris) return indexed;

  const { MeshoptSimplifier } = await import("meshoptimizer");
  await MeshoptSimplifier.ready;
  const indexU32 = idx instanceof Uint32Array ? idx : new Uint32Array(idx);
  const posF32 = pos instanceof Float32Array ? pos : new Float32Array(pos);
  const [newIdx] = MeshoptSimplifier.simplify(indexU32, posF32, 3, targetTris * 3, 1.0, ["Prune"]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(posF32, 3));
  geo.setIndex(new THREE.Uint32BufferAttribute(new Uint32Array(newIdx), 1));
  geo.computeVertexNormals();
  return geo;
}

// Kontur dış loop'unun 2D en geniş açıklığı (cell hesabı için)
function contourMaxExtent(c: CapContour): number {
  const outer = [...c.loops].sort((a, b) => Math.abs(b.area) - Math.abs(a.area))[0];
  let mnU = Infinity, mxU = -Infinity, mnV = Infinity, mxV = -Infinity;
  for (let i = 0; i < outer.u.length; i += 1) {
    if (outer.u[i] < mnU) mnU = outer.u[i]; if (outer.u[i] > mxU) mxU = outer.u[i];
    if (outer.v[i] < mnV) mnV = outer.v[i]; if (outer.v[i] > mxV) mxV = outer.v[i];
  }
  return Math.max(mxU - mnU || 1, mxV - mnV || 1);
}

const triCount = (g: THREE.BufferGeometry) => (g.index ? g.index.count : g.attributes.position.count) / 3;

// Seçilen eksende EN GENİŞ kapalı konturu veren pozisyon. Rölyefli modellerde
// kenara yakın kesitlerde loop kapanmaz (kontur çıkmaz); orta bölgede kapanır.
function bestFootprintPosition(geo: THREE.BufferGeometry, axis: Axis): number {
  const probes = [0.5, 0.45, 0.55, 0.4, 0.6, 0.35, 0.65, 0.3, 0.7, 0.25, 0.75];
  let best = 0.5, bestArea = -1;
  for (const p of probes) {
    try {
      const c = cutAndCap(geo, { axis, position: p, flip: false }).contour;
      if (!c) continue;
      const area = Math.max(...c.loops.map((l) => Math.abs(l.area)), 0);
      if (area > bestArea) { bestArea = area; best = p; }
    } catch { /* yok say */ }
  }
  return best;
}

export async function runAjurPipeline(
  params: AjurPipelineParams,
  opts: AjurPipelineOpts = {},
): Promise<AjurPipelineResult> {
  const { onProgress, signal } = opts;
  const mode = opts.mode ?? "single";
  if ((opts.execution ?? "main-thread") === "worker") {
    throw new Error("Worker yürütmesi henüz hazır değil (V2). 'main-thread' kullanın.");
  }
  const emit = (stage: AjurStage, percent: number, message: string) =>
    onProgress?.({ stage, percent, message });

  const t0 = Date.now();
  const inputTris = triCount(params.geometry);
  const wallMm = Math.max(0.5, Math.min(2.0, params.wallMm));
  const border = Math.max(params.border, wallMm); // Kilit 6: frame >= duvar

  // ---- Stage 0: Prepare (decimate + weld) ----
  throwIfAborted(signal);
  emit("prepare", 4, "Mesh hazırlanıyor…");
  await yieldFrame();
  let working = params.geometry;
  if (params.decimateTarget && inputTris > params.decimateTarget) {
    emit("prepare", 10, `Mesh sadeleştiriliyor (${(inputTris / 1000).toFixed(0)}K → ${(params.decimateTarget / 1000).toFixed(0)}K)…`);
    await yieldFrame();
    working = await decimateGeometry(params.geometry, params.decimateTarget);
  }
  const workingTris = triCount(working);

  // Sağlam footprint düzlemi — seçilen eksende en geniş kapalı kesit
  // (rölyefli modelde kenara yakın pozisyonda kontur çıkmaz → bu garanti verir).
  throwIfAborted(signal);
  const axis = params.backPlane.axis;
  const footprint: CutPlane = { axis, position: bestFootprintPosition(working, axis), flip: params.backPlane.flip };

  const compose = params.compose ?? "drill-back";
  let outGeo: THREE.BufferGeometry | null = null;
  let panelGeo: THREE.BufferGeometry | null = null;
  let holes = 0, strutMm = 0, cavityMm3 = 0;
  let shell: THREE.BufferGeometry;

  if (compose === "drill-back") {
    // İçi boşalt (levelSet kavite, manifold) + arka duvarı KISA del → delikler
    // kaviteye açılır, ÖN figüre asla ulaşmaz. Solid garantili-manifold → güvenli.
    throwIfAborted(signal);
    emit("hollow", 26, "İç boşluk oluşturuluyor…");
    await yieldFrame();
    const fc = cutAndCap(working, footprint).contour;
    if (!fc) throw new Error("Bu yönde silüet çıkarılamadı — başka bir yön seçin.");
    const cell = Math.max(contourMaxExtent(fc) / Math.max(1, params.cellsAcross), 1e-3);
    const drill = await buildHollowAjurDifference(working, {
      pattern: params.pattern, cell, holeScale: params.holeScale, border,
      wallMm, frontSkinMm: params.frontSkinMm,
      fromMax: footprint.flip, footprintPlane: footprint, footprintContour: fc,
      onProgress: (p) => emit("hollow", 26 + Math.round(p * 44), "İç boşluk oluşturuluyor…"),
    });
    emit("compose", 88, "Arka ajur deliniyor…");
    await yieldFrame();
    shell = working; cavityMm3 = drill.cavityMm3;
    outGeo = drill.geometry; holes = drill.holes; strutMm = drill.strutMm;
  } else {
    // slab-union: arkadan kes → ön gövde + slab kontur → hollow → panel → union
    // ---- Stage 1: Back cut ----
    emit("cut", 18, "Arka yüz kesiliyor…");
    await yieldFrame();
    let cut = cutAndCap(working, params.backPlane);
    if (!cut.contour) cut = cutAndCap(working, footprint); // sağlam pozisyona düş
    if (!cut.contour) throw new Error("Arka kesit çıkmadı — başka bir yön seçin.");
    cut.geometry.computeVertexNormals();

    // ---- Stage 2: Hollow ----
    throwIfAborted(signal);
    emit("hollow", 26, "İç boşluk oluşturuluyor…");
    await yieldFrame();
    const hollow = hollowShellSDF(cut.geometry, wallMm, {
      onProgress: (p) => emit("hollow", 26 + Math.round(p * 38), "İç boşluk oluşturuluyor…"),
    });
    shell = hollow.shell; shell.computeVertexNormals(); cavityMm3 = hollow.cavityMm3;

    // ---- Stage 3: Desenli slab ----
    throwIfAborted(signal);
    emit("panel", 68, "Ajur panel üretiliyor…");
    await yieldFrame();
    const cell = Math.max(contourMaxExtent(cut.contour) / Math.max(1, params.cellsAcross), 1e-3);
    const panel = buildPatternPanel(cut.contour, {
      pattern: params.pattern, cell, holeScale: params.holeScale,
      thickness: params.thickness, border,
    });
    if (panel.holes === 0) throw new Error("Panele desen sığmadı — sıklığı artırın ya da delik boyutunu küçültün.");
    panel.geometry.computeVertexNormals();
    panelGeo = panel.geometry; holes = panel.holes; strutMm = panel.strutMm;

    // ---- Stage 4: Compose ----
    throwIfAborted(signal);
    if (mode === "single") {
      emit("compose", 82, "Tek parça birleştiriliyor…");
      await yieldFrame();
      const u = await manifoldUnion(shell, panel.geometry);
      outGeo = u.geometry;
    } else {
      emit("compose", 90, "Parçalar hazırlanıyor…");
      await yieldFrame();
    }
  }

  // ---- Stage 5: Finalize ----
  emit("finalize", 98, "Sonlandırılıyor…");
  await yieldFrame();
  emit("finalize", 100, "Tamamlandı.");

  return {
    mode,
    geometry: mode === "two-piece" && compose === "slab-union" ? null : outGeo,
    parts: { shell, panel: panelGeo },
    stats: {
      inputTris, workingTris, holes, strutMm,
      cavityMm3, wallMm,
      ms: Date.now() - t0,
    },
  };
}
