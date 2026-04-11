"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { MeshRealtimeViewer, type MeshRealtimeViewerHandle } from "@/components/remaura/MeshRealtimeViewer";
import { createClient } from "@/utils/supabase/client";
import {
  remauraHandleBillingApiResponse,
  useRemauraBillingModal,
} from "@/components/remaura/RemauraBillingModalProvider";

type DownloadModelFormat = "glb" | "stl";
type MeshGenerationMode = "production" | "visual";
const MAX_ATTEMPTS_PER_IMAGE = 4;

function generateMeshFileCode(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = String(now.getFullYear());
  const dateKey = `${dd}${mm}${yyyy}`;
  const storageKey = `remaura-mesh-counter-${dateKey}`;
  const current = parseInt(localStorage.getItem(storageKey) ?? "0", 10);
  const next = current + 1;
  localStorage.setItem(storageKey, String(next));
  return `${dateKey}${String(next).padStart(4, "0")}`;
}

export function Remaura3DAISection() {
  const billingUi = useRemauraBillingModal();
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCreating3D, setIsCreating3D] = useState(false);
  const [mesh3DError, setMesh3DError] = useState<string | null>(null);
  const [mesh3DTaskId, setMesh3DTaskId] = useState<string | null>(null);
  const [mesh3DStatus, setMesh3DStatus] = useState<string | null>(null);
  const [mesh3DProgress, setMesh3DProgress] = useState<number | null>(null);
  const [mesh3DModelUrl, setMesh3DModelUrl] = useState<string | null>(null);
  const [mesh3DDownloadUrl, setMesh3DDownloadUrl] = useState<string | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<DownloadModelFormat>("glb");
  const [generationMode, setGenerationMode] = useState<MeshGenerationMode>("production");
  const [remainingAttempts, setRemainingAttempts] = useState<number>(MAX_ATTEMPTS_PER_IMAGE);
  const [outerDiameterMm, setOuterDiameterMm] = useState<number | null>(null);
  const [zScaleMm, setZScaleMm] = useState<number>(1.0);
  const [cleanedPreviewUrl, setCleanedPreviewUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [meshFileCode, setMeshFileCode] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const viewerRef = useRef<MeshRealtimeViewerHandle | null>(null);
  const cleanedImageBlobRef = useRef<Blob | null>(null);
  const cleanedObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (cleanedObjectUrlRef.current) {
        URL.revokeObjectURL(cleanedObjectUrlRef.current);
        cleanedObjectUrlRef.current = null;
      }
    };
  }, []);

  const resetMeshState = useCallback(() => {
    setMesh3DError(null);
    setMesh3DTaskId(null);
    setMesh3DStatus(null);
    setMesh3DProgress(null);
    setMesh3DModelUrl(null);
    setMesh3DDownloadUrl(null);
    setDownloadFormat("glb");
    setMeshFileCode(null);
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file?.type.startsWith("image/")) return;
    if (cleanedObjectUrlRef.current) {
      URL.revokeObjectURL(cleanedObjectUrlRef.current);
      cleanedObjectUrlRef.current = null;
    }
    cleanedImageBlobRef.current = null;
    setCleanedPreviewUrl(null);
    resetMeshState();
    setGenerationMode("production");
    setRemainingAttempts(MAX_ATTEMPTS_PER_IMAGE);
    const reader = new FileReader();
    reader.onload = () => setUploadedImage(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

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
    if (cleanedObjectUrlRef.current) {
      URL.revokeObjectURL(cleanedObjectUrlRef.current);
      cleanedObjectUrlRef.current = null;
    }
    cleanedImageBlobRef.current = null;
    setCleanedPreviewUrl(null);
    setUploadedImage(null);
    resetMeshState();
    setGenerationMode("production");
    setRemainingAttempts(MAX_ATTEMPTS_PER_IMAGE);
  }, [resetMeshState]);

  const toDataUrl = useCallback((blob: Blob) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Dosya okunamadi."));
      reader.readAsDataURL(blob);
    });
  }, []);

  const dataUrlToPngBlob = useCallback(async (dataUrl: string): Promise<Blob> => {
    if (dataUrl.startsWith("data:image/png;base64,")) {
      const res = await fetch(dataUrl);
      return await res.blob();
    }
    const img = new window.Image();
    img.src = dataUrl;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Gorsel donusumu basarisiz."));
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas baglami olusturulamadi.");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    const pngBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
    if (!pngBlob) throw new Error("PNG blob olusturulamadi.");
    return pngBlob;
  }, []);

  const inferModelExtension = useCallback((url: string): string => {
    const clean = url.split("?")[0]?.split("#")[0] ?? "";
    if (clean.toLowerCase().endsWith(".usdz")) return "usdz";
    if (clean.toLowerCase().endsWith(".gltf")) return "gltf";
    return "glb";
  }, []);

  const resolvedViewFormat = useCallback((): string => {
    const sourceUrl = mesh3DModelUrl ?? mesh3DDownloadUrl;
    return sourceUrl ? inferModelExtension(sourceUrl) : "glb";
  }, [mesh3DModelUrl, mesh3DDownloadUrl, inferModelExtension]);

  const buildProxyFileUrl = useCallback(
    (kind: "view" | "download", formatOverride?: string) => {
      if (!mesh3DTaskId) return null;
      const format = formatOverride ?? (kind === "view" ? resolvedViewFormat() : downloadFormat);
      let url = `/api/remaura/mesh3d/file?taskId=${encodeURIComponent(mesh3DTaskId)}&format=${encodeURIComponent(format)}&kind=${kind}`;
      if (outerDiameterMm !== null && outerDiameterMm > 0) {
        url += `&diameterMm=${outerDiameterMm}`;
      }
      return url;
    },
    [mesh3DTaskId, resolvedViewFormat, downloadFormat, outerDiameterMm]
  );

  const handleDownloadModel = useCallback(async () => {
    if (isDownloading) return;
    const url = buildProxyFileUrl("download", downloadFormat);
    if (url) {
      try {
        setIsDownloading(true);
        setMesh3DError(null);
        const res = await fetch(url);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string })?.error ?? `İndirme başarısız (${res.status})`);
        }
        const blob = await res.blob();
        if (blob.size < 1024) {
          setMesh3DError("Model dosyası indirilemedi veya geçersiz.");
          return;
        }
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        const code = meshFileCode ?? generateMeshFileCode();
        anchor.download = `remaura-ai-${code}.${downloadFormat}`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
      } catch (e) {
        setMesh3DError(e instanceof Error ? e.message : "İndirme başarısız.");
      } finally {
        setIsDownloading(false);
      }
      return;
    }
    // Proxy URL yoksa (görev oluşturulmamış) Three.js STL export
    if (downloadFormat === "stl") {
      const ok = viewerRef.current?.downloadSTL() ?? false;
      if (!ok) setMesh3DError("STL export icin once model olusturun.");
    }
  }, [isDownloading, buildProxyFileUrl, downloadFormat]);

  const fetchMeshStatusOnce = useCallback(async (taskId: string) => {
    const res = await fetch(`/api/remaura/mesh3d/status?taskId=${encodeURIComponent(taskId)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "Meshy durum kontrolu basarisiz.");

    const status = String(data?.status ?? "PENDING");
    setMesh3DStatus(status);
    setMesh3DProgress(typeof data?.progress === "number" ? data.progress : null);
    if (typeof data?.modelUrl === "string" && data.modelUrl) setMesh3DModelUrl(data.modelUrl);
    if (typeof data?.downloadUrl === "string" && data.downloadUrl) setMesh3DDownloadUrl(data.downloadUrl);
    return status.toUpperCase();
  }, []);

  const pollMeshStatus = useCallback(async (taskId: string) => {
    let attempts = 0;
    while (attempts < 150) {
      attempts += 1;
      const status = await fetchMeshStatusOnce(taskId);
      if (status === "SUCCEEDED" || status === "SUCCESS" || status === "COMPLETED") return;
      if (status === "FAILED" || status === "ERROR" || status === "CANCELED") {
        throw new Error("Mesh olusturma basarisiz oldu.");
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }, [fetchMeshStatusOnce]);

  const handleRefreshStatus = useCallback(async () => {
    if (!mesh3DTaskId) return;
    try {
      setMesh3DError(null);
      await fetchMeshStatusOnce(mesh3DTaskId);
    } catch (e) {
      setMesh3DError(e instanceof Error ? e.message : "Durum yenileme basarisiz.");
    }
  }, [mesh3DTaskId, fetchMeshStatusOnce]);

  const handleCreate3D = useCallback(async () => {
    if (!uploadedImage || isCreating3D) return;
    if (remainingAttempts <= 0) {
      setMesh3DError(`Bu gorsel icin ${MAX_ATTEMPTS_PER_IMAGE} deneme hakki doldu. Yeni gorsel yukleyin.`);
      return;
    }
    setIsCreating3D(true);
    setMesh3DError(null);
    setMesh3DTaskId(null);
    setMesh3DStatus("PENDING");
    setMesh3DProgress(null);
    setMesh3DModelUrl(null);
    setMesh3DDownloadUrl(null);

    try {
      let cleanedBlob = cleanedImageBlobRef.current;
      if (!cleanedBlob) {
        const { removeBackground } = await import("@imgly/background-removal");
        const removedBlob = await removeBackground(uploadedImage);
        const removedDataUrl = await toDataUrl(removedBlob);
        cleanedBlob = await dataUrlToPngBlob(removedDataUrl);
        cleanedImageBlobRef.current = cleanedBlob;

        if (cleanedObjectUrlRef.current) URL.revokeObjectURL(cleanedObjectUrlRef.current);
        const objectUrl = URL.createObjectURL(cleanedBlob);
        cleanedObjectUrlRef.current = objectUrl;
        setCleanedPreviewUrl(objectUrl);
      }

      const transparentPngDataUrl = await toDataUrl(cleanedBlob);
      if (!transparentPngDataUrl.startsWith("data:image/png;base64,")) {
        throw new Error("Meshy gonderimi icin alfa PNG olusturulamadi.");
      }

      const {
        data: { user },
      } = await createClient().auth.getUser();
      const res = await fetch("/api/remaura/mesh3d/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: transparentPngDataUrl,
          mode: generationMode,
          userId: user?.id ?? "",
        }),
      });
      if (await remauraHandleBillingApiResponse(res, billingUi)) return;
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "3D olusturma basarisiz.");

      const taskId = (data?.taskId as string | null) ?? null;
      setMesh3DTaskId(taskId);
      setMeshFileCode(generateMeshFileCode());
      setMesh3DStatus(typeof data?.status === "string" ? data.status : "PENDING");
      setMesh3DProgress(typeof data?.progress === "number" ? data.progress : null);
      setMesh3DModelUrl(typeof data?.modelUrl === "string" ? data.modelUrl : null);
      setMesh3DDownloadUrl(
        typeof data?.downloadUrl === "string"
          ? data.downloadUrl
          : typeof data?.modelUrl === "string"
            ? data.modelUrl
            : null
      );
      setRemainingAttempts((prev) => Math.max(0, prev - 1));

      if (taskId) {
        await pollMeshStatus(taskId);
      }
    } catch (e) {
      setMesh3DError(e instanceof Error ? e.message : "3D olusturma basarisiz.");
    } finally {
      setIsCreating3D(false);
    }
  }, [uploadedImage, isCreating3D, toDataUrl, dataUrlToPngBlob, pollMeshStatus, generationMode, remainingAttempts, billingUi]);

  return (
    <section className="mx-auto w-full max-w-6xl rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
        <div
          className="h-2 w-2 shrink-0 rounded-full bg-teal-500"
          style={{ boxShadow: "0 0 8px #14b8a6" }}
          aria-hidden
        />
        <span className="text-[11px] font-black uppercase tracking-widest text-muted">
          REMAURA 3D AI — Görselden 3D Model
        </span>
      </div>
      <p className="mb-3 text-[10px] text-muted/80">
        Görsel yükleyin, arka planı otomatik temizlenir ve 3D modele dönüştürülür.
      </p>
      <div className="mb-4 rounded-lg border border-teal-500/20 bg-teal-500/[0.06] px-3 py-2.5">
        <p className="text-[10px] leading-relaxed text-teal-100/85">
          <span className="font-semibold text-teal-300">Not:</span> Bu özellik sunucu tarafı yapılandırmasına bağlıdır.
          Çalışmıyorsa ortam ayarlarını kontrol edin veya yönetici / destek ile iletişime geçin.
        </p>
      </div>

      <div className="grid w-full gap-4 md:grid-cols-2">
        {/* Sol: Görsel yükleme */}
        <div className="flex flex-col gap-4">
          {!uploadedImage ? (
            <label
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`flex h-[480px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 transition-colors xl:h-[560px] ${
                isDragging
                  ? "border-teal-500 bg-teal-500/10"
                  : "border-border hover:border-teal-500/50 hover:bg-teal-500/5 dark:border-white/10 dark:hover:border-teal-500/30"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
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
              <span className="text-sm font-medium text-foreground">Görsel Yükle</span>
              <span className="text-[10px] text-muted">PNG, JPG veya WebP</span>
            </label>
          ) : (
            <div className="relative h-[480px] overflow-hidden rounded-xl border border-border bg-black/20 dark:border-white/10 xl:h-[560px]">
              <Image
                src={cleanedPreviewUrl ?? uploadedImage}
                alt=""
                width={400}
                height={400}
                className="h-full w-full object-contain"
                unoptimized
                sizes="400px"
              />
              {cleanedPreviewUrl && (
                <span className="absolute left-2 top-2 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
                  Arka plan temizlendi
                </span>
              )}
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-red-600 focus:outline-none"
                aria-label="Görseli kaldır"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Sağ: 3D Model Viewer */}
        <div className="flex flex-col rounded-xl border border-border bg-black/20 p-3 dark:border-white/10">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">3D Model</span>
            {mesh3DStatus ? <span className="text-[10px] text-muted/80">{mesh3DStatus}</span> : null}
          </div>
          <div className="relative h-[480px] overflow-hidden rounded-lg border border-dashed border-border/70 bg-[#0b0f14] xl:h-[560px]">
            <div className="relative z-[1] h-full w-full">
              <MeshRealtimeViewer
                ref={viewerRef}
                modelUrl={
                  mesh3DTaskId && (mesh3DModelUrl || mesh3DDownloadUrl)
                    ? (buildProxyFileUrl("view", "glb") ?? null)
                    : null
                }
                zScaleMm={zScaleMm}
              />
            </div>
            {isCreating3D || (mesh3DTaskId && !mesh3DModelUrl && !mesh3DDownloadUrl) ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10">
                <span
                  className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-[#b76e79]"
                  aria-hidden
                />
              </div>
            ) : null}
          </div>

          {typeof mesh3DProgress === "number" ? (
            <p className="mt-2 text-xs text-muted">İlerleme: %{Math.round(mesh3DProgress)}</p>
          ) : null}
          {mesh3DTaskId && !isCreating3D ? (
            <button
              type="button"
              onClick={() => void handleRefreshStatus()}
              className="mt-2 inline-flex min-h-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 px-3 text-xs font-semibold text-foreground transition-colors hover:bg-white/10"
            >
              Durumu Yenile
            </button>
          ) : null}
        </div>
      </div>

      {/* Kontroller + Butonlar — viewer altında, tam genişlik */}
      <div className="mt-4 flex flex-col gap-3">

        {mesh3DError ? <p className="text-xs text-red-600 dark:text-red-400">{mesh3DError}</p> : null}


        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">Üretim Modu</p>
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => setGenerationMode("production")}
              className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                generationMode === "production"
                  ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                  : "border-white/10 bg-white/[0.02] text-foreground hover:bg-white/[0.06]"
              }`}
            >
              Üretim Odaklı (Hızlı &amp; Ekonomik)
            </button>
            <button
              type="button"
              onClick={() => setGenerationMode("visual")}
              className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                generationMode === "visual"
                  ? "border-[#b76e79]/50 bg-[#b76e79]/12 text-[#f2d5d9]"
                  : "border-white/10 bg-white/[0.02] text-foreground hover:bg-white/[0.06]"
              }`}
            >
              Görsel Odaklı (Renkli &amp; Detaylı - Ek Kredi)
              <span className="ml-1 text-[10px] uppercase text-muted">Sunum İçin</span>
            </button>
          </div>
          {generationMode === "visual" ? (
            <p className="mt-2 text-[11px] text-amber-300">+10 Kredi ve ek işlem süresi uygulanır.</p>
          ) : null}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Kalınlık (Z Ekseni)</p>
            <span className="text-xs font-semibold text-foreground">
              {Math.round(zScaleMm * 100)}%
              {zScaleMm >= 0.999 && (
                <span className="ml-1 text-[10px] text-emerald-400">Doğal</span>
              )}
            </span>
          </div>
          <input
            type="range"
            min={0.01}
            max={1.0}
            step={0.001}
            value={zScaleMm}
            onChange={(e) => setZScaleMm(Number(e.target.value))}
            className="w-full accent-[#b76e79]"
          />
          <p className="mt-1 text-[10px] text-muted/60">
            100% = modelin orijinal oranları. Azaltınca Z ekseni incelir, taban sabit kalır.
          </p>
        </div>

        {/* Dış Çap (mm) — her zaman görünür */}
        <div className="rounded-lg border border-teal-500/20 bg-teal-500/5 p-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-teal-400">
              Hedef Dış Çap (mm)
            </p>
            {outerDiameterMm !== null && outerDiameterMm > 0 && (
              <span className="text-[10px] font-semibold text-teal-300">
                {outerDiameterMm.toFixed(1)} mm
              </span>
            )}
          </div>
          <input
            type="number"
            min={1}
            max={200}
            step={0.1}
            value={outerDiameterMm ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setOuterDiameterMm(v === "" ? null : Number(v));
            }}
            placeholder="Ör: 18.5"
            className="min-h-9 w-full rounded-lg border border-white/15 px-3 text-xs outline-none"
            style={{ backgroundColor: "#1a1f2e", color: "#e2e8f0" }}
          />
          <p className="mt-1 text-[10px] text-teal-400/60">
            {outerDiameterMm !== null && outerDiameterMm > 0
              ? `Model ${outerDiameterMm.toFixed(1)} mm dış çapa ölçeklenir`
              : "Boş bırakılırsa model orijinal boyutuyla indirilir"}
          </p>
        </div>

        {/* Format + İndir — her zaman görünür, model yokken disabled */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/15 bg-white/5 px-3">
            <span className="mr-2 text-[10px] font-semibold uppercase tracking-wide text-muted">Format</span>
            <select
              value={downloadFormat}
              onChange={(e) => setDownloadFormat(e.target.value as DownloadModelFormat)}
              className="w-full text-xs font-semibold outline-none"
              style={{ backgroundColor: "#1a1f2e", color: "#e2e8f0" }}
            >
              <option value="glb" style={{ backgroundColor: "#1a1f2e", color: "#e2e8f0" }}>.glb</option>
              <option value="stl" style={{ backgroundColor: "#1a1f2e", color: "#e2e8f0" }}>.stl</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => void handleDownloadModel()}
            disabled={isDownloading || !(mesh3DDownloadUrl || mesh3DModelUrl)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#b76e79]/50 bg-[#b76e79]/15 px-3 text-xs font-semibold text-[#f2d5d9] transition-colors hover:bg-[#b76e79]/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isDownloading ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white" />
                İndiriliyor...
              </>
            ) : (
              `İndir (.${downloadFormat})`
            )}
          </button>
          {downloadFormat === "glb" && (mesh3DDownloadUrl || mesh3DModelUrl) ? (
            <a
              href={buildProxyFileUrl("download", downloadFormat) ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/15 bg-white/5 px-3 text-xs font-semibold text-foreground transition-colors hover:bg-white/10 sm:col-span-2"
            >
              Yeni Sekmede Aç
            </a>
          ) : null}
        </div>

      </div>

      <div className="mt-2 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => void handleCreate3D()}
          disabled={isCreating3D || !uploadedImage || remainingAttempts <= 0}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#b76e79] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#a65f69] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCreating3D ? "Arka plan temizleniyor ve 3D oluşturuluyor..." : "3D Oluştur"}
        </button>
        {uploadedImage ? (
          <button
            type="button"
            onClick={() => void handleCreate3D()}
            disabled={isCreating3D || remainingAttempts <= 0}
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Aynı Görselle Tekrar Dene
          </button>
        ) : null}
      </div>
    </section>
  );
}
