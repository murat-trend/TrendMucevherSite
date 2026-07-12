/*
 * FOTO MOTORU — boru hattı orkestrasyonu.
 * Pahalı adım (arka plan kesimi) bir kez koşar ve önbelleğe alınır;
 * ayar değişiklikleri yalnızca hızlı adımları yeniden koşar.
 */
import {
  analyzeImage,
  applyBaseEnhance,
  applyDenoise,
  applyMetalTone,
  applySharpen,
  composeScene,
  defringeAlpha,
  type AutoAnalysis,
  type BackdropKey,
  type EnhanceSettings,
  type FrameMode,
  type MetalSettings,
} from "./engine";

const MAX_PROCESS_SIZE = 2048;

function make2d(width: number, height: number): CanvasRenderingContext2D {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas 2d desteklenmiyor");
  return ctx;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Görsel okunamadı."));
    img.src = src;
  });
}

/**
 * Görseli işleme boyutuna indirir (büyük telefon fotoğrafları için).
 * 0.5x altı oranlarda kademeli (yarıya-yarıya) küçültme: tek adımlı bilinear
 * örnek atlayıp ince telleri kesikli bırakır — kademeli küçültme detayı korur.
 */
export function toWorkCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const scale = Math.min(1, MAX_PROCESS_SIZE / Math.max(img.width, img.height));
  const targetW = Math.round(img.width * scale);
  const targetH = Math.round(img.height * scale);

  let source: HTMLImageElement | HTMLCanvasElement = img;
  let w = img.width;
  let h = img.height;
  while (w / 2 >= targetW && h / 2 >= targetH) {
    w = Math.round(w / 2);
    h = Math.round(h / 2);
    const step = make2d(w, h);
    step.imageSmoothingQuality = "high";
    step.drawImage(source, 0, 0, w, h);
    source = step.canvas;
  }

  const ctx = make2d(targetW, targetH);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, targetW, targetH);
  return ctx.canvas;
}

/**
 * PAHALI ADIM — arka plan kesimi (bir kez koşar).
 * Motor tarayıcıda çalışır; ilk kullanımda model iner.
 */
export async function cutoutProduct(source: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  const { removeBackground } = await import("@imgly/background-removal");
  const blob = await removeBackground(source.toDataURL("image/png"));
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const ctx = make2d(img.width, img.height);
    ctx.drawImage(img, 0, 0);
    defringeAlpha(ctx);
    return ctx.canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export type RenderOptions = {
  enhance: EnhanceSettings;
  metal: MetalSettings;
  backdrop: BackdropKey;
  shadow: boolean;
  frame: FrameMode;
  /** true → kesilmiş ürün + sahne; false → kesimsiz, yalnız iyileştirme */
  useCutout: boolean;
};

export type PipelineCache = {
  work: HTMLCanvasElement;
  analysis: AutoAnalysis;
  cutout: HTMLCanvasElement | null;
};

export async function preparePipeline(dataUrl: string): Promise<PipelineCache> {
  const img = await loadImage(dataUrl);
  const work = toWorkCanvas(img);
  const ctx = work.getContext("2d", { willReadFrequently: true })!;
  const analysis = analyzeImage(ctx.getImageData(0, 0, work.width, work.height));
  return { work, analysis, cutout: null };
}

/**
 * HIZLI ADIMLAR — her ayar değişiminde koşar (~100-300ms).
 * Kaynak: kesim varsa kesilmiş ürün, yoksa orijinal çalışma tuvali.
 */
export function renderScene(cache: PipelineCache, options: RenderOptions): HTMLCanvasElement {
  const source = options.useCutout && cache.cutout ? cache.cutout : cache.work;
  const ctx = make2d(source.width, source.height);
  ctx.drawImage(source, 0, 0);

  const imgData = ctx.getImageData(0, 0, source.width, source.height);
  applyBaseEnhance(imgData, cache.analysis, options.enhance);
  applyMetalTone(imgData, options.metal);
  ctx.putImageData(imgData, 0, 0);

  applyDenoise(ctx, options.enhance.denoise);
  applySharpen(ctx, options.enhance.sharpness);

  if (options.useCutout && cache.cutout) {
    return composeScene(ctx.canvas, {
      backdrop: options.backdrop,
      shadow: options.shadow,
      frame: options.frame,
    });
  }
  return ctx.canvas;
}
