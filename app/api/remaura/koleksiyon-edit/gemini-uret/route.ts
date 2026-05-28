import { loadEnvConfig } from "@next/env";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";

loadEnvConfig(process.cwd());
export const runtime = "nodejs";
export const maxDuration = 120;

const MODEL = "gemini-3.1-flash-image-preview";

async function requireAdmin() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, response: NextResponse.json({ error: "Oturum gerekli" }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!isRemauraSuperAdminUserId(user.id) && profile?.role !== "admin")
    return { ok: false as const, response: NextResponse.json({ error: "Yetkisiz" }, { status: 403 }) };
  return { ok: true as const };
}

async function translateToEnglish(text: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || !text.trim()) return text;
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: key });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system: "Translate jewelry design descriptions from Turkish, German, or Russian to English. Return only the translation.",
      messages: [{ role: "user", content: text }],
    });
    const block = msg.content[0];
    return block?.type === "text" ? block.text.trim() : text;
  } catch { return text; }
}

const TAKI_EN: Record<string, string> = {
  "Yüzük": "ring",
  "Kolye": "necklace pendant",
  "Küpe": "pair of earrings",
  "Bilezik": "bracelet",
  "Broş": "brooch",
};

const METAL_EN: Record<string, string> = {
  "Sarı Altın": "yellow gold",
  "Rose Gold": "rose gold",
  "Beyaz Altın": "white gold",
  "Gümüş": "silver",
  "Oksitlenmiş Gümüş": "oxidized antique silver",
};

const KAMERA: Record<string, string> = {
  "Yüzük": "45-degree overhead angle, ring band fully visible, top face clearly shown",
  "Kolye": "front-facing view, pendant centered, chain visible on both sides",
  "Küpe": "front-facing view, pair of earrings side by side, symmetric composition",
  "Bilezik": "45-degree overhead angle, bracelet showing both inner and outer surface",
  "Broş": "perfectly flat front-facing view, entire brooch visible",
};

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const googleKey = process.env.GOOGLE_API_KEY;
  if (!googleKey) return NextResponse.json({ error: "Servis yapılandırılmamış, lütfen yöneticiye bildirin." }, { status: 500 });

  const body = await req.json() as {
    takiTipi?: string;
    metalRengi?: string;
    tema?: string;
    formKarakterleri?: string[];
    referansGorsel: string;
    numImages?: number;
  };
  const { takiTipi, metalRengi, tema, formKarakterleri, referansGorsel, numImages = 1 } = body;
  if (!referansGorsel) return NextResponse.json({ error: "Referans görsel zorunlu." }, { status: 400 });

  const takiEn  = TAKI_EN[takiTipi ?? ""] ?? "jewelry piece";
  const metalEn = METAL_EN[metalRengi ?? ""] ?? "silver";
  const kamera  = KAMERA[takiTipi ?? ""] ?? "professional jewelry photography angle";
  const formEn  = Array.isArray(formKarakterleri) && formKarakterleri.length > 0
    ? await translateToEnglish(formKarakterleri.join(", ")) : "";
  const temaEn  = tema?.trim() ? await translateToEnglish(tema) : "";

  const raw  = referansGorsel.includes(",") ? referansGorsel.split(",")[1] : referansGorsel;
  const mime = (referansGorsel.match(/data:([^;]+);/)?.[1] ?? "image/jpeg");

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: googleKey });

    // Her varyasyon için bağımsız multi-turn conversation
    const results = await Promise.all(
      Array.from({ length: Math.min(numImages, 4) }, async () => {

        // ── TURN 1: Stil analizi (TEXT only) ──────────────────────────────
        const turn1 = await ai.models.generateContent({
          model: MODEL,
          contents: [{
            role: "user",
            parts: [
              { inlineData: { mimeType: mime, data: raw } },
              {
                text:
                  "Analyze ONLY the decorative style of this jewelry. " +
                  "Describe: metal color and surface finish, craftsmanship technique, " +
                  "decorative motifs, stone type and placement, overall mood. " +
                  "Do NOT mention the jewelry type or shape.",
              },
            ],
          }],
          config: { responseModalities: ["TEXT"] } as any,
        });

        const styleAnalysis = (turn1.candidates?.[0]?.content?.parts ?? [])
          .filter((p: any) => !p.thought && p.text)
          .map((p: any) => p.text as string)
          .join("") || "elegant metalwork style";

        // ── TURN 3: Yeni takı üretimi (IMAGE + TEXT) ──────────────────────
        const generatePrompt = [
          `Using the style described above, design a new ${metalEn} ${takiEn}.`,
          `The jewelry type must be: ${takiEn}. Do not generate any other jewelry type.`,
          `Apply the same metal finish, technique, motifs and stones to the ${takiEn} form.`,
          temaEn ? `Theme accent: ${temaEn}.` : "",
          formEn ? `Form style: ${formEn}.` : "",
          `Camera: ${kamera}.`,
          `White studio background. No hands, no model, no body parts.`,
          `Single centered ${takiEn}. Professional jewelry photography. Ultra detailed.`,
        ].filter(Boolean).join(" ");

        const turn3 = await ai.models.generateContent({
          model: MODEL,
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { mimeType: mime, data: raw } },
                {
                  text:
                    "Analyze ONLY the decorative style. " +
                    "Describe metal, technique, motifs, stones, mood. " +
                    "Do NOT mention jewelry type.",
                },
              ],
            },
            {
              role: "model",
              parts: [{ text: styleAnalysis }],
            },
            {
              role: "user",
              parts: [{ text: generatePrompt }],
            },
          ],
          config: { responseModalities: ["IMAGE", "TEXT"] } as any,
        });

        // thought olmayan image part'ı bul
        const parts = (turn3.candidates?.[0]?.content?.parts ?? []) as any[];
        for (const part of parts) {
          if (!part.thought && part.inlineData?.mimeType?.startsWith("image/")) {
            return {
              image: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
              styleAnalysis,
            };
          }
        }
        return null;
      })
    );

    const validResults = results.filter(Boolean) as { image: string; styleAnalysis: string }[];
    if (validResults.length === 0)
      return NextResponse.json({ error: "Görsel üretilemedi." }, { status: 500 });

    const images = validResults.map(r => r.image);
    const styleAnalysis = validResults[0]?.styleAnalysis ?? null;
    return NextResponse.json({ images, styleAnalysis });

  } catch (err: unknown) {
    console.error("[gemini-uret] error:", err);
    const e = err as { status?: number; message?: string };
    const status = e?.status ?? 500;
    let userMsg = "Koleksiyon görseli üretilemedi, lütfen tekrar deneyin.";
    if (status === 429) userMsg = "İstek limiti aşıldı, lütfen birkaç dakika sonra tekrar deneyin.";
    else if (status === 503 || status === 504) userMsg = "Servis geçici olarak meşgul, lütfen tekrar deneyin.";
    return NextResponse.json({ error: userMsg }, { status: 500 });
  }
}
