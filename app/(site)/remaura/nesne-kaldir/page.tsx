"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  RemauraBillingModalProvider,
  useRemauraBillingModal,
} from "@/components/remaura/RemauraBillingModalProvider";
import { useRemauraCreditsCheck } from "@/hooks/useRemauraCreditsCheck";
import { useLanguage } from "@/components/i18n/LanguageProvider";

const BRUSH_MIN = 2;
const BRUSH_MAX = 80;
const BRUSH_DEFAULT = 20;

type TabId = "remove" | "sharpen";

function clientToCanvas(clientX: number, clientY: number, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * canvas.width;
  const y = ((clientY - rect.top) / rect.height) * canvas.height;
  return { x, y };
}

function maskHasAnyWhite(mask: HTMLCanvasElement): boolean {
  const ctx = mask.getContext("2d");
  if (!ctx) return false;
  const { data } = ctx.getImageData(0, 0, mask.width, mask.height);
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    if (r > 24 || g > 24 || b > 24) return true;
  }
  return false;
}

function paintStroke(
  maskCtx: CanvasRenderingContext2D,
  brushCtx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  radius: number,
  mode: "brush" | "eraser",
) {
  if (mode === "brush") {
    maskCtx.save();
    maskCtx.globalCompositeOperation = "source-over";
    maskCtx.beginPath();
    maskCtx.strokeStyle = "#ffffff";
    maskCtx.lineWidth = radius * 2;
    maskCtx.lineCap = "round";
    maskCtx.lineJoin = "round";
    maskCtx.moveTo(x0, y0);
    maskCtx.lineTo(x1, y1);
    maskCtx.stroke();
    maskCtx.restore();

    brushCtx.save();
    brushCtx.globalCompositeOperation = "source-over";
    brushCtx.beginPath();
    brushCtx.strokeStyle = "rgba(220, 38, 38, 0.65)";
    brushCtx.lineWidth = radius * 2;
    brushCtx.lineCap = "round";
    brushCtx.lineJoin = "round";
    brushCtx.moveTo(x0, y0);
    brushCtx.lineTo(x1, y1);
    brushCtx.stroke();
    brushCtx.restore();
  } else {
    maskCtx.save();
    maskCtx.globalCompositeOperation = "source-over";
    maskCtx.beginPath();
    maskCtx.strokeStyle = "#000000";
    maskCtx.lineWidth = radius * 2;
    maskCtx.lineCap = "round";
    maskCtx.lineJoin = "round";
    maskCtx.moveTo(x0, y0);
    maskCtx.lineTo(x1, y1);
    maskCtx.stroke();
    maskCtx.restore();

    brushCtx.save();
    brushCtx.globalCompositeOperation = "destination-out";
    brushCtx.beginPath();
    brushCtx.strokeStyle = "rgba(255, 255, 255, 1)";
    brushCtx.lineWidth = radius * 2;
    brushCtx.lineCap = "round";
    brushCtx.lineJoin = "round";
    brushCtx.moveTo(x0, y0);
    brushCtx.lineTo(x1, y1);
    brushCtx.stroke();
    brushCtx.restore();
  }
}

function paintDot(
  maskCtx: CanvasRenderingContext2D,
  brushCtx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  mode: "brush" | "eraser",
) {
  if (mode === "brush") {
    maskCtx.save();
    maskCtx.globalCompositeOperation = "source-over";
    maskCtx.beginPath();
    maskCtx.fillStyle = "#ffffff";
    maskCtx.arc(x, y, radius, 0, Math.PI * 2);
    maskCtx.fill();
    maskCtx.restore();

    brushCtx.save();
    brushCtx.globalCompositeOperation = "source-over";
    brushCtx.beginPath();
    brushCtx.fillStyle = "rgba(220, 38, 38, 0.65)";
    brushCtx.arc(x, y, radius, 0, Math.PI * 2);
    brushCtx.fill();
    brushCtx.restore();
  } else {
    maskCtx.save();
    maskCtx.globalCompositeOperation = "source-over";
    maskCtx.beginPath();
    maskCtx.fillStyle = "#000000";
    maskCtx.arc(x, y, radius, 0, Math.PI * 2);
    maskCtx.fill();
    maskCtx.restore();

    brushCtx.save();
    brushCtx.globalCompositeOperation = "destination-out";
    brushCtx.beginPath();
    brushCtx.fillStyle = "rgba(255, 255, 255, 1)";
    brushCtx.arc(x, y, radius, 0, Math.PI * 2);
    brushCtx.fill();
    brushCtx.restore();
  }
}

function NesneKaldirPageContent() {
  const { t } = useLanguage();
  const om = t.remauraTools.objectRemove;
  const billingUi = useRemauraBillingModal();
  const { checkCredits } = useRemauraCreditsCheck();
  const [activeTab, setActiveTab] = useState<TabId>("remove");

  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [layoutSize, setLayoutSize] = useState<{ w: number; h: number } | null>(null);
  const [brushRadius, setBrushRadius] = useState(BRUSH_DEFAULT);
  const [tool, setTool] = useState<"brush" | "eraser">("brush");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPaint, setHasPaint] = useState(false);

  const [sharpFile, setSharpFile] = useState<File | null>(null);
  const [sharpPreview, setSharpPreview] = useState<string | null>(null);
  const [sharpResult, setSharpResult] = useState<string | null>(null);
  const [sharpLoading, setSharpLoading] = useState(false);
  const [sharpError, setSharpError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const sharpInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const maskRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const toolRef = useRef(tool);
  const brushRadiusRef = useRef(brushRadius);
  toolRef.current = tool;
  brushRadiusRef.current = brushRadius;

  const measureLayout = useCallback(() => {
    const img = imgRef.current;
    if (!img || !img.complete || img.naturalWidth === 0) return;
    const w = img.offsetWidth;
    const h = img.offsetHeight;
    if (w > 0 && h > 0) {
      setLayoutSize((prev) => (prev?.w === w && prev?.h === h ? prev : { w, h }));
    }
  }, []);

  const applyCanvasDimensions = useCallback((w: number, h: number) => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    overlay.width = w;
    overlay.height = h;
    overlay.style.width = `${w}px`;
    overlay.style.height = `${h}px`;
    overlay.style.position = "absolute";
    overlay.style.left = "0";
    overlay.style.top = "0";
  }, []);

  const initMaskAndOverlay = useCallback(
    (w: number, h: number) => {
      const mask = document.createElement("canvas");
      mask.width = w;
      mask.height = h;
      const mctx = mask.getContext("2d")!;
      mctx.fillStyle = "#000000";
      mctx.fillRect(0, 0, w, h);
      maskRef.current = mask;

      applyCanvasDimensions(w, h);
      const overlay = overlayRef.current;
      if (overlay) {
        overlay.getContext("2d")!.clearRect(0, 0, w, h);
      }
      setHasPaint(false);
    },
    [applyCanvasDimensions],
  );

  useEffect(() => {
    if (!layoutSize || !preview || activeTab !== "remove") return;
    initMaskAndOverlay(layoutSize.w, layoutSize.h);
  }, [layoutSize?.w, layoutSize?.h, preview, activeTab, initMaskAndOverlay]);

  useEffect(() => {
    if (!preview || activeTab !== "remove") return;
    const img = imgRef.current;
    if (!img) return;

    const run = () => {
      measureLayout();
    };
    run();
    const ro = new ResizeObserver(() => run());
    ro.observe(img);
    window.addEventListener("resize", run);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", run);
    };
  }, [preview, activeTab, measureLayout]);

  useEffect(() => {
    if (activeTab !== "remove" || !preview) return;
    const el = imgRef.current;
    if (!el?.complete || el.naturalWidth === 0) return;
    requestAnimationFrame(() => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (w > 0 && h > 0) setLayoutSize({ w, h });
    });
  }, [activeTab, preview]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (preview) URL.revokeObjectURL(preview);
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setLayoutSize(null);
    setResult(null);
    setError(null);
    maskRef.current = null;
    e.target.value = "";
  };

  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const sync = () => {
      const w = img.offsetWidth;
      const h = img.offsetHeight;
      if (w > 0 && h > 0) {
        setLayoutSize({ w, h });
      } else {
        requestAnimationFrame(sync);
      }
    };
    requestAnimationFrame(() => {
      requestAnimationFrame(sync);
    });
  };

  const handleSharpImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (sharpPreview) URL.revokeObjectURL(sharpPreview);
    setSharpFile(file);
    setSharpPreview(URL.createObjectURL(file));
    setSharpResult(null);
    setSharpError(null);
    e.target.value = "";
  };

  const syncHasPaintFromMask = useCallback(() => {
    const mask = maskRef.current;
    if (!mask) {
      setHasPaint(false);
      return;
    }
    setHasPaint(maskHasAnyWhite(mask));
  }, []);

  const paintAt = useCallback(
    (clientX: number, clientY: number) => {
      const overlay = overlayRef.current;
      const mask = maskRef.current;
      if (!overlay || !mask || layoutSize == null) return;
      const brushCtx = overlay.getContext("2d");
      const maskCtx = mask.getContext("2d");
      if (!brushCtx || !maskCtx) return;

      const { x, y } = clientToCanvas(clientX, clientY, overlay);
      const r = brushRadiusRef.current;
      const mode = toolRef.current;
      const lp = lastPoint.current;

      if (lp) {
        paintStroke(maskCtx, brushCtx, lp.x, lp.y, x, y, r, mode);
      } else {
        paintDot(maskCtx, brushCtx, x, y, r, mode);
      }
      lastPoint.current = { x, y };
    },
    [layoutSize],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (layoutSize == null) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    lastPoint.current = null;
    paintAt(e.clientX, e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    paintAt(e.clientX, e.clientY);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (drawing.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    drawing.current = false;
    lastPoint.current = null;
    syncHasPaintFromMask();
  };

  const clearMask = () => {
    if (!layoutSize) return;
    initMaskAndOverlay(layoutSize.w, layoutSize.h);
  };

  const openRemoveFilePicker = useCallback(async () => {
    const ok = await checkCredits(1, billingUi.openUnauthorized, billingUi.openInsufficientCredits);
    if (!ok) return;
    inputRef.current?.click();
  }, [billingUi, checkCredits]);

  const openSharpFilePicker = useCallback(async () => {
    const ok = await checkCredits(1, billingUi.openUnauthorized, billingUi.openInsufficientCredits);
    if (!ok) return;
    sharpInputRef.current?.click();
  }, [billingUi, checkCredits]);

  const handleSubmit = async () => {
    if (!image) {
      setError(om.errImageRequired);
      return;
    }
    const maskCanvas = maskRef.current;
    if (!maskCanvas || !hasPaint) {
      setError(om.errPaintRegion);
      return;
    }

    const ok = await checkCredits(1, billingUi.openUnauthorized, billingUi.openInsufficientCredits);
    if (!ok) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const maskBlob: Blob = await new Promise((resolve, reject) => {
        maskCanvas.toBlob((b) => (b ? resolve(b) : reject(new Error(om.errMaskBlob))), "image/png");
      });

      const fd = new FormData();
      fd.append("image", image);
      fd.append("mask_image", maskBlob, "mask.png");
      const {
        data: { user },
      } = await createClient().auth.getUser();
      fd.append("userId", user?.id ?? "");

      const res = await fetch("/api/remaura/nesne-kaldir", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
        if (res.status === 401 && data?.code === "UNAUTHORIZED") {
          billingUi.openUnauthorized();
          return;
        }
        if (res.status === 402 && data?.code === "INSUFFICIENT_CREDITS") {
          billingUi.openInsufficientCredits();
          return;
        }
        throw new Error(data.error || om.genericError);
      }

      const blob = await res.blob();
      setResult(URL.createObjectURL(blob));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : om.unknownError);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result;
    a.download = "nesne-kaldirildi.png";
    a.click();
  };

  const handleNetlestir = async () => {
    if (!sharpFile) {
      setSharpError(om.errNeedImage);
      return;
    }
    const ok = await checkCredits(1, billingUi.openUnauthorized, billingUi.openInsufficientCredits);
    if (!ok) return;
    setSharpLoading(true);
    setSharpError(null);
    setSharpResult(null);
    try {
      const fd = new FormData();
      fd.append("image", sharpFile);
      const {
        data: { user },
      } = await createClient().auth.getUser();
      fd.append("userId", user?.id ?? "");
      const res = await fetch("/api/remaura/gorseli-netlestir", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
        if (res.status === 401 && data?.code === "UNAUTHORIZED") {
          billingUi.openUnauthorized();
          return;
        }
        if (res.status === 402 && data?.code === "INSUFFICIENT_CREDITS") {
          billingUi.openInsufficientCredits();
          return;
        }
        throw new Error(data.error || om.sharpenFail);
      }
      const blob = await res.blob();
      setSharpResult(URL.createObjectURL(blob));
    } catch (err: unknown) {
      setSharpError(err instanceof Error ? err.message : om.unknownError);
    } finally {
      setSharpLoading(false);
    }
  };

  const handleSharpDownload = () => {
    if (!sharpResult) return;
    const a = document.createElement("a");
    a.href = sharpResult;
    a.download = "netlestirildi.png";
    a.click();
  };

  const cursorClass = tool === "eraser" ? "cursor-alias" : "cursor-crosshair";

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-center text-3xl font-bold">{om.title}</h1>

        <div
          className="mb-8 flex flex-wrap justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1"
          role="tablist"
          aria-label={om.tablistAria}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "remove"}
            onClick={() => setActiveTab("remove")}
            className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === "remove"
                ? "bg-amber-600/25 text-amber-200 ring-1 ring-amber-500/40"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {om.tab1}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "sharpen"}
            onClick={() => setActiveTab("sharpen")}
            className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === "sharpen"
                ? "bg-sky-600/25 text-sky-200 ring-1 ring-sky-500/40"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {om.tab2}
          </button>
        </div>

        {activeTab === "remove" && (
          <>
            <p className="mb-2 text-center text-gray-400">{om.subtitle}</p>
            <p className="mb-8 text-center text-xs text-gray-500">{om.removeDetail}</p>

            {!preview ? (
              <div
                onClick={() => void openRemoveFilePicker()}
                className="mb-6 cursor-pointer rounded-xl border-2 border-dashed border-gray-700 p-8 text-center transition hover:border-gray-500"
              >
                <p className="text-gray-500">{om.uploadPrompt}</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>
            ) : (
              <div className="mb-6 space-y-4">
                <div className="relative inline-block max-h-[min(24rem,70vh)] max-w-full">
                  <img
                    ref={imgRef}
                    src={preview}
                    alt={om.altSource}
                    className="block max-h-[min(24rem,70vh)] w-auto max-w-full rounded-lg object-contain"
                    onLoad={handleImgLoad}
                    draggable={false}
                  />
                  {layoutSize && layoutSize.w > 0 && layoutSize.h > 0 ? (
                    <canvas
                      ref={overlayRef}
                      className={`absolute z-10 touch-none ${cursorClass} rounded-lg`}
                      onPointerDown={onPointerDown}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                      onPointerLeave={onPointerUp}
                      onPointerCancel={onPointerUp}
                    />
                  ) : null}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <label htmlFor="brush-size" className="shrink-0 text-sm text-gray-400">
                      {om.brushSize}
                    </label>
                    <input
                      id="brush-size"
                      type="range"
                      min={BRUSH_MIN}
                      max={BRUSH_MAX}
                      value={brushRadius}
                      onChange={(e) => setBrushRadius(Number(e.target.value))}
                      className="min-w-0 flex-1 accent-amber-500"
                    />
                    <span className="shrink-0 tabular-nums text-sm text-gray-300">
                      {brushRadius}
                      <span className="ml-0.5 text-gray-500">px</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setTool("brush")}
                      className={`rounded-lg border px-4 py-2 text-sm transition ${
                        tool === "brush"
                          ? "border-amber-500 bg-amber-500/20 text-amber-200"
                          : "border-gray-600 text-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {om.brushTool}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTool("eraser")}
                      className={`rounded-lg border px-4 py-2 text-sm transition ${
                        tool === "eraser"
                          ? "border-sky-500 bg-sky-500/20 text-sky-200"
                          : "border-gray-600 text-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {om.eraser}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void openRemoveFilePicker()}
                    className="rounded-lg border border-gray-600 px-4 py-2 text-sm transition hover:border-gray-400"
                  >
                    {om.anotherImage}
                  </button>
                  <button
                    type="button"
                    onClick={clearMask}
                    disabled={!layoutSize}
                    className="rounded-lg border border-gray-600 px-4 py-2 text-sm transition hover:border-gray-400 disabled:opacity-40"
                  >
                    {om.clearMask}
                  </button>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </div>
              </div>
            )}

            {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={loading || !image || !hasPaint || layoutSize == null}
              className="w-full rounded-lg bg-gradient-to-r from-amber-600 to-yellow-500 py-3 font-semibold transition hover:opacity-90 disabled:opacity-40"
            >
              {loading ? om.processing : om.processButton}
            </button>

            {result && (
              <div className="mt-10">
                <h2 className="mb-4 text-center text-lg font-semibold">{om.resultHeading}</h2>
                <img src={result} alt={om.altResultRemove} className="mx-auto mb-4 max-h-96 rounded-xl object-contain" />
                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-full rounded-lg border border-gray-600 py-3 transition hover:border-gray-400"
                >
                  {om.downloadButton}
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === "sharpen" && (
          <>
            <p className="mb-8 text-center text-sm text-gray-400">{om.sharpenDetail}</p>

            {!sharpPreview ? (
              <div
                onClick={() => void openSharpFilePicker()}
                className="mb-6 cursor-pointer rounded-xl border-2 border-dashed border-sky-900/60 p-8 text-center transition hover:border-sky-600/50"
              >
                <p className="text-gray-500">{om.sharpenUploadPrompt}</p>
                <input
                  ref={sharpInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleSharpImageChange}
                />
              </div>
            ) : (
              <div className="mb-6 space-y-4">
                <div className="flex justify-center">
                  <img
                    src={sharpPreview}
                    alt={om.altSharpSource}
                    className="max-h-[min(20rem,60vh)] rounded-lg object-contain"
                  />
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => void openSharpFilePicker()}
                    className="rounded-lg border border-gray-600 px-4 py-2 text-sm transition hover:border-gray-400"
                  >
                    {om.sharpenAnotherImage}
                  </button>
                  <input
                    ref={sharpInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleSharpImageChange}
                  />
                </div>
              </div>
            )}

            {sharpError && <p className="mb-4 text-center text-sm text-red-400">{sharpError}</p>}

            {sharpLoading && (
              <p className="mb-4 text-center text-sm text-sky-300/90" aria-live="polite">
                {om.sharpenProcessingWait}
              </p>
            )}

            <button
              type="button"
              onClick={() => void handleNetlestir()}
              disabled={sharpLoading || !sharpFile}
              className="w-full rounded-lg bg-gradient-to-r from-sky-600 to-cyan-500 py-3 font-semibold transition hover:opacity-90 disabled:opacity-40"
            >
              {sharpLoading ? om.sharpenProcessing : om.sharpenAction}
            </button>

            {sharpResult && (
              <div className="mt-10">
                <h2 className="mb-4 text-center text-lg font-semibold">{om.resultHeading}</h2>
                <img src={sharpResult} alt={om.altSharpResult} className="mx-auto mb-4 max-h-96 rounded-xl object-contain" />
                <button
                  type="button"
                  onClick={handleSharpDownload}
                  className="w-full rounded-lg border border-gray-600 py-3 transition hover:border-gray-400"
                >
                  {om.downloadButton}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default function NesneKaldirPage() {
  return (
    <RemauraBillingModalProvider>
      <NesneKaldirPageContent />
    </RemauraBillingModalProvider>
  );
}
