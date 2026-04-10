"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { BackgroundRemoverPanel } from "@/components/remaura/BackgroundRemoverPanel";
import { RemauraWatermarkOverlay } from "@/components/remaura/RemauraWatermarkOverlay";
import { trackEvent } from "@/lib/analytics/track";
import { applyWatermark } from "@/lib/remaura/apply-rem-watermark";

type MetalToneKey =
  | "none"
  | "white-gold"
  | "silver"
  | "rose-gold"
  | "green-gold"
  | "yellow-gold"
  | "gold-18k";

const METAL_TONES: Record<
  Exclude<MetalToneKey, "none">,
  {
    label: string;
    hex: string;
    presetContrast: number;
    presetBrightness: number;
    presetTone: number;
    presetSoften: number;
  }
> = {
  "white-gold": {
    label: "Beyaz Altin",
    hex: "#E7E2D7",
    presetContrast: 112,
    presetBrightness: 108,
    presetTone: 0,
    presetSoften: 0.2,
  },
  silver: {
    label: "Gumus",
    hex: "#C8CCD2",
    presetContrast: 118,
    presetBrightness: 112,
    presetTone: 0,
    presetSoften: 0.3,
  },
  "rose-gold": {
    label: "Rose Gold",
    hex: "#C9836E",
    presetContrast: 114,
    presetBrightness: 104,
    presetTone: -8,
    presetSoften: 0.2,
  },
  "green-gold": {
    label: "Yesil Altin",
    hex: "#B4A56A",
    presetContrast: 110,
    presetBrightness: 104,
    presetTone: 6,
    presetSoften: 0.2,
  },
  "yellow-gold": {
    label: "Sari Altin",
    hex: "#D4AF37",
    presetContrast: 116,
    presetBrightness: 105,
    presetTone: -10,
    presetSoften: 0.2,
  },
  "gold-18k": {
    label: "18 Ayar Altin",
    hex: "#C9A227",
    presetContrast: 118,
    presetBrightness: 104,
    presetTone: -8,
    presetSoften: 0.2,
  },
};

const LIGHTING_PRESETS = {
  studio: { label: "Studyo Isigi", contrast: 114, brightness: 120, tone: 2, soften: 0.3, shine: 36 },
  showcase: { label: "Vitrin Isigi", contrast: 124, brightness: 108, tone: -2, soften: 0.2, shine: 48 },
} as const;

function applyLightingToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mode: "studio" | "showcase" | "none",
  intensity: number
) {
  if (mode === "none" || intensity <= 0) return;

  if (mode === "studio") {
    const topWash = ctx.createLinearGradient(0, 0, 0, height * 0.65);
    topWash.addColorStop(0, "rgba(255,255,255,0.95)");
    topWash.addColorStop(1, "rgba(255,255,255,0)");
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.18 * intensity;
    ctx.fillStyle = topWash;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    const leftSpot = ctx.createRadialGradient(
      width * 0.2,
      height * 0.2,
      0,
      width * 0.2,
      height * 0.2,
      width * 0.55
    );
    leftSpot.addColorStop(0, "rgba(255,255,255,1)");
    leftSpot.addColorStop(1, "rgba(255,255,255,0)");
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.16 * intensity;
    ctx.fillStyle = leftSpot;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    const rightSpot = ctx.createRadialGradient(
      width * 0.8,
      height * 0.2,
      0,
      width * 0.8,
      height * 0.2,
      width * 0.55
    );
    rightSpot.addColorStop(0, "rgba(255,255,255,1)");
    rightSpot.addColorStop(1, "rgba(255,255,255,0)");
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.16 * intensity;
    ctx.fillStyle = rightSpot;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  if (mode === "showcase") {
    const warmAmbient = ctx.createLinearGradient(0, 0, 0, height);
    warmAmbient.addColorStop(0, "rgba(255,248,232,0.72)");
    warmAmbient.addColorStop(0.6, "rgba(255,240,214,0.22)");
    warmAmbient.addColorStop(1, "rgba(255,230,200,0)");
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.22 * intensity;
    ctx.fillStyle = warmAmbient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    const glassLeft = ctx.createLinearGradient(0, 0, width * 0.35, height);
    glassLeft.addColorStop(0, "rgba(255,255,255,0)");
    glassLeft.addColorStop(0.38, "rgba(255,255,255,0.95)");
    glassLeft.addColorStop(0.55, "rgba(255,255,255,0.35)");
    glassLeft.addColorStop(1, "rgba(255,255,255,0)");
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.2 * intensity;
    ctx.fillStyle = glassLeft;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    const glassRight = ctx.createLinearGradient(width * 0.65, 0, width, height);
    glassRight.addColorStop(0, "rgba(255,255,255,0)");
    glassRight.addColorStop(0.45, "rgba(255,255,255,0.8)");
    glassRight.addColorStop(0.62, "rgba(255,255,255,0.24)");
    glassRight.addColorStop(1, "rgba(255,255,255,0)");
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.16 * intensity;
    ctx.fillStyle = glassRight;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    const shelfGlow = ctx.createRadialGradient(
      width * 0.5,
      height * 0.92,
      0,
      width * 0.5,
      height * 0.92,
      width * 0.55
    );
    shelfGlow.addColorStop(0, "rgba(255,230,180,0.72)");
    shelfGlow.addColorStop(1, "rgba(255,220,165,0)");
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.18 * intensity;
    ctx.fillStyle = shelfGlow;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  const vignette = ctx.createRadialGradient(
    width * 0.5,
    height * 0.5,
    width * 0.28,
    width * 0.5,
    height * 0.5,
    width * 0.9
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,1)");
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = (mode === "showcase" ? 0.24 : 0.14) * intensity;
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

const REFERENCE_TARGETS = [
  { id: "white-gold-a", label: "Beyaz Altin A", hex: "#E7E2D7", metalTone: "white-gold" },
  { id: "white-gold-b", label: "Beyaz Altin B", hex: "#ECE8DE", metalTone: "white-gold" },
  { id: "silver", label: "Gumus", hex: "#C8CCD2", metalTone: "silver" },
  { id: "rose-gold-a", label: "Rose Gold A", hex: "#C9836E", metalTone: "rose-gold" },
  { id: "rose-gold-b", label: "Rose Gold B", hex: "#D6917A", metalTone: "rose-gold" },
  { id: "green-gold", label: "Yesil Altin", hex: "#B4A56A", metalTone: "green-gold" },
  { id: "yellow-gold", label: "Sari Altin", hex: "#D4AF37", metalTone: "yellow-gold" },
  { id: "gold-18k", label: "18 Ayar Altin", hex: "#C9A227", metalTone: "gold-18k" },
] as const;

const BTN_BASE =
  "inline-flex min-h-11 items-center justify-center rounded-lg border px-3 py-2 text-sm font-semibold transition-[transform,box-shadow,background-color,border-color,color] duration-150 ease-out active:translate-y-px active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b76e79]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#141414] disabled:cursor-not-allowed disabled:opacity-50";
const BTN_NEUTRAL = `${BTN_BASE} border-white/15 bg-white/[0.03] text-foreground hover:border-[#b76e79]/40 hover:bg-[#b76e79]/10`;
const BTN_TOGGLE_ACTIVE = `${BTN_BASE} border-[#b76e79] bg-[#b76e79]/15 text-[#b76e79] shadow-[0_0_0_1px_rgba(183,110,121,0.25)_inset]`;
const BTN_CARD =
  "rounded-lg border bg-black/20 p-2 text-left transition-[transform,box-shadow,background-color,border-color] duration-150 ease-out active:translate-y-px active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b76e79]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#141414] disabled:cursor-not-allowed disabled:opacity-50";

type T = {
  removeBackground: string;
  removingBackground: string;
  removeBackgroundHint: string;
  uploadImage: string;
  uploadImageHint: string;
  downloadImage: string;
};

export function RemauraBackgroundRemovalSection({ t }: { t: T }) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [exportFileName, setExportFileName] = useState("urun-gorsel");
  const [bgError, setBgError] = useState<string | null>(null);
  const [contrast, setContrast] = useState(100);
  const [brightness, setBrightness] = useState(100);
  const [soften, setSoften] = useState(0);
  const [tone, setTone] = useState(0);
  const [shine, setShine] = useState(0);
  const [metalTone, setMetalTone] = useState<MetalToneKey>("none");
  const [metalStrength, setMetalStrength] = useState(70);
  const [activeReferenceId, setActiveReferenceId] = useState<string | null>(null);
  const [lightingPreset, setLightingPreset] = useState<keyof typeof LIGHTING_PRESETS | "custom">("custom");
  const [lightingMode, setLightingMode] = useState<"none" | "studio" | "showcase">("none");
  const [includeLightingInExport, setIncludeLightingInExport] = useState(false);
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [comparePos, setComparePos] = useState(50);
  const controlsDisabled = !imageSrc;

  const applyMetalTone = useCallback((nextTone: MetalToneKey) => {
    setMetalTone(nextTone);
    if (nextTone === "none") {
      setContrast(100);
      setBrightness(100);
      setTone(0);
      setSoften(0);
      setShine(0);
      setMetalStrength(70);
      return;
    }
    const preset = METAL_TONES[nextTone];
    setContrast(preset.presetContrast);
    setBrightness(preset.presetBrightness);
    setTone(preset.presetTone);
    setSoften(preset.presetSoften);
    setShine(20);
    setMetalStrength(100);
    trackEvent("metal_tone_select", { tone: nextTone });
  }, []);

  const applyLightingPreset = useCallback(
    (key: keyof typeof LIGHTING_PRESETS) => {
      if (lightingMode === key) {
        setLightingMode("none");
        setLightingPreset("custom");
        trackEvent("lighting_preset_toggle", { preset: key, active: false });
        return;
      }
      const preset = LIGHTING_PRESETS[key];
      setLightingPreset(key);
      setLightingMode(key);
      setContrast(preset.contrast);
      setBrightness(preset.brightness);
      setTone(preset.tone);
      setSoften(preset.soften);
      setShine(preset.shine);
      trackEvent("lighting_preset_toggle", { preset: key, active: true });
    },
    [lightingMode]
  );

  const onFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(file);
    setBgError(null);
    trackEvent("image_upload", { mime: file.type, size: file.size });
  }, []);

  const filterString = useMemo(() => {
    const baseHueRotate = tone * 0.6;
    const baseSaturation = 100 + Math.abs(tone) * 0.35;
    return `contrast(${contrast}%) brightness(${brightness}%) blur(${soften}px) hue-rotate(${baseHueRotate}deg) saturate(${baseSaturation}%)`;
  }, [brightness, contrast, soften, tone]);

  const handleResetAdjustments = useCallback(() => {
    setContrast(100);
    setBrightness(100);
    setSoften(0);
    setTone(0);
    setShine(0);
    setMetalTone("none");
    setMetalStrength(70);
    setActiveReferenceId(null);
    setLightingPreset("custom");
    setLightingMode("none");
  }, []);

  const applyReferenceTarget = useCallback(
    (target: (typeof REFERENCE_TARGETS)[number]) => {
      setActiveReferenceId(target.id);
      applyMetalTone(target.metalTone);
      setLightingMode("none");
      setLightingPreset("custom");
      trackEvent("reference_target_click", { reference_id: target.id, tone: target.metalTone });
    },
    [applyMetalTone]
  );

  const handleDownload = useCallback(async (format: "png" | "jpg") => {
    if (!imageSrc) return;
    const img = new window.Image();
    img.src = imageSrc;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Gorsel yuklenemedi"));
    });

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (format === "jpg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.filter = filterString;
    ctx.drawImage(img, 0, 0);
    if (metalTone !== "none") {
      ctx.save();
      ctx.globalCompositeOperation = "color";
      ctx.globalAlpha = metalStrength / 100;
      ctx.fillStyle = METAL_TONES[metalTone].hex;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
    if (shine > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = Math.min(0.55, shine / 100);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    }
    if (includeLightingInExport) {
      applyLightingToCanvas(
        ctx,
        canvas.width,
        canvas.height,
        lightingMode,
        Math.min(1, Math.max(0, shine / 100))
      );
    }

    await applyWatermark(canvas);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), format === "png" ? "image/png" : "image/jpeg", 0.92);
    });
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeBase = (exportFileName.trim() || "remaura-background-removed")
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
      .slice(0, 80);
    link.download = `${safeBase || "remaura-background-removed"}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    trackEvent("image_download", {
      format,
      include_lighting: includeLightingInExport,
      lighting_mode: lightingMode,
      metal_tone: metalTone,
    });
  }, [exportFileName, filterString, imageSrc, includeLightingInExport, lightingMode, metalStrength, metalTone, shine]);

  const referenceBoard = (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Referans Panosu</p>
      <div className="grid grid-cols-2 gap-2">
        {REFERENCE_TARGETS.map((ref) => {
          const isActive = activeReferenceId === ref.id;
          return (
          <button
            key={ref.label}
            type="button"
            disabled={controlsDisabled}
            aria-pressed={isActive}
            onClick={() => applyReferenceTarget(ref)}
            className={`${BTN_CARD} ${
              isActive
                ? "border-[#b76e79] bg-[#b76e79]/10 shadow-[0_0_0_1px_rgba(183,110,121,0.25)_inset]"
                : "border-white/10 hover:border-[#b76e79]/40"
            }`}
          >
            <div
              className="h-10 w-full rounded-md border border-white/10"
              style={{ background: `linear-gradient(135deg, ${ref.hex}, #2a2a2a)` }}
            />
            <p className="mt-1 truncate text-[10px] font-medium text-foreground" title={ref.label}>
              {ref.label}
            </p>
          </button>
        )})}
      </div>
    </div>
  );

  const lightingOverlayStyle = useMemo(() => {
    const intensity = Math.min(1, Math.max(0, shine / 100));
    if (lightingMode === "studio") {
      return {
        background:
          "radial-gradient(ellipse at 20% 20%, rgba(255,255,255,0.9), transparent 58%), radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.9), transparent 58%), linear-gradient(to bottom, rgba(255,255,255,0.4), transparent 65%)",
        mixBlendMode: "screen" as const,
        opacity: 0.45 * intensity,
      };
    }
    if (lightingMode === "showcase") {
      return {
        background:
          "linear-gradient(110deg, transparent 24%, rgba(255,255,255,0.48) 36%, rgba(255,255,255,0.12) 52%, transparent 66%), linear-gradient(70deg, transparent 48%, rgba(255,255,255,0.28) 58%, transparent 70%), linear-gradient(to bottom, rgba(255,246,222,0.24), transparent 68%), radial-gradient(ellipse at 50% 95%, rgba(255,228,175,0.24), transparent 60%)",
        mixBlendMode: "screen" as const,
        opacity: 0.72 * intensity,
      };
    }
    return null;
  }, [lightingMode, shine]);

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="rounded-3xl border border-white/10 bg-[#141414] p-6 shadow-2xl">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/30 px-6 py-12 transition-colors hover:border-[#b76e79]/40">
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={onFile} />
          <span className="text-center text-sm font-medium text-foreground">{t.uploadImage}</span>
          <span className="mt-1 text-center text-[10px] text-muted">{t.uploadImageHint}</span>
        </label>

        {imageSrc ? (
          <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
            <div className="space-y-4">
              <div className="relative mx-auto h-[min(60vh,480px)] w-full overflow-hidden rounded-xl border border-white/10">
                <Image
                  src={imageSrc}
                  alt=""
                  width={800}
                  height={800}
                  unoptimized
                  className="h-full w-full object-contain"
                  style={{ filter: filterString }}
                />
                {compareEnabled && (
                  <Image
                    src={imageSrc}
                    alt=""
                    width={800}
                    height={800}
                    unoptimized
                    className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                    style={{ clipPath: `polygon(0 0, ${comparePos}% 0, ${comparePos}% 100%, 0 100%)` }}
                  />
                )}
                {shine > 0 && (
                  <Image
                    src={imageSrc}
                    alt=""
                    width={800}
                    height={800}
                    unoptimized
                    className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                    style={{ mixBlendMode: "screen", opacity: Math.min(0.55, shine / 100) }}
                  />
                )}
                {lightingOverlayStyle && (
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={lightingOverlayStyle}
                  />
                )}
                {metalTone !== "none" && (
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      backgroundColor: METAL_TONES[metalTone].hex,
                      opacity: metalStrength / 100,
                      mixBlendMode: "color",
                      WebkitMaskImage: `url(${imageSrc})`,
                      maskImage: `url(${imageSrc})`,
                      WebkitMaskRepeat: "no-repeat",
                      maskRepeat: "no-repeat",
                      WebkitMaskPosition: "center",
                      maskPosition: "center",
                      WebkitMaskSize: "contain",
                      maskSize: "contain",
                    }}
                  />
                )}
                {compareEnabled && (
                  <div
                    className="pointer-events-none absolute bottom-0 top-0 w-px bg-[#b76e79]"
                    style={{ left: `${comparePos}%` }}
                  />
                )}
                <RemauraWatermarkOverlay />
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <button
                  type="button"
                  aria-pressed={compareEnabled}
                  onClick={() =>
                    setCompareEnabled((v) => {
                      const next = !v;
                      trackEvent("compare_toggle", { active: next });
                      return next;
                    })
                  }
                  className={`${compareEnabled ? BTN_TOGGLE_ACTIVE : BTN_NEUTRAL} text-xs ${
                    compareEnabled
                      ? ""
                      : ""
                  }`}
                >
                  {compareEnabled ? "Karşılaştırma Açık" : "Once/Sonra Karşılaştır"}
                </button>
                {compareEnabled && (
                  <label className="mt-3 block text-xs text-muted">
                    Bolme cizgisi: <span className="text-foreground">{comparePos}%</span>
                    <input
                      type="range"
                      min={5}
                      max={95}
                      value={comparePos}
                      onChange={(e) => setComparePos(Number(e.target.value))}
                      className="mt-1 w-full"
                    />
                  </label>
                )}
              </div>
              <BackgroundRemoverPanel
                imageSrc={imageSrc}
                onRemoved={(next) => {
                  setImageSrc(next);
                  trackEvent("background_remove_success");
                }}
                onError={(error) => {
                  setBgError(error);
                  trackEvent("background_remove_error", { message: error });
                }}
                t={{
                  removeBackground: t.removeBackground,
                  removingBackground: t.removingBackground,
                  removeBackgroundHint: t.removeBackgroundHint,
                }}
              />
              {bgError && <p className="text-center text-xs text-destructive">{bgError}</p>}
            </div>
            <div>{referenceBoard}</div>
          </div>
        ) : (
          <p className="mt-4 text-center text-xs text-muted">
            Araclari kullanmak icin once bir gorsel yukleyin.
          </p>
        )}
        {!imageSrc && <div className="mt-4">{referenceBoard}</div>}
      </div>

      <aside className="rounded-3xl border border-white/10 bg-[#141414] p-5 shadow-2xl xl:sticky xl:top-8 xl:max-h-[calc(100vh-2.5rem)] xl:overflow-y-auto">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#b76e79]">Görsel Ayarları</p>
        <div className={`grid grid-cols-1 gap-3 rounded-xl border border-white/10 bg-black/20 p-4 sm:grid-cols-2 ${controlsDisabled ? "opacity-60" : ""}`}>
          <p className="sm:col-span-2 text-xs text-muted">
            Metal tonu secimi soldaki <span className="text-foreground">Referans Panosu</span> uzerinden yapilir.
          </p>
          <label className="sm:col-span-2 text-xs text-muted">
            Metal tonu gucu: <span className="text-foreground">{metalStrength}%</span>
            <input
              type="range"
              min={0}
              max={100}
              value={metalStrength}
              disabled={controlsDisabled}
              onChange={(e) => setMetalStrength(Number(e.target.value))}
              className="mt-1 w-full"
            />
          </label>
          <label className="text-xs text-muted">
            Kontrast: <span className="text-foreground">{contrast}%</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="range"
                min={60}
                max={180}
                value={contrast}
                disabled={controlsDisabled}
                onChange={(e) => {
                  setLightingPreset("custom");
                  setContrast(Number(e.target.value));
                }}
                className="w-full"
              />
              <input
                type="number"
                min={60}
                max={180}
                value={contrast}
                disabled={controlsDisabled}
                onChange={(e) => {
                  setLightingPreset("custom");
                  const next = Number(e.target.value);
                  if (!Number.isNaN(next)) setContrast(Math.min(180, Math.max(60, next)));
                }}
                className="w-16 rounded border border-white/15 bg-white/[0.03] px-2 py-1 text-xs text-foreground"
              />
            </div>
          </label>
          <label className="text-xs text-muted">
            Isik: <span className="text-foreground">{brightness}%</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="range"
                min={60}
                max={160}
                value={brightness}
                disabled={controlsDisabled}
                onChange={(e) => {
                  setLightingPreset("custom");
                  setBrightness(Number(e.target.value));
                }}
                className="w-full"
              />
              <input
                type="number"
                min={60}
                max={160}
                value={brightness}
                disabled={controlsDisabled}
                onChange={(e) => {
                  setLightingPreset("custom");
                  const next = Number(e.target.value);
                  if (!Number.isNaN(next)) setBrightness(Math.min(160, Math.max(60, next)));
                }}
                className="w-16 rounded border border-white/15 bg-white/[0.03] px-2 py-1 text-xs text-foreground"
              />
            </div>
          </label>
          <label className="text-xs text-muted">
            Parlaklik: <span className="text-foreground">{shine}%</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={100}
                value={shine}
                disabled={controlsDisabled}
                onChange={(e) => {
                  setLightingPreset("custom");
                  setShine(Number(e.target.value));
                }}
                className="w-full"
              />
              <input
                type="number"
                min={0}
                max={100}
                value={shine}
                disabled={controlsDisabled}
                onChange={(e) => {
                  setLightingPreset("custom");
                  const next = Number(e.target.value);
                  if (!Number.isNaN(next)) setShine(Math.min(100, Math.max(0, next)));
                }}
                className="w-16 rounded border border-white/15 bg-white/[0.03] px-2 py-1 text-xs text-foreground"
              />
            </div>
          </label>
          <label className="text-xs text-muted">
            Kenar yumusatma: <span className="text-foreground">{soften.toFixed(1)}px</span>
            <input
              type="range"
              min={0}
              max={4}
              step={0.1}
              value={soften}
              disabled={controlsDisabled}
              onChange={(e) => {
                setLightingPreset("custom");
                setSoften(Number(e.target.value));
              }}
              className="mt-1 w-full"
            />
          </label>
          <label className="text-xs text-muted">
            Tonlama: <span className="text-foreground">{tone}</span>
            <input
              type="range"
              min={-40}
              max={40}
              value={tone}
              disabled={controlsDisabled}
              onChange={(e) => {
                setLightingPreset("custom");
                setTone(Number(e.target.value));
              }}
              className="mt-1 w-full"
            />
          </label>
          <button
            type="button"
            disabled={controlsDisabled}
            onClick={handleResetAdjustments}
            className={`sm:col-span-2 ${BTN_NEUTRAL} text-xs`}
          >
            Ayarlari Sifirla
          </button>
        </div>
        <div className={`mt-4 rounded-xl border border-white/10 bg-black/20 p-4 ${controlsDisabled ? "opacity-60" : ""}`}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Isik Presetleri</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(Object.keys(LIGHTING_PRESETS) as Array<keyof typeof LIGHTING_PRESETS>).map((key) => (
              <button
                key={key}
                type="button"
                disabled={controlsDisabled}
                aria-pressed={lightingMode === key}
                onClick={() => applyLightingPreset(key)}
                className={`${lightingMode === key ? BTN_TOGGLE_ACTIVE : BTN_NEUTRAL} text-xs ${
                  lightingMode === key
                    ? ""
                    : ""
                }`}
              >
                {LIGHTING_PRESETS[key].label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Dosya Adi</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={exportFileName}
              onChange={(e) => setExportFileName(e.target.value)}
              placeholder="Ornek: yuzuk-vitrin-1"
              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-xs text-foreground placeholder:text-muted"
            />
            <button
              type="button"
              disabled={controlsDisabled}
              onClick={() => void handleDownload("png")}
              className={`${BTN_NEUTRAL} text-xs`}
            >
              PNG Indir
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 rounded-xl border border-white/10 bg-black/20 p-4">
          <label className="mb-1 flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={includeLightingInExport}
              onChange={(e) => setIncludeLightingInExport(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-transparent accent-[#b76e79]"
            />
            Indirmede isik efektlerini uygula
          </label>
          <button
            type="button"
            disabled={controlsDisabled}
            onClick={() => void handleDownload("png")}
            className={BTN_NEUTRAL}
          >
            {t.downloadImage} (PNG - Seffaf)
          </button>
          <button
            type="button"
            disabled={controlsDisabled}
            onClick={() => void handleDownload("jpg")}
            className={BTN_NEUTRAL}
          >
            {t.downloadImage} (JPG - Beyaz)
          </button>
        </div>
      </aside>
    </div>
  );
}
