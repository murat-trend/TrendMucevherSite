"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  remauraHandleBillingApiResponse,
  useRemauraBillingModal,
} from "@/components/remaura/RemauraBillingModalProvider";
import { RemauraWatermarkOverlay } from "@/components/remaura/RemauraWatermarkOverlay";
import { createClient } from "@/utils/supabase/client";
import { applyWatermark } from "@/lib/remaura/apply-rem-watermark";

type RemauraPhotoEditSectionText = {
  title: string;
  hint: string;
  uploadImage: string;
  uploadImageHint: string;
  clearImage: string;
  downloadImage: string;
  resetAdjustments: string;
  noImage: string;
};

type RemauraPhotoEditSectionProps = {
  t: RemauraPhotoEditSectionText;
};

const SLIDER_BASE =
  "w-full accent-[#b76e79] disabled:cursor-not-allowed disabled:opacity-40";

type OutputFormat = "square" | "portrait" | "story";

const OUTPUT_SIZES: Record<OutputFormat, { w: number; h: number; label: string }> = {
  square: { w: 1080, h: 1080, label: "1:1 Katalog" },
  portrait: { w: 1080, h: 1350, label: "4:5 E-Ticaret" },
  story: { w: 1080, h: 1920, label: "9:16 Reels/TikTok" },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function applyHighlightCompression(channel: number, amount: number) {
  if (amount <= 0) return channel;
  const normalized = channel / 255;
  if (normalized < 0.72) return channel;
  const t = (normalized - 0.72) / 0.28;
  const compressed = normalized - t * t * amount * 0.22;
  return Math.round(clamp(compressed * 255, 0, 255));
}

function applyDetailEnhance(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  amount: number,
  radiusPx: number
) {
  if (amount <= 0) return;

  const base = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const blurCanvas = document.createElement("canvas");
  blurCanvas.width = canvas.width;
  blurCanvas.height = canvas.height;
  const blurCtx = blurCanvas.getContext("2d");
  if (!blurCtx) return;

  blurCtx.filter = `blur(${radiusPx}px)`;
  blurCtx.drawImage(canvas, 0, 0);
  const blurred = blurCtx.getImageData(0, 0, canvas.width, canvas.height);

  const out = base.data;
  const blurData = blurred.data;

  for (let i = 0; i < out.length; i += 4) {
    const r = out[i] ?? 0;
    const g = out[i + 1] ?? 0;
    const b = out[i + 2] ?? 0;
    const br = blurData[i] ?? 0;
    const bg = blurData[i + 1] ?? 0;
    const bb = blurData[i + 2] ?? 0;

    out[i] = clamp(Math.round(r + (r - br) * amount), 0, 255);
    out[i + 1] = clamp(Math.round(g + (g - bg) * amount), 0, 255);
    out[i + 2] = clamp(Math.round(b + (b - bb) * amount), 0, 255);
  }

  ctx.putImageData(base, 0, 0);
}

function applyMetalReflectionLayer(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  opts: {
    reflectionStrength: number;
    edgeSpecular: number;
    specularRolloff: number;
  },
  reflectionMap: HTMLImageElement | null,
  baseBeforeReflection: ImageData | null,
  fogSuppression: number
) {
  const reflectionAlpha = clamp(opts.reflectionStrength / 100, 0, 1);
  const edgeAlpha = clamp(opts.edgeSpecular / 100, 0, 1);
  const rolloff = clamp(opts.specularRolloff / 100, 0, 1);

  if (reflectionMap) {
    const ratio = Math.max(canvas.width / reflectionMap.naturalWidth, canvas.height / reflectionMap.naturalHeight);
    const rw = reflectionMap.naturalWidth * ratio;
    const rh = reflectionMap.naturalHeight * ratio;
    const rx = (canvas.width - rw) / 2;
    const ry = (canvas.height - rh) / 2;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.15 + reflectionAlpha * 0.45;
    ctx.drawImage(reflectionMap, rx, ry, rw, rh);
    ctx.restore();
  } else {
    // Procedural strip reflections for metallic look without a reflection map.
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.08 + reflectionAlpha * 0.28;
    const g1 = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    g1.addColorStop(0.08, "rgba(255,255,255,0.0)");
    g1.addColorStop(0.24, "rgba(255,255,255,0.55)");
    g1.addColorStop(0.34, "rgba(255,255,255,0.0)");
    g1.addColorStop(0.66, "rgba(255,255,255,0.45)");
    g1.addColorStop(0.78, "rgba(255,255,255,0.0)");
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  // Glancing angle boost: edges catch more light on polished metal.
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.08 + edgeAlpha * 0.22;
  const edgeGrad = ctx.createRadialGradient(
    canvas.width * 0.5,
    canvas.height * 0.5,
    Math.min(canvas.width, canvas.height) * 0.22,
    canvas.width * 0.5,
    canvas.height * 0.5,
    Math.max(canvas.width, canvas.height) * 0.8
  );
  edgeGrad.addColorStop(0.0, "rgba(255,255,255,0.0)");
  edgeGrad.addColorStop(0.62, "rgba(255,255,255,0.0)");
  edgeGrad.addColorStop(1.0, "rgba(255,255,255,0.9)");
  ctx.fillStyle = edgeGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  if (rolloff > 0) {
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = frame.data;
    for (let i = 0; i < px.length; i += 4) {
      px[i] = applyHighlightCompression(px[i] ?? 0, rolloff * 0.8);
      px[i + 1] = applyHighlightCompression(px[i + 1] ?? 0, rolloff * 0.8);
      px[i + 2] = applyHighlightCompression(px[i + 2] ?? 0, rolloff * 0.8);
    }
    ctx.putImageData(frame, 0, 0);
  }

  // Reduce env haze on near-white/low-saturation background areas.
  if (fogSuppression > 0 && baseBeforeReflection) {
    const after = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const out = after.data;
    const base = baseBeforeReflection.data;
    const s = clamp(fogSuppression, 0, 1);

    for (let i = 0; i < out.length; i += 4) {
      const br = base[i] ?? 0;
      const bg = base[i + 1] ?? 0;
      const bb = base[i + 2] ?? 0;
      const ba = base[i + 3] ?? 0;
      if (ba < 8) continue;

      const max = Math.max(br, bg, bb);
      const min = Math.min(br, bg, bb);
      const sat = max === 0 ? 0 : (max - min) / max;
      const lum = (0.2126 * br + 0.7152 * bg + 0.0722 * bb) / 255;

      const isLikelyBackground = lum > 0.78 && sat < 0.14;
      if (!isLikelyBackground) continue;

      const bgWeight = clamp(((lum - 0.78) / 0.22) * ((0.14 - sat) / 0.14), 0, 1) * s;
      out[i] = Math.round((out[i] ?? 0) * (1 - bgWeight) + br * bgWeight);
      out[i + 1] = Math.round((out[i + 1] ?? 0) * (1 - bgWeight) + bg * bgWeight);
      out[i + 2] = Math.round((out[i + 2] ?? 0) * (1 - bgWeight) + bb * bgWeight);
    }

    ctx.putImageData(after, 0, 0);
  }
}

async function convertExrFileToDataUrl(file: File): Promise<string> {
  const [{ EXRLoader }] = await Promise.all([import("three/examples/jsm/loaders/EXRLoader.js")]);
  const loader = new EXRLoader();
  const objectUrl = URL.createObjectURL(file);
  let texture: {
    image: {
      data: Float32Array | Uint16Array;
      width: number;
      height: number;
    };
    dispose: () => void;
  } | null = null;

  try {
    texture = (await loader.loadAsync(objectUrl)) as unknown as {
      image: {
        data: Float32Array | Uint16Array;
        width: number;
        height: number;
      };
      dispose: () => void;
    };
  } catch {
    // Fallback for EXR files that fail via loadAsync in some builds.
    const buffer = await file.arrayBuffer();
    texture = loader.parse(buffer) as unknown as {
      image: {
        data: Float32Array | Uint16Array;
        width: number;
        height: number;
      };
      dispose: () => void;
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  if (!texture?.image?.data || !texture.image.width || !texture.image.height) {
    throw new Error("Invalid EXR texture");
  }

  const image = texture.image as {
    data: Float32Array | Uint16Array;
    width: number;
    height: number;
  };

  const width = image.width;
  const height = image.height;
  const src = image.data;
  const pxCount = width * height;
  const channelCount = Math.max(3, Math.min(4, Math.round(src.length / Math.max(1, pxCount))));
  const hasAlpha = channelCount >= 4;
  const out = new Uint8ClampedArray(width * height * 4);

  let lumSum = 0;
  for (let i = 0; i < pxCount; i += 1) {
    const srcIdx = i * channelCount;
    const r = Number(src[srcIdx] ?? 0);
    const g = Number(src[srcIdx + 1] ?? r);
    const b = Number(src[srcIdx + 2] ?? r);
    lumSum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  const avgLum = lumSum / Math.max(1, pxCount);
  const exposure = 0.65 / Math.max(0.0001, avgLum);

  for (let i = 0; i < pxCount; i += 1) {
    const srcIdx = i * channelCount;
    const outIdx = i * 4;
    const r = Number(src[srcIdx] ?? 0);
    const g = Number(src[srcIdx + 1] ?? r);
    const b = Number(src[srcIdx + 2] ?? r);
    const a = hasAlpha ? Number(src[srcIdx + 3] ?? 1) : 1;

    const mapChannel = (v: number) => {
      const toneMapped = 1 - Math.exp(-Math.max(0, v) * exposure);
      return Math.round(clamp(Math.pow(toneMapped, 1 / 2.2) * 255, 0, 255));
    };

    out[outIdx] = mapChannel(r);
    out[outIdx + 1] = mapChannel(g);
    out[outIdx + 2] = mapChannel(b);
    out[outIdx + 3] = Math.round(clamp(a * 255, 0, 255));
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("EXR conversion failed");
  const imgData = new ImageData(out, width, height);
  ctx.putImageData(imgData, 0, 0);

  texture.dispose();
  return canvas.toDataURL("image/png");
}

async function convertHdrFileToDataUrl(file: File): Promise<string> {
  const [{ RGBELoader }] = await Promise.all([import("three/examples/jsm/loaders/RGBELoader.js")]);
  const loader = new RGBELoader();
  const objectUrl = URL.createObjectURL(file);
  let texture: {
    image: {
      data: Float32Array | Uint16Array | Uint8Array;
      width: number;
      height: number;
    };
    dispose: () => void;
  } | null = null;

  try {
    texture = (await loader.loadAsync(objectUrl)) as unknown as {
      image: {
        data: Float32Array | Uint16Array | Uint8Array;
        width: number;
        height: number;
      };
      dispose: () => void;
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  if (!texture?.image?.data || !texture.image.width || !texture.image.height) {
    throw new Error("Invalid HDR texture");
  }

  const image = texture.image;
  const width = image.width;
  const height = image.height;
  const src = image.data;
  const pxCount = width * height;
  const channelCount = Math.max(3, Math.min(4, Math.round(src.length / Math.max(1, pxCount))));
  const out = new Uint8ClampedArray(width * height * 4);

  let lumSum = 0;
  for (let i = 0; i < pxCount; i += 1) {
    const srcIdx = i * channelCount;
    const r = Number(src[srcIdx] ?? 0);
    const g = Number(src[srcIdx + 1] ?? r);
    const b = Number(src[srcIdx + 2] ?? r);
    lumSum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  const avgLum = lumSum / Math.max(1, pxCount);
  const exposure = 0.65 / Math.max(0.0001, avgLum);

  for (let i = 0; i < pxCount; i += 1) {
    const srcIdx = i * channelCount;
    const outIdx = i * 4;
    const r = Number(src[srcIdx] ?? 0);
    const g = Number(src[srcIdx + 1] ?? r);
    const b = Number(src[srcIdx + 2] ?? r);
    const mapChannel = (v: number) => {
      const toneMapped = 1 - Math.exp(-Math.max(0, v) * exposure);
      return Math.round(clamp(Math.pow(toneMapped, 1 / 2.2) * 255, 0, 255));
    };
    out[outIdx] = mapChannel(r);
    out[outIdx + 1] = mapChannel(g);
    out[outIdx + 2] = mapChannel(b);
    out[outIdx + 3] = 255;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("HDR conversion failed");
  ctx.putImageData(new ImageData(out, width, height), 0, 0);
  texture.dispose();
  return canvas.toDataURL("image/png");
}

export function RemauraPhotoEditSection({ t }: RemauraPhotoEditSectionProps) {
  const billingUi = useRemauraBillingModal();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturate, setSaturate] = useState(100);
  const [sharpness, setSharpness] = useState(0);
  const [clarity, setClarity] = useState(0);
  const [noiseReduction, setNoiseReduction] = useState(0);
  const [highlightProtect, setHighlightProtect] = useState(0);
  const [metalRealismEnabled, setMetalRealismEnabled] = useState(false);
  const [reflectionMapSrc, setReflectionMapSrc] = useState<string | null>(null);
  const [reflectionReferenceEnabled, setReflectionReferenceEnabled] = useState(false);
  const [reflectionStrength, setReflectionStrength] = useState(40);
  const [edgeSpecular, setEdgeSpecular] = useState(45);
  const [specularRolloff, setSpecularRolloff] = useState(28);
  const [hideEnvFog, setHideEnvFog] = useState(true);
  const [reflectionMapError, setReflectionMapError] = useState<string | null>(null);
  const [sceneEnvFile, setSceneEnvFile] = useState<File | null>(null);
  const [syncEnvToReflection, setSyncEnvToReflection] = useState(true);
  const [whiteBackground, setWhiteBackground] = useState(true);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("portrait");
  const [zoom, setZoom] = useState(100);
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [comparePos, setComparePos] = useState(50);
  const reflectionInputRef = useRef<HTMLInputElement | null>(null);
  const sceneEnvInputRef = useRef<HTMLInputElement | null>(null);
  const mainImageInputRef = useRef<HTMLInputElement | null>(null);

  const getFotoEditAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const { data: sessionData } = await createClient().auth.getSession();
    const token = sessionData.session?.access_token;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, []);

  const verifyFotoEditCreditsOnServer = useCallback(async (): Promise<boolean> => {
    let res: Response;
    try {
      res = await fetch("/api/remaura/foto-edit/verify-credits", {
        method: "POST",
        headers: await getFotoEditAuthHeaders(),
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({}),
      });
    } catch {
      billingUi.openInsufficientCredits();
      return false;
    }
    if (!res.ok) {
      if (await remauraHandleBillingApiResponse(res, billingUi)) return false;
      billingUi.openInsufficientCredits();
      return false;
    }
    let body: { ok?: boolean };
    try {
      body = (await res.json()) as { ok?: boolean };
    } catch {
      billingUi.openInsufficientCredits();
      return false;
    }
    if (!body.ok) {
      billingUi.openInsufficientCredits();
      return false;
    }
    return true;
  }, [billingUi, getFotoEditAuthHeaders]);

  const controlsDisabled = !imageSrc;

  const filterString = useMemo(
    () =>
      `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) blur(0px)`,
    [brightness, contrast, saturate]
  );

  const onFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const file = input.files?.[0];
      if (!file || !file.type.startsWith("image/")) {
        input.value = "";
        return;
      }
      void (async () => {
        const ok = await verifyFotoEditCreditsOnServer();
        if (!ok) {
          input.value = "";
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          setImageSrc(reader.result as string);
          setZoom(100);
        };
        reader.readAsDataURL(file);
      })();
    },
    [verifyFotoEditCreditsOnServer],
  );

  const openMainImagePicker = useCallback(async () => {
    const ok = await verifyFotoEditCreditsOnServer();
    if (!ok) return;
    mainImageInputRef.current?.click();
  }, [verifyFotoEditCreditsOnServer]);

  const openSceneEnvPicker = useCallback(async () => {
    const ok = await verifyFotoEditCreditsOnServer();
    if (!ok) return;
    sceneEnvInputRef.current?.click();
  }, [verifyFotoEditCreditsOnServer]);

  const openReflectionPicker = useCallback(async () => {
    const ok = await verifyFotoEditCreditsOnServer();
    if (!ok) return;
    reflectionInputRef.current?.click();
  }, [verifyFotoEditCreditsOnServer]);

  const resetAdjustments = useCallback(() => {
    setBrightness(100);
    setContrast(100);
    setSaturate(100);
    setSharpness(0);
    setClarity(0);
    setNoiseReduction(0);
    setHighlightProtect(0);
    setMetalRealismEnabled(false);
    setReflectionMapSrc(null);
    setReflectionReferenceEnabled(false);
    setReflectionStrength(40);
    setEdgeSpecular(45);
    setSpecularRolloff(28);
    setHideEnvFog(true);
    setSceneEnvFile(null);
    setSyncEnvToReflection(true);
    setWhiteBackground(true);
    setOutputFormat("portrait");
    setZoom(100);
    setCompareEnabled(false);
    setComparePos(50);
  }, []);

  const clearImage = useCallback(() => {
    setImageSrc(null);
    setReflectionMapSrc(null);
    setReflectionReferenceEnabled(false);
    setSceneEnvFile(null);
    resetAdjustments();
  }, [resetAdjustments]);

  const onReflectionMapFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const file = input.files?.[0];
      if (!file) return;
      const isImageType = file.type.startsWith("image/");
      const isExrByExt = /\.exr$/i.test(file.name);
      const isHdrByExt = /\.hdr$/i.test(file.name);
      if (!isImageType && !isExrByExt && !isHdrByExt) {
        input.value = "";
        return;
      }

      void (async () => {
        const creditOk = await verifyFotoEditCreditsOnServer();
        if (!creditOk) {
          input.value = "";
          return;
        }

        setReflectionMapError(null);

        if (isExrByExt) {
          try {
            const dataUrl = await convertExrFileToDataUrl(file);
            setReflectionMapSrc(dataUrl);
            setReflectionReferenceEnabled(true);
            setMetalRealismEnabled(true);
          } catch {
            setReflectionMapError("EXR dosyası okunamadı. Lütfen başka bir EXR deneyin.");
          }
          return;
        }

        if (isHdrByExt) {
          try {
            const dataUrl = await convertHdrFileToDataUrl(file);
            setReflectionMapSrc(dataUrl);
            setReflectionReferenceEnabled(true);
            setMetalRealismEnabled(true);
          } catch {
            setReflectionMapError("HDR dosyası okunamadı. Lütfen başka bir HDR deneyin.");
          }
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          setReflectionMapSrc(reader.result as string);
          setReflectionReferenceEnabled(true);
          setMetalRealismEnabled(true);
        };
        reader.readAsDataURL(file);
      })();
    },
    [verifyFotoEditCreditsOnServer],
  );

  const onSceneEnvFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const file = input.files?.[0];
      if (!file) return;
      const typeAllowed =
        file.type.startsWith("image/") || /\.exr$/i.test(file.name) || /\.hdr$/i.test(file.name);
      if (!typeAllowed) {
        input.value = "";
        return;
      }

      void (async () => {
        const creditOk = await verifyFotoEditCreditsOnServer();
        if (!creditOk) {
          input.value = "";
          return;
        }

        setSceneEnvFile(file);

        if (!syncEnvToReflection) return;
        setReflectionMapError(null);

        if (/\.exr$/i.test(file.name)) {
          try {
            const dataUrl = await convertExrFileToDataUrl(file);
            setReflectionMapSrc(dataUrl);
            setReflectionReferenceEnabled(true);
            setMetalRealismEnabled(true);
          } catch {
            setReflectionMapError("EXR ortam ışığı yansıma haritasına dönüştürülemedi.");
          }
          return;
        }

        if (/\.hdr$/i.test(file.name)) {
          try {
            const dataUrl = await convertHdrFileToDataUrl(file);
            setReflectionMapSrc(dataUrl);
            setReflectionReferenceEnabled(true);
            setMetalRealismEnabled(true);
          } catch {
            setReflectionMapError("HDR ortam ışığı yansıma haritasına dönüştürülemedi.");
          }
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          setReflectionMapSrc(reader.result as string);
          setReflectionReferenceEnabled(true);
          setMetalRealismEnabled(true);
        };
        reader.readAsDataURL(file);
      })();
    },
    [syncEnvToReflection, verifyFotoEditCreditsOnServer],
  );

  const handleDownload = useCallback(async () => {
    if (!imageSrc) return;

    const debitHeaders = await getFotoEditAuthHeaders();

    let debitRes: Response;
    try {
      debitRes = await fetch("/api/remaura/foto-edit/debit-download", {
        method: "POST",
        headers: debitHeaders,
        credentials: "same-origin",
        body: JSON.stringify({}),
      });
    } catch {
      billingUi.openInsufficientCredits();
      return;
    }

    if (!debitRes.ok) {
      if (await remauraHandleBillingApiResponse(debitRes, billingUi)) return;
      billingUi.openInsufficientCredits();
      return;
    }

    let debitBody: { ok?: boolean };
    try {
      debitBody = (await debitRes.json()) as { ok?: boolean };
    } catch {
      billingUi.openInsufficientCredits();
      return;
    }
    if (!debitBody.ok) {
      billingUi.openInsufficientCredits();
      return;
    }

    const img = new window.Image();
    img.src = imageSrc;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Image load failed"));
    });

    const canvas = document.createElement("canvas");
    const size = OUTPUT_SIZES[outputFormat];
    canvas.width = size.w;
    canvas.height = size.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (whiteBackground) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    const ratio = Math.min(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
    const drawW = img.naturalWidth * ratio;
    const drawH = img.naturalHeight * ratio;
    const drawX = (canvas.width - drawW) / 2;
    const drawY = (canvas.height - drawH) / 2;

    const denoisePx = noiseReduction > 0 ? Math.max(0, noiseReduction / 45) : 0;
    ctx.filter = `${filterString} ${denoisePx > 0 ? `blur(${denoisePx.toFixed(2)}px)` : ""}`.trim();
    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    // Highlight compression reduces blown reflections common in jewelry shots.
    if (highlightProtect > 0) {
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const px = frame.data;
      const amount = highlightProtect / 100;
      for (let i = 0; i < px.length; i += 4) {
        px[i] = applyHighlightCompression(px[i] ?? 0, amount);
        px[i + 1] = applyHighlightCompression(px[i + 1] ?? 0, amount);
        px[i + 2] = applyHighlightCompression(px[i + 2] ?? 0, amount);
      }
      ctx.putImageData(frame, 0, 0);
    }

    const detailAmount = clamp((sharpness * 0.008) + (clarity * 0.006), 0, 0.8);
    const detailRadius = clamp(1.1 + (clarity / 100) * 1.3, 1.1, 2.4);
    applyDetailEnhance(canvas, ctx, detailAmount, detailRadius);

    let reflectionMapImg: HTMLImageElement | null = null;
    if (metalRealismEnabled && reflectionMapSrc && reflectionReferenceEnabled) {
      const reflection = new window.Image();
      reflection.src = reflectionMapSrc;
      await new Promise<void>((resolve, reject) => {
        reflection.onload = () => resolve();
        reflection.onerror = () => reject(new Error("Reflection map load failed"));
      });
      reflectionMapImg = reflection;
    }

    if (metalRealismEnabled) {
      const baseBeforeReflection = ctx.getImageData(0, 0, canvas.width, canvas.height);
      applyMetalReflectionLayer(
        canvas,
        ctx,
        { reflectionStrength, edgeSpecular, specularRolloff },
        reflectionMapImg,
        baseBeforeReflection,
        hideEnvFog ? 0.9 : 0
      );
    }

    if (sharpness > 0 || clarity > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "soft-light";
      ctx.globalAlpha = Math.min(0.42, sharpness / 160 + clarity / 220);
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();
    }

    await applyWatermark(canvas);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92);
    });
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `remaura-foto-edit-${outputFormat}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [
    clarity,
    edgeSpecular,
    filterString,
    highlightProtect,
    imageSrc,
    metalRealismEnabled,
    noiseReduction,
    outputFormat,
    reflectionMapSrc,
    reflectionReferenceEnabled,
    reflectionStrength,
    sharpness,
    hideEnvFog,
    specularRolloff,
    whiteBackground,
    billingUi,
    getFotoEditAuthHeaders,
  ]);

  const applyPreset = useCallback((preset: "catalog" | "social" | "premium") => {
    if (preset === "catalog") {
      setBrightness(107);
      setContrast(112);
      setSaturate(94);
      setSharpness(22);
      setClarity(10);
      setNoiseReduction(14);
      setHighlightProtect(18);
      setWhiteBackground(true);
      setOutputFormat("portrait");
      return;
    }
    if (preset === "social") {
      setBrightness(104);
      setContrast(118);
      setSaturate(120);
      setSharpness(34);
      setClarity(18);
      setNoiseReduction(10);
      setHighlightProtect(10);
      setWhiteBackground(false);
      setOutputFormat("story");
      return;
    }
    setBrightness(102);
    setContrast(110);
    setSaturate(108);
    setSharpness(30);
    setClarity(16);
    setNoiseReduction(12);
    setHighlightProtect(15);
      setMetalRealismEnabled(true);
      setReflectionStrength(52);
      setEdgeSpecular(58);
      setSpecularRolloff(34);
    setWhiteBackground(true);
    setOutputFormat("square");
  }, []);

  const applyAutoFix = useCallback(async () => {
    if (!imageSrc) return;
    const ok = await verifyFotoEditCreditsOnServer();
    if (!ok) return;
    const img = new window.Image();
    img.src = imageSrc;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Image load failed"));
    });

    const sample = document.createElement("canvas");
    sample.width = 180;
    sample.height = 180;
    const sctx = sample.getContext("2d");
    if (!sctx) return;
    sctx.drawImage(img, 0, 0, sample.width, sample.height);
    const data = sctx.getImageData(0, 0, sample.width, sample.height).data;

    let lumSum = 0;
    let satSum = 0;
    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let brightPixels = 0;
    const lumHist = new Array<number>(256).fill(0);
    const pixels = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      rSum += r;
      gSum += g;
      bSum += b;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      lumSum += lum / 255;
      satSum += max === 0 ? 0 : (max - min) / max;
      lumHist[Math.max(0, Math.min(255, Math.round(lum)))] += 1;
      if (lum >= 245) brightPixels += 1;
    }

    const percentileLum = (p: number) => {
      const target = pixels * p;
      let acc = 0;
      for (let i = 0; i < lumHist.length; i += 1) {
        acc += lumHist[i] ?? 0;
        if (acc >= target) return i;
      }
      return 255;
    };

    const clamp = (value: number, min: number, max: number) =>
      Math.min(max, Math.max(min, value));

    const avgLum = lumSum / pixels;
    const avgSat = satSum / pixels;
    const avgR = rSum / pixels;
    const avgG = gSum / pixels;
    const avgB = bSum / pixels;
    const warmBias = (avgR - avgB) / 255;
    const p05 = percentileLum(0.05);
    const p95 = percentileLum(0.95);
    const dynamicRange = (p95 - p05) / 255;
    const brightRatio = brightPixels / pixels;

    const nextContrast = Math.round(clamp(118 + (0.42 - dynamicRange) * 120, 98, 142));
    const nextBrightness = Math.round(
      clamp(104 + (0.56 - avgLum) * 38 - Math.max(0, p95 / 255 - 0.9) * 18, 90, 123)
    );
    const satBase = 106 + (0.25 - avgSat) * 92;
    const nextSaturate = Math.round(clamp(satBase - warmBias * 18, 90, 132));
    const nextSharpness = Math.round(clamp(20 + (0.5 - dynamicRange) * 28, 16, 36));
    const nextClarity = Math.round(clamp(11 + (0.44 - dynamicRange) * 36, 8, 28));
    const nextNoise = Math.round(clamp(12 + (0.33 - dynamicRange) * 45, 6, 30));
    const nextHighlightProtect = Math.round(clamp((brightRatio * 100 - 8) * 1.35, 0, 40));

    setBrightness(nextBrightness);
    setContrast(nextContrast);
    setSaturate(nextSaturate);
    setSharpness(nextSharpness);
    setClarity(nextClarity);
    setNoiseReduction(nextNoise);
    setHighlightProtect(nextHighlightProtect);
    setWhiteBackground(brightRatio > 0.2);
  }, [imageSrc, verifyFotoEditCreditsOnServer]);

  return (
    <section className="mx-auto w-full max-w-6xl rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">{t.title}</h2>
        <p className="mt-1 text-xs text-muted sm:text-sm">{t.hint}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void openMainImagePicker()}
              className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-[#b76e79]/70 bg-[#b76e79]/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#b76e79] transition-colors hover:bg-[#b76e79]/20"
            >
              {t.uploadImage}
            </button>
            <input
              ref={mainImageInputRef}
              type="file"
              accept="image/*"
              onChange={onFile}
              className="hidden"
              tabIndex={-1}
              aria-hidden
            />
            <button
              type="button"
              onClick={clearImage}
              disabled={controlsDisabled}
              className="min-h-11 rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-foreground transition-colors hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t.clearImage}
            </button>
            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={controlsDisabled}
              className="min-h-11 rounded-lg border border-[#b76e79]/70 bg-[#b76e79] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#a65f69] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t.downloadImage}
            </button>
            <button
              type="button"
              onClick={applyAutoFix}
              disabled={controlsDisabled}
              className="min-h-11 rounded-lg border border-[#b76e79]/50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#c4838b] transition-colors hover:border-[#b76e79]/80 hover:bg-[#b76e79]/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Otomatik Düzelt
            </button>
            <button
              type="button"
              disabled={controlsDisabled}
              onClick={() => void openSceneEnvPicker()}
              className="min-h-11 rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-foreground transition-colors hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              360 Ortam Işığı Yükle
            </button>
            <button
              type="button"
              disabled={controlsDisabled}
              onClick={() => {
                if (!reflectionMapSrc) {
                  void openReflectionPicker();
                  return;
                }
                setReflectionReferenceEnabled((v) => !v);
              }}
              className={`min-h-11 rounded-lg border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                reflectionMapSrc && reflectionReferenceEnabled
                  ? "border-[#b76e79]/80 bg-[#b76e79]/15 text-[#c4838b]"
                  : "border-white/15 text-foreground hover:border-white/30"
              }`}
            >
              {reflectionMapSrc
                ? `Yansıma Referansı: ${reflectionReferenceEnabled ? "Açık" : "Kapalı"}`
                : "Yansıma Referansı"}
            </button>
            <input
              ref={reflectionInputRef}
              type="file"
              accept="image/*,.exr,.hdr"
              onChange={onReflectionMapFile}
              className="hidden"
              tabIndex={-1}
              aria-hidden
            />
            <input
              ref={sceneEnvInputRef}
              type="file"
              accept="image/*,.exr,.hdr"
              onChange={onSceneEnvFile}
              className="hidden"
              tabIndex={-1}
              aria-hidden
            />
            {reflectionMapSrc && (
              <button
                type="button"
                onClick={() => {
                  setReflectionMapSrc(null);
                  setReflectionReferenceEnabled(false);
                }}
                className="min-h-11 rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-foreground transition-colors hover:border-white/30"
              >
                Referansı Sil
              </button>
            )}
            {sceneEnvFile && (
              <button
                type="button"
                onClick={() => setSceneEnvFile(null)}
                className="min-h-11 rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-foreground transition-colors hover:border-white/30"
              >
                360 ENV Sil
              </button>
            )}
          </div>
          {reflectionMapError && (
            <p className="mt-2 text-xs text-destructive">{reflectionMapError}</p>
          )}

          <p className="mt-2 text-[11px] text-muted">{t.uploadImageHint}</p>

          <div className="mt-4 flex min-h-[320px] items-center justify-center rounded-lg border border-white/10 bg-black/30 p-2">
            {imageSrc ? (
                <div
                  className={`relative h-[min(65vh,560px)] w-full select-none rounded-md ${
                    zoom > 100 ? "overflow-auto" : "overflow-hidden"
                  }`}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <div className="absolute right-2 top-2 z-10 rounded-md border border-white/10 bg-black/55 px-2 py-1 text-[10px] text-white/90">
                    Zoom %{zoom}
                  </div>
                  <div className="flex h-full min-h-[280px] items-center justify-center">
                    <img
                      src={imageSrc}
                      alt="Photo edit original"
                      draggable={false}
                      onContextMenu={(e) => e.preventDefault()}
                      className="max-h-full max-w-full rounded-md object-contain"
                      style={{
                        transform: `scale(${zoom / 100})`,
                        transformOrigin: "center center",
                      }}
                    />
                  </div>

                  <div
                    className="pointer-events-none absolute inset-0"
                    style={compareEnabled ? { clipPath: `inset(0 0 0 ${comparePos}%)` } : undefined}
                  >
                    <div className="flex h-full min-h-[280px] items-center justify-center">
                      <img
                        src={imageSrc}
                        alt="Photo edit processed"
                        draggable={false}
                        onContextMenu={(e) => e.preventDefault()}
                        className="max-h-full max-w-full rounded-md object-contain"
                        style={{
                          filter: `${filterString} ${
                            noiseReduction > 0 ? `blur(${(noiseReduction / 85).toFixed(2)}px)` : ""
                          }`.trim(),
                          transform: `scale(${zoom / 100})`,
                          transformOrigin: "center center",
                        }}
                      />
                    </div>

                    {(sharpness > 0 || clarity > 0) && (
                      <div
                        className="pointer-events-none absolute inset-0 bg-white/20"
                        style={{
                          opacity: Math.min(0.3, sharpness / 170 + clarity / 220),
                          mixBlendMode: "soft-light",
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
                    {highlightProtect > 0 && (
                      <div
                        className="pointer-events-none absolute inset-0 bg-black/20"
                        style={{
                          opacity: Math.min(0.22, highlightProtect / 140),
                          mixBlendMode: "multiply",
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
                    {metalRealismEnabled && (
                      <>
                        {reflectionMapSrc && reflectionReferenceEnabled ? (
                          <div
                            className="pointer-events-none absolute inset-0"
                            style={{
                              backgroundImage: `url(${reflectionMapSrc})`,
                              backgroundPosition: "center",
                              backgroundRepeat: "no-repeat",
                              backgroundSize: "cover",
                              mixBlendMode: "screen",
                              opacity: Math.min(
                                0.42,
                                (0.1 + reflectionStrength / 230) * (hideEnvFog ? 0.75 : 1)
                              ),
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
                        ) : (
                          <div
                            className="pointer-events-none absolute inset-0"
                            style={{
                              background:
                                "linear-gradient(120deg, rgba(255,255,255,0) 16%, rgba(255,255,255,0.55) 30%, rgba(255,255,255,0) 42%, rgba(255,255,255,0.4) 64%, rgba(255,255,255,0) 78%)",
                              mixBlendMode: "screen",
                              opacity: Math.min(
                                0.46,
                                (0.1 + reflectionStrength / 200) * (hideEnvFog ? 0.72 : 1)
                              ),
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
                        <div
                          className="pointer-events-none absolute inset-0"
                          style={{
                            background:
                              "radial-gradient(circle at center, rgba(255,255,255,0) 42%, rgba(255,255,255,0.65) 100%)",
                            mixBlendMode: "screen",
                            opacity: Math.min(
                              0.32,
                              (0.06 + edgeSpecular / 260) * (hideEnvFog ? 0.78 : 1)
                            ),
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
                      </>
                    )}
                  </div>

                  {compareEnabled && (
                    <>
                      <div
                        className="pointer-events-none absolute bottom-0 top-0 w-px bg-[#b76e79]"
                        style={{ left: `${comparePos}%` }}
                      />
                      <div
                        className="pointer-events-none absolute top-1/2 z-10 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#b76e79]/80 bg-black/75 shadow-[0_0_0_1px_rgba(183,110,121,0.35),0_8px_18px_rgba(0,0,0,0.35)]"
                        style={{ left: `${comparePos}%` }}
                      >
                        <div className="flex h-full w-full items-center justify-center gap-[2px]">
                          <span className="h-3 w-[2px] rounded bg-[#c4838b]/85" />
                          <span className="h-3 w-[2px] rounded bg-[#c4838b]/85" />
                        </div>
                      </div>
                    </>
                  )}
                  <RemauraWatermarkOverlay />
                </div>
            ) : (
              <p className="text-center text-xs text-muted">{t.noImage}</p>
            )}
          </div>

          {imageSrc && (
            <div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                  Önce / Sonra Karşılaştırma
                </p>
                <button
                  type="button"
                  onClick={() => setCompareEnabled((v) => !v)}
                  disabled={controlsDisabled}
                  className={`min-h-8 rounded-md border px-3 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    compareEnabled
                      ? "border-[#b76e79]/80 bg-[#b76e79]/15 text-[#c4838b]"
                      : "border-white/15 text-foreground hover:border-white/30"
                  }`}
                >
                  {compareEnabled ? "Açık" : "Kapalı"}
                </button>
              </div>
              {compareEnabled ? (
                <>
                  <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-muted">
                    <span>Once</span>
                    <span>Sonra</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={95}
                    value={comparePos}
                    onChange={(e) => setComparePos(Number(e.target.value))}
                    disabled={controlsDisabled}
                    className={SLIDER_BASE}
                  />
                </>
              ) : (
                <p className="text-xs text-muted">
                  Ürün üzerindeki düzenleme etkisini bölünmüş görünümde izlemek için açın.
                </p>
              )}
            </div>
          )}
        </div>

        <aside className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Hizli Presetler</p>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset("catalog")}
                  disabled={controlsDisabled}
                  className="min-h-10 rounded-lg border border-white/15 px-3 py-2 text-left text-xs text-foreground transition-colors hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Katalog Beyaz
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("social")}
                  disabled={controlsDisabled}
                  className="min-h-10 rounded-lg border border-white/15 px-3 py-2 text-left text-xs text-foreground transition-colors hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sosyal Medya Canlı
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("premium")}
                  disabled={controlsDisabled}
                  className="min-h-10 rounded-lg border border-white/15 px-3 py-2 text-left text-xs text-foreground transition-colors hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Premium Vitrin
                </button>
              </div>
            </div>

            <label className="block">
              <div className="mb-1 flex items-center justify-between text-xs text-foreground/90">
                <span>Cikti Formati</span>
              </div>
              <select
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
                disabled={controlsDisabled}
                className="min-h-10 w-full rounded-lg border border-white/15 bg-black/20 px-3 text-xs text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                {Object.entries(OUTPUT_SIZES).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 rounded-lg border border-white/10 p-2 text-xs text-foreground/90">
              <input
                type="checkbox"
                checked={whiteBackground}
                onChange={(e) => setWhiteBackground(e.target.checked)}
                disabled={controlsDisabled}
                className="h-4 w-4 accent-[#b76e79] disabled:cursor-not-allowed disabled:opacity-40"
              />
              Beyaz Arka Plan ile Kaydet
            </label>

            <label className="flex items-center gap-2 rounded-lg border border-white/10 p-2 text-xs text-foreground/90">
              <input
                type="checkbox"
                checked={syncEnvToReflection}
                onChange={(e) => setSyncEnvToReflection(e.target.checked)}
                disabled={controlsDisabled}
                className="h-4 w-4 accent-[#b76e79] disabled:cursor-not-allowed disabled:opacity-40"
              />
              360 ENV&apos;i Metal Yansımayı Bağla
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-white/10 p-2 text-xs text-foreground/90">
              <input
                type="checkbox"
                checked={hideEnvFog}
                onChange={(e) => setHideEnvFog(e.target.checked)}
                disabled={controlsDisabled}
                className="h-4 w-4 accent-[#b76e79] disabled:cursor-not-allowed disabled:opacity-40"
              />
              ENV Sis Gizleme
            </label>

            <label className="flex items-center gap-2 rounded-lg border border-white/10 p-2 text-xs text-foreground/90">
              <input
                type="checkbox"
                checked={metalRealismEnabled}
                onChange={(e) => setMetalRealismEnabled(e.target.checked)}
                disabled={controlsDisabled}
                className="h-4 w-4 accent-[#b76e79] disabled:cursor-not-allowed disabled:opacity-40"
              />
              Gerçek Metal Yansıma Modu
            </label>

            <label className="block">
              <div className="mb-1 flex items-center justify-between text-xs text-foreground/90">
                <span>Zoom</span>
                <span>%{zoom}</span>
              </div>
              <input
                type="range"
                min={100}
                max={320}
                step={5}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                disabled={controlsDisabled}
                className={SLIDER_BASE}
              />
            </label>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(100, z - 20))}
                disabled={controlsDisabled}
                className="min-h-9 rounded-lg border border-white/15 px-2 text-xs text-foreground transition-colors hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Zoom -
              </button>
              <button
                type="button"
                onClick={() => setZoom(100)}
                disabled={controlsDisabled}
                className="min-h-9 rounded-lg border border-white/15 px-2 text-xs text-foreground transition-colors hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                100%
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(320, z + 20))}
                disabled={controlsDisabled}
                className="min-h-9 rounded-lg border border-white/15 px-2 text-xs text-foreground transition-colors hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Zoom +
              </button>
            </div>

            <label className="block">
              <div className="mb-1 flex items-center justify-between text-xs text-foreground/90">
                <span>Parlaklık</span>
                <span>{brightness}%</span>
              </div>
              <input
                type="range"
                min={60}
                max={160}
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                disabled={controlsDisabled}
                className={SLIDER_BASE}
              />
            </label>

            <label className="block">
              <div className="mb-1 flex items-center justify-between text-xs text-foreground/90">
                <span>Kontrast</span>
                <span>{contrast}%</span>
              </div>
              <input
                type="range"
                min={60}
                max={180}
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                disabled={controlsDisabled}
                className={SLIDER_BASE}
              />
            </label>

            <label className="block">
              <div className="mb-1 flex items-center justify-between text-xs text-foreground/90">
                <span>Doygunluk</span>
                <span>{saturate}%</span>
              </div>
              <input
                type="range"
                min={40}
                max={180}
                value={saturate}
                onChange={(e) => setSaturate(Number(e.target.value))}
                disabled={controlsDisabled}
                className={SLIDER_BASE}
              />
            </label>

            <label className="block">
              <div className="mb-1 flex items-center justify-between text-xs text-foreground/90">
                <span>Netlik</span>
                <span>{sharpness}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={sharpness}
                onChange={(e) => setSharpness(Number(e.target.value))}
                disabled={controlsDisabled}
                className={SLIDER_BASE}
              />
            </label>

            <label className="block">
              <div className="mb-1 flex items-center justify-between text-xs text-foreground/90">
                <span>Detay</span>
                <span>{clarity}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={clarity}
                onChange={(e) => setClarity(Number(e.target.value))}
                disabled={controlsDisabled}
                className={SLIDER_BASE}
              />
            </label>

            <label className="block">
              <div className="mb-1 flex items-center justify-between text-xs text-foreground/90">
                <span>Parazit Azaltma</span>
                <span>{noiseReduction}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={noiseReduction}
                onChange={(e) => setNoiseReduction(Number(e.target.value))}
                disabled={controlsDisabled}
                className={SLIDER_BASE}
              />
            </label>

            <label className="block">
              <div className="mb-1 flex items-center justify-between text-xs text-foreground/90">
                <span>Parlama Koruma</span>
                <span>{highlightProtect}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={highlightProtect}
                onChange={(e) => setHighlightProtect(Number(e.target.value))}
                disabled={controlsDisabled}
                className={SLIDER_BASE}
              />
            </label>

            {metalRealismEnabled && (
              <>
                <label className="block">
                  <div className="mb-1 flex items-center justify-between text-xs text-foreground/90">
                    <span>Yansıma Gücü</span>
                    <span>{reflectionStrength}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={reflectionStrength}
                    onChange={(e) => setReflectionStrength(Number(e.target.value))}
                    disabled={controlsDisabled}
                    className={SLIDER_BASE}
                  />
                </label>

                <label className="block">
                  <div className="mb-1 flex items-center justify-between text-xs text-foreground/90">
                    <span>Kenar Parlamasi</span>
                    <span>{edgeSpecular}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={edgeSpecular}
                    onChange={(e) => setEdgeSpecular(Number(e.target.value))}
                    disabled={controlsDisabled}
                    className={SLIDER_BASE}
                  />
                </label>

                <label className="block">
                  <div className="mb-1 flex items-center justify-between text-xs text-foreground/90">
                    <span>Specular Rolloff</span>
                    <span>{specularRolloff}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={specularRolloff}
                    onChange={(e) => setSpecularRolloff(Number(e.target.value))}
                    disabled={controlsDisabled}
                    className={SLIDER_BASE}
                  />
                </label>
              </>
            )}

            <button
              type="button"
              onClick={resetAdjustments}
              disabled={controlsDisabled}
              className="mt-2 min-h-11 w-full rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-foreground transition-colors hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t.resetAdjustments}
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}

