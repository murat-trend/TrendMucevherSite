"use client";

import { useState, useCallback, useRef } from "react";
import { MeshRealtimeViewer } from "@/components/remaura/MeshRealtimeViewer";

type OptimizeResult = {
  url: string;
  key: string;
  originalSize: number;
  optimizedSize: number;
  reductionPercent: number;
};

export function RemauraMeshAISection() {
  const [uploadedModel, setUploadedModel] = useState<File | null>(null);
  const [uploadBlobUrl, setUploadBlobUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Seçenekler — UI'da görünür, ileride route parametresine bağlanacak
  const [meshCleanup, setMeshCleanup] = useState(true);
  const [repairMesh, setRepairMesh] = useState(true);
  const [smoothSurface, setSmoothSurface] = useState(false);
  const [decimate, setDecimate] = useState(true);
  const [targetFaces, setTargetFaces] = useState(250000);
  const [maxHoleSize, setMaxHoleSize] = useState(1000);

  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Yüklenen dosya .stl veya .glb ise viewer fileType
  const uploadedFileType = uploadedModel?.name.toLowerCase().endsWith(".stl") ? "stl" : "glb";

  const handleFile = useCallback((file: File) => {
    const name = file.name.toLowerCase();
    if (!name.endsWith(".glb") && !name.endsWith(".stl")) {
      setError("Sadece .glb ve .stl dosyaları kabul edilir.");
      return;
    }
    setUploadedModel(file);
    if (uploadBlobUrl) URL.revokeObjectURL(uploadBlobUrl);
    setUploadBlobUrl(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  }, [uploadBlobUrl]);

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
    setResult(null);
    setError(null);
  }, [uploadBlobUrl]);

  const handleDownload = useCallback(async () => {
    if (!result?.url || isDownloading) return;
    setIsDownloading(true);
    try {
      const res = await fetch(result.url);
      if (!res.ok) throw new Error("İndirme başarısız.");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const baseName = uploadedModel?.name.replace(/\.(glb|stl)$/i, "") ?? "model";
      a.download = `${baseName}-optimized.glb`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setError(e instanceof Error ? e.message : "İndirme başarısız.");
    } finally {
      setIsDownloading(false);
    }
  }, [result, isDownloading, uploadedModel]);

  const handleProcess = useCallback(async () => {
    if (!uploadedModel || isProcessing) return;
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", uploadedModel);

      const res = await fetch("/api/mesh-optimize", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({})) as { error?: string } & Partial<OptimizeResult>;

      if (!res.ok) {
        throw new Error(data?.error ?? `İşlem başarısız (${res.status})`);
      }

      if (!data.url) throw new Error("Sunucudan geçersiz yanıt alındı.");

      setResult(data as OptimizeResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "İşlem başarısız.");
    } finally {
      setIsProcessing(false);
    }
  }, [uploadedModel, isProcessing]);

  return (
    <section className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Sol: Yükleme + Orijinal Model */}
        <div className="flex flex-col rounded-xl border border-border bg-black/20 p-3 dark:border-white/10">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
              Model Yükle
            </span>
            {uploadedModel ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-[10px] text-muted/70 hover:text-foreground"
              >
                Temizle
              </button>
            ) : null}
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !uploadedModel && inputRef.current?.click()}
            className={`relative flex h-[480px] flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed transition-colors xl:h-[560px] ${
              uploadedModel
                ? "border-border/50 bg-[#0b0f14]"
                : isDragging
                ? "cursor-pointer border-violet-400/60 bg-violet-500/5"
                : "cursor-pointer border-border/70 bg-[#0b0f14] hover:border-white/20"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".glb,.stl"
              className="hidden"
              onChange={handleInputChange}
            />
            {uploadedModel && uploadBlobUrl ? (
              <div className="relative z-[1] h-full w-full">
                <MeshRealtimeViewer
                  modelUrl={uploadBlobUrl}
                  zScaleMm={1.0}
                  fileType={uploadedFileType}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 p-6 text-center">
                <svg
                  className="h-10 w-10 text-muted/40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                  />
                </svg>
                <p className="text-xs font-semibold text-foreground">
                  GLB veya STL Yükle
                </p>
                <p className="text-[10px] text-muted/60">.glb · .stl</p>
              </div>
            )}
          </div>

          {uploadedModel ? (
            <p className="mt-2 truncate text-[10px] text-muted/60">
              {uploadedModel.name} · {(uploadedModel.size / 1024).toFixed(0)} KB
            </p>
          ) : null}
        </div>

        {/* Sağ: Sonuç / Önizleme — çıktı her zaman GLB */}
        <div className="flex flex-col rounded-xl border border-border bg-black/20 p-3 dark:border-white/10">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
              Temizlenmiş Model
            </span>
            {isProcessing ? (
              <span className="text-[10px] text-violet-400">İşleniyor...</span>
            ) : null}
          </div>
          <div className="relative h-[480px] overflow-hidden rounded-lg border border-dashed border-border/70 bg-[#0b0f14] xl:h-[560px]">
            <div className="relative z-[1] h-full w-full">
              <MeshRealtimeViewer
                modelUrl={result?.url ?? null}
                zScaleMm={1.0}
                fileType="glb"
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
            {result ? (
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-[2] bg-gradient-to-t from-black/80 to-transparent px-3 pb-2.5 pt-10">
                <div className="grid grid-cols-3 gap-x-3 gap-y-0.5">
                  <span className="text-[10px] font-mono text-emerald-300">
                    Önce: {(result.originalSize / 1024).toFixed(0)} KB
                  </span>
                  <span className="text-[10px] font-mono text-emerald-300">
                    Sonra: {(result.optimizedSize / 1024).toFixed(0)} KB
                  </span>
                  <span className="text-[10px] font-mono text-emerald-300">
                    -%{result.reductionPercent} küçüldü
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Kontroller */}
      <div className="mt-4 flex flex-col gap-3">
        {error ? (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        ) : null}

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">
            İşlem Seçenekleri
          </p>
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

        {result ? (
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={isDownloading}
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-violet-400/50 bg-violet-500/15 px-4 py-2 text-xs font-semibold text-violet-200 transition-colors hover:bg-violet-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDownloading ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white" />
                İndiriliyor...
              </>
            ) : (
              "İşlenmiş Modeli İndir (.glb)"
            )}
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
