"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import {
  Upload, Download, RotateCcw, Sparkles, Check, ChevronLeft, ChevronRight, Ruler,
} from "lucide-react";
import { AjurViewer, type AjurViewerHandle } from "./AjurViewer";
import { analyzeModelForAjur, autoLevelGeometry, detectFlatFace, type Axis, type PatternType } from "./lib/ajurOps";
import { runAjurPipeline, type AjurPipelineProgress } from "./lib/ajurPipeline";
import { analyzeGeometry, computeWeight, METALS, type MeshAnalysis, type MetalWeight } from "../mesh-temizle/lib/meshOps";

type LogType = "info" | "ok" | "warn" | "err";
type Log = { id: number; type: LogType; msg: string };

// Arka yön = ajurun uygulanacağı yüz. Flip/eksen kullanıcıdan gizli.
type Dir = "back" | "front" | "top" | "bottom" | "left" | "right";

const DIRS: { key: Dir; label: string; arrow: string }[] = [
  { key: "back", label: "Arka", arrow: "⌫" },
  { key: "front", label: "Ön", arrow: "⌦" },
  { key: "top", label: "Üst", arrow: "↑" },
  { key: "bottom", label: "Alt", arrow: "↓" },
  { key: "left", label: "Sol", arrow: "←" },
  { key: "right", label: "Sağ", arrow: "→" },
];

function dirToPlane(dir: Dir, depth: number): { axis: Axis; position: number; flip: boolean } {
  const d = Math.min(0.95, Math.max(0, depth));
  switch (dir) {
    case "back": return { axis: "z", position: d, flip: false };
    case "front": return { axis: "z", position: 1 - d, flip: true };
    case "bottom": return { axis: "y", position: d, flip: false };
    case "top": return { axis: "y", position: 1 - d, flip: true };
    case "left": return { axis: "x", position: d, flip: false };
    case "right": return { axis: "x", position: 1 - d, flip: true };
  }
}
function clipToDir(axis: Axis, flip: boolean): Dir {
  if (axis === "z") return flip ? "front" : "back";
  if (axis === "y") return flip ? "top" : "bottom";
  return flip ? "right" : "left";
}

const PATTERNS: { key: PatternType; label: string; hint: string }[] = [
  { key: "petek", label: "Petek", hint: "Altıgen — en sağlam köprüler" },
  { key: "yuvarlak", label: "Yuvarlak", hint: "Daire — yumuşak görünüm" },
  { key: "baklava", label: "Baklava", hint: "Eşkenar dörtgen — klasik" },
];

const STEPS = ["Model Yükle", "Arka Yön", "Desen", "Üret"];

export function AjurClient() {
  const [step, setStep] = useState(0);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [resultGeo, setResultGeo] = useState<THREE.BufferGeometry | null>(null);
  const [fileName, setFileName] = useState("");
  const [analysis, setAnalysis] = useState<MeshAnalysis | null>(null);
  const [weight, setWeight] = useState<MetalWeight | null>(null);
  const [metalKey, setMetalKey] = useState("au18");

  // Ayarlar
  const [dir, setDir] = useState<Dir>("back");
  const [pattern, setPattern] = useState<PatternType>("petek");
  const [cellsAcross, setCellsAcross] = useState(10);
  const [holeScale, setHoleScale] = useState(0.6);
  const [wallMm, setWallMm] = useState(1.0);
  const [frontSkin, setFrontSkin] = useState(1.0);     // ön yüzde korunacak min et (mm)
  const [thinExtent, setThinExtent] = useState(6);     // modelin en ince ekseni (mm) — bilgi

  // Üretim
  const [pipeProgress, setPipeProgress] = useState<AjurPipelineProgress | null>(null);
  const [resultStats, setResultStats] = useState<{ holes: number; strutMm: number; ms: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [logs, setLogs] = useState<Log[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const viewerRef = useRef<AjurViewerHandle | null>(null);
  const logId = useRef(0);

  const shown = resultGeo ?? geometry;
  const noClip = useMemo(() => ({ enabled: false, axis: "z" as const, position: 0.5, flip: false }), []);
  // Seçili yüz göstergesi — sonuç yokken yön seçimini görselleştir
  const marker = useMemo(() => {
    if (resultGeo) return null;
    const p = dirToPlane(dir, 0);
    return { axis: p.axis, flip: p.flip };
  }, [dir, resultGeo]);

  const addLog = useCallback((type: LogType, msg: string) => {
    setLogs((p) => [...p, { id: (logId.current += 1), type, msg }].slice(-40));
  }, []);

  // Görüntülenen geometri değişince analiz + gramaj
  useEffect(() => {
    if (!shown) { setAnalysis(null); setWeight(null); return; }
    try { setAnalysis(analyzeGeometry(shown)); setWeight(computeWeight(shown)); }
    catch { setAnalysis(null); setWeight(null); }
  }, [shown]);

  function loadFile(file: File) {
    setFileName(file.name);
    addLog("info", `Yükleniyor: ${file.name}`);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = new STLLoader().parse(e.target?.result as ArrayBuffer);
        const geo = autoLevelGeometry(raw).geometry;
        setGeometry(geo);
        setResultGeo(null);
        setResultStats(null);
        // Arka yön önerisi: ince eksen + DÜZ (detaysız) yüzü arka kabul et
        try {
          const a = analyzeModelForAjur(geo);
          const flat = detectFlatFace(geo, a.thinAxis); // fromMax=true → arka yüksek uçta
          setDir(clipToDir(a.thinAxis, flat.fromMax));
          // En ince eksen = model kalınlığı (bilgi); ön et varsayılanı ~%20 (min 0.8)
          const tExt = Math.min(...a.dims);
          setThinExtent(+tExt.toFixed(1));
          setFrontSkin(+Math.max(0.8, Math.min(2.0, tExt * 0.2)).toFixed(1));
        } catch { /* yok say */ }
        addLog("ok", "Model yüklendi ve hizalandı.");
        setStep(1);
      } catch {
        addLog("err", "Model okunamadı. Dosya bozuk veya desteklenmeyen olabilir.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function onInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (f) loadFile(f);
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) loadFile(f);
  }

  // Önizleme amaçlı yaklaşık köprü kalınlığı (üretmeden uyarı için)
  const approxStrut = useMemo(() => {
    if (!analysis) return null;
    const dims = [...analysis.dimensions].sort((a, b) => b - a);
    const faceMax = dims[0]; // en geniş yüz ekseni
    const cell = faceMax / Math.max(1, cellsAcross);
    return cell * (1 - holeScale);
  }, [analysis, cellsAcross, holeScale]);

  async function produce() {
    if (!geometry) return;
    setResultGeo(null);
    setResultStats(null);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPipeProgress({ stage: "prepare", percent: 0, message: "Başlatılıyor…" });
    addLog("info", "Ajur üretimi başladı.");
    try {
      const res = await runAjurPipeline(
        {
          geometry,
          backPlane: dirToPlane(dir, 0.2),
          wallMm,
          pattern,
          cellsAcross,
          holeScale,
          thickness: Math.max(0.8, wallMm),
          border: Math.max(wallMm, 0.6),
          decimateTarget: 150000,
          compose: "drill-back",
          frontSkinMm: frontSkin,
        },
        { mode: "single", execution: "main-thread", signal: ctrl.signal, onProgress: setPipeProgress },
      );
      if (res.geometry) {
        res.geometry.computeVertexNormals();
        setResultGeo(res.geometry);
      }
      const s = res.stats;
      setResultStats({ holes: s.holes, strutMm: s.strutMm, ms: s.ms });
      addLog("ok", `Tamam — ${s.holes} delik · köprü ${s.strutMm.toFixed(2)}mm · ${(s.ms / 1000).toFixed(1)}s.`);
      if (s.strutMm < 0.8) addLog("warn", `Köprü ${s.strutMm.toFixed(2)}mm — döküm için ince olabilir.`);
    } catch (err) {
      const e = err as Error;
      if (e.name === "AbortError") addLog("warn", "İptal edildi.");
      else addLog("err", `Başarısız: ${e.message}`);
    } finally {
      setPipeProgress(null);
      abortRef.current = null;
    }
  }

  function exportStl() {
    const g = resultGeo ?? geometry;
    if (!g) return;
    try {
      const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial());
      const stl = new STLExporter().parse(mesh, { binary: true }) as unknown as BlobPart;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([stl], { type: "model/stl" }));
      a.download = (fileName.replace(/\.[^.]+$/, "") || "ajur") + "_ajur.stl";
      a.click(); URL.revokeObjectURL(a.href);
      addLog("ok", "STL indirildi.");
    } catch { addLog("err", "Dışa aktarma başarısız."); }
  }

  function reset() {
    setStep(0); setGeometry(null); setResultGeo(null); setResultStats(null);
    setFileName(""); setAnalysis(null); setWeight(null); setDir("back");
    setPattern("petek"); setCellsAcross(10); setHoleScale(0.6); setWallMm(1.0);
    setFrontSkin(1.0); setThinExtent(6); setLogs([]);
  }

  const grams = weight?.weights.find((w) => w.key === metalKey)?.grams;
  const canNext = step === 0 ? !!geometry : true;

  return (
    <div className="min-h-screen bg-[#07080a] px-4 py-8 text-white">
      {/* İlerleme overlay */}
      {pipeProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-[min(92vw,420px)] rounded-2xl border border-[#b76e79]/30 bg-[#0a0b0e] p-6 shadow-2xl">
            <div className="mb-1 flex items-center gap-2 text-sm font-medium text-[#e6b3bb]">
              <Sparkles className="h-4 w-4 animate-pulse" /> Ajur üretiliyor
            </div>
            <p className="mb-4 text-xs text-white/40">Model boyutuna göre 20–60 sn sürebilir. Pencereyi kapatmayın.</p>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-sm text-white/80">{pipeProgress.message}</span>
              <span className="font-mono text-xs text-[#e6b3bb]">%{pipeProgress.percent}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,#c4838b,#b76e79,#a65f69)] transition-all duration-300"
                style={{ width: `${pipeProgress.percent}%` }} />
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => abortRef.current?.abort()}
                className="rounded-full border border-white/15 px-4 py-1.5 text-xs font-medium text-white/70 hover:bg-white/10">İptal</button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl">
        {/* Başlık */}
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#b76e79]/30 bg-[#b76e79]/10 px-3 py-1 text-xs font-medium text-[#b76e79]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#b76e79]" /> Ajur Aracı
            </div>
            <h1 className="font-display text-3xl font-medium tracking-tight">Arkaya ışık geçen ajur</h1>
          </div>
          {geometry && (
            <button onClick={reset} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/60 hover:text-white">
              <RotateCcw className="h-4 w-4" /> Baştan
            </button>
          )}
        </div>

        {/* Adım göstergesi */}
        <div className="mb-5 flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                i < step ? "bg-[#b76e79] text-white" : i === step ? "bg-[#b76e79] text-white ring-2 ring-[#b76e79]/30 ring-offset-2 ring-offset-[#07080a]" : "bg-white/10 text-white/40"}`}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`hidden text-xs sm:inline ${i === step ? "font-medium text-white" : "text-white/40"}`}>{label}</span>
              {i < STEPS.length - 1 && <div className={`h-px flex-1 ${i < step ? "bg-[#b76e79]/50" : "bg-white/10"}`} />}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
          {/* SOL: viewer (1. adım hariç) */}
          {step > 0 && (
            <div className="relative h-[460px] overflow-hidden rounded-2xl border border-white/[0.06] bg-[#07080a]">
              <AjurViewer ref={viewerRef} geometry={shown} ghost={null} clip={noClip} wireframe={false} gizmo={false} marker={marker} />
              <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white/60 backdrop-blur">
                {resultGeo ? "Sonuç" : fileName || "Model"}
              </div>
            </div>
          )}

          {/* SAĞ (veya 1. adımda tam genişlik): adım paneli */}
          <div className={`flex flex-col gap-4 ${step === 0 ? "lg:col-span-2" : ""}`}>

            {/* ADIM 1 — Yükle */}
            {step === 0 && (
              <div
                onDragOver={(e) => e.preventDefault()} onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className="flex min-h-[280px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] px-6 text-center hover:border-[#b76e79]/40 hover:bg-[#b76e79]/5"
              >
                <input ref={inputRef} type="file" accept=".stl" className="hidden" onChange={onInput} />
                <Upload className="h-10 w-10 text-white/30" />
                <p className="text-base font-medium text-white/70">STL dosyanı sürükle veya tıkla</p>
                <p className="max-w-sm text-xs text-white/35">3D modelini yükle. Model otomatik hizalanır, sonraki adımda arka yüzü seçeceksin.</p>
              </div>
            )}

            {/* ADIM 2 — Arka yön */}
            {step === 1 && (
              <div className="flex flex-col gap-4 rounded-2xl border border-[#b76e79]/20 bg-[#b76e79]/[0.06] p-5">
                <div>
                  <h2 className="text-sm font-semibold text-white/90">Ajur hangi yüze uygulansın?</h2>
                  <p className="mt-1 text-xs text-white/40">
                    Modelin <b>düz arka yüzünü</b> seç (figürün OLMADIĞI taraf). Soldaki modelde seçtiğin yüz <span className="text-[#ff8fa3]">gül renkle</span> parlar — figürün üstündeyse başka yön seç. Önerilen seçili geldi.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {DIRS.map((d) => (
                    <button key={d.key} onClick={() => setDir(d.key)}
                      className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-sm font-medium transition-colors ${dir === d.key ? "bg-[#b76e79] text-white" : "bg-white/10 text-white/60 hover:bg-white/15"}`}>
                      <span className="leading-none">{d.arrow}</span> {d.label}
                    </button>
                  ))}
                </div>
                <button onClick={() => { const v = viewerRef.current?.getViewClip(); if (v) setDir(clipToDir(v.axis, v.flip)); }}
                  className="self-start rounded-md bg-white/10 px-3 py-1.5 text-[11px] text-white/70 hover:bg-white/15">
                  Şu an baktığım yüzü seç
                </button>
              </div>
            )}

            {/* ADIM 3 — Desen */}
            {step === 2 && (
              <div className="flex flex-col gap-4 rounded-2xl border border-[#b76e79]/20 bg-[#b76e79]/[0.06] p-5">
                <div>
                  <h2 className="text-sm font-semibold text-white/90">Desen ve ayarlar</h2>
                  <p className="mt-1 text-xs text-white/40">Delik şekli, sıklığı ve duvar kalınlığını seç.</p>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {PATTERNS.map((p) => (
                    <button key={p.key} onClick={() => setPattern(p.key)}
                      className={`rounded-lg px-2 py-2.5 text-sm font-medium transition-colors ${pattern === p.key ? "bg-[#b76e79] text-white" : "bg-white/10 text-white/60 hover:bg-white/15"}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <p className="-mt-2 text-[11px] text-white/35">{PATTERNS.find((p) => p.key === pattern)?.hint}</p>

                <Slider label="Sıklık" value={cellsAcross} min={4} max={24} step={1}
                  onChange={setCellsAcross} fmt={(v) => `${v} göz`} />
                <Slider label="Delik boyutu" value={holeScale} min={0.3} max={0.9} step={0.02}
                  onChange={setHoleScale} fmt={(v) => `%${(v * 100).toFixed(0)}`} />
                <Slider label="Duvar" value={wallMm} min={0.5} max={2.0} step={0.1}
                  onChange={setWallMm} fmt={(v) => `${v.toFixed(1)} mm`} />
                <Slider label="Ön et koru" value={frontSkin} min={0.5} max={2.5} step={0.1}
                  onChange={setFrontSkin} fmt={(v) => `${v.toFixed(1)} mm`} />
                <p className="-mt-1 text-[11px] text-white/35">
                  Model kalınlığı ≈ {thinExtent.toFixed(1)} mm. Delik her noktada ön yüze <b>{frontSkin.toFixed(1)} mm</b> kala durur — ön figür asla delinmez. Artır = daha güvenli; azalt = daha derin/ışıklı.
                </p>

                {frontSkin > thinExtent - wallMm && (
                  <div className="rounded-lg border border-amber-400/30 bg-amber-400/[0.06] px-3 py-2 text-[11px] text-amber-300/90">
                    ⚠ Ön et + duvar, model kalınlığını aşıyor — bu modelde çoğu delik açılamayabilir. Ön eti ya da duvarı küçült.
                  </div>
                )}
                {approxStrut !== null && (
                  <div className={`rounded-lg border px-3 py-2 text-[11px] ${approxStrut < 0.8 ? "border-amber-400/30 bg-amber-400/[0.06] text-amber-300/90" : "border-white/10 bg-white/[0.03] text-white/50"}`}>
                    Tahmini köprü kalınlığı ≈ <b>{approxStrut.toFixed(2)} mm</b>
                    {approxStrut < 0.8 && " — döküm için ince. Delik boyutunu küçült ya da sıklığı azalt."}
                  </div>
                )}
              </div>
            )}

            {/* ADIM 4 — Üret */}
            {step === 3 && (
              <div className="flex flex-col gap-4 rounded-2xl border border-[#b76e79]/20 bg-[#b76e79]/[0.06] p-5">
                <div>
                  <h2 className="text-sm font-semibold text-white/90">Üret</h2>
                  <p className="mt-1 text-xs text-white/40">Ayarların özeti aşağıda. Hazırsan üret.</p>
                </div>
                <div className="space-y-1.5 rounded-lg bg-white/[0.03] px-3 py-2.5 text-xs">
                  <SumRow k="Yüz" v={DIRS.find((d) => d.key === dir)?.label ?? dir} />
                  <SumRow k="Desen" v={PATTERNS.find((p) => p.key === pattern)?.label ?? pattern} />
                  <SumRow k="Sıklık" v={`${cellsAcross} göz`} />
                  <SumRow k="Delik" v={`%${(holeScale * 100).toFixed(0)}`} />
                  <SumRow k="Duvar" v={`${wallMm.toFixed(1)} mm`} />
                  <SumRow k="Ön et koru" v={`${frontSkin.toFixed(1)} mm`} />
                </div>

                {!resultGeo ? (
                  <button onClick={produce} disabled={!!pipeProgress}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#c4838b,#b76e79,#a65f69)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
                    <Sparkles className="h-4 w-4" /> Ajur üret
                  </button>
                ) : (
                  <>
                    <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/[0.06] px-3 py-2.5 text-xs text-emerald-300/90">
                      ✓ Hazır{resultStats ? ` — ${resultStats.holes} delik · köprü ${resultStats.strutMm.toFixed(2)}mm · ${(resultStats.ms / 1000).toFixed(1)}s` : ""}.
                      Soldan kontrol et; iyiyse indir.
                    </div>
                    <button onClick={exportStl}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-semibold text-black">
                      <Download className="h-4 w-4" /> STL indir
                    </button>
                    <button onClick={() => { setResultGeo(null); setResultStats(null); setStep(2); }}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10">
                      Ayarları değiştir
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Gramaj (model varken) */}
            {step > 0 && weight && (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                <span className="mb-2 flex items-center gap-1.5 text-xs font-medium text-white/60">
                  <Ruler className="h-3.5 w-3.5" /> Tahmini Gramaj
                </span>
                <div className="mb-2 flex flex-wrap gap-1">
                  {METALS.map((m) => (
                    <button key={m.key} onClick={() => setMetalKey(m.key)}
                      className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${metalKey === m.key ? "bg-[#b76e79] text-white" : "bg-white/10 text-white/60 hover:bg-white/15"}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-baseline justify-between rounded-lg border border-[#b76e79]/20 bg-[#b76e79]/[0.06] px-3 py-2">
                  <span className="text-[11px] text-white/50">Hacim {weight.volumeCm3.toFixed(2)} cm³</span>
                  <span className="font-mono text-base font-semibold text-[#e6b3bb]">{grams?.toFixed(2)} g</span>
                </div>
              </div>
            )}

            {/* Navigasyon */}
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button onClick={() => setStep((s) => Math.max(0, s - 1))}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10">
                  <ChevronLeft className="h-4 w-4" /> Geri
                </button>
              )}
              {step < STEPS.length - 1 && (
                <button onClick={() => canNext && setStep((s) => s + 1)} disabled={!canNext}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#c4838b,#b76e79,#a65f69)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
                  İleri <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Son birkaç mesaj */}
            {logs.length > 0 && (
              <div className="rounded-xl border border-white/[0.06] bg-[#030712] px-3 py-2 font-mono text-[11px] leading-relaxed">
                {logs.slice(-4).map((l) => (
                  <div key={l.id} className={l.type === "err" ? "text-red-400" : l.type === "ok" ? "text-emerald-400" : l.type === "warn" ? "text-amber-400" : "text-white/50"}>{l.msg}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SumRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/45">{k}</span>
      <span className="font-medium text-white/85">{v}</span>
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange, fmt }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; fmt: (v: number) => string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs text-white/60">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range-slider flex-1 min-w-[80px]" />
      <span className="w-16 shrink-0 text-right font-mono text-xs text-white/60">{fmt(value)}</span>
    </div>
  );
}
