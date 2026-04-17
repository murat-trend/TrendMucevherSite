"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { MeshRealtimeViewer, type MeshRealtimeViewerHandle } from "@/components/remaura/MeshRealtimeViewer";
import {
  RemauraBillingModalProvider,
  useRemauraBillingModal,
} from "@/components/remaura/RemauraBillingModalProvider";
import { useRemauraCreditsCheck } from "@/hooks/useRemauraCreditsCheck";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import {
  Upload, Video, Download, RotateCcw,
  Loader2, CheckCircle, Info,
} from "lucide-react";

type RecordState = "idle" | "recording" | "processing" | "done";

const TRANSPARENT_BG =
  "bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAAH0lEQVQ4jWNgYGD4z8BQDwAAAP//AwBG7SMdAAAADklEQVQI12NgYGD4DwABBAEAWB0v7QAAAABJRU5ErkJggg==')] bg-repeat";

/** Video kaydında recordCanvas'a çizilecek arka plan renkleri. */
const BG_VIDEO_FILL: Record<string, { base: string; overlay?: string }> = {
  transparent: { base: "#0a0a0a" },
  black:       { base: "#000000" },
  white:       { base: "#ffffff" },
  dark:        { base: "#1a1a1a" },
  gold:        { base: "#0a0a0a", overlay: "rgba(201,168,76,0.13)" },
};

export default function VideoOptimizePage() {
  return (
    <RemauraBillingModalProvider>
      <VideoOptimizePageInner />
    </RemauraBillingModalProvider>
  );
}

function VideoOptimizePageInner() {
  const { locale, t } = useLanguage();
  const vo = t.remauraTools.videoOptimize;
  const numberLocale =
    locale === "tr" ? "tr-TR" : locale === "de" ? "de-DE" : locale === "ru" ? "ru-RU" : "en-US";

  const BG_OPTIONS = useMemo(
    () => [
      { id: "transparent", label: vo.bgTransparent, cls: TRANSPARENT_BG },
      { id: "black", label: vo.bgBlack, cls: "bg-black" },
      { id: "white", label: vo.bgWhite, cls: "bg-white" },
      { id: "dark", label: vo.bgDarkGray, cls: "bg-[#1a1a1a]" },
      { id: "gold", label: vo.bgGold, cls: "bg-[#c9a84c22]" },
    ],
    [locale, vo.bgTransparent, vo.bgBlack, vo.bgWhite, vo.bgDarkGray, vo.bgGold],
  );

  const DURATION_OPTIONS = useMemo(
    () =>
      (["5", "10", "15", "30"] as const).map((id) => ({
        id,
        label: vo.durationSec.replace("{n}", id),
      })),
    [locale, vo.durationSec],
  );

  const FORMAT_OPTIONS = useMemo(
    () => [
      { id: "square" as const, label: vo.formatSquare, w: 1080, h: 1080 },
      { id: "portrait" as const, label: vo.formatPortrait, w: 1080, h: 1920 },
      { id: "landscape" as const, label: vo.formatLandscape, w: 1920, h: 1080 },
    ],
    [locale, vo.formatSquare, vo.formatPortrait, vo.formatLandscape],
  );

  const billingUi = useRemauraBillingModal();
  const { checkCredits } = useRemauraCreditsCheck();
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fileType, setFileType] = useState<"stl" | "glb" | "auto">("auto");
  const [bg, setBg] = useState("dark");
  const [duration, setDuration] = useState("10");
  const [format, setFormat] = useState("square");
  const [showGrid, setShowGrid] = useState(true);
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [progress, setProgress] = useState(0);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [mp4Url, setMp4Url] = useState<string | null>(null);
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [mp4Converting, setMp4Converting] = useState(false);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [recordMimeType, setRecordMimeType] = useState("video/webm");
  const [meshStats, setMeshStats] = useState<{ vertices: number; faces: number } | null>(null);

  const viewerRef = useRef<MeshRealtimeViewerHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const recordCanvasRef = useRef<HTMLCanvasElement>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  const openMeshFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFile = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    const type = ext === "stl" ? "stl" : ext === "glb" ? "glb" : "auto";
    setFileType(type);
    setFileName(file.name);
    setModelUrl(URL.createObjectURL(file));
    setOutputUrl(null);
    setOutputBlob(null);
    setRecordState("idle");
  };

  const startRecording = useCallback(async () => {
    const container = viewerContainerRef.current;
    const recordCanvas = recordCanvasRef.current;
    if (!container || !modelUrl || !recordCanvas) return;

    const ok = await checkCredits(1, billingUi.openUnauthorized, billingUi.openInsufficientCredits);
    if (!ok) return;

    setRecordState("recording");
    setProgress(0);
    setOutputUrl(null);
    setOutputBlob(null);

    const sourceCanvas = container.querySelector("canvas");
    if (!sourceCanvas) {
      setRecordState("idle");
      return;
    }

    const fmt = FORMAT_OPTIONS.find((f) => f.id === format) ?? FORMAT_OPTIONS[0];
    const durationSec = Number(duration);
    const fps = 30;
    // bg state'ini kayıt başlangıcında yakala — loop içinde stale closure olmasın
    const bgFill = BG_VIDEO_FILL[bg] ?? BG_VIDEO_FILL.dark;

    try {
      recordCanvas.width = fmt.w;
      recordCanvas.height = fmt.h;
      const ctx = recordCanvas.getContext("2d");
      if (!ctx) {
        setRecordState("idle");
        return;
      }

      const stream = recordCanvas.captureStream(fps);
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm")
          ? "video/webm"
          : "video/mp4";
      setRecordMimeType(mimeType);
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 15_000_000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.start();

      let rafId = 0;
      const startTime = Date.now();
      const render = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        const pct = Math.min(Math.round((elapsed / durationSec) * 100), 99);
        setProgress(pct);

        // Arka planı doldur — Three.js canvas transparent, video encoder siyah yapar
        ctx.fillStyle = bgFill.base;
        ctx.fillRect(0, 0, fmt.w, fmt.h);
        if (bgFill.overlay) {
          ctx.fillStyle = bgFill.overlay;
          ctx.fillRect(0, 0, fmt.w, fmt.h);
        }
        ctx.drawImage(sourceCanvas, 0, 0, fmt.w, fmt.h);

        if (elapsed < durationSec) {
          rafId = window.requestAnimationFrame(render);
        } else {
          recorder.stop();
          setRecordState("processing");
        }
      };
      render();

      recorder.onstop = () => {
        window.cancelAnimationFrame(rafId);
        const blob = new Blob(chunks, { type: mimeType });
        setOutputBlob(blob);
        setOutputUrl(URL.createObjectURL(blob));
        setRecordState("done");
        setProgress(100);
      };
    } catch {
      setRecordState("idle");
    }
  }, [billingUi, checkCredits, modelUrl, format, duration, bg, FORMAT_OPTIONS]);

  const download = () => {
    if (!outputUrl) return;
    const ext = recordMimeType.includes("mp4") ? "mp4" : "webm";
    const a = document.createElement("a");
    a.href = outputUrl;
    a.download = `remaura-3d-${Date.now()}.${ext}`;
    a.click();
  };

  const downloadMp4 = useCallback(async () => {
    if (!outputBlob) return;
    if (mp4Url) {
      const a = document.createElement("a");
      a.href = mp4Url;
      a.download = `remaura-3d-${Date.now()}.mp4`;
      a.click();
      return;
    }
    setMp4Converting(true);
    try {
      if (!ffmpegRef.current) {
        const ffmpeg = new FFmpeg();
        const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
        });
        ffmpegRef.current = ffmpeg;
        setFfmpegLoaded(true);
      }
      const ffmpeg = ffmpegRef.current;
      if (!ffmpeg) return;

      await ffmpeg.writeFile("input.webm", await fetchFile(outputBlob));
      await ffmpeg.exec([
        "-i", "input.webm",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "18",
        "-movflags", "+faststart",
        "-pix_fmt", "yuv420p",
        "output.mp4",
      ]);

      const data = await ffmpeg.readFile("output.mp4");
      const blob = new Blob([data as BlobPart], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      setMp4Url(url);
      const a = document.createElement("a");
      a.href = url;
      a.download = `remaura-3d-${Date.now()}.mp4`;
      a.click();

      await ffmpeg.deleteFile("input.webm");
      await ffmpeg.deleteFile("output.mp4");
    } catch (err) {
      console.error(err);
      alert(vo.alertMp4Fail);
    } finally {
      setMp4Converting(false);
    }
  }, [outputBlob, mp4Url, vo.alertMp4Fail]);

  const reset = () => {
    setModelUrl(null);
    setOutputUrl(null);
    setMp4Url(null);
    setOutputBlob(null);
    setRecordState("idle");
    setProgress(0);
    setMeshStats(null);
    setFileName("");
  };

  const selectedBg = BG_OPTIONS.find((b) => b.id === bg) ?? BG_OPTIONS[0];
  const selectedFmt = FORMAT_OPTIONS.find((f) => f.id === format) ?? FORMAT_OPTIONS[0];

  useEffect(() => {
    viewerRef.current?.setGridVisible(showGrid);
  }, [showGrid]);

  return (
    <main className="min-h-screen bg-background">
      <div className="border-b border-border/60 bg-card">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <h1 className="font-display text-2xl font-medium tracking-[-0.02em] text-foreground">{vo.title}</h1>
          <p className="mt-1 text-[13px] text-muted">{vo.subtitle}</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {!modelUrl ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void (async () => {
                const ok = await checkCredits(1, billingUi.openUnauthorized, billingUi.openInsufficientCredits);
                if (!ok) return;
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              })();
            }}
            onClick={() => void openMeshFilePicker()}
            className={`flex min-h-[400px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all ${
              dragging ? "border-accent bg-accent/[0.04]" : "border-border/60 hover:border-accent/40 hover:bg-surface-alt/50"
            }`}
          >
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-surface-alt">
              <Upload size={28} className="text-muted" strokeWidth={1.5} />
            </div>
            <p className="text-[16px] font-medium text-foreground">{vo.uploadLabel}</p>
            <p className="mt-2 text-[13px] text-muted">{vo.uploadHint}</p>
            <div className="mt-6 flex gap-3">
              {[".stl", ".glb"].map((ext) => (
                <span key={ext} className="rounded-full border border-border/60 px-3 py-1 text-[11px] font-medium text-muted">
                  {ext}
                </span>
              ))}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".stl,.glb"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                void (async () => {
                  const ok = await checkCredits(1, billingUi.openUnauthorized, billingUi.openInsufficientCredits);
                  if (!ok) return;
                  handleFile(f);
                })();
              }}
            />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-4">
            <div className="space-y-4 lg:col-span-3">
              <div className="flex justify-center">
              <div
                ref={viewerContainerRef}
                className={`relative overflow-hidden rounded-2xl border border-border/80 ${selectedBg.cls}`}
                style={{ aspectRatio: `${selectedFmt.w}/${selectedFmt.h}`, maxHeight: "70vh", maxWidth: "100%" }}
              >
                <MeshRealtimeViewer
                  ref={viewerRef}
                  modelUrl={modelUrl}
                  fileType={fileType}
                  onMeshStats={setMeshStats}
                  autoRotate={true}
                  showGrid={true}
                  renderWidth={selectedFmt.w}
                  renderHeight={selectedFmt.h}
                  preserveDrawingBuffer={true}
                />

                {recordState === "recording" && (
                  <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-red-500/30 bg-black/60 px-3 py-1.5 backdrop-blur-sm">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                    <span className="text-[11px] font-medium text-white">
                      {vo.recordingPercent.replace("{p}", String(progress))}
                    </span>
                  </div>
                )}

                {meshStats && (
                  <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 backdrop-blur-sm">
                    <span className="text-[11px] text-white/70">
                      {vo.vertexFace
                        .replace("{v}", meshStats.vertices.toLocaleString(numberLocale))
                        .replace("{f}", meshStats.faces.toLocaleString(numberLocale))}
                    </span>
                  </div>
                )}

                <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 backdrop-blur-sm">
                  <span className="max-w-[160px] truncate text-[11px] text-white/70">{fileName}</span>
                </div>
              </div>
              </div>

              <div className="flex gap-2 mt-2 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    const r = viewerRef.current;
                    if (r) r.setRotation?.({ x: 0, y: 0, z: 0 });
                  }}
                  className="rounded-lg border border-border/40 px-3 py-1.5 text-xs text-muted hover:text-foreground"
                >
                  {vo.flat}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const r = viewerRef.current;
                    if (r) r.setRotation?.({ x: Math.PI / 2, y: 0, z: 0 });
                  }}
                  className="rounded-lg border border-border/40 px-3 py-1.5 text-xs text-muted hover:text-foreground"
                >
                  {vo.rot90x}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const r = viewerRef.current;
                    if (r) r.setRotation?.({ x: Math.PI, y: 0, z: 0 });
                  }}
                  className="rounded-lg border border-border/40 px-3 py-1.5 text-xs text-muted hover:text-foreground"
                >
                  {vo.rot180x}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const r = viewerRef.current;
                    if (r) r.setRotation?.({ x: -Math.PI / 2, y: 0, z: 0 });
                  }}
                  className="rounded-lg border border-border/40 px-3 py-1.5 text-xs text-muted hover:text-foreground"
                >
                  {vo.rotNeg90x}
                </button>
              </div>

              {(recordState === "recording" || recordState === "processing") && (
                <div className="rounded-xl border border-border/80 bg-card p-4">
                  <div className="mb-2 flex items-center justify-between text-[12px]">
                    <span className="text-muted">
                      {recordState === "recording" ? vo.recording : vo.processing}
                    </span>
                    <span className="font-medium text-foreground">%{progress}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-alt">
                    <div className="h-full rounded-full bg-red-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {recordState === "done" && outputUrl && (
                <div className="space-y-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-emerald-500" strokeWidth={2} />
                    <span className="text-[14px] font-medium text-foreground">{vo.videoReady}</span>
                  </div>
                  <video src={outputUrl} controls className="max-h-[300px] w-full rounded-xl" />
                  <div className="flex gap-3">
                    <button
                      onClick={download}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-[13px] font-medium text-white hover:bg-emerald-400"
                    >
                      <Download size={15} /> {vo.downloadButton}
                    </button>
                    <button
                      onClick={() => void downloadMp4()}
                      disabled={mp4Converting}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border/80 py-3 text-[13px] font-medium text-foreground hover:border-accent/30 disabled:opacity-50"
                      title={ffmpegLoaded ? vo.ffmpegReadyHint : vo.ffmpegLoadHint}
                    >
                      {mp4Converting ? (
                        <><Loader2 size={15} className="animate-spin" /> {vo.mp4Preparing}</>
                      ) : (
                        <><Download size={15} /> {vo.mp4Download}</>
                      )}
                    </button>
                    {mp4Url && !mp4Converting && (
                      <span className="text-[10px] text-emerald-500">✓ {vo.mp4ReadyBadge}</span>
                    )}
                    <button
                      onClick={() => {
                        setRecordState("idle");
                        setOutputUrl(null);
                        setOutputBlob(null);
                      }}
                      className="flex items-center gap-2 rounded-xl border border-border/80 px-4 py-3 text-[13px] text-muted hover:text-foreground"
                    >
                      <RotateCcw size={14} /> {vo.repeat}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-border/80 bg-card p-5">
                <h3 className="mb-4 text-[12px] font-medium uppercase tracking-wider text-muted">{vo.panelBackground}</h3>
                <div className="flex flex-wrap gap-2">
                  {BG_OPTIONS.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => setBg(entry.id)}
                      className={`rounded-xl border px-3 py-2 text-[12px] transition-all ${
                        bg === entry.id ? "border-accent/30 bg-accent/[0.08] text-accent" : "border-border/60 text-muted hover:text-foreground"
                      }`}
                    >
                      {entry.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-5">
                <h3 className="mb-4 text-[12px] font-medium uppercase tracking-wider text-muted">{vo.panelGrid}</h3>
                <button
                  onClick={() => setShowGrid((prev) => !prev)}
                  className={`w-full rounded-xl border px-4 py-2.5 text-[13px] font-medium transition-all ${
                    showGrid ? "border-accent/30 bg-accent/[0.06] text-accent" : "border-border/60 text-foreground hover:border-accent/20"
                  }`}
                >
                  {showGrid ? vo.gridOn : vo.gridOff}
                </button>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-5">
                <h3 className="mb-4 text-[12px] font-medium uppercase tracking-wider text-muted">{vo.panelFormat}</h3>
                <div className="space-y-2">
                  {FORMAT_OPTIONS.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => setFormat(entry.id)}
                      className={`flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-[13px] transition-all ${
                        format === entry.id ? "border-accent/30 bg-accent/[0.06] text-accent" : "border-border/60 text-foreground hover:border-accent/20"
                      }`}
                    >
                      <span>{entry.label}</span>
                      <span className="text-[11px] text-muted">{entry.w}×{entry.h}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-5">
                <h3 className="mb-4 text-[12px] font-medium uppercase tracking-wider text-muted">{vo.panelDuration}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {DURATION_OPTIONS.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => setDuration(entry.id)}
                      className={`rounded-xl border py-2.5 text-[13px] font-medium transition-all ${
                        duration === entry.id ? "border-accent/30 bg-accent/[0.06] text-accent" : "border-border/60 text-foreground hover:border-accent/20"
                      }`}
                    >
                      {entry.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-surface-alt p-4">
                <Info size={14} className="mt-0.5 shrink-0 text-muted" strokeWidth={1.75} />
                <p className="text-[11px] leading-relaxed text-muted">{vo.sidebarHint}</p>
              </div>

              <div className="space-y-2">
                {recordState === "idle" && (
                  <button
                    onClick={() => void startRecording()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 py-3.5 text-[14px] font-medium text-white transition-colors hover:bg-red-400"
                  >
                    <Video size={16} /> {vo.processButton}
                  </button>
                )}
                {recordState === "recording" && (
                  <button
                    disabled
                    className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-red-500/50 py-3.5 text-[14px] font-medium text-white"
                  >
                    <span className="h-3 w-3 animate-pulse rounded-full bg-white" />
                    {vo.recordingPercent.replace("{p}", String(progress))}
                  </button>
                )}
                {recordState === "processing" && (
                  <button
                    disabled
                    className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-surface-alt py-3.5 text-[14px] font-medium text-muted"
                  >
                    <Loader2 size={16} className="animate-spin" /> {vo.processing}
                  </button>
                )}
                <button
                  onClick={reset}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/80 py-3 text-[13px] text-muted hover:text-foreground"
                >
                  <RotateCcw size={14} /> {vo.differentModel}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <canvas ref={recordCanvasRef} className="hidden" />
    </main>
  );
}
