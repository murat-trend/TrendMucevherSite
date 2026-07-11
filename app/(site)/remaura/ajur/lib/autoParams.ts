import type { MeshBVH } from "three-mesh-bvh";
import * as THREE from "three";
import { patternById } from "./patterns";
import { maskUVBounds, type MaskFrame } from "./mask";
import { planHoles, type AjurParams, type HolePlan } from "./applyAjur";
import type { CastingRule } from "./castingRules";

// ---------------------------------------------------------------------------
// OTO AJUR çözücüsü — yoğunluk tercihi değil, MODEL + DÖKÜM KISITI:
//   - köprü ≥ güvenlik payı × max(metal kuralı, desen kuralı)
//   - delik ≥ dolum sınırı (küçük delik dökümde dolmaz)
//   - kenar payı bant genişliğine göre (dar bantta otomatik daralır)
//   - aday (ölçek, yoğunluk) ızgarası GERÇEK planHoles ile değerlendirilir,
//     kısıtı geçenler arasında en çok metal kazandıran seçilir.
// Literatür dayanağı: openwork'te desen "hem süs hem mühendislik"; ≤0.5-0.6mm
// eleman taşıyıcı sayılmaz (bkz. project_manufacturing_pipeline notu).
// ---------------------------------------------------------------------------

export type AutoLevel = "hafif" | "dengeli" | "agresif";

export type AutoSolveResult = {
  params: AjurParams;
  plan: HolePlan;
  /** kısıt raporu — UI'da "neden bu ayar" şeffaflığı */
  bridgeTargetMm: number;
  candidatesTried: number;
};

const HS_BY_LEVEL: Record<AutoLevel, number[]> = {
  hafif: [0.4, 0.45, 0.5],
  dengeli: [0.52, 0.58, 0.64],
  agresif: [0.66, 0.72, 0.78],
};

/** dökümde güvenle dolan asgari delik genişliği (mm) — dar delik dolmaz */
const MIN_HOLE_MM = 0.8;
/** köprü güvenlik çarpanı */
const BRIDGE_SAFETY = 1.25;

export function solveAutoParams(
  ctx: {
    geometry: THREE.BufferGeometry;
    bvh: MeshBVH;
    mask: Uint8Array;
    frame: MaskFrame;
    isShell: boolean;
  },
  patternId: string,
  level: AutoLevel,
  rule: CastingRule,
  frontSkinMm: number,
): AutoSolveResult {
  const pattern = patternById(patternId);
  if (!pattern) throw new Error("Desen bulunamadı.");
  const bounds = maskUVBounds(ctx.geometry, ctx.mask, ctx.frame);
  if (!bounds) throw new Error("Güvenli bölge boş — önce bölge seçin.");

  const bandV = bounds.maxV - bounds.minV;
  const bandU = bounds.maxU - bounds.minU;
  // kenar payı: PRD varsayılanı 1.5; dar bantta otomatik daralır (≥1.0)
  const margin = bandV < 7 ? Math.max(1.0, Math.min(1.5, bandV / 4)) : 1.5;
  const bridgeTarget = BRIDGE_SAFETY * Math.max(rule.minBridgeMm, pattern.minBridgeMm);

  // aday ölçekler: varsayılanın çevresi + bant genişliğine oranlı adaylar
  const cellCands = new Set<number>();
  for (const f of [0.6, 0.75, 0.9, 1.0, 1.2, 1.45, 1.75]) {
    cellCands.add(Math.min(12, Math.max(1.6, pattern.defaultCellMm * f)));
  }
  for (const rows of [1, 2, 3]) {
    // bandV'ye tam satır sığdıran ölçekler (satır adımı ~cell·0.8-1.0 varsayımı)
    const c = (bandV - 2 * margin) / (rows * 0.9);
    if (c >= 1.6 && c <= 12) cellCands.add(c);
  }

  let best: AutoSolveResult | null = null;
  let tried = 0;
  const evaluate = (cellMm: number, hs: number, minBridge: number) => {
    const params: AjurParams = {
      patternId, cellMm, holeScale: hs, rotationDeg: 0,
      marginMm: margin, frontSkinMm,
    };
    let plan: HolePlan;
    try {
      plan = planHoles(ctx, params);
    } catch {
      return;
    }
    tried += 1;
    if (plan.placements.length < 4) return;
    if (plan.bridgeMm < minBridge) return;
    // delik dolum sınırı: en küçük delik genişliği ~cell·hs·(desene göre) —
    // pratik vekil: köprü hesabındaki poligon genişliği yerine hücre×oran
    if (cellMm * Math.min(0.92, Math.max(0.2, hs)) * 0.5 < MIN_HOLE_MM) return;
    if (!best || plan.removedMm3 > best.plan.removedMm3) {
      best = { params, plan, bridgeTargetMm: bridgeTarget, candidatesTried: 0 };
    }
  };

  if (pattern.layout === "central") {
    // merkezî desen (gül penceresi): ölçek maske yarıçapından; sadece hs taranır
    for (const hs of HS_BY_LEVEL[level]) evaluate(pattern.defaultCellMm, hs, bridgeTarget);
    if (!best) for (const hs of HS_BY_LEVEL[level]) evaluate(pattern.defaultCellMm, hs, bridgeTarget / BRIDGE_SAFETY);
  } else {
    for (const hs of HS_BY_LEVEL[level]) {
      for (const cell of cellCands) evaluate(cell, hs, bridgeTarget);
    }
    // hiçbiri geçmediyse güvenlik payını gevşet (1.0×) — yine kural altına İNME
    if (!best) {
      for (const hs of HS_BY_LEVEL[level]) {
        for (const cell of cellCands) evaluate(cell, hs, bridgeTarget / BRIDGE_SAFETY);
      }
    }
  }

  if (!best) {
    throw new Error(
      "Bu desen bu bölgeye güvenli parametrelerle sığmadı — farklı desen deneyin ya da bölgeyi genişletin.",
    );
  }
  (best as AutoSolveResult).candidatesTried = tried;
  void bandU;
  return best;
}
