"use client";

import { useCallback, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import {
  AlertTriangle, CheckCircle2, Download, FileText, ListChecks,
  RotateCcw, Scissors, Scale, Upload, Wrench,
} from "lucide-react";
import { MeshCleanViewer } from "./MeshCleanViewer";
import {
  analyzeGeometry, basicCleanup, keepLargestShell, deleteNonManifoldFaces,
  repairEdgesAndSmallHoles, scaleGeometry, computeWeight, type MeshAnalysis, type MetalWeight,
} from "./lib/meshOps";
import { Ruler } from "lucide-react";

type Log = { id: number; type: "info" | "ok" | "warn" | "err"; msg: string };

export function MeshTemizleClient() {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [analysis, setAnalysis] = useState<MeshAnalysis | null>(null);
  const [weight, setWeight] = useState<MetalWeight | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [targetMm, setTargetMm] = useState("");
  const [wireframe, setWireframe] = useState(false);
  const [showBadEdges, setShowBadEdges] = useState(true);
  const [logs, setLogs] = useState<Log[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const logBoxRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((type: Log["type"], msg: string) => {
    const t = new Date().toLocaleTimeString("tr-TR", { hour12: false });
    setLogs((p) => [...p, { id: Date.now() + Math.random(), type, msg: `[${t}] ${msg}` }].slice(-40));
    requestAnimationFrame(() => logBoxRef.current?.scrollTo({ top: logBoxRef.current.scrollHeight }));
  }, []);

  function apply(next: THREE.BufferGeometry, label: string) {
    const a = analyzeGeometry(next);
    setGeometry(next);
    setAnalysis(a);
    setWeight(null); // geometri değişti, ağırlık tekrar hesaplanmalı
    addLog(a.watertight ? "ok" : "warn",
      `${label}: ${a.triangleCount.toLocaleString()} üçgen, ${a.shellCount} parça, ${a.boundaryEdges} açık kenar, ${a.nonManifoldEdges} non-manifold.`);
    return a;
  }

  function loadFile(file: File) {
    setFileName(file.name);
    setWeight(null);
    addLog("info", `Yükleniyor: ${file.name} (${(file.size / 1024).toFixed(0)} KB)`);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buf = e.target?.result as ArrayBuffer;
        const geo = new STLLoader().parse(buf);
        geo.computeVertexNormals();
        apply(geo, "Analiz");
      } catch {
        addLog("err", "STL okunamadı. Dosya bozuk veya desteklenmeyen formatta olabilir.");
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

  function runBasicCleanup() {
    if (!geometry) return;
    addLog("info", "Temel temizlik: weld + duplicate/degenerate yüz temizliği…");
    try { apply(basicCleanup(geometry, 5), "Temel temizlik"); }
    catch { addLog("err", "Temel temizlik başarısız."); }
  }
  function runKeepLargest() {
    if (!geometry || !analysis) return;
    addLog("info", `İzole parça temizliği. Mevcut parça: ${analysis.shellCount}.`);
    try { apply(keepLargestShell(geometry, analysis), "En büyük parça"); }
    catch { addLog("err", "İzole parça temizliği başarısız."); }
  }
  function runDeleteNM() {
    if (!geometry) return;
    addLog("info", "Yeşil (non-manifold) yüzler ve bağlı çöpler siliniyor…");
    try { apply(deleteNonManifoldFaces(geometry, 1), "Yeşil çöp temizliği"); }
    catch { addLog("err", "Non-manifold temizliği başarısız."); }
  }
  function runEdgeRepair() {
    if (!geometry || !analysis) return;
    addLog("info", `Açık kenar kapatma. Açık kenar: ${analysis.boundaryEdges}, non-manifold: ${analysis.nonManifoldEdges}.`);
    try {
      const before = { b: analysis.boundaryEdges, n: analysis.nonManifoldEdges };
      const a = apply(repairEdgesAndSmallHoles(geometry), "Kenar onarımı");
      addLog("ok", `Açık kenar ${before.b} → ${a.boundaryEdges}, non-manifold ${before.n} → ${a.nonManifoldEdges}.`);
    } catch { addLog("err", "Kenar onarımı başarısız."); }
  }

  function runScale(factor: number, label: string) {
    if (!geometry || factor <= 0 || !isFinite(factor)) return;
    addLog("info", `Ölçek uygulanıyor: ${label} (×${factor.toFixed(4)})`);
    try { apply(scaleGeometry(geometry, factor), `Ölçek ${label}`); }
    catch { addLog("err", "Ölçekleme başarısız."); }
  }
  function runScaleToMax(targetMm: number) {
    if (!geometry || !analysis) return;
    const cur = Math.max(...analysis.dimensions);
    if (cur <= 0 || targetMm <= 0) return;
    runScale(targetMm / cur, `en büyük boyut ${targetMm}mm`);
  }

  function runWeight() {
    if (!geometry) return;
    const w = computeWeight(geometry);
    setWeight(w);
    addLog("ok", `Hacim ${w.volumeMm3.toFixed(2)} mm³ · gümüş ${w.weights[0].grams.toFixed(2)} g.`);
    if (analysis && !analysis.watertight) {
      addLog("warn", "Model watertight değil — temizledikten sonra gramaj daha güvenilir olur.");
    }
  }

  function exportStl() {
    if (!geometry) return;
    try {
      const mesh = new THREE.Mesh(geometry);
      mesh.updateMatrixWorld(true);
      // Binary çıktı three sürümüne göre DataView / ArrayBuffer / Uint8Array dönebilir.
      const result = new STLExporter().parse(mesh, { binary: true }) as unknown;

      let blobPart: BlobPart;
      if (typeof result === "string") {
        blobPart = result;
      } else if (result instanceof ArrayBuffer) {
        blobPart = new Uint8Array(result.slice(0));
      } else if (ArrayBuffer.isView(result)) {
        // DataView / Uint8Array vb. → taze Uint8Array'e kopyala
        const v = result as ArrayBufferView;
        const src = new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
        blobPart = new Uint8Array(src); // kopya
      } else {
        // son çare: ASCII
        blobPart = new STLExporter().parse(mesh) as unknown as string;
      }

      const blob = new Blob([blobPart], { type: "model/stl" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = (fileName.replace(/\.stl$/i, "") || "model") + "_temiz.stl";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      addLog("ok", `Temizlenmiş STL indirildi (${(blob.size / 1024).toFixed(0)} KB).`);
    } catch (err) {
      addLog("err", `İndirme başarısız: ${(err as Error).message}`);
    }
  }

  function reset() {
    setGeometry(null); setAnalysis(null); setWeight(null); setFileName("");
    addLog("info", "Sıfırlandı.");
  }

  return (
    <div className="min-h-screen bg-[#07080a] px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        {/* Başlık */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#b76e79]/30 bg-[#b76e79]/10 px-3 py-1 text-xs font-medium text-[#b76e79]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#b76e79]" />
              Mesh Temizleme &amp; Gramaj
            </div>
            <h1 className="font-display text-3xl font-medium tracking-tight">Modeli oku, temizle, tart</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={reset} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/60 hover:text-white">
              <RotateCcw className="h-4 w-4" /> Sıfırla
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px]">
          {/* SOL: sahne + log */}
          <div className="flex flex-col gap-4">
            <div className="relative h-[480px] overflow-hidden rounded-2xl border border-white/[0.06] bg-[#07080a]">
              <MeshCleanViewer geometry={geometry} wireframe={wireframe} showBadEdges={showBadEdges} />
              <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white/60 backdrop-blur">
                {fileName || "STL yüklenmedi"}
              </div>
              <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-end gap-2">
                <button onClick={() => setWireframe((v) => !v)} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/15">
                  {wireframe ? "Katı" : "Tel kafes"}
                </button>
                <button onClick={() => setShowBadEdges((v) => !v)} className="rounded-full bg-[#00ff66]/20 px-3 py-1.5 text-xs font-medium text-[#7dffb0] hover:bg-[#00ff66]/30">
                  {showBadEdges ? "Yeşil hataları gizle" : "Yeşil hataları göster"}
                </button>
                <button onClick={exportStl} disabled={!geometry} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-40">
                  <Download className="h-3.5 w-3.5" /> STL indir
                </button>
              </div>
            </div>

            {/* Log */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#030712] p-3">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/50">
                  <ListChecks className="h-3.5 w-3.5" /> İşlem Günlüğü
                </span>
                {logs.length > 0 && <button onClick={() => setLogs([])} className="text-[11px] text-white/30 hover:text-white/60">temizle</button>}
              </div>
              <div ref={logBoxRef} className="h-28 overflow-y-auto px-1 font-mono text-[11px] leading-relaxed">
                {logs.length === 0 ? <p className="text-white/25">Hazır. STL yükleyin…</p> :
                  logs.map((l) => (
                    <div key={l.id} className={l.type === "err" ? "text-red-400" : l.type === "ok" ? "text-emerald-400" : l.type === "warn" ? "text-amber-400" : "text-white/55"}>{l.msg}</div>
                  ))}
              </div>
            </div>
          </div>

          {/* SAĞ: kontrol */}
          <div className="flex flex-col gap-4">
            {/* Yükle */}
            <div
              onDragOver={(e) => e.preventDefault()} onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className="flex min-h-[96px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 text-center hover:border-[#b76e79]/40 hover:bg-[#b76e79]/5"
            >
              <input ref={inputRef} type="file" accept=".stl" className="hidden" onChange={onInput} />
              <Upload className="h-5 w-5 text-white/40" />
              <p className="text-sm text-white/50">{fileName || "STL sürükle veya tıkla"}</p>
            </div>

            {/* Analiz raporu */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70">
                  <FileText className="h-4 w-4" /> Analiz Raporu
                </span>
                {analysis && (analysis.watertight
                  ? <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  : <AlertTriangle className="h-5 w-5 text-amber-400" />)}
              </div>
              {analysis ? (
                <div className="space-y-2 text-sm">
                  <Row label="Üçgen" value={analysis.triangleCount.toLocaleString()} />
                  <Row label="Vertex (weld)" value={analysis.vertexCount.toLocaleString()} />
                  <Row label="Parça / Shell" value={String(analysis.shellCount)} bad={analysis.shellCount > 1} />
                  <Row label="Açık kenar" value={analysis.boundaryEdges.toLocaleString()} bad={analysis.boundaryEdges > 0} />
                  <Row label="Non-manifold" value={analysis.nonManifoldEdges.toLocaleString()} bad={analysis.nonManifoldEdges > 0} />
                  <Row label="Boyut (mm)" value={analysis.dimensions.map((d) => d.toFixed(2)).join(" × ")} />
                </div>
              ) : <p className="text-sm text-white/30">STL yüklenince rapor burada görünür.</p>}
              {analysis && (Math.max(...analysis.dimensions) < 4 || Math.max(...analysis.dimensions) > 250) && (
                <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
                  Boyut mücevher için olağandışı görünüyor — gerçek ölçüyü aşağıdan girip ölçekle.
                </p>
              )}
            </div>

            {/* Birim / Ölçek */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
              <span className="mb-1 flex items-center gap-1.5 text-sm font-medium text-white/70">
                <Ruler className="h-4 w-4" /> Birim / Ölçek
              </span>
              <p className="mb-3 text-xs text-white/35">
                Mesh AI / Tripo ölçüsüne güvenme. Parçanın <strong className="text-white/55">gerçek en büyük boyutunu (mm)</strong> gir — model homojen olarak o boyuta ölçeklenir.
              </p>
              {analysis && (
                <p className="mb-2 font-mono text-xs text-white/45">
                  Şu an en büyük boyut: <span className="text-[#e6b3bb]">{Math.max(...analysis.dimensions).toFixed(2)} mm</span>
                </p>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="number" inputMode="decimal" placeholder="Gerçek en büyük boyut (mm)"
                  value={targetMm} onChange={(e) => setTargetMm(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#b76e79]/40 focus:outline-none"
                />
                <button
                  onClick={() => { const v = parseFloat(targetMm); if (v > 0) runScaleToMax(v); }}
                  disabled={!geometry || !(parseFloat(targetMm) > 0)}
                  className="shrink-0 rounded-lg bg-[#b76e79]/20 px-4 py-2 text-sm font-medium text-[#e6b3bb] hover:bg-[#b76e79]/30 disabled:opacity-35"
                >Uygula</button>
              </div>
            </div>

            {/* İşlemler */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
              <span className="mb-3 block text-sm font-medium text-white/70">Temizleme İşlemleri</span>
              <div className="flex flex-col gap-2">
                <OpBtn onClick={runBasicCleanup} disabled={!geometry} icon={<Wrench className="h-4 w-4" />}>Temel topoloji temizliği</OpBtn>
                <OpBtn onClick={runKeepLargest} disabled={!analysis || analysis.shellCount < 2} icon={<Scissors className="h-4 w-4" />}>İzole parçaları sil (en büyüğü tut)</OpBtn>
                <OpBtn onClick={runDeleteNM} disabled={!analysis || analysis.nonManifoldEdges === 0} icon={<Scissors className="h-4 w-4" />} green>Yeşil çöpleri temizle</OpBtn>
                <OpBtn onClick={runEdgeRepair} disabled={!analysis || (analysis.boundaryEdges === 0 && analysis.nonManifoldEdges === 0)} icon={<AlertTriangle className="h-4 w-4" />}>Açık kenarları kapat (delik onarımı)</OpBtn>
              </div>
            </div>

            {/* Hacim & ağırlık */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
              <div className="mb-1 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70">
                  <Scale className="h-4 w-4" /> Hacim ve Metal Ağırlığı
                </span>
                <button onClick={runWeight} disabled={!geometry} className="rounded-full bg-[linear-gradient(135deg,#c4838b,#b76e79,#a65f69)] px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40">
                  Hesapla
                </button>
              </div>
              <p className="mb-3 text-xs text-white/35">Temizlenmiş modelde en güvenilir sonucu verir.</p>
              {weight ? (
                <>
                  <div className="mb-3 rounded-xl border border-[#b76e79]/20 bg-[#b76e79]/5 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-white/40">Hacim</p>
                    <p className="font-mono text-2xl font-semibold">{weight.volumeMm3.toFixed(2)} <span className="text-base text-white/50">mm³</span></p>
                    <p className="font-mono text-xs text-white/40">{weight.volumeCm3.toFixed(4)} cm³</p>
                  </div>
                  <div className="space-y-1.5">
                    {weight.weights.map((w) => (
                      <div key={w.key} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                        <div>
                          <p className="text-sm font-medium">{w.label}</p>
                          <p className="font-mono text-[11px] text-white/35">{w.density} g/cm³</p>
                        </div>
                        <p className="font-mono text-lg font-semibold text-[#e6b3bb]">{w.grams.toFixed(2)} g</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : <p className="text-sm text-white/30">«Hesapla» ile gramajı gör.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.05] pb-1.5 last:border-0">
      <span className="text-white/45">{label}</span>
      <span className={`font-mono ${bad ? "text-amber-400" : "text-white"}`}>{value}</span>
    </div>
  );
}

function OpBtn({ onClick, disabled, icon, green, children }: { onClick: () => void; disabled?: boolean; icon: React.ReactNode; green?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
        green
          ? "border border-[#00ff66]/30 bg-[#00ff66]/10 text-[#7dffb0] hover:bg-[#00ff66]/20"
          : "border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]"
      }`}
    >
      {icon}{children}
    </button>
  );
}
