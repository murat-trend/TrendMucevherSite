"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { MeshRealtimeViewer, type MeshRealtimeViewerHandle } from "@/components/remaura/MeshRealtimeViewer";
import { getRingSizeTargetMm, RING_SIZE_SWISS } from "@/lib/remaura/ring-size";

type MeasureReport = {
  error?: string;
  outer_diameter_mm?: number;
  inner_diameter_mm?: number;
  inner_diameter_min_mm?: number;
  inner_outer_ratio?: number;
  inner_plausible?: boolean;
  inner_std_mm?: number;
  stability_pct?: number;
  stability_warning?: boolean;
  ring_axis?: string;
  sections_used?: number;
  sections_total?: number;
  watertight?: boolean;
  ring_size_eu?: number;
  ring_size_us?: number;
  ring_size_tr?: number;
  ring_size_ref_mm?: number;
};

type ScaleReport = {
  scaled?: boolean;
  scale_factor?: number;
  pre?: MeasureReport;
  post?: MeasureReport | null;
  error_mm?: number;
  warning?: string | null;
  validation_ok?: boolean | null;
  tolerance_mm?: number;
};

const EU_SIZES = Object.keys(RING_SIZE_SWISS)
  .map(Number)
  .sort((a, b) => a - b);

function decodeRingReportHeader(b64: string | null): ScaleReport | null {
  if (!b64) return null;
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const text = new TextDecoder("utf-8").decode(bytes);
    const o = JSON.parse(text) as ScaleReport & { log?: string };
    delete o.log;
    return o;
  } catch {
    return null;
  }
}

function buildScaledFilename(seq: number): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mo = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  const HH = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const n = String(seq).padStart(4, "0");
  return `remaura-ring-rail-${dd}${mo}${yyyy}-${HH}${mm}${ss}-${n}.stl`;
}

export function RemauraRingRailResizeSection() {
  const [uploadedModel, setUploadedModel] = useState<File | null>(null);
  const [uploadBlobUrl, setUploadBlobUrl] = useState<string | null>(null);
  const [scaledBlobUrl, setScaledBlobUrl] = useState<string | null>(null);
  const [scaledBlob, setScaledBlob] = useState<Blob | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measureReport, setMeasureReport] = useState<MeasureReport | null>(null);
  const [measureError, setMeasureError] = useState<string | null>(null);

  const [targetInnerMm, setTargetInnerMm] = useState("");
  const [euRingSize, setEuRingSize] = useState<number | "">("");

  const [isScaling, setIsScaling] = useState(false);
  const [scaleReport, setScaleReport] = useState<ScaleReport | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const viewerRef = useRef<MeshRealtimeViewerHandle | null>(null);
  const scaledViewerRef = useRef<MeshRealtimeViewerHandle | null>(null);
  const downloadSeqRef = useRef(1);

  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith(".stl")) {
      setError("Sadece STL dosyaları kabul edilir.");
      return;
    }
    setUploadedModel(file);
    setUploadBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setScaledBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setScaledBlob(null);
    setScaleReport(null);
    setMeasureReport(null);
    setMeasureError(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (!uploadedModel) {
      setMeasureReport(null);
      setMeasureError(null);
      setIsMeasuring(false);
      return;
    }

    let cancelled = false;
    setIsMeasuring(true);
    setMeasureError(null);

    const fd = new FormData();
    fd.append("file", uploadedModel);

    fetch("/api/remaura/ring-rail/measure", { method: "POST", body: fd })
      .then(async (res) => {
        const data = (await res.json()) as MeasureReport & { error?: string; log?: string };
        if (cancelled) return;
        if (!res.ok) {
          setMeasureReport(null);
          setMeasureError(data.error ?? "Ölçüm başarısız.");
          return;
        }
        setMeasureReport(data);
        if (typeof data.inner_diameter_mm === "number") {
          setTargetInnerMm(data.inner_diameter_mm.toFixed(3));
        }
      })
      .catch(() => {
        if (!cancelled) setMeasureError("Ağ hatası veya sunucu yanıt vermedi.");
      })
      .finally(() => {
        if (!cancelled) setIsMeasuring(false);
      });

    return () => {
      cancelled = true;
    };
  }, [uploadedModel]);

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
    if (scaledBlobUrl) URL.revokeObjectURL(scaledBlobUrl);
    setScaledBlobUrl(null);
    setScaledBlob(null);
    setMeasureReport(null);
    setMeasureError(null);
    setScaleReport(null);
    setTargetInnerMm("");
    setEuRingSize("");
    setError(null);
  }, [uploadBlobUrl, scaledBlobUrl]);

  const onEuSizeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (v === "") {
      setEuRingSize("");
      return;
    }
    const n = parseInt(v, 10);
    setEuRingSize(n);
    setTargetInnerMm(getRingSizeTargetMm(n).toFixed(3));
  }, []);

  const handleScale = useCallback(async () => {
    if (!uploadedModel) return;
    const mm = parseFloat(targetInnerMm.replace(",", "."));
    if (!Number.isFinite(mm) || mm <= 0 || mm > 50) {
      setError("Hedef iç çap 0–50 mm arasında geçerli bir sayı olmalı.");
      return;
    }
    setError(null);
    setIsScaling(true);
    setScaleReport(null);
    setScaledBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setScaledBlob(null);

    try {
      const fd = new FormData();
      fd.append("file", uploadedModel);
      fd.append("targetInnerMm", String(mm));

      const res = await fetch("/api/remaura/ring-rail/scale", { method: "POST", body: fd });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Boyutlandırma başarısız.");
        return;
      }

      const blob = await res.blob();
      const hdr = res.headers.get("x-ring-report");
      const rep = decodeRingReportHeader(hdr);
      setScaleReport(rep);
      setScaledBlob(blob);
      setScaledBlobUrl(URL.createObjectURL(blob));
    } catch {
      setError("Boyutlandırma isteği başarısız.");
    } finally {
      setIsScaling(false);
    }
  }, [uploadedModel, targetInnerMm]);

  const handleDownloadScaled = useCallback(() => {
    if (!scaledBlob) return;
    const name = buildScaledFilename(downloadSeqRef.current++);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(scaledBlob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [scaledBlob]);

  return (
    <section className="mx-auto w-full max-w-6xl">
      <div className="mb-4 text-center">
        <h2 className="text-lg font-bold uppercase tracking-widest text-amber-400">
          Ring Rail Resize
        </h2>
        <p className="mt-1 text-[10px] text-muted">
          Yüzük ve ray modellerini hassas ölçülendirme
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col rounded-xl border border-border bg-black/20 p-3 dark:border-white/10">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
              Model Yükle
            </span>
          </div>

          {!uploadedModel ? (
            <label
              htmlFor="ring-rail-upload"
              className={`flex h-[480px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-colors xl:h-[560px] ${
                isDragging
                  ? "border-amber-400 bg-amber-500/10"
                  : "border-border/50 bg-black/10 hover:border-amber-400/50"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <input
                id="ring-rail-upload"
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
                  ref={viewerRef}
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
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2 top-2 z-[2] flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-red-600 focus:outline-none"
                aria-label="Modeli kaldır"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col rounded-xl border border-border bg-black/20 p-3 dark:border-white/10">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
              Boyutlandırılmış Model
            </span>
          </div>
          {scaledBlobUrl ? (
            <div className="relative h-[480px] overflow-hidden rounded-xl border border-border bg-black/20 dark:border-white/10 xl:h-[560px]">
              <div className="relative z-[1] h-full w-full">
                <MeshRealtimeViewer
                  ref={scaledViewerRef}
                  modelUrl={scaledBlobUrl}
                  zScaleMm={1.0}
                  fileType="stl"
                />
              </div>
            </div>
          ) : (
            <div className="relative flex h-[480px] items-center justify-center rounded-lg border border-dashed border-border/70 bg-[#0b0f14] xl:h-[560px]">
              <span className="text-xs text-muted/50">
                {isScaling ? "Boyutlandırılıyor…" : "Ölçüm yapıp boyutlandırın"}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}

        {uploadedModel ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">
              Ölçüm
            </p>
            {isMeasuring ? (
              <p className="text-xs text-muted">Kesit analizi çalışıyor…</p>
            ) : measureError ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">{measureError}</p>
            ) : measureReport ? (
              <div className="grid gap-1 text-[11px] text-foreground/90">
                <p>
                  Dış çap: <span className="font-mono">{measureReport.outer_diameter_mm} mm</span>
                </p>
                <p>
                  İç çap (nominal):{" "}
                  <span className="font-mono">{measureReport.inner_diameter_mm} mm</span>
                </p>
                <p>
                  İç çap (min):{" "}
                  <span className="font-mono">{measureReport.inner_diameter_min_mm} mm</span>
                </p>
                <p>
                  Eksen: {measureReport.ring_axis} · Kesit: {measureReport.sections_used}/
                  {measureReport.sections_total}
                </p>
                <p>
                  EU / US / TR (tahmin):{" "}
                  <span className="font-mono">
                    {measureReport.ring_size_eu} / {measureReport.ring_size_us} /{" "}
                    {measureReport.ring_size_tr}
                  </span>
                </p>
                {measureReport.inner_outer_ratio != null ? (
                  <p className="text-muted">
                    İç/dış çap oranı:{" "}
                    <span className="font-mono">{measureReport.inner_outer_ratio}</span>
                  </p>
                ) : null}
                {measureReport.inner_plausible === false ? (
                  <p className="text-amber-500">
                    Uyarı: Ölçülen iç çap bu model için şüpheli görünüyor (oran veya mm aralığı
                    tipik yüzük dışı). Boyutlandırmadan önce değeri kontrol edin.
                  </p>
                ) : null}
                <p className="text-muted">
                  Mesh: {measureReport.watertight ? "kapalı (watertight)" : "açık"}
                </p>
                {measureReport.stability_warning ? (
                  <p className="text-amber-500">
                    Uyarı: İç çap kesitler arası sapma %{measureReport.stability_pct?.toFixed(1)}{" "}
                    (eşik %5). Eksen veya model karmaşık olabilir.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">
            Boyut Ayarları
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-[10px] text-muted">EU numara (referans)</span>
              <select
                value={euRingSize === "" ? "" : String(euRingSize)}
                onChange={onEuSizeChange}
                disabled={!uploadedModel || isMeasuring}
                className="rounded-lg border border-border bg-black/30 px-2 py-1.5 text-xs text-foreground [color-scheme:light] disabled:opacity-50"
              >
                <option value="" className="bg-white text-zinc-900">
                  — Seçin —
                </option>
                {EU_SIZES.map((s) => (
                  <option key={s} value={s} className="bg-white text-zinc-900">
                    {s} ({getRingSizeTargetMm(s).toFixed(2)} mm iç çap)
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-[10px] text-muted">Hedef iç çap (mm)</span>
              <input
                type="text"
                inputMode="decimal"
                value={targetInnerMm}
                onChange={(e) => setTargetInnerMm(e.target.value)}
                disabled={!uploadedModel || isMeasuring}
                className="rounded-lg border border-border bg-black/30 px-2 py-1.5 text-xs font-mono text-foreground disabled:opacity-50"
                placeholder="örn. 17.35"
              />
            </label>
            <button
              type="button"
              onClick={handleScale}
              disabled={!uploadedModel || isMeasuring || isScaling || !measureReport}
              className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isScaling ? "İşleniyor…" : "Boyutlandır"}
            </button>
          </div>
        </div>

        {scaleReport ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">
              Doğrulama
            </p>
            <div className="text-[11px] space-y-1">
              <p>
                Ölçek: <span className="font-mono">{scaleReport.scale_factor}</span>
              </p>
              {scaleReport.post ? (
                <>
                  <p>
                    Son iç çap:{" "}
                    <span className="font-mono">{scaleReport.post.inner_diameter_mm} mm</span>
                  </p>
                  <p>
                    Hata:{" "}
                    <span className="font-mono">
                      {scaleReport.error_mm !== undefined ? `${scaleReport.error_mm >= 0 ? "+" : ""}${scaleReport.error_mm} mm` : "—"}
                    </span>
                  </p>
                  <p>
                    Tolerans: ±{scaleReport.tolerance_mm ?? 0.03} mm —{" "}
                    {scaleReport.validation_ok === true ? (
                      <span className="text-emerald-500">OK</span>
                    ) : scaleReport.validation_ok === false ? (
                      <span className="text-amber-500">Uyarı</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </p>
                </>
              ) : (
                <p className="text-amber-500">Son ölçüm alınamadı.</p>
              )}
              {scaleReport.warning ? (
                <p className="text-amber-500">{scaleReport.warning}</p>
              ) : null}
            </div>
            {scaledBlob ? (
              <button
                type="button"
                onClick={handleDownloadScaled}
                className="mt-3 w-full rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/20"
              >
                STL indir
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
