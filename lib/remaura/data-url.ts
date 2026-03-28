/** Stil / referans görselleri için data URL → base64 + MIME (WebP, PNG, JPEG, …). */
export function parseStyleImageDataUrl(dataUrl: string): { base64: string; mimeType: string } | null {
  if (!dataUrl.startsWith("data:")) return null;
  const semi = dataUrl.indexOf(";");
  const comma = dataUrl.indexOf(",");
  if (semi < 5 || comma < 0 || comma <= semi) return null;
  const mimeType = dataUrl.slice(5, semi).trim() || "image/jpeg";
  const base64 = dataUrl.slice(comma + 1).trim();
  if (!base64) return null;
  return { base64, mimeType };
}

export function styleDataUrlsToPayload(urls: (string | null)[]): { base64: string; mimeType: string }[] {
  const out: { base64: string; mimeType: string }[] = [];
  for (const url of urls) {
    if (!url?.startsWith("data:")) continue;
    const p = parseStyleImageDataUrl(url);
    if (p?.base64) out.push(p);
  }
  return out;
}
