import "server-only";

/**
 * AÇI LAB — AI upscale (fal.ai, serverless — geçici; sonra kendi sunucu).
 *
 * Düşük kaliteli/bulanık girdi (telefon/Instagram) → AI ile netleştir + detay kurtar.
 * Poz-normalize'DEN ÖNCE çalışır: Gemini net detayı sadık korusun diye.
 *
 * Modeller (güçten güçsüze, gerçek iyileştirme için):
 *  - "clarity"  → fal-ai/clarity-upscaler  : gerçek detay ekler (Magnific tarzı). En iyi.
 *  - "aura-sr"  → fal-ai/aura-sr            : keskin GAN 4x, detay uydurmaz (fidelity güvenli).
 *  - "esrgan"   → fal-ai/esrgan             : hafif; çoğu zaman sadece büyütür (zayıf).
 * Hepsi çıktı: TEK `image.url` (fal-hosted).
 */
export type UpscaleModel = "clarity" | "aura-sr" | "esrgan";

function buildInput(model: UpscaleModel, image: string, scale: number): { endpoint: string; input: Record<string, unknown> } {
  const s = Math.max(1, Math.min(scale, 4));
  switch (model) {
    case "aura-sr":
      return {
        endpoint: "fal-ai/aura-sr",
        input: { image_url: image, upscaling_factor: 4, overlapping_tiles: true },
      };
    case "esrgan":
      return {
        endpoint: "fal-ai/esrgan",
        input: { image_url: image, scale: s, model: "RealESRGAN_x4plus", output_format: "jpeg" },
      };
    case "clarity":
    default:
      return {
        endpoint: "fal-ai/clarity-upscaler",
        input: {
          image_url: image,
          upscale_factor: s,
          // Fidelity: yüksek benzerlik + düşük yaratıcılık → detay netleşir, tasarım değişmez
          resemblance: 0.85,
          creativity: 0.3,
          prompt: "luxury jewelry, gold and diamonds, sharp intricate metal detail, high quality, ultra detailed",
          num_inference_steps: 18,
        },
      };
  }
}

function extractUrl(data: unknown): string | undefined {
  const d = data as { image?: { url?: string }; images?: Array<{ url?: string }> };
  return d?.image?.url ?? d?.images?.[0]?.url;
}

export async function falUpscaleToUrl(
  image: string,
  scale = 2,
  model: UpscaleModel = "clarity",
): Promise<string> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) throw new Error("Servis yapılandırılmamış.");

  const { fal } = await import("@fal-ai/client");
  fal.config({ credentials: falKey });

  // Büyük data-URI'yi doğrudan geçmek fal'da 422/limit veriyor →
  // önce fal storage'a yükle, gerçek URL ile besle (fal'ın önerdiği yol).
  let imageUrl = image;
  if (image.startsWith("data:")) {
    const comma = image.indexOf(",");
    const mime = image.slice(5, comma).split(";")[0] || "image/jpeg";
    const buf = Buffer.from(image.slice(comma + 1), "base64");
    const blob = new Blob([new Uint8Array(buf)], { type: mime });
    imageUrl = await fal.storage.upload(blob);
  }

  const { endpoint, input } = buildInput(model, imageUrl, scale);
  const result = await (
    fal.subscribe as (
      m: string,
      o: { input: Record<string, unknown>; logs: boolean },
    ) => Promise<{ data: unknown }>
  )(endpoint, { input, logs: false });

  const url = extractUrl(result.data);
  if (!url) throw new Error("Upscale sonucu boş döndü.");
  return url;
}

/** Upscale + sonucu base64 data URI olarak getir (Gemini'ye beslemek için). */
export async function falUpscaleToDataUri(
  image: string,
  scale = 2,
  model: UpscaleModel = "clarity",
): Promise<string> {
  const url = await falUpscaleToUrl(image, scale, model);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Upscale görseli indirilemedi (${res.status}).`);
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}
