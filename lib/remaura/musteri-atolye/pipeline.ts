import "server-only";

import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { GoogleGenAI } from "@google/genai";
import { getConvertR2Client } from "@/lib/modeller/r2-convert-storage";
import { falUpscaleToUrl, type UpscaleModel } from "@/lib/remaura/aci-lab-upscale";

/**
 * MÜŞTERİ ATÖLYESİ — görsel boru hattı.
 *
 * Müşterinin gönderdiği ürün fotoğrafından, 3D'ye (mesh/tripo) verilebilir
 * temiz bir ürün görseli üretir:
 *
 *   1) taş (+ tırnak) kaldır ve altında kalan gövdeyi TAMAMLA
 *   2) arka planı kaldır → şeffaf PNG
 *   3) istenen boya büyüt (şeffaflık korunarak)
 *   4) R2'ye yaz, URL döndür
 *
 * ⚠ Neden URL dönüyoruz: Vercel istek/yanıt gövdesi ~4.5MB. 2K–4K şeffaf PNG
 * bunun katbekat üstünde; base64 olarak JSON'da dönemez. Sonuç R2'ye yazılır.
 */

// ─── Sabitler (ölçülmüş limitler) ────────────────────────────────────────────

/** Stability girdi tavanı: 4.194.304 piksel (≈2048²). Altında kalıyoruz. */
const STABILITY_MAX_PIXELS = 4_000_000;

/** Görsel üreten modelin çıktısı ~1024px; büyütme ayrı adım. */
const GEMINI_MODEL = "gemini-3.1-flash-image";

/** fal büyütücü 1–4 kat destekliyor. */
const MAX_UPSCALE_FACTOR = 4;

/**
 * Şeffaf alanı büyütmeden önce düzleştirdiğimiz nötr renk. Beyaz/siyah kenarda
 * hale bırakıyor; orta gri en az iz bırakan seçim.
 */
const FLATTEN_BG = { r: 128, g: 128, b: 128 };

export const HEDEF_BOYLAR = [1024, 2048, 4096] as const;
export type HedefBoy = (typeof HEDEF_BOYLAR)[number];

export type TasKapsami = "buyuk" | "hepsi" | "tarif";

export type HazirlaGirdi = {
  /** data: URI veya https:// URL */
  image: string;
  tasKapsami: TasKapsami;
  /** tasKapsami === "tarif" iken tasarımcının kendi tarifi */
  tasTarif?: string;
  /** Asma halkası / zincir / bileklik de kalksın mı */
  bailKaldir: boolean;
  hedefBoy: HedefBoy;
  buyutucu?: UpscaleModel;
};

export type HazirlaSonuc = {
  url: string;
  width: number;
  height: number;
};

// ─── Görsel yardımcıları ─────────────────────────────────────────────────────

async function getSharp() {
  return (await import("sharp")).default;
}

/** data: URI ya da URL → buffer + mime. */
export async function toBuffer(input: string): Promise<{ buf: Buffer; mime: string }> {
  if (input.startsWith("http://") || input.startsWith("https://")) {
    const res = await fetch(input, { cache: "no-store" });
    if (!res.ok) throw new Error(`Görsel indirilemedi: ${res.status}`);
    return {
      buf: Buffer.from(await res.arrayBuffer()),
      mime: res.headers.get("content-type") ?? "image/png",
    };
  }
  const mime = input.match(/^data:([^;]+);base64,/)?.[1] ?? "image/png";
  const raw = input.includes(",") ? input.slice(input.indexOf(",") + 1) : input;
  return { buf: Buffer.from(raw, "base64"), mime };
}

/** Sağlayıcı piksel tavanının altına indir (aşan görsel 400 döndürüyor). */
async function capPixels(buf: Buffer, maxPixels = STABILITY_MAX_PIXELS): Promise<Buffer> {
  const sharp = await getSharp();
  const meta = await sharp(buf).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h || w * h <= maxPixels) return buf;
  const scale = Math.sqrt(maxPixels / (w * h));
  return sharp(buf)
    .resize(Math.max(1, Math.floor(w * scale)), Math.max(1, Math.floor(h * scale)), { fit: "inside" })
    .png()
    .toBuffer();
}

function blob(buf: Buffer, mime = "image/png"): Blob {
  return new Blob([new Uint8Array(buf)], { type: mime });
}

// ─── 1. Adım — taş kaldır + gövdeyi tamamla ─────────────────────────────────

function tasEmri(kapsam: TasKapsami, tarif?: string): string {
  switch (kapsam) {
    case "hepsi":
      return "Remove EVERY gemstone in the piece — the large center stone(s) and all small accent stones, including any stones used as eyes or pavé.";
    case "tarif":
      return `Remove exactly the following stone(s) and nothing else: "${(tarif ?? "").trim()}". Leave every other stone untouched.`;
    case "buyuk":
    default:
      return [
        "Remove ONLY the large set stone(s) — the solitaire / center stone(s) held by prongs, claws or a bezel.",
        "KEEP every small accent stone that belongs to the motif itself (eyes, nose, tiny pavé stones). Those are part of the design, not the set stone.",
      ].join(" ");
  }
}

function buildPrompt(girdi: HazirlaGirdi): string {
  const parts: string[] = [
    "You are preparing a jewelry product image for 3D reconstruction. Edit the photograph as follows.",
    "",
    `REMOVE THE STONE: ${tasEmri(girdi.tasKapsami, girdi.tasTarif)}`,
    "Also remove the metal that only existed to hold that stone — the prongs, claws, bezel cup and setting basket must be gone completely. Do NOT leave an empty setting behind.",
    "",
    "REBUILD WHAT WAS HIDDEN: the stone covered part of the piece. Reconstruct that hidden area so the jewelry becomes a complete, closed, self-consistent object — continue the body, limbs, tail, scrollwork or band that the stone was sitting on, in the exact same style, enamel colours and metal work as the visible parts. The finished piece must look like it was designed without a stone in the first place, not like something was cut out of it.",
  ];

  if (girdi.bailKaldir) {
    parts.push(
      "",
      "ISOLATE THE PIECE: remove the bail, jump ring, chain, bracelet, clasp, hand, skin and any other object. Only the single jewelry piece itself remains."
    );
  } else {
    parts.push(
      "",
      "ISOLATE THE PIECE: remove the chain, bracelet, hand, skin and any other object, but KEEP the bail / jump ring attached to the piece — it is part of the design."
    );
  }

  parts.push(
    "",
    "PRESERVE EXACTLY — do not reinterpret, restyle or redraw these:",
    "- the silhouette and proportions of the piece",
    "- every enamel colour and colour boundary",
    "- the gold/silver outline linework and its thickness",
    "- all engraving, fur texture, filigree and surface detail",
    "- the metal tone and finish",
    "",
    "OUTPUT: one photorealistic jewelry product image of the SAME piece, shot straight-on, centred, filling the frame with a small even margin on all sides, on a plain uniform light grey studio background with no shadow, no reflection, no props and no text. Sharp focus across the whole piece."
  );

  return parts.join("\n");
}

type GeminiResult = {
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: unknown[] } | null;
  }> | null;
};

function extractImage(result: GeminiResult): Buffer {
  const candidate = result.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const imgPart = (parts as Array<{ thought?: boolean; inlineData?: { mimeType: string; data: string } }>)
    .find((p) => !p.thought && p.inlineData?.mimeType?.startsWith("image/"));
  if (!imgPart?.inlineData) {
    const text = (parts as Array<{ text?: string; thought?: boolean }>)
      .filter((p) => !p.thought && p.text)
      .map((p) => p.text)
      .join(" ");
    throw new Error(`no_image | finishReason=${candidate?.finishReason} | text=${text.slice(0, 160)}`);
  }
  return Buffer.from(imgPart.inlineData.data, "base64");
}

/**
 * Taşı kaldırır, gövdeyi tamamlar, parçayı düz zemine izole eder.
 * ⚠ Çıktı KIRPILMAZ — ücretli katmanda görünür sağlayıcı filigranı yok (fb11d77'de
 * ölçüldü) ve alt kenarı kırpmak izole ürünün gövdesini keser.
 */
export async function tasKaldirVeTamamla(girdi: HazirlaGirdi, apiKey: string): Promise<Buffer> {
  const { buf, mime } = await toBuffer(girdi.image);
  const capped = await capPixels(buf);
  const mimeType = (mime.startsWith("image/") ? mime : "image/png") as
    | "image/jpeg"
    | "image/png"
    | "image/webp";

  const ai = new GoogleGenAI({ apiKey });

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("timeout_240s — hazırlama çok uzun sürdü")), 240_000)
  );

  const result = await Promise.race([
    ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: capped.toString("base64") } },
            { text: buildPrompt(girdi) },
          ],
        },
      ],
      config: { responseModalities: ["IMAGE", "TEXT"], thinkingConfig: { thinkingBudget: 0 } } as never,
    }),
    timeout,
  ]);

  return extractImage(result as GeminiResult);
}

// ─── 2. Adım — arka planı kaldır (şeffaf PNG) ───────────────────────────────

export async function arkaPlanKaldir(buf: Buffer, apiKey: string): Promise<Buffer> {
  const capped = await capPixels(buf);
  const form = new FormData();
  form.append("image", blob(capped), "image.png");
  form.append("output_format", "png");

  const res = await fetch("https://api.stability.ai/v2beta/stable-image/edit/remove-background", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "image/*" },
    body: form,
  });

  if (!res.ok) {
    const txt = await res.text();
    const err = new Error(`remove_bg_${res.status} | ${txt.slice(0, 300)}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  return Buffer.from(await res.arrayBuffer());
}

// ─── 3. Adım — şeffaflığı koruyarak büyüt ───────────────────────────────────

/**
 * Büyütücüler alfa kanalını taşımıyor. Bu yüzden renk katmanını ve şeffaflık
 * maskesini AYRI büyütüp geri birleştiriyoruz:
 *
 *   renk  → nötr griye düzleştir → fal büyütücü (×2–×4)
 *   maske → sharp/lanczos ile aynı piksel boyuna
 *   sonuç → renk + maske  (tek şeffaf PNG)
 *
 * Varsayılan büyütücü `aura-sr`: GAN tabanlı, detay UYDURMAZ. 3D'ye gidecek bir
 * üründe uydurulmuş detay yanlış geometri demek — sadakat hızdan önemli.
 */
export async function buyutSeffaf(
  src: Buffer,
  hedefBoy: HedefBoy,
  model: UpscaleModel = "aura-sr"
): Promise<Buffer> {
  const sharp = await getSharp();
  const meta = await sharp(src).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) throw new Error("Görsel boyutu okunamadı.");

  const uzunKenar = Math.max(w, h);

  // Zaten hedefte/üstündeyse yalnızca hedefe indir — büyütücüye para verme.
  if (uzunKenar >= hedefBoy) {
    return uzunKenar === hedefBoy
      ? src
      : sharp(src).resize({ width: w >= h ? hedefBoy : undefined, height: h > w ? hedefBoy : undefined, fit: "inside", kernel: "lanczos3" }).png().toBuffer();
  }

  const kat = Math.min(MAX_UPSCALE_FACTOR, Math.max(2, Math.ceil(hedefBoy / uzunKenar)));

  // Renk katmanı — şeffaf alan nötr griye düzleşir (kenarda hale bırakmasın).
  const duzRgb = await sharp(src).flatten({ background: FLATTEN_BG }).png().toBuffer();
  const buyukUrl = await falUpscaleToUrl(`data:image/png;base64,${duzRgb.toString("base64")}`, kat, model);
  const { buf: buyukRgb } = await toBuffer(buyukUrl);

  const buyukMeta = await sharp(buyukRgb).metadata();
  const bw = buyukMeta.width ?? 0;
  const bh = buyukMeta.height ?? 0;
  if (!bw || !bh) throw new Error("Büyütülmüş görsel okunamadı.");

  let birlesik: Buffer;
  if (meta.hasAlpha) {
    // Maskeyi büyütülmüş renk katmanının TAM boyuna getir, sonra geri tak.
    const { data: maske, info } = await sharp(src)
      .extractChannel("alpha")
      .resize(bw, bh, { kernel: "lanczos3", fit: "fill" })
      .raw()
      .toBuffer({ resolveWithObject: true });

    birlesik = await sharp(buyukRgb)
      .removeAlpha()
      .joinChannel(maske, { raw: { width: info.width, height: info.height, channels: 1 } })
      .png()
      .toBuffer();
  } else {
    birlesik = await sharp(buyukRgb).png().toBuffer();
  }

  // Büyütücü hedefi aşabilir (×4 sabit modeller) — tam hedefe indir.
  const sonUzun = Math.max(bw, bh);
  if (sonUzun <= hedefBoy) return birlesik;

  return sharp(birlesik)
    .resize({
      width: bw >= bh ? hedefBoy : undefined,
      height: bh > bw ? hedefBoy : undefined,
      fit: "inside",
      kernel: "lanczos3",
    })
    .png()
    .toBuffer();
}

// ─── 4. Adım — R2'ye yaz ─────────────────────────────────────────────────────

export async function r2yeYaz(buf: Buffer, prefix = "musteri-atolye"): Promise<string> {
  const { s3, bucket, publicBase } = getConvertR2Client();
  const key = `${prefix}/${randomUUID()}.png`;
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buf,
      ContentType: "image/png",
    })
  );
  return `${publicBase}/${key}`;
}

// ─── Boru hattı ──────────────────────────────────────────────────────────────

export async function hazirla(
  girdi: HazirlaGirdi,
  keys: { google: string; stability: string }
): Promise<HazirlaSonuc> {
  const duzenli = await tasKaldirVeTamamla(girdi, keys.google);
  const seffaf = await arkaPlanKaldir(duzenli, keys.stability);
  const buyuk = await buyutSeffaf(seffaf, girdi.hedefBoy, girdi.buyutucu);

  const sharp = await getSharp();
  const meta = await sharp(buyuk).metadata();
  const url = await r2yeYaz(buyuk);

  return { url, width: meta.width ?? 0, height: meta.height ?? 0 };
}

/** Kayıtlı bir görseli sonradan daha büyük boya çıkarır (4K düğmesi). */
export async function buyut(
  image: string,
  hedefBoy: HedefBoy,
  model?: UpscaleModel
): Promise<HazirlaSonuc> {
  const { buf } = await toBuffer(image);
  const buyuk = await buyutSeffaf(buf, hedefBoy, model);
  const sharp = await getSharp();
  const meta = await sharp(buyuk).metadata();
  const url = await r2yeYaz(buyuk);
  return { url, width: meta.width ?? 0, height: meta.height ?? 0 };
}
