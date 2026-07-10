import { loadEnvConfig } from "@next/env";
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/remaura/uretim-3d/auth";
import {
  buildDesenPrompt,
  NAKKAS_STYLES,
  type NakkasDesenParams,
  type NakkasStyleKey,
} from "@/lib/remaura/nakkas/prompts";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * NAKKAŞ — DESEN ÜRETİCİ (izole deney).
 * Sabit işçilik reçetesi + tarz (preset/manuel) → Gemini ile usta-kalite,
 * taşsız, derin-rölyefli, 3D-uygun ornament görseli. Süper-admin geçitli.
 */

const GEMINI_MODEL = "gemini-3.1-flash-image-preview";

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

/**
 * Kare tuvale OTUR — DİSTORSİYONSUZ. Deseni ASLA kırpma/çekiştirme yapmayız
 * (kırpma ornamenti yer, çekiştirme oranı bozar). Gemini'ye baştan doğru en-boy
 * (yuzey=1:1, band=16:9) ürettiriyoruz; burada sadece "contain" ile (bozmadan,
 * gerekirse koyu padle) sabit kareye getiriyoruz. 1:1 gelince pad'e gerek kalmaz.
 */
async function frameSquare(base64: string): Promise<string> {
  try {
    const sharp = (await import("sharp")).default;
    const buf = Buffer.from(base64, "base64");
    const out = await sharp(buf)
      .resize(1024, 1024, { fit: "contain", position: "centre", background: { r: 22, g: 22, b: 24, alpha: 1 } })
      .jpeg({ quality: 92 })
      .toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    return `data:image/png;base64,${base64}`;
  }
}

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const googleKey = sanitizeGoogleKey();
  if (!googleKey) {
    return NextResponse.json({ error: "Servis yapılandırılmamış." }, { status: 500 });
  }

  try {
    const body = (await req.json()) as NakkasDesenParams;
    const style = body.style && body.style in NAKKAS_STYLES ? (body.style as NakkasStyleKey) : undefined;
    const manual = typeof body.manual === "string" ? body.manual : undefined;
    if (!style && !manual?.trim()) {
      return NextResponse.json({ error: "Tarz seçin veya açıklama yazın." }, { status: 400 });
    }

    const mode = body.mode === "band" ? "band" : "yuzey";
    const promptUsed = buildDesenPrompt({ style, manual, mode });

    const ai = new GoogleGenAI({ apiKey: googleKey });
    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user" as const, parts: [{ text: promptUsed }] }],
      config: {
        responseModalities: ["IMAGE", "TEXT"],
        thinkingConfig: { thinkingBudget: 0 },
        // Baştan doğru en-boy iste (kırpma/çekiştirme yerine): yuzey=kare, band=geniş.
        imageConfig: { aspectRatio: mode === "band" ? "16:9" : "1:1" },
      } as never,
    });

    const parts =
      (result as { candidates?: Array<{ content?: { parts?: unknown[] } }> })
        .candidates?.[0]?.content?.parts ?? [];
    const imgPart = (parts as Array<{ inlineData?: { mimeType: string; data: string } }>).find(
      (p) => p.inlineData?.mimeType?.startsWith("image/"),
    );
    if (!imgPart?.inlineData) {
      return NextResponse.json({ error: "Desen üretilemedi, tekrar deneyin." }, { status: 500 });
    }

    const image = await frameSquare(imgPart.inlineData.data);
    return NextResponse.json({ image, promptUsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("[nakkas/desen] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
