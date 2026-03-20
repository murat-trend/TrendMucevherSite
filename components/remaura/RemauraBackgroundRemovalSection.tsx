"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { BackgroundRemoverPanel } from "@/components/remaura/BackgroundRemoverPanel";

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
  const [bgError, setBgError] = useState<string | null>(null);
  const [contrast, setContrast] = useState(100);
  const [brightness, setBrightness] = useState(100);
  const [soften, setSoften] = useState(0);
  const [tone, setTone] = useState(0);
  const [metalTone, setMetalTone] = useState<MetalToneKey>("none");
  const [metalStrength, setMetalStrength] = useState(70);
  const controlsDisabled = !imageSrc;

  const applyMetalTone = useCallback((nextTone: MetalToneKey) => {
    setMetalTone(nextTone);
    if (nextTone === "none") {
      setContrast(100);
      setBrightness(100);
      setTone(0);
      setSoften(0);
      setMetalStrength(70);
      return;
    }
    const preset = METAL_TONES[nextTone];
    setContrast(preset.presetContrast);
    setBrightness(preset.presetBrightness);
    setTone(preset.presetTone);
    setSoften(preset.presetSoften);
    setMetalStrength(100);
  }, []);

  const onFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(file);
    setBgError(null);
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
    setMetalTone("none");
    setMetalStrength(70);
  }, []);

  const handleDownload = useCallback(async () => {
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

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/png");
    });
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "remaura-background-removed.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filterString, imageSrc, metalStrength, metalTone]);

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="rounded-3xl border border-white/10 bg-[#141414] p-6 shadow-2xl">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/30 px-6 py-12 transition-colors hover:border-[#b76e79]/40">
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={onFile} />
          <span className="text-center text-sm font-medium text-foreground">{t.uploadImage}</span>
          <span className="mt-1 text-center text-[10px] text-muted">{t.uploadImageHint}</span>
        </label>

        {imageSrc ? (
          <div className="mt-6 space-y-4">
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
              {metalTone !== "none" && (
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundColor: METAL_TONES[metalTone].hex,
                    mixBlendMode: "color",
                    opacity: metalStrength / 100,
                  }}
                />
              )}
            </div>
            <BackgroundRemoverPanel
              imageSrc={imageSrc}
              onRemoved={(next) => setImageSrc(next)}
              onError={setBgError}
              t={{
                removeBackground: t.removeBackground,
                removingBackground: t.removingBackground,
                removeBackgroundHint: t.removeBackgroundHint,
              }}
            />
            <button
              type="button"
              onClick={handleDownload}
              className="w-full rounded-lg border border-white/15 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-[#b76e79]/40 hover:bg-[#b76e79]/10"
            >
              {t.downloadImage}
            </button>
            {bgError && <p className="text-center text-xs text-destructive">{bgError}</p>}
          </div>
        ) : (
          <p className="mt-4 text-center text-xs text-muted">
            Araclari kullanmak icin once bir gorsel yukleyin.
          </p>
        )}
      </div>

      <aside className="rounded-3xl border border-white/10 bg-[#141414] p-5 shadow-2xl xl:sticky xl:top-8">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#b76e79]">Gorsel Ayarlari</p>
        <div className={`grid grid-cols-1 gap-3 rounded-xl border border-white/10 bg-black/20 p-4 sm:grid-cols-2 ${controlsDisabled ? "opacity-60" : ""}`}>
          <div className="sm:col-span-2">
            <p className="mb-2 text-xs text-muted">Metal tonu</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={controlsDisabled}
                onClick={() => applyMetalTone("none")}
                className={`rounded-md border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                  metalTone === "none"
                    ? "border-[#b76e79] bg-[#b76e79]/15 text-[#b76e79]"
                    : "border-white/15 bg-white/[0.03] text-foreground hover:border-white/30"
                }`}
              >
                Orijinal
              </button>
              {(Object.keys(METAL_TONES) as Array<Exclude<MetalToneKey, "none">>).map((key) => (
                <button
                  key={key}
                  type="button"
                  disabled={controlsDisabled}
                  onClick={() => applyMetalTone(key)}
                  className={`rounded-md border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                    metalTone === key
                      ? "border-[#b76e79] bg-[#b76e79]/15 text-[#b76e79]"
                      : "border-white/15 bg-white/[0.03] text-foreground hover:border-white/30"
                  }`}
                >
                  {METAL_TONES[key].label}
                </button>
              ))}
            </div>
          </div>
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
            <input
              type="range"
              min={60}
              max={180}
              value={contrast}
              disabled={controlsDisabled}
              onChange={(e) => setContrast(Number(e.target.value))}
              className="mt-1 w-full"
            />
          </label>
          <label className="text-xs text-muted">
            Isik: <span className="text-foreground">{brightness}%</span>
            <input
              type="range"
              min={60}
              max={160}
              value={brightness}
              disabled={controlsDisabled}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="mt-1 w-full"
            />
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
              onChange={(e) => setSoften(Number(e.target.value))}
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
              onChange={(e) => setTone(Number(e.target.value))}
              className="mt-1 w-full"
            />
          </label>
          <button
            type="button"
            disabled={controlsDisabled}
            onClick={handleResetAdjustments}
            className="sm:col-span-2 rounded-lg border border-white/15 bg-white/[0.03] px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:border-white/30"
          >
            Ayarlari Sifirla
          </button>
        </div>
      </aside>
    </div>
  );
}
