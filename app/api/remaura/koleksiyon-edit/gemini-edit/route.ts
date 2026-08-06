import { loadEnvConfig } from "@next/env";
import { GoogleGenAI } from "@google/genai";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { logWarning } from "@/lib/remaura/warnings/log";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 300;

const MODEL = "gemini-3.1-flash-image";

// ─── Watermark crop ───────────────────────────────────────────────────────────
// Gemini çıktısının alt kısmındaki logoyu kırpar (gemini-uret ile aynı yöntem)

async function cropGeminiWatermark(base64: string): Promise<string> {
  try {
    const sharp = (await import("sharp")).default;
    const buf = Buffer.from(base64, "base64");
    const meta = await sharp(buf).metadata();
    const w = meta.width ?? 1024;
    const h = meta.height ?? 1024;
    const cropH = Math.floor(h * 0.94); // son %6 kırp
    const result = await sharp(buf)
      .extract({ left: 0, top: 0, width: w, height: cropH })
      .png()
      .toBuffer();
    return result.toString("base64");
  } catch {
    return base64;
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function requireSuperAdmin(): Promise<
  { ok: true } | { ok: false; response: NextResponse }
> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Oturum gerekli" }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!isRemauraSuperAdminUserId(user.id) && profile?.role !== "admin") {
    return { ok: false, response: NextResponse.json({ error: "Yetkisiz" }, { status: 403 }) };
  }
  return { ok: true };
}

// ─── Image resolve ──────────────────────────────────────────────────────────

async function resolveBase64(input: string): Promise<{ data: string; mime: string }> {
  if (input.startsWith("http://") || input.startsWith("https://")) {
    const res = await fetch(input, { cache: "no-store" });
    if (!res.ok) throw new Error(`Görsel fetch başarısız: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get("content-type") ?? "image/png";
    return { data: buf.toString("base64"), mime };
  }
  const mimeMatch = input.match(/^data:([^;]+);base64,/);
  const mime = mimeMatch?.[1] ?? "image/png";
  const data = input.includes(",") ? input.split(",")[1] : input;
  return { data, mime };
}

// ─── Result extract ───────────────────────────────────────────────────────────

type GeminiResult = {
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: unknown[] } | null;
  }> | null;
};

async function extractImage(result: GeminiResult): Promise<string> {
  const candidate = result.candidates?.[0];
  const finishReason = candidate?.finishReason;
  const parts = candidate?.content?.parts ?? [];
  const imgPart = (parts as Array<{ thought?: boolean; inlineData?: { mimeType: string; data: string } }>)
    .find(p => !p.thought && p.inlineData?.mimeType?.startsWith("image/"));
  if (!imgPart?.inlineData) {
    const textParts = (parts as Array<{ text?: string; thought?: boolean }>)
      .filter(p => !p.thought && p.text).map(p => p.text).join(" ");
    throw new Error(`no_image | finishReason=${finishReason} | text=${textParts.slice(0, 120)}`);
  }
  // Gemini logosunu kırp — çıktı her zaman PNG olarak döner
  const cropped = await cropGeminiWatermark(imgPart.inlineData.data);
  return `data:image/png;base64,${cropped}`;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const rawKey = process.env.GOOGLE_API_KEY ?? "";
  const googleKey = rawKey
    .split("")
    .filter((ch) => ch.charCodeAt(0) > 31 && ch.charCodeAt(0) < 256)
    .join("")
    .trim() || undefined;

  if (!googleKey) {
    logWarning({ tool: "koleksiyon-edit", action: "Düzenle (Recolor/Değiştir)", provider: "gemini", status: 500, raw: "GOOGLE_API_KEY yapılandırılmamış" });
    return NextResponse.json({ error: "Servis yapılandırılmamış, lütfen yöneticiye bildirin." }, { status: 500 });
  }

  try {
    const body = await req.json() as { image?: string; instruction?: string };
    const { image, instruction } = body;

    if (!image) return NextResponse.json({ error: "Görsel gerekli." }, { status: 400 });
    if (!instruction?.trim()) return NextResponse.json({ error: "Değişiklik talimatı gerekli." }, { status: 400 });

    const { data: base64, mime } = await resolveBase64(image);
    const mimeType = (mime || "image/png") as "image/jpeg" | "image/png" | "image/webp";

    const editPrompt = [
      `You are editing a luxury jewelry product photograph. Apply ONLY this change: "${instruction.trim()}".`,
      `CRITICAL RULES:`,
      `1. Apply the requested change precisely, but change NOTHING else. Everything not mentioned in the instruction — background, lighting, camera angle, composition, overall shape, and all other motifs — must stay pixel-for-pixel identical.`,
      `2. Any newly added motif must be sculpted in the same metal and craftsmanship style as the surrounding jewelry and fully integrated into the piece (unless the instruction explicitly asks to change the metal or color).`,
      `3. Do NOT replace the whole piece. Do NOT turn it into a realistic standalone object. Do NOT change the jewelry type.`,
      `4. Output a photorealistic jewelry product image of the SAME piece with only the requested change applied.`,
    ].join(" ");

    const ai = new GoogleGenAI({ apiKey: googleKey });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout_240s — düzenleme çok uzun sürdü")), 240_000)
    );

    const result = await Promise.race([
      ai.models.generateContent({
        model: MODEL,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType, data: base64 } },
              { text: editPrompt },
            ],
          },
        ],
        config: { responseModalities: ["IMAGE", "TEXT"], thinkingConfig: { thinkingBudget: 0 } } as never,
      }),
      timeoutPromise,
    ]);

    const dataUrl = await extractImage(result as GeminiResult);
    return NextResponse.json({ image: dataUrl });
  } catch (err: unknown) {
    console.error("[gemini-edit] error:", err);
    const e = err as { status?: number; message?: string };
    const status = e?.status ?? 500;
    logWarning({ tool: "koleksiyon-edit", action: "Düzenle (Recolor/Değiştir)", provider: "gemini", status: e?.status ?? null, raw: e?.message ?? String(err) });
    let userMsg = "Düzenleme başarısız oldu, lütfen tekrar deneyin.";
    if (status === 401 || status === 403) userMsg = "Yetkilendirme hatası, lütfen yöneticiye bildirin.";
    else if (status === 429) userMsg = "İstek limiti aşıldı, lütfen birkaç dakika sonra tekrar deneyin.";
    else if (status === 503 || status === 504) userMsg = "Servis geçici olarak meşgul, lütfen tekrar deneyin.";
    return NextResponse.json({ error: userMsg }, { status: 500 });
  }
}
