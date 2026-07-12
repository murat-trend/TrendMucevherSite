import { loadEnvConfig } from "@next/env";
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/remaura/uretim-3d/auth";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * REMAURA AI v1 — Studio görsel üretim ucu.
 *
 * Dış sözleşme (RAI adası ve ileride müşteri API'si bunu kullanır —
 * alan adları değişmez, değişiklik gerekirse v2 açılır):
 *   POST { prompt, negative?, format, styleImages? }  →  { image } | { error }
 *
 * Auth: test fazında süper-admin oturumu; panel token + tenant kredi
 * düşümü faz 2'de bu katmana bağlanacak. Servis adları client'a sızmaz.
 */

const MODEL = "gemini-3.1-flash-image-preview";
const MAX_STYLE_IMAGE_BYTES = 6 * 1024 * 1024;

const FORMAT_RATIO: Record<string, string> = {
  "insta-post": "1:1",
  "story-reels": "9:16",
  "youtube-web": "16:9",
  portrait: "4:5",
};

type StudioGenerateRequest = {
  prompt?: string;
  negative?: string;
  format?: string;
  styleImages?: string[];
};

function sanitizeGoogleKey(): string | undefined {
  const raw = process.env.GOOGLE_API_KEY ?? "";
  return (
    raw
      .split("")
      .filter((ch) => ch.charCodeAt(0) > 31 && ch.charCodeAt(0) < 256)
      .join("")
      .trim() || undefined
  );
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const m = /^data:(image\/[a-z+.-]+);base64,(.+)$/i.exec(dataUrl);
  if (!m) return null;
  if (m[2].length * 0.75 > MAX_STYLE_IMAGE_BYTES) return null;
  return { mimeType: m[1], data: m[2] };
}

// Büyük referans görselleri üretimi yavaşlatır — sunucuda küçült,
// sharp yoksa (yerel geliştirme) olduğu gibi geç.
async function shrinkStyleImage(parsed: { mimeType: string; data: string }) {
  try {
    const sharp = (await import("sharp")).default;
    const resized = await sharp(Buffer.from(parsed.data, "base64"))
      .resize(512, 512, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    return { mimeType: "image/jpeg", data: resized.toString("base64") };
  } catch {
    return parsed;
  }
}

function buildStudioPrompt(body: StudioGenerateRequest, hasStyleRefs: boolean): string {
  const lines = [
    "Professional luxury jewelry product photography.",
    `Subject: ${body.prompt?.trim()}.`,
    hasStyleRefs
      ? "Follow the decorative style of the reference image(s): metal finish, surface technique, motifs and stone treatment. Do not copy the jewelry type from the references; the subject description above defines what to create."
      : "",
    "Clean studio lighting, high detail, sharp focus, single centered piece, no hands, no model, no text, no watermark.",
    body.negative?.trim() ? `Avoid: ${body.negative.trim()}.` : "",
  ];
  return lines.filter(Boolean).join(" ");
}

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const key = sanitizeGoogleKey();
  if (!key) {
    return NextResponse.json(
      { error: "Görsel servisi yapılandırılmamış. Lütfen yönetici ile iletişime geçin." },
      { status: 500 },
    );
  }

  try {
    const body = (await req.json()) as StudioGenerateRequest;

    if (!body.prompt?.trim()) {
      return NextResponse.json({ error: "Bir açıklama yazın." }, { status: 400 });
    }
    const ratio = FORMAT_RATIO[body.format ?? ""];
    if (!ratio) {
      return NextResponse.json({ error: "Geçersiz format." }, { status: 400 });
    }

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
    const styleRefs = (body.styleImages ?? []).filter(Boolean).slice(0, 2);
    for (const ref of styleRefs) {
      const parsed = parseDataUrl(ref);
      if (!parsed) {
        return NextResponse.json(
          { error: "Stil referansı okunamadı veya çok büyük (maks. 6MB)." },
          { status: 400 },
        );
      }
      parts.push({ inlineData: await shrinkStyleImage(parsed) });
    }
    parts.push({ text: buildStudioPrompt(body, styleRefs.length > 0) });

    const ai = new GoogleGenAI({ apiKey: key });
    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user" as const, parts }],
      config: {
        responseModalities: ["IMAGE", "TEXT"],
        thinkingConfig: { thinkingBudget: 0 },
        imageConfig: { aspectRatio: ratio },
      } as never,
    });

    const outParts =
      (result as { candidates?: Array<{ content?: { parts?: unknown[] } }> })
        .candidates?.[0]?.content?.parts ?? [];
    const imgPart = (outParts as Array<{ inlineData?: { mimeType: string; data: string } }>).find(
      (p) => p.inlineData?.mimeType?.startsWith("image/"),
    );
    if (!imgPart?.inlineData) {
      return NextResponse.json({ error: "Üretim başarısız oldu, tekrar deneyin." }, { status: 500 });
    }

    return NextResponse.json({
      image: `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`,
    });
  } catch (err) {
    console.error("[v1/studio/generate] error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Üretim sırasında bir sorun oluştu, tekrar deneyin." },
      { status: 500 },
    );
  }
}
