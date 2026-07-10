"use client";

// ORTAK HOOK'LAR — dosya→varlık dönüştürme ve AI üretim çağrısı.

import { useCallback, useState } from "react";
import { AUDIO_MIMES } from "./constants";
import type { Asset, AssetKind, GenerateRequest, GenerateResponse } from "./types";
import { uid } from "./types";

function kindOf(file: File): AssetKind | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (AUDIO_MIMES.includes(file.type) || /\.(mp3|wav|aac|m4a)$/i.test(file.name)) return "audio";
  if (/\.stl$/i.test(file.name)) return "stl";
  return null;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Dosya okunamadı."));
    reader.readAsDataURL(file);
  });
}

/** Dosyayı Asset'e çevirir; desteklenmeyen türde null döner. */
export function useAssetUpload() {
  const [uploading, setUploading] = useState(false);

  const fileToAsset = useCallback(async (file: File): Promise<Asset | null> => {
    const kind = kindOf(file);
    if (!kind) return null;
    setUploading(true);
    try {
      // STL büyük olabilir; içerik değil metadata taşınır (görüntüleme ayrı iş).
      const dataUrl = kind === "stl" ? undefined : await readAsDataUrl(file);
      return {
        id: uid("ast"),
        kind,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        dataUrl,
        createdAt: Date.now(),
      };
    } finally {
      setUploading(false);
    }
  }, []);

  return { fileToAsset, uploading };
}

/** AI üretim uç noktasını çağırır; hata mesajları kullanıcıya uygun ve geneldir. */
export function useGenerate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (req: GenerateRequest): Promise<string | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/remaura/creative-studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      const data = (await res.json()) as GenerateResponse;
      if (!res.ok || !data.image) {
        setError(data.error ?? "Üretim başarısız oldu, tekrar deneyin.");
        return null;
      }
      return data.image;
    } catch {
      setError("Ağ hatası — bağlantınızı kontrol edin.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { generate, loading, error, setError };
}

/** Ses süresini (saniye) data URL'den okur. */
export function probeAudioDuration(dataUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const el = document.createElement("audio");
    el.onloadedmetadata = () => resolve(Number.isFinite(el.duration) ? el.duration : 10);
    el.onerror = () => resolve(10);
    el.src = dataUrl;
  });
}
