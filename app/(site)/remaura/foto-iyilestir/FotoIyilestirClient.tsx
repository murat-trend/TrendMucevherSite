"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  METAL_TONE_LABELS,
  type BackdropKey,
  type FrameMode,
  type MetalToneKey,
} from "@/lib/remaura/foto-motoru/engine";
import {
  cutoutProduct,
  loadImage,
  preparePipeline,
  renderScene,
  type PipelineCache,
} from "@/lib/remaura/foto-motoru/pipeline";
import { exportScene } from "@/lib/remaura/foto-motoru/engine";
import styles from "./foto.module.css";

type Phase = "idle" | "ready" | "enhancing" | "done";

const BACKDROPS: { key: BackdropKey; label: string }[] = [
  { key: "white", label: "Beyaz Stüdyo" },
  { key: "gray", label: "Gri Degrade" },
  { key: "black", label: "Siyah Yansımalı" },
  { key: "transparent", label: "Şeffaf" },
];

const METAL_SWATCHES: { key: MetalToneKey; css: string }[] = [
  { key: "none", css: "linear-gradient(135deg,#666,#333)" },
  { key: "yellow-gold", css: "linear-gradient(135deg,#F0E68C,#D4AF37)" },
  { key: "rose-gold", css: "linear-gradient(135deg,#E8B4B8,#B76E79)" },
  { key: "white-gold", css: "linear-gradient(135deg,#f2eee0,#cfc9b4)" },
  { key: "silver", css: "linear-gradient(135deg,#e2e6ea,#aab2bc)" },
  { key: "platinum", css: "linear-gradient(135deg,#d9dde2,#9aa0a8)" },
  { key: "bronze", css: "linear-gradient(135deg,#CD7F32,#A0522D)" },
  { key: "oxidized", css: "linear-gradient(135deg,#5c6672,#2e343c)" },
];

const EXPORT_SIZES = [
  { label: "Instagram", w: 1080, h: 1080 },
  { label: "TikTok / Reels", w: 1080, h: 1920 },
  { label: "YouTube", w: 1920, h: 1080 },
  { label: "HD Kare", w: 2048, h: 2048 },
];

export function FotoIyilestirClient() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const [backdrop, setBackdrop] = useState<BackdropKey>("white");
  const [shadow, setShadow] = useState(true);
  // varsayılan: stüdyo kadrajı (onaylanan görünüm) — "orijinal" isteğe bağlı
  const [frame, setFrame] = useState<FrameMode>("studio");
  const [metalTone, setMetalTone] = useState<MetalToneKey>("none");
  const [metalIntensity, setMetalIntensity] = useState(50);
  const [exposure, setExposure] = useState(0);
  const [sharpness, setSharpness] = useState(30);
  const [denoise, setDenoise] = useState(20);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [exportSize, setExportSize] = useState(EXPORT_SIZES[3]);
  const [sliderPos, setSliderPos] = useState(50);
  const [dragActive, setDragActive] = useState(false);

  const cacheRef = useRef<PipelineCache | null>(null);
  const beforeCanvasRef = useRef<HTMLCanvasElement>(null);
  const afterCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const currentOptions = useCallback(
    () => ({
      enhance: { exposure, sharpness, denoise },
      metal: { tone: metalTone, intensity: metalIntensity },
      backdrop,
      shadow,
      frame,
      useCutout: true,
    }),
    [exposure, sharpness, denoise, metalTone, metalIntensity, backdrop, shadow, frame]
  );

  // ── Dosya alma ──
  const handleFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 20 * 1024 * 1024) {
      setError("Dosya çok büyük (maks. 20MB).");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setFileName(file.name);
      setFileSize((file.size / 1024 / 1024).toFixed(2) + " MB");
      cacheRef.current = null;
      setPhase("ready");
    };
    reader.readAsDataURL(file);
  };

  const reset = () => {
    setPhase("idle");
    setImageSrc(null);
    cacheRef.current = null;
    setError(null);
  };

  // ── Sahneyi çiz ──
  const paint = useCallback(async () => {
    const cache = cacheRef.current;
    if (!cache || !imageSrc) return;
    const scene = renderScene(cache, currentOptions());

    const after = afterCanvasRef.current;
    const before = beforeCanvasRef.current;
    if (!after || !before) return;

    after.width = scene.width;
    after.height = scene.height;
    after.getContext("2d")!.drawImage(scene, 0, 0);

    // Önce: orijinal, aynı kare çerçevede ortalanmış
    const orig = await loadImage(imageSrc);
    before.width = scene.width;
    before.height = scene.height;
    const bctx = before.getContext("2d")!;
    bctx.clearRect(0, 0, before.width, before.height);
    // orijinal kadrajda sahne = çalışma tuvali boyutu → birebir hizalı doldur
    const fill = frame === "original" ? 1 : 0.92;
    const scale = Math.min((scene.width * fill) / orig.width, (scene.height * fill) / orig.height);
    const dw = orig.width * scale;
    const dh = orig.height * scale;
    bctx.drawImage(orig, (scene.width - dw) / 2, (scene.height - dh) / 2, dw, dh);
  }, [currentOptions, imageSrc, frame]);

  // ── Otomatik İyileştir ──
  const handleEnhance = async () => {
    if (!imageSrc || phase === "enhancing") return;
    setPhase("enhancing");
    setError(null);
    try {
      if (!cacheRef.current) {
        setProgress("Fotoğraf analiz ediliyor...");
        cacheRef.current = await preparePipeline(imageSrc);
      }
      if (!cacheRef.current.cutout) {
        setProgress("Arka plan temizleniyor... (ilk kullanımda model indirilir)");
        cacheRef.current.cutout = await cutoutProduct(cacheRef.current.work);
      }
      setProgress("Sahne oluşturuluyor...");
      await paint();
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "İyileştirme başarısız oldu, tekrar deneyin.");
      setPhase("ready");
    } finally {
      setProgress(null);
    }
  };

  // ── Ayar değişince yeniden çiz (debounce) ──
  useEffect(() => {
    if (phase !== "done") return;
    const t = setTimeout(() => void paint(), 120);
    return () => clearTimeout(t);
  }, [phase, paint]);

  // ── Önce/sonra kaydırıcı ──
  useEffect(() => {
    const onMove = (clientX: number) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100));
      setSliderPos(x);
    };
    const mouseMove = (e: MouseEvent) => onMove(e.clientX);
    const touchMove = (e: TouchEvent) => onMove(e.touches[0].clientX);
    const stop = () => {
      draggingRef.current = false;
    };
    document.addEventListener("mousemove", mouseMove);
    document.addEventListener("mouseup", stop);
    document.addEventListener("touchmove", touchMove);
    document.addEventListener("touchend", stop);
    return () => {
      document.removeEventListener("mousemove", mouseMove);
      document.removeEventListener("mouseup", stop);
      document.removeEventListener("touchmove", touchMove);
      document.removeEventListener("touchend", stop);
    };
  }, []);

  // ── Dışa aktarım ──
  const handleExport = (format: "png" | "jpg") => {
    const cache = cacheRef.current;
    if (!cache) return;
    const scene = renderScene(cache, currentOptions());
    const dataUrl = exportScene(scene, exportSize.w, exportSize.h, format);
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `remaura-foto-${Date.now()}.${format}`;
    a.click();
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8" style={{ background: "#050508", color: "#fff" }}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Başlık */}
        <div className="text-center pt-6 pb-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Mücevher Fotoğraf <span style={{ color: "#D4AF37" }}>İyileştirme</span>
          </h1>
          <p className="mt-2 text-sm" style={{ color: "#94A3B8" }}>
            Telefonla çektiğiniz fotoğrafı satışa hazır ürün fotoğrafına çevirin — ücretsiz.
          </p>
        </div>

        {/* BLOK 1: Yükleme */}
        {phase === "idle" ? (
          <label
            className={`${styles.glassCard} rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-4`}
            style={{
              minHeight: 280,
              borderColor: dragActive ? "#D4AF37" : "rgba(255,255,255,0.12)",
              background: dragActive ? "rgba(212,175,55,0.05)" : undefined,
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              handleFile(e.dataTransfer.files[0]);
            }}
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(212,175,55,0.1)" }}>
              <svg className="w-8 h-8" style={{ color: "#D4AF37" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <path d="M17 8 12 3 7 8" />
                <path d="M12 3v12" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-white mb-1">Mücevher Fotoğrafınızı Yükleyin</p>
              <p className="text-sm" style={{ color: "#64748B" }}>
                Sürükle-bırak yapın veya tıklayarak seçin
              </p>
              <p className="text-xs mt-1" style={{ color: "#64748B" }}>
                PNG, JPG, WEBP · Maks. 20MB
              </p>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
        ) : (
          <div className={`${styles.glassCard} rounded-2xl p-4 flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageSrc ?? ""} alt="" className="w-12 h-12 rounded-lg object-cover border border-white/[0.08]" />
              <div>
                <p className="text-sm font-medium text-white">{fileName}</p>
                <p className="text-xs" style={{ color: "#64748B" }}>
                  {fileSize}
                </p>
              </div>
            </div>
            <button onClick={reset} className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors" style={{ color: "#64748B" }}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* BLOK 2: Otomatik İyileştir */}
        {(phase === "ready" || phase === "enhancing" || phase === "done") && (
          <div>
            <button
              onClick={() => void handleEnhance()}
              disabled={phase === "enhancing"}
              className={`${styles.btnGold} ${phase !== "done" ? styles.pulseGlow : ""} w-full py-4 rounded-2xl text-base flex items-center justify-center gap-3`}
            >
              {phase === "enhancing" ? (
                <>
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  İyileştiriliyor...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z" />
                    <path d="m14 7 3 3" />
                    <path d="M5 6v4" />
                    <path d="M19 14v4" />
                    <path d="M10 2v2" />
                    <path d="M7 8H5" />
                    <path d="M19 14h-2" />
                  </svg>
                  {phase === "done" ? "Tekrar İyileştir" : "Otomatik İyileştir"}
                </>
              )}
            </button>
            <p className="text-center text-xs mt-2" style={{ color: "#64748B" }}>
              {progress ?? "Beyaz dengesi, pozlama, keskinlik, arka plan temizliği, zemin ve gölge — tek tıkla"}
            </p>
            {error && (
              <p className="text-center text-xs mt-2" style={{ color: "#f87171" }}>
                {error}
              </p>
            )}
          </div>
        )}

        {/* BLOK 3: Önce/Sonra */}
        {phase === "done" && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white">Önizleme</h2>
              <div className="flex items-center gap-4 text-xs" style={{ color: "#94A3B8" }}>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-white/[0.2]" /> Orijinal
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#D4AF37" }} /> İyileştirilmiş
                </span>
              </div>
            </div>
            <div className={`${styles.glassCard} rounded-2xl p-3`}>
              <div
                ref={containerRef}
                className={`relative overflow-hidden rounded-xl ${backdrop === "transparent" ? styles.checker : ""}`}
              >
                <canvas ref={afterCanvasRef} className="block w-full h-auto" />
                <canvas
                  ref={beforeCanvasRef}
                  className="absolute top-0 left-0 w-full h-auto"
                  style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)`, background: "rgba(5,5,8,0.85)" }}
                />
                <div
                  className={styles.sliderHandle}
                  style={{ left: `${sliderPos}%` }}
                  onMouseDown={() => {
                    draggingRef.current = true;
                  }}
                  onTouchStart={() => {
                    draggingRef.current = true;
                  }}
                />
                <div className="absolute top-3 left-3 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-black/50 backdrop-blur-sm" style={{ color: "#94A3B8", zIndex: 12 }}>
                  Orijinal
                </div>
                <div className="absolute top-3 right-3 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-black/50 backdrop-blur-sm" style={{ color: "#D4AF37", zIndex: 12 }}>
                  İyileştirilmiş
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BLOK 4-5-6: Kontroller */}
        {phase === "done" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Zemin */}
            <div className={`${styles.glassCard} rounded-2xl p-5`}>
              <h3 className="text-sm font-bold text-white mb-4">Zemin</h3>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {BACKDROPS.map((bg) => (
                  <button
                    key={bg.key}
                    onClick={() => setBackdrop(bg.key)}
                    className="p-3 rounded-xl border-2 transition-all text-left"
                    style={{ borderColor: backdrop === bg.key ? "#D4AF37" : "rgba(255,255,255,0.06)" }}
                  >
                    <div
                      className={`w-full h-10 rounded-lg mb-2 border border-white/[0.1] ${bg.key === "transparent" ? styles.checker : ""}`}
                      style={
                        bg.key === "white"
                          ? { background: "linear-gradient(180deg,#f8f8f8,#e8e8e8)" }
                          : bg.key === "gray"
                            ? { background: "linear-gradient(135deg,#d0d0d0,#808080,#404040)" }
                            : bg.key === "black"
                              ? { background: "radial-gradient(ellipse at center 30%,#333,#0a0a0a 60%,#000)" }
                              : undefined
                      }
                    />
                    <span className="text-[11px] font-medium" style={{ color: "#94A3B8" }}>
                      {bg.label}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 py-3 border-t border-white/[0.06]">
                {(
                  [
                    { key: "studio", label: "Stüdyo Kadrajı" },
                    { key: "original", label: "Orijinal Kadraj" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFrame(f.key)}
                    className="flex-1 py-2 rounded-lg border text-[11px] font-medium transition-all"
                    style={{
                      borderColor: frame === f.key ? "#D4AF37" : "rgba(255,255,255,0.06)",
                      color: frame === f.key ? "#D4AF37" : "#94A3B8",
                      background: frame === f.key ? "rgba(212,175,55,0.08)" : "transparent",
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between py-3 border-t border-white/[0.06]">
                <span className="text-xs font-medium" style={{ color: "#94A3B8" }}>
                  Alt Gölge
                </span>
                <button
                  onClick={() => setShadow((s) => !s)}
                  className="relative w-10 h-5 rounded-full transition-all"
                  style={{ background: shadow ? "rgba(212,175,55,0.3)" : "rgba(255,255,255,0.1)" }}
                >
                  <span
                    className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                    style={{ left: shadow ? 20 : 2, background: shadow ? "#D4AF37" : "#64748B" }}
                  />
                </button>
              </div>
            </div>

            {/* Metal Tonu */}
            <div className={`${styles.glassCard} rounded-2xl p-5`}>
              <h3 className="text-sm font-bold text-white mb-1">Metal Tonu</h3>
              <p className="text-[10px] mb-4" style={{ color: "#64748B" }}>
                Yalnızca ürünün metal yüzeylerine uygulanır
              </p>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {METAL_SWATCHES.map((sw) => (
                  <button
                    key={sw.key}
                    onClick={() => setMetalTone(sw.key)}
                    className="flex flex-col items-center gap-1"
                    title={METAL_TONE_LABELS[sw.key]}
                  >
                    <span
                      className="w-9 h-9 rounded-full transition-transform hover:scale-110"
                      style={{
                        background: sw.css,
                        boxShadow: metalTone === sw.key ? "0 0 0 2px #D4AF37, 0 0 12px rgba(212,175,55,0.4)" : "none",
                      }}
                    />
                    <span className="text-[9px]" style={{ color: metalTone === sw.key ? "#D4AF37" : "#64748B" }}>
                      {METAL_TONE_LABELS[sw.key]}
                    </span>
                  </button>
                ))}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#64748B" }}>
                    Şiddet
                  </span>
                  <span className="text-[10px] font-mono" style={{ color: "#D4AF37" }}>
                    {metalIntensity}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={metalIntensity}
                  onChange={(e) => setMetalIntensity(Number(e.target.value))}
                  className={styles.range}
                />
              </div>
            </div>

            {/* İnce Ayar */}
            <div className={`${styles.glassCard} rounded-2xl p-5`}>
              <h3 className="text-sm font-bold text-white mb-4">İnce Ayar</h3>
              {(
                [
                  { key: "exposure", label: "Pozlama", min: -100, max: 100, value: exposure, set: setExposure },
                  { key: "sharpness", label: "Keskinlik", min: 0, max: 100, value: sharpness, set: setSharpness },
                  { key: "denoise", label: "Gürültü Azaltma", min: 0, max: 100, value: denoise, set: setDenoise },
                ] as const
              ).map((item) => (
                <div key={item.key} className="border-b border-white/[0.06] last:border-0">
                  <button
                    onClick={() => setOpenAccordion(openAccordion === item.key ? null : item.key)}
                    className="w-full flex items-center justify-between py-3 text-left"
                  >
                    <span className="text-xs font-medium" style={{ color: "#94A3B8" }}>
                      {item.label}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-[10px] font-mono" style={{ color: "#D4AF37" }}>
                        {item.value}
                      </span>
                      <svg
                        className="w-3.5 h-3.5 transition-transform"
                        style={{ color: "#64748B", transform: openAccordion === item.key ? "rotate(180deg)" : "none" }}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </span>
                  </button>
                  {openAccordion === item.key && (
                    <div className="pb-3">
                      <input
                        type="range"
                        min={item.min}
                        max={item.max}
                        value={item.value}
                        onChange={(e) => item.set(Number(e.target.value))}
                        className={styles.range}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BLOK 7: Dışa Aktar */}
        {phase === "done" && (
          <div className={`${styles.glassCard} rounded-2xl p-5`}>
            <h3 className="text-sm font-bold text-white mb-4">Dışa Aktar</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              {EXPORT_SIZES.map((size) => (
                <button
                  key={size.label}
                  onClick={() => setExportSize(size)}
                  className="p-3 rounded-xl border transition-all text-left bg-white/[0.02]"
                  style={{
                    borderColor: exportSize.label === size.label ? "#9B7FD4" : "rgba(255,255,255,0.06)",
                  }}
                >
                  <p className="text-xs font-medium text-white">{size.label}</p>
                  <p className="text-[10px]" style={{ color: "#64748B" }}>
                    {size.w} x {size.h}
                  </p>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleExport("png")}
                className="flex-1 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all hover:opacity-80"
                style={{ background: "rgba(155,127,212,0.1)", borderColor: "rgba(155,127,212,0.25)", color: "#B8A0E8" }}
              >
                PNG İndir
              </button>
              <button
                onClick={() => handleExport("jpg")}
                className="flex-1 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all hover:opacity-80"
                style={{ background: "rgba(212,175,55,0.1)", borderColor: "rgba(212,175,55,0.25)", color: "#D4AF37" }}
              >
                JPG İndir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
