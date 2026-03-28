"use client";

import { useState, useCallback, useRef } from "react";
import { MeshRealtimeViewer, type MeshRealtimeViewerHandle } from "@/components/remaura/MeshRealtimeViewer";

type StlAnalysis = {
  vertices: number;
  faces: number;
  triangles: number;
  polygons: number;
  components: number;
  watertight: boolean;
};

export function RemauraMeshAISection() {
  const [uploadedModel, setUploadedModel] = useState<File | null>(null);
  const [uploadBlobUrl, setUploadBlobUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [meshCleanup, setMeshCleanup] = useState(true);
  const [repairMesh, setRepairMesh] = useState(true);
  const [smoothSurface, setSmoothSurface] = useState(false);
  const [decimate, setDecimate] = useState(true);
  const [targetFaces, setTargetFaces] = useState(250000);
  const [maxHoleSize, setMaxHoleSize] = useState(1000);

  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlobUrl, setResultBlobUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [processLog, setProcessLog] = useState<string | null>(null);
  const [inputStats, setInputStats] = useState<StlAnalysis | null>(null);
  const [outputStats, setOutputStats] = useState<StlAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const viewerRef = useRef<MeshRealtimeViewerHandle | null>(null);

  const readStlHeaderLocal = useCallback(async (file: File | Blob): Promise<StlAnalysis | null> => {
    try {
      const buf = await file.slice(0, 84).arrayBuffer();
      if (buf.byteLength < 84) return null;
      const view = new DataView(buf);
      const first5 = new Uint8Array(buf, 0, 5);
      const isSolid = String.fromCharCode(...first5) === "solid";
      if (isSolid) return null;
      const triCount = view.getUint32(80, true);
      const expectedSize = 84 + triCount * 50;
      if (Math.abs(file.size - expectedSize) > 10) return null;
      return {
        vertices: triCount * 3,
        faces: triCount,
        triangles: triCount,
        polygons: triCount,
        components: -1,
        watertight: false,
      };
    } catch {
      return null;
    }
  }, []);

  const analyzeStl = useCallback(async (file: File | Blob): Promise<StlAnalysis | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/remaura/mesh/analyze", { method: "POST", body: formData });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.error) return null;
      return data as StlAnalysis;
    } catch {
      return null;
    }
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith(".stl")) {
      setError("Sadece STL dosyaları kabul edilir.");
      return;
    }
    setUploadedModel(file);
    if (uploadBlobUrl) URL.revokeObjectURL(uploadBlobUrl);
    setUploadBlobUrl(URL.createObjectURL(file));
    if (resultBlobUrl) URL.revokeObjectURL(resultBlobUrl);
    setResultBlobUrl(null);
    setResultBlob(null);
    setError(null);
    setProcessLog(null);
    setInputStats(null);
    setOutputStats(null);

    setIsAnalyzing(true);
    readStlHeaderLocal(file).then((quick) => {
      if (quick) setInputStats(quick);

      analyzeStl(file).then((full) => {
        if (full) setInputStats(full);
        setIsAnalyzing(false);
      });
    });
  }, [resultBlobUrl, uploadBlobUrl, analyzeStl, readStlHeaderLocal]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClear = useCallback(() => {
    setUploadedModel(null);
    if (uploadBlobUrl) URL.revokeObjectURL(uploadBlobUrl);
    setUploadBlobUrl(null);
    if (resultBlobUrl) URL.revokeObjectURL(resultBlobUrl);
    setResultBlobUrl(null);
    setResultBlob(null);
    setError(null);
    setProcessLog(null);
    setInputStats(null);
    setOutputStats(null);
  }, [resultBlobUrl, uploadBlobUrl]);

  const handleProcess = useCallback(async () => {
    if (!uploadedModel || isProcessing) return;
    setIsProcessing(true);
    setError(null);
    if (resultBlobUrl) URL.revokeObjectURL(resultBlobUrl);
    setResultBlobUrl(null);
    setResultBlob(null);
    setProcessLog(null);
    setOutputStats(null);

    try {
      const formData = new FormData();
      formData.append("file", uploadedModel);
      formData.append("cleanup", String(meshCleanup));
      formData.append("repair", String(repairMesh));
      formData.append("smooth", String(smoothSurface));
      formData.append("decimate", String(decimate));
      formData.append("targetFaces", String(targetFaces));
      formData.append("maxHoleSize", String(maxHoleSize));

      const res = await fetch("/api/remaura/mesh/process", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          (errData as { error?: string })?.error ?? `İşlem başarısız (${res.status})`
        );
      }

      const log = res.headers.get("X-Mesh-Log");
      if (log) setProcessLog(decodeURIComponent(log));

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setResultBlob(blob);
      setResultBlobUrl(url);

      analyzeStl(blob).then((stats) => {
        if (stats) setOutputStats(stats);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "İşlem başarısız.");
    } finally {
      setIsProcessing(false);
    }
  }, [uploadedModel, isProcessing, meshCleanup, repairMesh, smoothSurface, decimate, targetFaces, resultBlobUrl]);

  const generateMeshFileName = useCallback((): string => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = String(now.getFullYear());
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const dateKey = `${dd}${mm}${yyyy}`;
    const storageKey = `remura-mesh-counter-${dateKey}`;
    const current = parseInt(localStorage.getItem(storageKey) ?? "0", 10);
    const next = current + 1;
    localStorage.setItem(storageKey, String(next));
    return `remaura-mesh-ai-${dateKey}-${hh}${min}${ss}-${String(next).padStart(4, "0")}.stl`;
  }, []);

  const handleDownload = useCallback(() => {
    if (!resultBlob || !resultBlobUrl) return;
    const anchor = document.createElement("a");
    anchor.href = resultBlobUrl;
    anchor.download = generateMeshFileName();
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }, [resultBlob, resultBlobUrl, generateMeshFileName]);

  return (
    <section className="mx-auto w-full max-w-6xl rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
        <div
          className="h-2 w-2 shrink-0 rounded-full bg-violet-500"
          style={{ boxShadow: "0 0 8px #8b5cf6" }}
          aria-hidden
        />
        <span className="text-[11px] font-black uppercase tracking-widest text-muted">
          REMURA MESH AI — Auto Remesh &amp; Cleanup
        </span>
      </div>
      <p className="mb-4 text-[10px] text-muted/80">
        STL modelinizi yükleyin. Mesh temizleme, onarım, yüzey düzeltme ve poligon azaltma işlemleri uygulanır.
      </p>

      <div className="grid w-full gap-4 md:grid-cols-2">
        {/* Sol: Model yükleme */}
        <div className="flex flex-col gap-4">
          {!uploadedModel ? (
            <label
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`flex h-[480px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 transition-colors xl:h-[560px] ${
                isDragging
                  ? "border-violet-500 bg-violet-500/10"
                  : "border-border hover:border-violet-500/50 hover:bg-violet-500/5 dark:border-white/10 dark:hover:border-violet-500/30"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".stl"
                className="hidden"
                onChange={handleInputChange}
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" x2="12" y1="3" y2="15" />
              </svg>
              <span className="text-sm font-medium text-foreground">STL Model Yükle</span>
              <span className="text-[10px] text-muted">Sadece .stl formatı</span>
            </label>
          ) : (
            <div className="relative h-[480px] overflow-hidden rounded-xl border border-border bg-black/20 dark:border-white/10 xl:h-[560px]">
              <div className="relative z-[1] h-full w-full">
                <MeshRealtimeViewer
                  modelUrl={uploadBlobUrl}
                  zScaleMm={1.0}
                  fileType="stl"
                />
              </div>
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-[2] bg-gradient-to-t from-black/80 to-transparent px-3 pb-2.5 pt-10">
                <p className="truncate text-xs font-semibold text-white">{uploadedModel.name}</p>
                <p className="text-[10px] text-white/50">
                  {(uploadedModel.size / (1024 * 1024)).toFixed(2)} MB
                </p>
                {inputStats ? (
                  <div className="mt-1.5 grid grid-cols-3 gap-x-3 gap-y-0.5">
                    <span className="text-[10px] font-mono text-violet-300">
                      Polygons: {inputStats.polygons.toLocaleString("tr-TR")}
                    </span>
                    <span className="text-[10px] font-mono text-violet-300">
                      Triangles: {inputStats.triangles.toLocaleString("tr-TR")}
                    </span>
                    <span className="text-[10px] font-mono text-violet-300">
                      Vertices: {inputStats.vertices.toLocaleString("tr-TR")}
                    </span>
                    <span className="text-[10px] font-mono text-violet-300">
                      Parts: {inputStats.components >= 0 ? inputStats.components : (isAnalyzing ? "..." : "—")}
                    </span>
                    <span className="text-[10px] font-mono text-violet-300">
                      {isAnalyzing ? "Analiz..." : inputStats.watertight ? "Watertight" : "Open mesh"}
                    </span>
                  </div>
                ) : isAnalyzing ? (
                  <p className="mt-1 text-[10px] text-violet-300/70">Analiz ediliyor...</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2 top-2 z-[2] flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-red-600 focus:outline-none"
                aria-label="Modeli kaldır"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Sag: Sonuç / Önizleme */}
        <div className="flex flex-col rounded-xl border border-border bg-black/20 p-3 dark:border-white/10">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Temizlenmiş Model</span>
            {isProcessing ? <span className="text-[10px] text-violet-400">İşleniyor...</span> : null}
          </div>
          <div className="relative h-[480px] overflow-hidden rounded-lg border border-dashed border-border/70 bg-[#0b0f14] xl:h-[560px]">
            <div className="relative z-[1] h-full w-full">
              <MeshRealtimeViewer
                ref={viewerRef}
                modelUrl={resultBlobUrl}
                zScaleMm={1.0}
                fileType="stl"
              />
            </div>
            {isProcessing ? (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/30">
                <span
                  className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-violet-400"
                  aria-hidden
                />
                <span className="text-xs text-muted">Mesh işleniyor...</span>
              </div>
            ) : null}
            {outputStats ? (
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-[2] bg-gradient-to-t from-black/80 to-transparent px-3 pb-2.5 pt-10">
                <div className="grid grid-cols-3 gap-x-3 gap-y-0.5">
                  <span className="text-[10px] font-mono text-emerald-300">
                    Polygons: {outputStats.polygons.toLocaleString("tr-TR")}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-300">
                    Triangles: {outputStats.triangles.toLocaleString("tr-TR")}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-300">
                    Vertices: {outputStats.vertices.toLocaleString("tr-TR")}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-300">
                    Parts: {outputStats.components >= 0 ? outputStats.components : "—"}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-300">
                    {outputStats.watertight ? "Watertight" : "Open mesh"}
                  </span>
                </div>
                {inputStats && inputStats.triangles > 0 ? (
                  <p className="mt-1 text-[10px] font-mono text-white/50">
                    {Math.round(((inputStats.triangles - outputStats.triangles) / inputStats.triangles) * 100)}% azaltma
                    {inputStats.components >= 0 && outputStats.components >= 0
                      ? ` · Parts: ${inputStats.components} → ${outputStats.components}`
                      : ""}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Kontroller */}
      <div className="mt-4 flex flex-col gap-3">
        {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">İşlem Seçenekleri</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-0.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
              <span className="flex items-center gap-2 text-xs text-foreground">
                <input type="checkbox" checked={meshCleanup} onChange={(e) => setMeshCleanup(e.target.checked)} className="accent-violet-500" />
                Mesh Cleanup
              </span>
              <span className="pl-5 text-[9px] text-muted/60">Kopuk parçalar, duplicate face, dejenere üçgen temizliği</span>
            </label>
            <label className="flex flex-col gap-0.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
              <span className="flex items-center gap-2 text-xs text-foreground">
                <input type="checkbox" checked={repairMesh} onChange={(e) => setRepairMesh(e.target.checked)} className="accent-violet-500" />
                Repair Mesh
              </span>
              <span className="pl-5 text-[9px] text-muted/60">Non-manifold onarım, delik kapatma, normal düzeltme</span>
            </label>
            <label className="flex flex-col gap-0.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
              <span className="flex items-center gap-2 text-xs text-foreground">
                <input type="checkbox" checked={smoothSurface} onChange={(e) => setSmoothSurface(e.target.checked)} className="accent-violet-500" />
                Laplacian refine
              </span>
              <span className="pl-5 text-[9px] text-muted/60">Laplacian iterasyonu (yüzey pürüzleri azaltır)</span>
            </label>
            <label className="flex flex-col gap-0.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
              <span className="flex items-center gap-2 text-xs text-foreground">
                <input type="checkbox" checked={decimate} onChange={(e) => setDecimate(e.target.checked)} className="accent-violet-500" />
                Decimate
              </span>
              <span className="pl-5 text-[9px] text-muted/60">Polygon azaltma (dosya boyutu küçültür)</span>
            </label>
          </div>
        </div>

        {repairMesh ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                Maks. Delik Boyutu (kenar sayısı)
              </p>
              <span className="text-xs font-semibold text-foreground">
                {maxHoleSize.toLocaleString("tr-TR")}
              </span>
            </div>
            <input
              type="number"
              min={10}
              max={10000}
              step={100}
              value={maxHoleSize}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (Number.isFinite(v) && v > 0) setMaxHoleSize(v);
              }}
              className="mt-2 min-h-9 w-full rounded-lg border border-white/15 px-3 text-xs outline-none"
              style={{ backgroundColor: "#1a1f2e", color: "#e2e8f0" }}
            />
            <p className="mt-1 text-[10px] text-muted/60">
              Kapatılacak en büyük delik boyutu — Varsayılan: 1.000
            </p>
          </div>
        ) : null}

        {decimate ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                Hedef Üçgen Sayısı
              </p>
              <span className="text-xs font-semibold text-foreground">
                {targetFaces.toLocaleString("tr-TR")}
              </span>
            </div>
            <input
              type="number"
              min={1000}
              max={5000000}
              step={10000}
              value={targetFaces}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (Number.isFinite(v) && v > 0) setTargetFaces(v);
              }}
              className="mt-2 min-h-9 w-full rounded-lg border border-white/15 px-3 text-xs outline-none"
              style={{ backgroundColor: "#1a1f2e", color: "#e2e8f0" }}
            />
            <p className="mt-1 text-[10px] text-muted/60">
              Varsayılan: 250.000 — Mücevher üretimi için önerilen aralık: 100K–500K
            </p>
          </div>
        ) : null}

        {processLog ? (
          <div className="rounded-lg border border-white/5 bg-black/20 p-2">
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-[10px] leading-relaxed text-muted/70">
              {processLog}
            </pre>
          </div>
        ) : null}

        {resultBlobUrl ? (
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-violet-400/50 bg-violet-500/15 px-4 py-2 text-xs font-semibold text-violet-200 transition-colors hover:bg-violet-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            İşlenmiş Modeli İndir (.stl)
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => void handleProcess()}
          disabled={!uploadedModel || isProcessing}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isProcessing ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Mesh İşleniyor...
            </>
          ) : (
            "Mesh İşle"
          )}
        </button>
      </div>
    </section>
  );
}
