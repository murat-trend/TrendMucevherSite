/*
 * Ortak yükleme yardımcıları — 413 dersinin kalıcı çözümü.
 * Kaynak kalıp: sosyal-boyut (kanıtlanmış). İki limit birden gözetilir:
 * Vercel ~4.5MB istek gövdesi (413) + görsel API'lerinin ~4.19M piksel sınırı.
 */

const approxBytes = (s: string) => Math.ceil((s.length - s.indexOf(",") - 1) * 0.75);

/** Data-URL görseli, gövde limitine sığacak boyuta indirir (gerekirse kademeli). */
export async function shrinkForUpload(
  dataUrl: string,
  maxBytes = 3_200_000,
  maxPixels = 4_000_000
): Promise<string> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new window.Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });
  const pixels = img.width * img.height;
  if (approxBytes(dataUrl) <= maxBytes && pixels <= maxPixels) return dataUrl;

  const pxScale = pixels > maxPixels ? Math.sqrt(maxPixels / pixels) : 1;
  let out = dataUrl;
  for (const mul of [1, 0.85, 0.7, 0.55]) {
    const scale = pxScale * mul;
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const x = c.getContext("2d");
    if (!x) return out;
    x.drawImage(img, 0, 0, w, h);
    out = c.toDataURL("image/jpeg", 0.85);
    if (approxBytes(out) <= maxBytes && w * h <= maxPixels) return out;
  }
  return out;
}

/**
 * 413 gibi durumlarda gövde JSON değil (düz metin) → güvenli parse.
 * Asla fırlatmaz; JSON değilse boş obje döner.
 */
export async function readJsonSafe<T extends object = Record<string, unknown>>(
  res: Response
): Promise<Partial<T> & { error?: string }> {
  const txt = await res.text();
  try {
    return JSON.parse(txt);
  } catch {
    return {};
  }
}

/** İnsanca hata mesajı: 413 özel durumu + sunucu mesajı + geri düşüş. */
export function uploadErrorMessage(
  res: Response,
  data: { error?: string },
  fallback: string
): string {
  if (res.status === 413) {
    return "Görsel çok büyük — lütfen daha küçük bir görsel yükleyin.";
  }
  return data.error ?? `${fallback} (${res.status})`;
}
