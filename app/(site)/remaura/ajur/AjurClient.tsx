"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";
import { AjurViewer, type ViewerMode } from "./AjurViewer";
import { loadStl, exportStlBlob } from "./lib/stl";
import { validateOnLoad, detectShell, scanMinWall, triCount, MAX_TRIS, type MinWallScan } from "./lib/validate";
import { decimateGeometry } from "./lib/decimate";
import { autoLevelGeometry } from "./lib/ajurOps";
import {
  detectModelKind, autoMaskRing, autoMaskMedallion, applyBrush, maskedCount,
  type MaskFrame, type ModelKind,
} from "./lib/mask";
import { PATTERNS, patternById } from "./lib/patterns";
import { planHoles, applyAjur, type AjurParams, type HolePlan } from "./lib/applyAjur";
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

  // senaryo
  const [hollowEstMm3, setHollowEstMm3] = useState<number | null>(null);

  // uygulama süreci
  const [applying, setApplying] = useState(false);
  const [applyPct, setApplyPct] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // sonuç doğrulama
  const [wallScan, setWallScan] = useState<MinWallScan | null>(null);
  const [showThin, setShowThin] = useState(true);

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
        ? autoMaskRing(geo, det.ringAxis)
        : autoMaskMedallion(geo);

      maskRef.current = auto.mask;
      setFrame(auto.frame);
      setKind(k);
      setMaskVersion((v) => v + 1);
      setModel({ geometry: geo, bvh, tris: val.tris, volumeMm3: val.volumeMm3, isShell, fileName });
      setClipAxis(auto.frame.kind === "cylindrical" ? auto.frame.axisIndex : 2);
      setStep(2);

      // dolu modelde hollow senaryosu — kaba tahmin (arka planda)
      if (!isShell) {
        setTimeout(() => {
          try {
            setHollowEstMm3(estimateHollowCavity(geo, bvh, 1.0));
          } catch { setHollowEstMm3(null); }
        }, 50);
      }
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
      ? autoMaskRing(model.geometry, det.ringAxis ?? 1)
      : autoMaskMedallion(model.geometry);
    maskRef.current = auto.mask;
    setFrame(auto.frame);
    setKind(newKind);
    setMaskVersion((v) => v + 1);
  }, [model]);

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
        const params: AjurParams = { patternId, cellMm, holeScale, rotationDeg, marginMm, frontSkinMm };
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
  }, [model, frame, step, patternId, cellMm, holeScale, rotationDeg, marginMm, frontSkinMm, maskVersion, result]);

  // ---- uygula ----
  const runApply = useCallback(async () => {
    if (!model || !frame || !maskRef.current || !plan || plan.placements.length === 0) return;
    setApplying(true);
    setApplyPct(0);
    setError(null);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const r = await applyAjur(
        { geometry: model.geometry, bvh: model.bvh, mask: maskRef.current, frame, isShell: model.isShell },
        plan,
        { onProgress: (p) => setApplyPct(Math.round(p * 100)), signal: ac.signal },
      );
      setResult(r);
      setStep(5);
      // sonuç min-et taraması (kırmızı highlight)
      setTimeout(() => {
        try {
          const rbvh = new MeshBVH(r.geometry);
          setWallScan(scanMinWall(r.geometry, rbvh, CASTING_RULES[metal].minWallHardMm));
        } catch { setWallScan(null); }
      }, 60);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      setApplying(false);
      abortRef.current = null;
    }
  }, [model, frame, plan, metal]);

  // ---- indir + köprüye yaz ----
  const download = useCallback(() => {
    if (!result) return;
    const blob = exportStlBlob(result.geometry);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (model?.fileName ?? "model.stl").replace(/\.stl$/i, "") + "_ajur.stl";
    a.click();
    URL.revokeObjectURL(url);
  }, [result, model]);

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
    if (result) return gramForMetal(result.volumeAfterMm3, metal);
    if (!model) return null;
    const planned = step === 4 && plan ? plan.removedMm3 : 0;
    return gramForMetal(Math.max(0, model.volumeMm3 - planned), metal);
  }, [model, result, plan, step, metal]);
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
                  if (s.id < step && !applying) {
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
                thinVerts={result && showThin ? wallScan?.thinVerts ?? null : null}
                clip={{ enabled: clipOn, axis: clipAxis, position: clipPos }}
                holePreview={step === 4 && !result ? plan?.placements ?? null : null}
                onPaint={onPaint}
              />
              {applying && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-sm">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#b76e79]/30 border-t-[#b76e79]" />
                  <p className="text-sm text-white/70">Ajur uygulanıyor… %{applyPct}</p>
                  <button
                    onClick={() => abortRef.current?.abort()}
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/60 hover:text-white"
                  >
                    İptal
                  </button>
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
                  <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4 text-xs leading-relaxed text-amber-200/90">
                    Bu model iç boşaltılmamış; ajur delikleri boşluğa açılmaz, kör biter.
                    Önce iç boşaltma öneriyoruz.{" "}
                    <Link href="/remaura/hollow" className="font-medium underline">İç Boşaltma aracı →</Link>
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
                        label="İç boşaltma (1.0 mm duvar)"
                        grams={hollowEstMm3 !== null ? gramForMetal(model.volumeMm3 - hollowEstMm3, metal) : null}
                        href="/remaura/hollow"
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
                  className="w-full rounded-xl bg-[linear-gradient(135deg,#c4838b,#b76e79,#a65f69)] px-6 py-3.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
                >
                  Uygula — gerçek delikleri aç
                </button>
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
                    wallScan.thinCount > 0 ? (
                      <p className="mt-1 text-red-400">
                        ⚠ {wallScan.thinCount} noktada et {fmt2(rule.minWallHardMm)} mm altında (en ince {fmt2(wallScan.minFoundMm)} mm)
                        — kırmızı bölgeler döküm riski taşır. Yoğunluğu azaltıp yeniden deneyebilirsiniz.
                      </p>
                    ) : (
                      <p className="mt-1 text-emerald-400">✓ Et kalınlığı {fmt2(rule.minWallHardMm)} mm üzerinde</p>
                    )
                  ) : (
                    <p className="mt-1 text-white/30">Et kalınlığı taranıyor…</p>
                  )}
                </div>

                <button
                  onClick={download}
                  className="w-full rounded-xl bg-[linear-gradient(135deg,#c4838b,#b76e79,#a65f69)] px-6 py-3.5 text-sm font-medium text-white hover:opacity-90"
                >
                  Ajurlu STL indir
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
