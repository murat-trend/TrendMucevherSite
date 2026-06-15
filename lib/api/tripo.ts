import { loadEnvConfig } from "@next/env";

/**
 * Tripo 3D API yardımcıları (V2 paneli).
 * Anahtar: TRIPO_API_KEY (.env.local). Taban: v2 openapi.
 *
 * NOT: model_version ve STL convert parametreleri Tripo hesabındaki güncel
 * sürümle doğrulanmalı; aşağıdaki değerler dokümante edilmiş v2 sözleşmesine göre.
 */
let tripoEnvLoaded = false;

function ensureTripoEnv(): void {
  if (tripoEnvLoaded) return;
  loadEnvConfig(process.cwd());
  tripoEnvLoaded = true;
}

export function getTripoApiKey(): string | undefined {
  ensureTripoEnv();
  const raw = process.env.TRIPO3D_API_KEY ?? process.env.TRIPO_API_KEY;
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export const TRIPO_BASE = "https://api.tripo3d.ai/v2/openapi";

/** Güncel image-to-model sürümü — gerekirse tek yerden güncellenir. */
export const TRIPO_MODEL_VERSION = "v2.5-20250123";

function dataUrlToBuffer(dataUrl: string): { buf: Buffer; mime: string } {
  const mime = dataUrl.match(/data:([^;]+);/)?.[1] ?? "image/png";
  const base64 = dataUrl.replace(/^data:[^;]+;base64,/, "");
  return { buf: Buffer.from(base64, "base64"), mime };
}

/** Görseli Tripo'ya yükler, file_token döner. */
export async function tripoUploadImage(
  apiKey: string,
  image: string
): Promise<{ fileToken: string; type: string }> {
  let buf: Buffer;
  let mime: string;
  if (image.startsWith("http://") || image.startsWith("https://")) {
    const res = await fetch(image);
    if (!res.ok) throw new Error(`Görsel indirilemedi: ${res.status}`);
    buf = Buffer.from(await res.arrayBuffer());
    mime = res.headers.get("content-type") ?? "image/png";
  } else {
    const parsed = dataUrlToBuffer(image);
    buf = parsed.buf;
    mime = parsed.mime;
  }

  const ext = mime.includes("png") ? "png" : "jpg";
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buf)], { type: mime }), `image.${ext}`);

  const res = await fetch(`${TRIPO_BASE}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const data = (await res.json().catch(() => ({}))) as {
    code?: number;
    data?: { image_token?: string };
    message?: string;
  };
  if (!res.ok || data.code !== 0 || !data.data?.image_token) {
    throw new Error(data.message ?? `Tripo yükleme başarısız (${res.status}).`);
  }
  return { fileToken: data.data.image_token, type: ext };
}
