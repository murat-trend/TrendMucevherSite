"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { BackgroundRemoverPanel } from "@/components/remaura/BackgroundRemoverPanel";

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

  const onFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(file);
    setBgError(null);
  }, []);

  const filterString = useMemo(() => {
    const hueRotate = tone * 0.6;
    const saturation = 100 + Math.abs(tone) * 0.35;
    return `contrast(${contrast}%) brightness(${brightness}%) blur(${soften}px) hue-rotate(${hueRotate}deg) saturate(${saturation}%)`;
  }, [brightness, contrast, soften, tone]);

  const handleResetAdjustments = useCallback(() => {
    setContrast(100);
    setBrightness(100);
    setSoften(0);
    setTone(0);
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
  }, [filterString, imageSrc]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="rounded-3xl border border-white/10 bg-[#141414] p-6 shadow-2xl">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/30 px-6 py-12 transition-colors hover:border-[#b76e79]/40">
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={onFile} />
          <span className="text-center text-sm font-medium text-foreground">{t.uploadImage}</span>
          <span className="mt-1 text-center text-[10px] text-muted">{t.uploadImageHint}</span>
        </label>

        {imageSrc && (
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
            </div>
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-white/10 bg-black/20 p-4 sm:grid-cols-2">
              <label className="text-xs text-muted">
                Kontrast: <span className="text-foreground">{contrast}%</span>
                <input
                  type="range"
                  min={60}
                  max={180}
                  value={contrast}
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
                  onChange={(e) => setTone(Number(e.target.value))}
                  className="mt-1 w-full"
                />
              </label>
              <button
                type="button"
                onClick={handleResetAdjustments}
                className="sm:col-span-2 rounded-lg border border-white/15 bg-white/[0.03] px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:border-white/30"
              >
                Ayarlari Sifirla
              </button>
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
        )}
      </div>
    </div>
  );
}
