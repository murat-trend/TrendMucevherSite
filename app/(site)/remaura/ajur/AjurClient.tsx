"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";
import { AjurViewer, type ViewerMode } from "./AjurViewer";
import { loadStl, exportStlBlob } from "./lib/stl";
import { validateOnLoad, detectShell, scanMinWall, blameThinHoles, thinPositions, triCount, MAX_TRIS, type MinWallScan } from "./lib/validate";
import { decimateGeometry } from "./lib/decimate";
import { autoLevelGeometry } from "./lib/ajurOps";
import {
  detectModelKind, autoMaskRing, autoMaskMedallion, applyBrush, maskedCount,
  type MaskFrame, type ModelKind,
} from "./lib/mask";
import { PATTERNS, patternById } from "./lib/patterns";
import { planHoles, applyAjur, type AjurParams, type HolePlan } from "./lib/applyAjur";
import { solveAutoParams, type AutoLevel } from "./lib/autoParams";
import { hollowModel } from "./lib/hollow";
import { buildRingLiner } from "./lib/liner";
import { exportObjGrouped } from "./lib/objExport";
import { manifoldUnion } from "./lib/ajurBoolean";
import { estimateHollowCavity, gramForMetal } from "./lib/estimate";
import { CASTING_RULES, type MetalKey } from "./lib/castingRules";
import { METALS } from "../mesh-temizle/lib/meshOps";
import { readBridge, writeBridge, clearBridge, type BridgeRecord } from "@/lib/remaura/mesh-bridge";

// ---------------------------------------------------------------------------
// Ajur & Arka Kesim — yeniden yapım (PRD v1.0, Temmuz 2026)
// 5 adım: Yükle → Analiz → Bölge → Ajur → İndir
// Tamamen tarayıcıda çalışır; dosya sunucuya asla gitmez.
// ---------------------------------------------------------------------------

type Step = 1 | 2 | 3 | 4 | 5;

type ModelState = {
  geometry: THREE.BufferGeometry;
  bvh: MeshBVH;
  tris: number;
  volumeMm3: number;
  isShell: boolean;
  fileName: string;
};

type ResultState = {
  geometry: THREE.BufferGeometry;
  holes: number;
  volumeBeforeMm3: number;
  volumeAfterMm3: number;
  ms: number;
};

const STEPS: { id: Step; label: string }[] = [
  { id: 1, label: "Yükle" },
  { id: 2, label: "Analiz" },
  { id: 3, label: "Bölge" },
  { id: 4, label: "Ajur" },
  { id: 5, label: "İndir" },
];

const fmt1 = (x: number) => x.toLocaleString("tr-TR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const fmt2 = (x: number) => x.toLocaleString("tr-TR", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

/** İç astar (kapak) kartı — konforme motor yoğun-organik borlarda (sarkan süs
 *  + gravür + konik flare) kanıt-testlerini geçene dek KAPALI. Taşan astar
 *  üretmektense gizli; kapaklı görünümün kanıtlı yolu: Gelişmiş > Delik zemini.
 *  Motor: lib/liner.ts · testler: scripts/test_liner.mts */
const LINER_ENABLED = false;

export function AjurClient() {
  const [step, setStep] = useState<Step>(1);
  const [model, setModel] = useState<ModelState | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // köprü (iç boşaltmadan geliş)
  const [bridgeRec, setBridgeRec] = useState<BridgeRecord | null>(null);

  // metal + gram
  const [metal, setMetal] = useState<MetalKey>("ag925");

  // maske
  const [kind, setKind] = useState<ModelKind>("medallion");
  const [frame, setFrame] = useState<MaskFrame | null>(null);
  const maskRef = useRef<Uint8Array | null>(null);
  const [maskVersion, setMaskVersion] = useState(0);
  const [viewerMode, setViewerMode] = useState<ViewerMode>("orbit");
  const [brushRadius, setBrushRadius] = useState(2);

  // patern parametreleri
  const [patternId, setPatternId] = useState("oval");
  const [cellMm, setCellMm] = useState(3.2);
  const [holeScale, setHoleScale] = useState(0.6);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [marginMm, setMarginMm] = useState(1.5);
  const [frontSkinMm, setFrontSkinMm] = useState(1.0);

  // plan (canlı önizleme + sayaç)
  const [plan, setPlan] = useState<HolePlan | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  // OTO AJUR — yoğunluk modele/kurala göre çözülür; slider'lar "Gelişmiş"te
  const [autoLevel, setAutoLevel] = useState<AutoLevel>("dengeli");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [solving, setSolving] = useState(false);
  /** oto modda tarama sonrası otomatik oto-düzelt hakkı (küçült + kaldır = 2 tur) */
  const autoChainRef = useRef(0);
  /** oto düzelt kademesi: 0 = suçlu delikleri KÜÇÜLT, 1 = KALDIR */
  const fixStageRef = useRef(0);

  // senaryo
  const [hollowEstMm3, setHollowEstMm3] = useState<number | null>(null);

  // uygulama süreci
  const [applying, setApplying] = useState(false);
  const [applyPct, setApplyPct] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // sayfa içi iç boşaltma + çekme payı
  const [hollowing, setHollowing] = useState(false);
  const [hollowWallMm, setHollowWallMm] = useState(1.0);
  const [shrinkPct, setShrinkPct] = useState(2.0);

  // KAPAK: delik zemini (kabukta) + yüzük iç astarı
  const [floorMm, setFloorMm] = useState(0);
  const [linerThicknessMm, setLinerThicknessMm] = useState(0.5);
  const [linerMode, setLinerMode] = useState<"fused" | "separate">("fused");
  const [linerGapMm, setLinerGapMm] = useState(0.25);
  const [linerBusy, setLinerBusy] = useState(false);
  /** ayrı-parça astar (kendi STL'i); tek parçada null kalır */
  const [linerPart, setLinerPart] = useState<{ geometry: THREE.BufferGeometry; volumeMm3: number } | null>(null);
  /** astar eklenmeden önceki sonuç — "astarı kaldır" için */
  const preLinerRef = useRef<ResultState | null>(null);
  const [linerFused, setLinerFused] = useState(false);
  /** gruplu OBJ dışa aktarımı için parçalar (gövde ayrı + astar ayrı) */
  const linerObjRef = useRef<{ body: THREE.BufferGeometry; liner: THREE.BufferGeometry } | null>(null);

  // sonuç doğrulama + oto düzelt
  const [wallScan, setWallScan] = useState<MinWallScan | null>(null);
  const [showThin, setShowThin] = useState(true);
  const appliedPlanRef = useRef<HolePlan | null>(null);
  const [blamedHoles, setBlamedHoles] = useState<number[]>([]);
  /** ajurdan kaynaklı ince vertexler (highlight bunları gösterir) */
  const [ajurThinVerts, setAjurThinVerts] = useState<Uint32Array | null>(null);
  /** delik açılmadan ÖNCE modelde zaten var olan ince nokta sayısı */
  const [baselineThin, setBaselineThin] = useState<number | null>(null);
  /** taban çizgisi cache — aynı çalışma geometrisi için bir kez taranır */
  const baselineRef = useRef<{ geometry: THREE.BufferGeometry; count: number; positions: Float32Array } | null>(null);

  // kesit
  const [clipOn, setClipOn] = useState(false);
  const [clipPos, setClipPos] = useState(0.5);
  const [clipAxis, setClipAxis] = useState<0 | 1 | 2>(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const rule = CASTING_RULES[metal];

  // ---- açılışta köprü kontrolü (PRD §4.1) ----
  useEffect(() => {
    readBridge().then(setBridgeRec).catch(() => setBridgeRec(null));
  }, []);

  // sınır aşımı → onay bekleyen otomatik sadeleştirme önerisi
  const [pendingDec, setPendingDec] = useState<{
    geometry: THREE.BufferGeometry;
    tris: number;
    fileName: string;
    fromBridge?: BridgeRecord;
  } | null>(null);
  const DECIMATE_TARGET = 200_000;

  // ---- yükleme (2 faz: hazırla → sonuçlandır) ----
  const finalizeModel = useCallback(async (geo: THREE.BufferGeometry, fileName: string, fromBridge?: BridgeRecord) => {
    try {
      const val = await validateOnLoad(geo);
      if (!val.ok) {
        setError(val.error ?? "Model doğrulanamadı.");
        setLoading(false);
        return;
      }
      const bvh = new MeshBVH(geo);
      const det = detectModelKind(geo, bvh);
      const k = det.kind;
      // Yüzükte merkez ışını tüpü 4 kez keser → detectShell yanlış pozitif verir;
      // yüzük şankı pratikte dolu kabul edilir (köprüden gelen hollow hariç).
      const isShell = fromBridge?.source === "hollow" ? true : k === "ring" ? false : detectShell(bvh, geo);
      const auto = k === "ring" && det.ringAxis !== null
        ? autoMaskRing(geo, det.ringAxis, bvh)
        : autoMaskMedallion(geo, bvh);

      maskRef.current = auto.mask;
      setFrame(auto.frame);
      setKind(k);
      setMaskVersion((v) => v + 1);
      setModel({ geometry: geo, bvh, tris: val.tris, volumeMm3: val.volumeMm3, isShell, fileName });
      setClipAxis(auto.frame.kind === "cylindrical" ? auto.frame.axisIndex : 2);
      setStep(2);
      if (fromBridge) {
        clearBridge().catch(() => undefined);
        setBridgeRec(null);
      }
    } catch {
      setError("Model işlenemedi — geçerli bir STL olduğundan emin olun.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadModel = useCallback(async (blob: Blob, fileName: string, fromBridge?: BridgeRecord) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setPlan(null);
    setWallScan(null);
    setHollowEstMm3(null);
    setPendingDec(null);
    try {
      let geo = await loadStl(blob);
      const leveled = autoLevelGeometry(geo);
      if (leveled.changed) geo = leveled.geometry;

      const tris = triCount(geo);
      if (tris > MAX_TRIS) {
        // reddetme — onaylı otomatik sadeleştirme öner (PRD ruhu: her redde çözüm)
        setPendingDec({ geometry: geo, tris, fileName, fromBridge });
        setLoading(false);
        return;
      }
      await finalizeModel(geo, fileName, fromBridge);
    } catch {
      setError("Dosya okunamadı — geçerli bir STL olduğundan emin olun.");
      setLoading(false);
    }
  }, [finalizeModel]);

  const acceptDecimate = useCallback(async () => {
    if (!pendingDec) return;
    setLoading(true);
    setError(null);
    try {
      const dec = await decimateGeometry(pendingDec.geometry, DECIMATE_TARGET);
      const p = pendingDec;
      setPendingDec(null);
      await finalizeModel(dec, p.fileName, p.fromBridge);
    } catch {
      setError("Sadeleştirme başarısız — modeli Mesh Temizleme aracından geçirip tekrar deneyin.");
      setLoading(false);
    }
  }, [pendingDec, finalizeModel]);

  const onFile = useCallback((f: File) => {
    if (!f.name.toLowerCase().endsWith(".stl")) {
      setError("Yalnızca STL kabul edilir.");
      return;
    }
    void loadModel(f, f.name);
  }, [loadModel]);

  // ---- model tipi değişince otomatik maskeyi yenile ----
  const reAutoMask = useCallback((newKind: ModelKind) => {
    if (!model) return;
    const det = detectModelKind(model.geometry, model.bvh);
    const auto = newKind === "ring"
      ? autoMaskRing(model.geometry, det.ringAxis ?? 1, model.bvh)
      : autoMaskMedallion(model.geometry, model.bvh);
    maskRef.current = auto.mask;
    setFrame(auto.frame);
    setKind(newKind);
    setMaskVersion((v) => v + 1);
  }, [model]);

  // ---- hollow senaryo tahmini (duvar slider'ıyla canlı) ----
  useEffect(() => {
    if (!model || model.isShell || step !== 2) return;
    const t = setTimeout(() => {
      try {
        setHollowEstMm3(estimateHollowCavity(model.geometry, model.bvh, hollowWallMm));
      } catch { setHollowEstMm3(null); }
    }, 300);
    return () => clearTimeout(t);
  }, [model, step, hollowWallMm]);

  // ---- sayfa içi iç boşaltma ----
  const runHollow = useCallback(async () => {
    if (!model || model.isShell) return;
    setHollowing(true);
    setError(null);
    await new Promise((r) => setTimeout(r, 60)); // overlay boyansın
    try {
      const h = await hollowModel(model.geometry, hollowWallMm);
      // boşaltma üçgen sayısını artırır (kavite yüzeyi) — sınırı aşarsa
      // türetilmiş veri olduğu için sormadan sadeleştir
      let hollowGeo = h.geometry;
      if (triCount(hollowGeo) > MAX_TRIS) {
        hollowGeo = await decimateGeometry(hollowGeo, DECIMATE_TARGET);
      }
      const bvh = new MeshBVH(hollowGeo);
      // maske yeni geometriye yeniden kurulur (vertex indeksleri değişti)
      const det = detectModelKind(hollowGeo, bvh);
      const auto = kind === "ring"
        ? autoMaskRing(hollowGeo, det.ringAxis ?? 2, bvh)
        : autoMaskMedallion(hollowGeo, bvh);
      maskRef.current = auto.mask;
      setFrame(auto.frame);
      setMaskVersion((v) => v + 1);
      setModel({
        ...model,
        geometry: hollowGeo,
        bvh,
        tris: triCount(hollowGeo),
        volumeMm3: h.volumeAfterMm3,
        isShell: true,
      });
      setPlan(null);
      setHollowEstMm3(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setHollowing(false);
    }
  }, [model, hollowWallMm, kind]);

  // ---- fırça ----
  const onPaint = useCallback((p: THREE.Vector3) => {
    if (!model || !maskRef.current) return;
    const mode = viewerMode === "brush-remove" ? "remove" : "add";
    const changed = applyBrush(model.geometry, maskRef.current, p, brushRadius, mode);
    if (changed > 0) setMaskVersion((v) => v + 1);
  }, [model, viewerMode, brushRadius]);

  // ---- canlı plan (adım 2 senaryo + adım 4 önizleme) ----
  useEffect(() => {
    if (!model || !frame || !maskRef.current || result) { setPlan(null); return; }
    if (step !== 2 && step !== 4) return;
    const t = setTimeout(() => {
      try {
        const params: AjurParams = { patternId, cellMm, holeScale, rotationDeg, marginMm, frontSkinMm, floorMm };
        const p = planHoles(
          { geometry: model.geometry, bvh: model.bvh, mask: maskRef.current!, frame, isShell: model.isShell },
          params,
        );
        setPlan(p);
        setPlanError(p.placements.length === 0 ? "Desen bu bölgeye sığmadı — ölçeği küçültün ya da kenar payını azaltın." : null);
      } catch (e) {
        setPlan(null);
        setPlanError((e as Error).message);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [model, frame, step, patternId, cellMm, holeScale, rotationDeg, marginMm, frontSkinMm, floorMm, maskVersion, result]);

  // ---- uygula (plan verilirse onu, yoksa canlı planı koşar) ----
  const runBoolean = useCallback(async (planToUse: HolePlan) => {
    if (!model || !frame || !maskRef.current || planToUse.placements.length === 0) return;
    setApplying(true);
    setApplyPct(0);
    setError(null);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const r = await applyAjur(
        { geometry: model.geometry, bvh: model.bvh, mask: maskRef.current, frame, isShell: model.isShell },
        planToUse,
        { onProgress: (p) => setApplyPct(Math.round(p * 100)), signal: ac.signal },
      );
      setResult(r);
      appliedPlanRef.current = planToUse;
      setWallScan(null);
      setBlamedHoles([]);
      setAjurThinVerts(null);
      // yeni sonuç = astar durumu sıfırlanır
      setLinerPart(null);
      setLinerFused(false);
      preLinerRef.current = null;
      setStep(5);
      // sonuç min-et taraması + suçlu delik eşlemesi. Modelin KENDİ ince
      // detayı (sculpt uçları) ayrı raporlanır — highlight ve oto düzelt
      // yalnız AJURDAN kaynaklı (deliğe komşu) inceleri hedefler.
      setTimeout(() => {
        try {
          const th = CASTING_RULES[metal].minWallHardMm;
          // taban çizgisi: DELİKSİZ modelin ince noktaları (cache'li) —
          // deliğe komşu düşen ama zaten var olan sculpt incesi deliği suçlamaz
          if (model && baselineRef.current?.geometry !== model.geometry) {
            const bs = scanMinWall(model.geometry, model.bvh, th);
            baselineRef.current = {
              geometry: model.geometry,
              count: bs.thinCount,
              positions: thinPositions(model.geometry, bs.thinVerts),
            };
          }
          setBaselineThin(baselineRef.current?.count ?? null);
          const rbvh = new MeshBVH(r.geometry);
          const scan = scanMinWall(r.geometry, rbvh, th);
          setWallScan(scan);
          if (scan.thinCount > 0) {
            const holes = planToUse.placements.map((p) => ({
              entry: p.entry, dir: p.dir, depth: p.depth,
              radiusMm: Math.max(...p.poly.map(([x, y]) => Math.hypot(x, y))),
            }));
            const blame = blameThinHoles(r.geometry, scan.thinVerts, holes, 1.0, baselineRef.current?.positions);
            setBlamedHoles(blame.holeIdx);
            setAjurThinVerts(blame.vertIdx);
          }
        } catch { setWallScan(null); }
      }, 60);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      setApplying(false);
      abortRef.current = null;
    }
  }, [model, frame, metal]);

  const runApply = useCallback(() => {
    autoChainRef.current = 0; // manuel mod: otomatik zincir yok
    fixStageRef.current = 0;
    if (plan) void runBoolean(plan);
  }, [plan, runBoolean]);

  // ---- OTO AJUR: kısıt çözücü + uygula + (gerekirse) otomatik oto-düzelt ----
  const runAutoAjur = useCallback(async () => {
    if (!model || !frame || !maskRef.current) return;
    setSolving(true);
    setError(null);
    await new Promise((r) => setTimeout(r, 30)); // buton durumu boyansın
    try {
      const solved = solveAutoParams(
        { geometry: model.geometry, bvh: model.bvh, mask: maskRef.current, frame, isShell: model.isShell },
        patternId, autoLevel, rule, frontSkinMm, floorMm,
      );
      // çözülen değerleri Gelişmiş panelde göster (şeffaflık)
      setCellMm(solved.params.cellMm);
      setHoleScale(solved.params.holeScale);
      setMarginMm(solved.params.marginMm);
      setRotationDeg(solved.params.rotationDeg);
      autoChainRef.current = 3; // tarama ince bulursa: küçült → kaldır → kaldır
      fixStageRef.current = 0;
      setSolving(false);
      await runBoolean(solved.plan);
    } catch (e) {
      setSolving(false);
      setError((e as Error).message);
    }
  }, [model, frame, patternId, autoLevel, rule, frontSkinMm, floorMm, runBoolean]);

  // oto zincir: tarama ajur-kaynaklı ince bulduysa oto-düzelt otomatik koşar
  useEffect(() => {
    if (autoChainRef.current > 0 && wallScan && blamedHoles.length > 0 && (ajurThinVerts?.length ?? 0) > 0) {
      autoChainRef.current -= 1;
      runAutoFix();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallScan, blamedHoles, ajurThinVerts]);

  // ---- oto düzelt (kademeli): önce suçlu delikleri KÜÇÜLT (desen korunur),
  // hâlâ ince üretiyorlarsa KALDIR. Boolean hep orijinalden yeniden koşulur. ----
  const runAutoFix = useCallback(() => {
    const applied = appliedPlanRef.current;
    if (!applied || blamedHoles.length === 0) return;
    const bad = new Set(blamedHoles);
    let next: HolePlan;
    if (fixStageRef.current === 0) {
      const SHRINK = 0.72;
      next = {
        ...applied,
        placements: applied.placements.map((p, i) =>
          bad.has(i)
            ? {
                ...p,
                poly: p.poly.map(([x, y]) => [x * SHRINK, y * SHRINK] as [number, number]),
                areaMm2: p.areaMm2 * SHRINK * SHRINK,
              }
            : p,
        ),
      };
      fixStageRef.current = 1;
    } else {
      next = {
        ...applied,
        placements: applied.placements.filter((_, i) => !bad.has(i)),
      };
      if (next.placements.length === 0) {
        setError("Tüm delikler riskli çıktı — farklı desen deneyin ya da bölgeyi değiştirin.");
        return;
      }
    }
    next.removedMm3 = next.placements.reduce((s, p) => s + p.areaMm2 * Math.max(0, p.depth - 0.5), 0);
    void runBoolean(next);
  }, [blamedHoles, runBoolean]);

  // ---- KAPAK: yüzük iç astarı ekle/kaldır ----
  const addLiner = useCallback(async () => {
    if (!model || !frame || !maskRef.current || !result || linerFused || linerPart) return;
    setLinerBusy(true);
    setError(null);
    try {
      // bant, deliklerin gerçek eksenel aralığına kilitlenir (taç altına uzamasın)
      let axialRangeMm: [number, number] | undefined;
      const applied = appliedPlanRef.current;
      if (applied && frame.kind === "cylindrical") {
        let lo = Infinity, hi = -Infinity;
        for (const p of applied.placements) {
          const v = p.entry.getComponent(frame.axisIndex) - frame.center.getComponent(frame.axisIndex);
          const r = Math.max(...p.poly.map(([x, y]) => Math.hypot(x, y)));
          if (v - r < lo) lo = v - r;
          if (v + r > hi) hi = v + r;
        }
        if (Number.isFinite(lo)) axialRangeMm = [lo - 1.2, hi + 1.2];
      }
      const liner = await buildRingLiner(model.geometry, maskRef.current, frame, {
        thicknessMm: linerThicknessMm,
        gapMm: linerMode === "separate" ? linerGapMm : 0,
        axialRangeMm,
      }, model.bvh);
      preLinerRef.current = result;
      linerObjRef.current = { body: result.geometry, liner: liner.geometry };
      if (linerMode === "fused") {
        const u = await manifoldUnion(result.geometry, liner.geometry);
        const { geometryVolumeMm3 } = await import("./lib/manifoldKit");
        setResult({
          ...result,
          geometry: u.geometry,
          volumeAfterMm3: geometryVolumeMm3(u.geometry), // örtüşme payı düşülmüş gerçek hacim
        });
        setLinerFused(true);
      } else {
        setLinerPart({ geometry: liner.geometry, volumeMm3: liner.volumeMm3 });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLinerBusy(false);
    }
  }, [model, frame, result, linerThicknessMm, linerMode, linerGapMm, linerFused, linerPart]);

  const removeLiner = useCallback(() => {
    if (preLinerRef.current) setResult(preLinerRef.current);
    preLinerRef.current = null;
    linerObjRef.current = null;
    setLinerPart(null);
    setLinerFused(false);
  }, []);

  // ZBrush iş akışı: STL grup taşıyamaz → gövde+astar tek OBJ'de ayrı gruplar
  // (polygroup) olarak iner; Split Groups ile ayrılır. Çekme payı uygulanır.
  const downloadGroupedObj = useCallback(() => {
    const parts = linerObjRef.current;
    if (!parts) return;
    const scale = 1 + Math.max(0, shrinkPct) / 100;
    const body = parts.body.clone();
    const liner = parts.liner.clone();
    if (scale !== 1) { body.scale(scale, scale, scale); liner.scale(scale, scale, scale); }
    const blob = exportObjGrouped([
      { name: "govde_ajur", geometry: body },
      { name: "ic_astar", geometry: liner },
    ]);
    body.dispose(); liner.dispose();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (model?.fileName ?? "model.stl").replace(/\.stl$/i, "") + "_ajur_gruplu.obj";
    a.click();
    URL.revokeObjectURL(url);
  }, [shrinkPct, model]);

  // ---- indir + köprüye yaz ----
  // Çekme payı: döküm küçülmesi telafisi — YALNIZ indirilen dosyaya uygulanır
  const download = useCallback(() => {
    if (!result) return;
    const scale = 1 + Math.max(0, shrinkPct) / 100;
    const g = result.geometry.clone();
    if (scale !== 1) g.scale(scale, scale, scale);
    const blob = exportStlBlob(g);
    g.dispose();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (model?.fileName ?? "model.stl").replace(/\.stl$/i, "") + "_ajur.stl";
    a.click();
    URL.revokeObjectURL(url);
  }, [result, model, shrinkPct]);

  // adım 5'e girişte çekme payını seçili metalin önerisine kur
  useEffect(() => {
    if (step === 5) setShrinkPct(CASTING_RULES[metal].shrinkagePct);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const sendToBridge = useCallback(async () => {
    if (!result) return;
    try {
      await writeBridge({
        meshBlob: exportStlBlob(result.geometry),
        source: "ajur",
        volumeCm3: result.volumeAfterMm3 / 1000,
      });
      setError(null);
    } catch {
      setError("Model köprüye yazılamadı.");
    }
  }, [result]);

  const reset = useCallback(() => {
    setModel(null); setResult(null); setPlan(null); setWallScan(null);
    setError(null); setStep(1); maskRef.current = null; setFrame(null);
    setViewerMode("orbit"); setClipOn(false); setHollowEstMm3(null);
    setPendingDec(null);
  }, []);

  // ---- gram sayacı (sabit) ----
  const gramNow = useMemo(() => {
    if (result) return gramForMetal(result.volumeAfterMm3 + (linerPart?.volumeMm3 ?? 0), metal);
    if (!model) return null;
    const planned = step === 4 && plan ? plan.removedMm3 : 0;
    return gramForMetal(Math.max(0, model.volumeMm3 - planned), metal);
  }, [model, result, plan, step, metal, linerPart]);
  const gramBefore = model ? gramForMetal(model.volumeMm3, metal) : null;

  const pattern = patternById(patternId);
  const displayGeo = result ? result.geometry : model?.geometry ?? null;
  const maskedN = maskRef.current ? maskedCount(maskRef.current) : 0;
  const bridgeWarn = !!(plan && pattern && plan.bridgeMm < Math.max(rule.minBridgeMm, pattern.minBridgeMm));

  return (
    <div className="min-h-screen bg-[#07080a] px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        {/* Başlık + sabit gram sayacı */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#b76e79]/30 bg-[#b76e79]/10 px-3 py-1 text-xs font-medium text-[#b76e79]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#b76e79]" />
              Deney / Lab
            </div>
            <h1 className="font-display text-3xl font-medium tracking-tight">Ajur & Arka Kesim</h1>
            <p className="mt-1 text-sm text-white/40">Modeliniz tarayıcınızdan çıkmaz — tüm işlem cihazınızda.</p>
          </div>

          {/* CANLI GRAM SAYACI — en görünür öğe (PRD §9) */}
          <div className="flex items-center gap-3 rounded-2xl border border-[#b76e79]/25 bg-[#b76e79]/[0.07] px-5 py-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-white/40">Tahmini ağırlık</p>
              <p className="font-mono text-2xl text-[#e8b4bc]">
                {gramNow === null ? "—" : `${fmt1(gramNow)} g`}
                {gramBefore !== null && gramNow !== null && gramNow < gramBefore - 0.05 && (
                  <span className="ml-2 text-sm text-emerald-400">−{fmt1(gramBefore - gramNow)} g</span>
                )}
              </p>
            </div>
            <select
              value={metal}
              onChange={(e) => setMetal(e.target.value as MetalKey)}
              className="rounded-lg border border-white/10 bg-[#141014] px-2 py-1.5 text-xs text-white/80 outline-none"
            >
              {METALS.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Adım göstergesi */}
        <div className="mb-5 flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1.5">
              {i > 0 && <div className="h-px w-5 bg-white/10" />}
              <button
                onClick={() => {
                  if (s.id < step && !applying && !hollowing) {
                    if (s.id < 5) { setResult(null); setWallScan(null); }
                    setStep(s.id);
                  }
                }}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  step === s.id
                    ? "border-[#b76e79]/50 bg-[#b76e79]/20 text-[#e8b4bc]"
                    : s.id < step
                      ? "border-white/15 bg-white/[0.05] text-white/60 hover:text-white"
                      : "border-white/[0.06] text-white/25"
                }`}
              >
                {s.id}. {s.label}
              </button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_370px]">
          {/* SOL: Sahne */}
          <div className="flex flex-col gap-3">
            <div className="relative h-[520px] overflow-hidden rounded-2xl border border-white/[0.06] bg-[#05060a]">
              <AjurViewer
                geometry={displayGeo}
                bvh={result ? null : model?.bvh ?? null}
                mode={step === 3 ? viewerMode : "orbit"}
                brushRadius={brushRadius}
                mask={result ? null : maskRef.current}
                maskVersion={maskVersion}
                thinVerts={result && showThin ? ajurThinVerts : null}
                clip={{ enabled: clipOn, axis: clipAxis, position: clipPos }}
                holePreview={step === 4 && !result ? plan?.placements ?? null : null}
                onPaint={onPaint}
              />
              {(applying || hollowing) && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-sm">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#b76e79]/30 border-t-[#b76e79]" />
                  <p className="px-6 text-center text-sm text-white/70">
                    {applying
                      ? `Ajur uygulanıyor… %${applyPct}`
                      : "İç boşluk oluşturuluyor… Bu adım modele göre 10–30 sn sürebilir; ekran duraklamış görünebilir."}
                  </p>
                  {applying && (
                    <button
                      onClick={() => abortRef.current?.abort()}
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/60 hover:text-white"
                    >
                      İptal
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Kesit kontrolü — tek tıkla (PRD §9) */}
            {model && (
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5">
                <button
                  onClick={() => setClipOn((v) => !v)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    clipOn
                      ? "border-[#b76e79]/40 bg-[#b76e79]/15 text-[#e8b4bc]"
                      : "border-white/10 bg-white/[0.03] text-white/50 hover:text-white/80"
                  }`}
                >
                  Kesit görünümü
                </button>
                {clipOn && (
                  <>
                    <div className="flex gap-1">
                      {(["X", "Y", "Z"] as const).map((ax, i) => (
                        <button
                          key={ax}
                          onClick={() => setClipAxis(i as 0 | 1 | 2)}
                          className={`rounded px-2 py-1 text-[11px] ${clipAxis === i ? "bg-[#b76e79]/25 text-[#e8b4bc]" : "text-white/40 hover:text-white/70"}`}
                        >
                          {ax}
                        </button>
                      ))}
                    </div>
                    <input
                      type="range" min={0.02} max={0.98} step={0.01}
                      value={clipPos}
                      onChange={(e) => setClipPos(Number(e.target.value))}
                      className="range-slider w-44"
                    />
                  </>
                )}
                {result && wallScan && (
                  <label className="ml-auto flex items-center gap-2 text-xs text-white/50">
                    <input type="checkbox" checked={showThin} onChange={(e) => setShowThin(e.target.checked)} />
                    İnce bölgeleri göster
                  </label>
                )}
              </div>
            )}
          </div>

          {/* SAĞ: Adım paneli */}
          <div className="flex flex-col gap-4">
            {error && (
              <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.07] p-4 text-sm text-red-300">
                <p>{error}</p>
                {error.includes("Mesh Temizleme") && (
                  <Link href="/remaura/mesh-temizle" className="mt-2 inline-block text-xs font-medium text-[#e8b4bc] underline">
                    Mesh Temizleme aracını aç →
                  </Link>
                )}
              </div>
            )}

            {/* ADIM 1 — Yükle */}
            {step === 1 && (
              <>
                {pendingDec && (
                  <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4">
                    <p className="text-sm font-medium text-amber-200">Model sınırın üzerinde</p>
                    <p className="mt-1 text-xs leading-relaxed text-white/50">
                      {pendingDec.fileName} — {(pendingDec.tris / 1000).toFixed(0)}K poligon; sınır{" "}
                      {(MAX_TRIS / 1000).toFixed(0)}K. Otomatik sadeleştirme ile{" "}
                      {(DECIMATE_TARGET / 1000).toFixed(0)}K&apos;ya indirebiliriz — detay kaybı bu
                      yoğunlukta gözle görülmez düzeydedir.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => void acceptDecimate()}
                        disabled={loading}
                        className="rounded-lg bg-[linear-gradient(135deg,#c4838b,#b76e79)] px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                      >
                        {loading ? "Sadeleştiriliyor…" : "Sadeleştir ve devam et"}
                      </button>
                      <button
                        onClick={() => setPendingDec(null)}
                        disabled={loading}
                        className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/50 hover:text-white disabled:opacity-50"
                      >
                        Vazgeç
                      </button>
                    </div>
                  </div>
                )}
                {bridgeRec && !pendingDec && (
                  <div className="rounded-2xl border border-[#b76e79]/25 bg-[#b76e79]/[0.07] p-4">
                    <p className="text-sm font-medium text-[#e8b4bc]">
                      {bridgeRec.source === "hollow"
                        ? "İç boşaltmadan gelen model"
                        : bridgeRec.source === "ajur"
                          ? "Önceki ajur çıktısı"
                          : "Dönüştürücüden gelen model"}
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      {fmt2(bridgeRec.volumeCm3)} cm³
                      {bridgeRec.wallThickness ? ` · ${fmt1(bridgeRec.wallThickness)} mm duvar` : ""}
                      {" · "}
                      {Math.round((Date.now() - bridgeRec.timestamp) / 60000)} dk önce
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => void loadModel(bridgeRec.meshBlob, "hollow_model.stl", bridgeRec)}
                        className="rounded-lg bg-[linear-gradient(135deg,#c4838b,#b76e79)] px-3 py-2 text-xs font-medium text-white"
                      >
                        Bu modelle devam et
                      </button>
                      <button
                        onClick={() => { clearBridge().catch(() => undefined); setBridgeRec(null); }}
                        className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/50 hover:text-white"
                      >
                        Yok say
                      </button>
                    </div>
                  </div>
                )}

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
                  onClick={() => inputRef.current?.click()}
                  className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 text-center transition-colors hover:border-[#b76e79]/40 hover:bg-[#b76e79]/5"
                >
                  <input
                    ref={inputRef} type="file" accept=".stl" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
                  />
                  {loading ? (
                    <>
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#b76e79]/30 border-t-[#b76e79]" />
                      <p className="text-sm text-white/50">Doğrulanıyor…</p>
                    </>
                  ) : (
                    <>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/40">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <p className="text-sm text-white/50">STL sürükle veya tıkla</p>
                      <p className="text-[11px] text-white/25">Maks. {(MAX_TRIS / 1000).toFixed(0)}K poligon · watertight zorunlu</p>
                    </>
                  )}
                </div>
              </>
            )}

            {/* ADIM 2 — Analiz + senaryolar */}
            {step === 2 && model && (
              <>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <p className="mb-3 text-sm font-medium text-white/70">Model raporu</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Stat label="Hacim" value={`${fmt2(model.volumeMm3 / 1000)} cm³`} />
                    <Stat label="Poligon" value={`${(model.tris / 1000).toFixed(0)}K`} />
                    <Stat label="Dosya" value={model.fileName} />
                    {/* Yapı — kullanıcı düzeltebilir (içi boşaltılmış yüzük dıştan anlaşılmaz) */}
                    <button
                      onClick={() => setModel({ ...model, isShell: !model.isShell })}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-left transition-colors hover:border-[#b76e79]/30"
                      title="Yanlışsa tıklayıp değiştirin"
                    >
                      <p className="text-[11px] text-white/40">Yapı (tıkla değiştir)</p>
                      <p className="font-mono text-sm text-[#e8b4bc]">{model.isShell ? "İçi boş (kabuk)" : "Dolu"}</p>
                    </button>
                  </div>
                  <div className="mt-3">
                    <p className="mb-1.5 text-xs text-white/40">Model tipi</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => reAutoMask("ring")}
                        className={`rounded-xl border px-3 py-2 text-xs font-medium ${kind === "ring" ? "border-[#b76e79]/40 bg-[#b76e79]/15 text-[#e8b4bc]" : "border-white/10 text-white/50"}`}
                      >
                        Yüzük — iç şank
                      </button>
                      <button
                        onClick={() => reAutoMask("medallion")}
                        className={`rounded-xl border px-3 py-2 text-xs font-medium ${kind === "medallion" ? "border-[#b76e79]/40 bg-[#b76e79]/15 text-[#e8b4bc]" : "border-white/10 text-white/50"}`}
                      >
                        Madalyon — arka plaka
                      </button>
                    </div>
                  </div>
                </div>

                {!model.isShell && (
                  <div className="rounded-2xl border border-[#b76e79]/25 bg-[#b76e79]/[0.07] p-4">
                    <p className="text-sm font-medium text-[#e8b4bc]">İç boşaltma (bu sayfada)</p>
                    <p className="mt-1 text-xs leading-relaxed text-white/50">
                      Model dolu — ajur deliklerinin boşluğa açılması için önce içini boşaltın.
                      Sculpt yüzeyine dokunulmaz.
                    </p>
                    <div className="mt-3">
                      <Slider
                        label="Duvar kalınlığı" value={hollowWallMm}
                        min={0.6} max={2.0} step={0.1} unit="mm" onChange={setHollowWallMm}
                      />
                      <p className="-mt-1 mb-2 text-[11px] text-white/30">Ajur açılacaksa 1.0 mm ve üzeri önerilir.</p>
                    </div>
                    <button
                      onClick={() => void runHollow()}
                      disabled={hollowing}
                      className="w-full rounded-xl bg-[linear-gradient(135deg,#c4838b,#b76e79)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {hollowing ? "Boşaltılıyor…" : "İçini boşalt"}
                    </button>
                  </div>
                )}

                {/* Senaryo kartları */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <p className="mb-3 text-sm font-medium text-white/70">
                    Senaryolar ({METALS.find((m) => m.key === metal)?.label})
                  </p>
                  <div className="flex flex-col gap-2">
                    <Scenario label="Mevcut durum" grams={gramForMetal(model.volumeMm3, metal)} />
                    <Scenario
                      label="Ajur (bu sayfada)"
                      grams={plan ? gramForMetal(model.volumeMm3 - plan.removedMm3, metal) : null}
                      accent
                    />
                    {!model.isShell && (
                      <Scenario
                        label={`İç boşaltma (${fmt1(hollowWallMm)} mm duvar)`}
                        grams={hollowEstMm3 !== null ? gramForMetal(model.volumeMm3 - hollowEstMm3, metal) : null}
                      />
                    )}
                  </div>
                  <p className="mt-2 text-[11px] text-white/25">Tahminler ±%10 — kesin değer "Uygula" sonrası hesaplanır.</p>
                </div>

                <button
                  onClick={() => setStep(3)}
                  className="w-full rounded-xl bg-[linear-gradient(135deg,#c4838b,#b76e79,#a65f69)] px-6 py-3 text-sm font-medium text-white hover:opacity-90"
                >
                  Bölge seçimine geç →
                </button>
              </>
            )}

            {/* ADIM 3 — Güvenli bölge */}
            {step === 3 && model && (
              <>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <p className="mb-1 text-sm font-medium text-white/70">Güvenli bölge</p>
                  <p className="mb-3 text-xs leading-relaxed text-white/40">
                    Gül rengi alan işlenecek bölgedir. Fırça ile ekleyip çıkarabilirsiniz —
                    işlem bu bölgenin dışına asla taşmaz.
                  </p>
                  <div className="mb-3 grid grid-cols-3 gap-2">
                    <ModeBtn active={viewerMode === "orbit"} onClick={() => setViewerMode("orbit")} label="Döndür" />
                    <ModeBtn active={viewerMode === "brush-add"} onClick={() => setViewerMode("brush-add")} label="Fırça +" />
                    <ModeBtn active={viewerMode === "brush-remove"} onClick={() => setViewerMode("brush-remove")} label="Fırça −" />
                  </div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-white/40">Fırça boyutu</span>
                    <span className="font-mono text-xs text-[#e8b4bc]">{fmt1(brushRadius)} mm</span>
                  </div>
                  <input
                    type="range" min={0.5} max={8} step={0.1}
                    value={brushRadius}
                    onChange={(e) => setBrushRadius(Number(e.target.value))}
                    className="range-slider w-full"
                  />
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-white/30">{maskedN.toLocaleString("tr-TR")} vertex seçili</span>
                    <button onClick={() => reAutoMask(kind)} className="text-[#e8b4bc]/70 underline hover:text-[#e8b4bc]">
                      Otomatik tespite dön
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => { setViewerMode("orbit"); setStep(4); }}
                  disabled={maskedN === 0}
                  className="w-full rounded-xl bg-[linear-gradient(135deg,#c4838b,#b76e79,#a65f69)] px-6 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
                >
                  Patern seçimine geç →
                </button>
              </>
            )}

            {/* ADIM 4 — Patern + önizleme */}
            {step === 4 && model && (
              <>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <p className="mb-2 text-sm font-medium text-white/70">Patern</p>
                  {(["fonksiyonel", "dekoratif"] as const).map((cat) => (
                    <div key={cat} className="mb-2 last:mb-0">
                      <p className="mb-1.5 text-[11px] uppercase tracking-wide text-white/25">
                        {cat === "fonksiyonel" ? "Fonksiyonel" : "Dekoratif"}
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {PATTERNS.filter((p) => p.category === cat).map((p) => (
                          <button
                            key={p.id}
                            onClick={() => { setPatternId(p.id); setCellMm(p.defaultCellMm); }}
                            className={`rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors ${
                              patternId === p.id
                                ? "border-[#b76e79]/40 bg-[#b76e79]/15 text-[#e8b4bc]"
                                : "border-white/[0.07] text-white/50 hover:border-white/20"
                            }`}
                          >
                            {p.labelTr}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* OTO AJUR — yoğunluk modele ve döküm kuralına göre çözülür */}
                <div className="rounded-2xl border border-[#b76e79]/25 bg-[#b76e79]/[0.07] p-4">
                  <p className="text-sm font-medium text-[#e8b4bc]">Oto Ajur</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/50">
                    Ölçek ve yoğunluğu modelinize ve seçili metalin döküm kurallarına göre
                    sistem belirler; riskli delikler otomatik ayıklanır.
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {(["hafif", "dengeli", "agresif"] as const).map((lv) => (
                      <ModeBtn
                        key={lv}
                        active={autoLevel === lv}
                        onClick={() => setAutoLevel(lv)}
                        label={lv === "hafif" ? "Hafif" : lv === "dengeli" ? "Dengeli" : "Agresif"}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => void runAutoAjur()}
                    disabled={solving || applying}
                    className="mt-3 w-full rounded-xl bg-[linear-gradient(135deg,#c4838b,#b76e79,#a65f69)] px-6 py-3.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {solving ? "En iyi ayar aranıyor…" : "Oto Ajur — modele göre uygula"}
                  </button>
                </div>

                <button
                  onClick={() => setAdvancedOpen((v) => !v)}
                  className="text-left text-xs text-white/40 underline hover:text-white/70"
                >
                  {advancedOpen ? "▾ Gelişmiş ayarları gizle" : "▸ Gelişmiş ayarlar (elle ölçek/yoğunluk)"}
                </button>

                {advancedOpen && (
                <>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                  {pattern?.layout !== "central" && (
                    <Slider label="Ölçek (hücre)" value={cellMm} min={1.5} max={10} step={0.1} unit="mm" onChange={setCellMm} />
                  )}
                  <Slider label="Delik yoğunluğu" value={holeScale} min={0.25} max={0.9} step={0.01} unit="" onChange={setHoleScale} />
                  <Slider label="Döndürme" value={rotationDeg} min={0} max={180} step={5} unit="°" onChange={setRotationDeg} />
                  <Slider label="Kenar payı" value={marginMm} min={1} max={4} step={0.1} unit="mm" onChange={setMarginMm} />
                  {!model.isShell && (
                    <Slider
                      label={kind === "ring" ? "Dış et koruması" : "Ön et koruması"}
                      value={frontSkinMm} min={0.5} max={2.5} step={0.1} unit="mm" onChange={setFrontSkinMm}
                    />
                  )}
                  {model.isShell && (
                    <>
                      <Slider
                        label="Delik zemini (kapaklı görünüm)"
                        value={floorMm} min={0} max={0.6} step={0.05} unit="mm" onChange={setFloorMm}
                      />
                      <p className="-mt-1 text-[11px] text-white/30">
                        0 = delikler iç boşluğa açık; &gt;0 = dibinde kapalı zemin kalır.
                      </p>
                    </>
                  )}
                </div>

                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-xs">
                  {plan ? (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between">
                        <span className="text-white/40">Delik</span>
                        <span className="font-mono text-white/80">{plan.placements.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/40">Köprü (tahmini)</span>
                        <span className={`font-mono ${bridgeWarn ? "text-amber-400" : "text-white/80"}`}>{fmt2(plan.bridgeMm)} mm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/40">Tahmini kazanç</span>
                        <span className="font-mono text-emerald-400">−{fmt1(gramForMetal(plan.removedMm3, metal))} g</span>
                      </div>
                      {bridgeWarn && (
                        <p className="mt-1 leading-relaxed text-amber-300/90">
                          Köprü {fmt2(plan.bridgeMm)} mm — bu metal için önerilen alt sınır{" "}
                          {fmt1(Math.max(rule.minBridgeMm, pattern?.minBridgeMm ?? 0))} mm. Yoğunluğu azaltın ya da ölçeği büyütün.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-white/30">{planError ?? "Önizleme hesaplanıyor…"}</p>
                  )}
                </div>

                <button
                  onClick={() => void runApply()}
                  disabled={!plan || plan.placements.length === 0 || applying}
                  className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-6 py-3 text-sm font-medium text-white/80 hover:bg-white/[0.09] disabled:opacity-40"
                >
                  Elle uygula — bu ayarlarla del
                </button>
                </>
                )}
              </>
            )}

            {/* ADIM 5 — Doğrulama + indir */}
            {step === 5 && result && model && (
              <>
                <div className="rounded-2xl border border-[#b76e79]/20 bg-[#b76e79]/5 p-4">
                  <p className="mb-3 text-sm font-medium text-[#e8b4bc]">Sonuç</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Stat label="Önce" value={`${fmt1(gramForMetal(result.volumeBeforeMm3, metal))} g`} />
                    <Stat label="Sonra" value={`${fmt1(gramForMetal(result.volumeAfterMm3, metal))} g`} />
                    <Stat
                      label="Kazanç"
                      value={`−%${(((result.volumeBeforeMm3 - result.volumeAfterMm3) / result.volumeBeforeMm3) * 100).toFixed(1)}`}
                    />
                    <Stat label="Delik" value={String(result.holes)} />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-xs leading-relaxed">
                  <p className="mb-2 text-sm font-medium text-white/70">Doğrulama</p>
                  <p className="text-emerald-400">✓ Watertight (kapalı katı)</p>
                  {wallScan ? (
                    <>
                      {(ajurThinVerts?.length ?? 0) > 0 ? (
                        <>
                          <p className="mt-1 text-red-400">
                            ⚠ Ajurdan kaynaklı {ajurThinVerts!.length} ince bölge (deliğe komşu, et{" "}
                            {fmt2(rule.minWallHardMm)} mm altında) — kırmızı bölgeler döküm riski taşır.
                          </p>
                          {blamedHoles.length > 0 && (
                            <button
                              onClick={runAutoFix}
                              disabled={applying}
                              className="mt-2 w-full rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-xs font-medium text-red-200 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                            >
                              ⚡ Oto düzelt — {blamedHoles.length} riskli deliği {fixStageRef.current === 0 ? "küçült" : "kaldır"} ve yeniden del
                            </button>
                          )}
                        </>
                      ) : (
                        <p className="mt-1 text-emerald-400">✓ Ajur delikleri ince bölge üretmedi</p>
                      )}
                      {wallScan.thinCount - (ajurThinVerts?.length ?? 0) > 0 && (
                        <p className="mt-1 text-white/35">
                          Modelin kendisinde {(wallScan.thinCount - (ajurThinVerts?.length ?? 0)).toLocaleString("tr-TR")} ince
                          nokta var (sculpt detayı olabilir; ajurdan bağımsız
                          {baselineThin !== null ? ` — delik öncesi de ${baselineThin.toLocaleString("tr-TR")} idi` : ""}).
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="mt-1 text-white/30">Et kalınlığı taranıyor…</p>
                  )}
                </div>

                {/* KAPAK — yüzük iç astarı (kapaklı ajur) */}
                {LINER_ENABLED && kind === "ring" && (
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                    <p className="mb-1 text-sm font-medium text-white/70">İç Astar (Kapak)</p>
                    {!linerFused && !linerPart ? (
                      <>
                        <p className="mb-3 text-xs leading-relaxed text-white/40">
                          Delikli şankın altına pürüzsüz bir iç bant: ten teması rahatlar,
                          kir girmez, desen kapalı zeminde okunur — klasik kapaklı ajur.
                        </p>
                        <Slider
                          label="Astar kalınlığı" value={linerThicknessMm}
                          min={0.3} max={0.8} step={0.05} unit="mm" onChange={setLinerThicknessMm}
                        />
                        <div className="mb-3 grid grid-cols-2 gap-2">
                          <ModeBtn active={linerMode === "fused"} onClick={() => setLinerMode("fused")} label="Tek parça (kaynaşık)" />
                          <ModeBtn active={linerMode === "separate"} onClick={() => setLinerMode("separate")} label="Ayrı parça (lehimlik)" />
                        </div>
                        {linerMode === "separate" && (
                          <Slider
                            label="Lehim boşluğu" value={linerGapMm}
                            min={0.2} max={0.4} step={0.01} unit="mm" onChange={setLinerGapMm}
                          />
                        )}
                        <button
                          onClick={() => void addLiner()}
                          disabled={linerBusy}
                          className="w-full rounded-xl bg-[linear-gradient(135deg,#c4838b,#b76e79)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                        >
                          {linerBusy ? "Astar kuruluyor…" : "İç astar ekle"}
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <p className="text-xs text-emerald-400">
                          ✓ Astar eklendi — {fmt2(linerThicknessMm)} mm,{" "}
                          {linerFused ? "tek parça (kaynaşık)" : `ayrı parça (${fmt2(linerGapMm)} mm lehim boşluğu)`}
                        </p>
                        <button
                          onClick={downloadGroupedObj}
                          className="w-full rounded-xl border border-[#b76e79]/30 bg-[#b76e79]/10 px-4 py-2.5 text-xs font-medium text-[#e8b4bc] hover:opacity-80"
                        >
                          Gövde + Astar indir (OBJ, ZBrush&apos;ta ayrı gruplar)
                        </button>
                        {linerPart && (
                          <button
                            onClick={() => {
                              const scale = 1 + Math.max(0, shrinkPct) / 100;
                              const g = linerPart.geometry.clone();
                              if (scale !== 1) g.scale(scale, scale, scale);
                              const blob = exportStlBlob(g);
                              g.dispose();
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = (model?.fileName ?? "model.stl").replace(/\.stl$/i, "") + "_astar.stl";
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                            className="w-full rounded-xl border border-[#b76e79]/30 bg-[#b76e79]/10 px-4 py-2.5 text-xs font-medium text-[#e8b4bc] hover:opacity-80"
                          >
                            Astar STL indir (ayrı parça)
                          </button>
                        )}
                        <button
                          onClick={removeLiner}
                          className="w-full rounded-xl border border-white/10 px-4 py-2 text-xs text-white/50 hover:text-white"
                        >
                          Astarı kaldır
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Çekme payı — döküm küçülmesi telafisi */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <Slider
                    label="Çekme payı (döküm)" value={shrinkPct}
                    min={0} max={4} step={0.1} unit="%" onChange={setShrinkPct}
                  />
                  <p className="text-[11px] leading-relaxed text-white/30">
                    İndirilen dosya %{shrinkPct.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} büyütülür —
                    döküm küçülmesini telafi eder. Seçili metal için öneri:{" "}
                    %{rule.shrinkagePct.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}.
                    Araçlar arası aktarım orijinal ölçüde kalır.
                  </p>
                </div>

                <button
                  onClick={download}
                  className="w-full rounded-xl bg-[linear-gradient(135deg,#c4838b,#b76e79,#a65f69)] px-6 py-3.5 text-sm font-medium text-white hover:opacity-90"
                >
                  Ajurlu STL indir{shrinkPct > 0 ? ` (+%${shrinkPct.toLocaleString("tr-TR", { maximumFractionDigits: 1 })})` : ""}
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setResult(null); setWallScan(null); setStep(4); }}
                    className="flex-1 rounded-xl border border-white/10 px-4 py-2.5 text-xs text-white/60 hover:text-white"
                  >
                    ← Ayarları değiştir
                  </button>
                  <button
                    onClick={() => void sendToBridge()}
                    className="flex-1 rounded-xl border border-[#b76e79]/30 bg-[#b76e79]/10 px-4 py-2.5 text-xs font-medium text-[#e8b4bc] hover:opacity-80"
                  >
                    Diğer araçlara aktar
                  </button>
                </div>
                <button onClick={reset} className="text-xs text-white/30 underline hover:text-white/60">
                  Yeni model yükle
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- küçük UI parçaları ----

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
      <p className="text-[11px] text-white/40">{label}</p>
      <p className="truncate font-mono text-sm text-white">{value}</p>
    </div>
  );
}

function Scenario({ label, grams, accent, href }: { label: string; grams: number | null; accent?: boolean; href?: string }) {
  const inner = (
    <div className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${
      accent ? "border-[#b76e79]/30 bg-[#b76e79]/10" : "border-white/[0.06] bg-white/[0.03]"
    }`}>
      <span className={`text-xs ${accent ? "text-[#e8b4bc]" : "text-white/50"}`}>
        {label}{href ? " →" : ""}
      </span>
      <span className="font-mono text-sm text-white">{grams === null ? "…" : `~${fmt1(grams)} g`}</span>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function ModeBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
        active ? "border-[#b76e79]/40 bg-[#b76e79]/15 text-[#e8b4bc]" : "border-white/10 text-white/40 hover:text-white/70"
      }`}
    >
      {label}
    </button>
  );
}

function Slider({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-white/40">{label}</span>
        <span className="font-mono text-xs text-[#e8b4bc]">
          {value.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}{unit}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range-slider w-full"
      />
    </div>
  );
}
