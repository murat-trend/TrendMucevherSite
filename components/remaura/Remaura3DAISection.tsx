"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { MeshRealtimeViewer, type MeshRealtimeViewerHandle } from "@/components/remaura/MeshRealtimeViewer";
import { createClient } from "@/utils/supabase/client";
import {
  remauraHandleBillingApiResponse,
  useRemauraBillingModal,
} from "@/components/remaura/RemauraBillingModalProvider";
import { useRemauraCreditsCheck } from "@/hooks/useRemauraCreditsCheck";
import { getOrPickDir } from "@/lib/remaura/dir-handle";

type DownloadModelFormat = "glb" | "stl";
type MeshGenerationMode = "production" | "visual";
const MAX_ATTEMPTS_PER_IMAGE = 4;

function generateRemauraFilename(engine: "rv1" | "rv2"): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const label = engine === "rv1" ? "RemauraRV1" : "RemauraRV2";
  return `${label}-${date}-${time}`;
}

export function Remaura3DAISection() {
  const billingUi = useRemauraBillingModal();
  const { checkCredits } = useRemauraCreditsCheck();
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
  const generationMode: MeshGenerationMode = "production";
  const [remainingAttempts, setRemainingAttempts] = useState<number>(MAX_ATTEMPTS_PER_IMAGE);

  type HistoryItem = { id: string; taskId: string; engine: string; imageUrl: string | null; createdAt: string; expiresAt: string };
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [outerDiameterMm, setOuterDiameterMm] = useState<number | null>(null);
  const [cleanedPreviewUrl, setCleanedPreviewUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [meshFileCode, setMeshFileCode] = useState<string | null>(null);
  const [currentEngine, setCurrentEngine] = useState<"rv1" | "rv2">("rv1");
  const [canUpload, setCanUpload] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const viewerRef = useRef<MeshRealtimeViewerHandle | null>(null);
  const cleanedImageBlobRef = useRef<Blob | null>(null);
  const cleanedObjectUrlRef = useRef<string | null>(null);
  const pickerBusyRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      if (cleanedObjectUrlRef.current) {
        URL.revokeObjectURL(cleanedObjectUrlRef.current);
        cleanedObjectUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await checkCredits(1, () => {}, () => {});
      if (!cancelled) setCanUpload(ok);
    })();
    return () => { cancelled = true; };
  }, [checkCredits]);

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

  useEffect(() => {
    const gorsel = localStorage.getItem("remaura_3d_gorsel");
    if (!gorsel) return;
    localStorage.removeItem("remaura_3d_gorsel");
    setUploadedImage(gorsel);
    cleanedImageBlobRef.current = null;
    setCleanedPreviewUrl(null);
    resetMeshState();
  }, [resetMeshState]);

  const handleFile = useCallback((file: File) => {
    if (!file?.type.startsWith("image/")) return;
    if (cleanedObjectUrlRef.current) {
      URL.revokeObjectURL(cleanedObjectUrlRef.current);
      cleanedObjectUrlRef.current = null;
    }
    cleanedImageBlobRef.current = null;
    setCleanedPreviewUrl(null);
    resetMeshState();
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

  const openFilePickerAfterGuard = useCallback(() => {
    if (pickerBusyRef.current) return;
    if (!canUpload) {
      void checkCredits(1, billingUi.openUnauthorized, billingUi.openInsufficientCredits);
      return;
    }
    pickerBusyRef.current = true;
    inputRef.current?.click();
    setTimeout(() => { pickerBusyRef.current = false; }, 500);
  }, [canUpload, checkCredits, billingUi]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const ok = await checkCredits(1, billingUi.openUnauthorized, billingUi.openInsufficientCredits);
      if (!ok) return;
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [checkCredits, billingUi, handleFile]
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
        const code = meshFileCode ?? generateRemauraFilename(currentEngine);
        const filename = `${code}.${downloadFormat}`;

        const dirHandle = await getOrPickDir("remaura-3d-dir");
        if (dirHandle) {
          const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
        } else {
          const objectUrl = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = objectUrl;
          anchor.download = filename;
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
        }
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

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      // Önce süresi dolmuşları temizle
      await fetch("/api/remaura/mesh3d/history", { method: "DELETE" });
      const res = await fetch("/api/remaura/mesh3d/history");
      const data = await res.json() as { items?: HistoryItem[] };
      setHistory(data.items ?? []);
    } catch { /* sessiz hata */ }
    finally { setHistoryLoading(false); }
  }, []);

  const saveJob = useCallback(async (taskId: string, image: string | null, engine: "rv1" | "rv2") => {
    try {
      await fetch("/api/remaura/mesh3d/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, image, engine }),
      });
    } catch { /* sessiz hata */ }
  }, []);

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
      const {
        data: { user },
      } = await createClient().auth.getUser();

      let cleanedBlob = cleanedImageBlobRef.current;
      if (!cleanedBlob) {
        const bgRes = await fetch("/api/remaura/mesh3d/remove-bg", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: uploadedImage, userId: user?.id ?? "" }),
        });
        if (!bgRes.ok) {
          const err = await bgRes.json().catch(() => ({}));
          throw new Error((err as { error?: string })?.error ?? "Arka plan kaldırılamadı.");
        }
        const bgData = await bgRes.json();
        const resultDataUrl: string = bgData.image;
        cleanedBlob = await dataUrlToPngBlob(resultDataUrl);
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
      setCurrentEngine("rv1");
      setMeshFileCode(generateRemauraFilename("rv1"));
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
        // Başarılı → kaydet + galeriyi güncelle
        void saveJob(taskId, uploadedImage, "rv1");
        void loadHistory();
      }
    } catch (e) {
      setMesh3DError(e instanceof Error ? e.message : "3D olusturma basarisiz.");
    } finally {
      setIsCreating3D(false);
    }
  }, [uploadedImage, isCreating3D, toDataUrl, dataUrlToPngBlob, pollMeshStatus, generationMode, remainingAttempts, billingUi, saveJob, loadHistory]);

  return (
    <section className="mx-auto w-full max-w-6xl rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-6">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleInputChange}
        aria-hidden
        tabIndex={-1}
      />
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
            <div
              role="button"
              tabIndex={0}
              aria-label="Görsel yükle"
              onClick={(e) => {
                e.preventDefault();
                void openFilePickerAfterGuard();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  void openFilePickerAfterGuard();
                }
              }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`flex h-[480px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 transition-colors xl:h-[560px] ${
                isDragging
                  ? "border-teal-500 bg-teal-500/10"
                  : "border-border hover:border-teal-500/50 hover:bg-teal-500/5 dark:border-white/10 dark:hover:border-teal-500/30"
              }`}
            >
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
            </div>
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
                zScaleMm={1.0}
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

      {/* Motor seçim butonları + indirme */}
      <div className="mt-4 flex flex-col gap-3">

        {mesh3DError ? <p className="text-xs text-red-400">{mesh3DError}</p> : null}

        {/* RV1 / RV2 butonları */}
        <div className="grid grid-cols-2 gap-3">
          {/* RV1 Magic — Mesh AI */}
          <button
            type="button"
            onClick={() => void handleCreate3D()}
            disabled={isCreating3D || !uploadedImage || remainingAttempts <= 0}
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border border-[#b76e79]/60 bg-[#b76e79]/12 px-3 py-3 transition-colors hover:bg-[#b76e79]/22 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="text-sm font-black tracking-tight text-[#f2d5d9]">
              {isCreating3D ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#f2d5d9]/30 border-t-[#f2d5d9]" />
                  Üretiliyor…
                </span>
              ) : "RV1 Magic"}
            </span>
            <span className="text-[10px] text-[#b76e79]/70">Ekonomik · Hızlı</span>
          </button>

          {/* RV2 — Tripo AI (yakında) */}
          <button
            type="button"
            disabled
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 opacity-40 cursor-not-allowed"
          >
            <span className="text-sm font-black tracking-tight text-white/60">RV2</span>
            <span className="text-[10px] text-white/30">Yakında</span>
          </button>
        </div>

        {/* İndirme — model gelince aktif */}
        <div className="grid grid-cols-2 gap-2">
          {(["glb", "stl"] as DownloadModelFormat[]).map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => { setDownloadFormat(fmt); void handleDownloadModel(); }}
              disabled={isDownloading || !(mesh3DDownloadUrl || mesh3DModelUrl)}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.04] px-3 text-xs font-semibold text-white/70 transition-colors hover:border-[#b76e79]/50 hover:bg-[#b76e79]/10 hover:text-[#f2d5d9] disabled:cursor-not-allowed disabled:opacity-35"
            >
              {isDownloading && downloadFormat === fmt ? (
                <span className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white" />
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              )}
              .{fmt.toUpperCase()}
            </button>
          ))}
        </div>

      </div>

      {/* ── 24 Saatlik Model Galerisi ── */}
      <div className="mt-6 border-t border-white/[0.06] pt-4">
        <button
          type="button"
          onClick={() => {
            const next = !historyOpen;
            setHistoryOpen(next);
            if (next && history.length === 0) void loadHistory();
          }}
          className="flex w-full items-center justify-between text-[11px] font-bold uppercase tracking-widest text-muted/70 hover:text-muted"
        >
          <span>Son 24 Saatteki Modeller</span>
          <span>{historyOpen ? "▲" : "▼"}</span>
        </button>

        {historyOpen && (
          <div className="mt-3">
            {historyLoading ? (
              <div className="flex items-center gap-2 py-4 text-xs text-muted/60">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/15 border-t-[#b76e79]" />
                Yükleniyor…
              </div>
            ) : history.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted/40">Henüz model yok.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {history.map((item) => {
                  const remaining = Math.max(0, Math.round((new Date(item.expiresAt).getTime() - Date.now()) / 3600000));
                  return (
                    <div key={item.id} className="flex flex-col gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-2">
                      {/* Thumbnail */}
                      <div className="relative aspect-square overflow-hidden rounded-lg bg-black/30">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="h-full w-full object-contain" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-muted/30">Görsel yok</div>
                        )}
                        <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] text-white/50">
                          {remaining}s kaldı
                        </span>
                      </div>
                      <p className="text-[9px] text-muted/40">{new Date(item.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</p>
                      {/* İndir butonları */}
                      <div className="grid grid-cols-2 gap-1">
                        {(["glb", "stl"] as DownloadModelFormat[]).map((fmt) => {
                          const eng = (item.engine ?? "rv1") as "rv1" | "rv2";
                          const fname = generateRemauraFilename(eng);
                          return (
                            <a
                              key={fmt}
                              href={`/api/remaura/mesh3d/file?taskId=${encodeURIComponent(item.taskId)}&format=${fmt}&kind=download`}
                              download={`${fname}.${fmt}`}
                              className="inline-flex items-center justify-center rounded-md border border-white/10 bg-white/[0.03] py-1 text-[10px] font-semibold text-white/60 transition hover:border-[#b76e79]/50 hover:text-[#f2d5d9]"
                            >
                              .{fmt.toUpperCase()}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
