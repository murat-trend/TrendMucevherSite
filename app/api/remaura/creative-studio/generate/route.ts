import { loadEnvConfig } from "@next/env";
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/remaura/uretim-3d/auth";
import { aspectRatioFor, buildImagePrompt } from "@/lib/remaura/creative-studio/prompts";
import type { GenerateRequest } from "@/lib/remaura/creative-studio/types";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * AI CREATIVE STUDIO — üretim ucu (izole, süper-admin geçitli).
 * type=image|thumbnail → görsel üretimi; type=video → sunucu render henüz
 * bağlanmadı, genel mesaj döner. Servis adları client'a asla sızmaz.
 */

const MODEL = "gemini-3.1-flash-image-preview";
const MAX_PRODUCT_IMAGE_BYTES = 6 * 1024 * 1024;

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
  if (m[2].length * 0.75 > MAX_PRODUCT_IMAGE_BYTES) return null;
  return { mimeType: m[1], data: m[2] };
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
    const body = (await req.json()) as GenerateRequest;

    if (body.type === "video") {
      return NextResponse.json(
        { error: "Sunucu tarafı video üretimi yakında — şimdilik Timeline'dan WEBM dışa aktarın." },
        { status: 501 },
      );
    }
    if (body.type !== "image" && body.type !== "thumbnail") {
      return NextResponse.json({ error: "Geçersiz üretim türü." }, { status: 400 });
    }
    if (!body.prompt?.trim() && !body.productImage) {
      return NextResponse.json(
        { error: "Bir açıklama yazın veya ürün görseli yükleyin." },
        { status: 400 },
      );
    }

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
    if (body.productImage) {
      const parsed = parseDataUrl(body.productImage);
      if (!parsed) {
        return NextResponse.json(
          { error: "Ürün görseli okunamadı veya çok büyük (maks. 6MB)." },
          { status: 400 },
        );
      }
      parts.push({ inlineData: parsed });
    }
    parts.push({ text: buildImagePrompt(body) });

    const ai = new GoogleGenAI({ apiKey: key });
    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user" as const, parts }],
      config: {
        responseModalities: ["IMAGE", "TEXT"],
        thinkingConfig: { thinkingBudget: 0 },
        imageConfig: { aspectRatio: aspectRatioFor(body.platform, body.type) },
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
    console.error("[creative-studio/generate] error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Üretim sırasında bir sorun oluştu, tekrar deneyin." },
      { status: 500 },
    );
  }
}
