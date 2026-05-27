import { loadEnvConfig } from "@next/env";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";

loadEnvConfig(process.cwd());
export const runtime = "nodejs";
export const maxDuration = 120;

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
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !text.trim()) return text;
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system: "You are a translator. The user will send a jewelry design description in Turkish, English, German, or Russian. Translate it to English. Return only the English translation, nothing else.",
      messages: [{ role: "user", content: text }],
    });
    const block = msg.content[0];
    return block?.type === "text" ? block.text.trim() : text;
  } catch {
    return text;
  }
}

const TAKI_TR: Record<string, string> = {
  "Yüzük": "yüzük", "Kolye": "kolye ucu", "Küpe": "küpe çifti",
  "Bilezik": "bilezik", "Broş": "broş",
};
const METAL_TR: Record<string, string> = {
  "Sarı Altın": "sarı altın", "Rose Gold": "rose gold",
  "Beyaz Altın": "beyaz altın", "Gümüş": "gümüş",
  "Oksitlenmiş Gümüş": "oksitlenmiş antik gümüş",
};
const KAMERA: Record<string, string> = {
  "Yüzük": "45-degree overhead angle, ring band fully visible, top face clearly shown, e-commerce jewelry standard angle",
  "Kolye": "front-facing view, pendant centered, chain visible on both sides",
  "Küpe": "front-facing view, pair of earrings side by side, symmetric composition",
  "Bilezik": "45-degree overhead angle, bracelet showing both inner and outer surface",
  "Broş": "perfectly flat front-facing view, entire brooch visible",
};

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const googleKey = process.env.GOOGLE_API_KEY;
  if (!googleKey) return NextResponse.json({ error: "GOOGLE_API_KEY yapılandırılmamış." }, { status: 500 });

  const body = await req.json() as {
    takiTipi?: string;
    tema?: string;
    metalRengi?: string;
    formKarakterleri?: string[];
    referansGorsel: string;
    numImages?: number;
  };
  const { takiTipi, tema, metalRengi, formKarakterleri, referansGorsel, numImages = 1 } = body;
  if (!referansGorsel) return NextResponse.json({ error: "Referans görsel zorunlu." }, { status: 400 });

  const takiTr  = TAKI_TR[takiTipi ?? ""] ?? "takı";
  const metalTr = METAL_TR[metalRengi ?? ""] ?? "gümüş";
  const kamera  = KAMERA[takiTipi ?? ""] ?? "professional product photography angle";
  const formStr = Array.isArray(formKarakterleri) && formKarakterleri.length > 0
    ? formKarakterleri.join(", ") : "";
  const temaEn  = tema?.trim() ? await translateToEnglish(tema) : "";

  const prompt = [
    `Referans görseldeki takının stilini birebir kullanarak yeni bir ${metalTr} ${takiTr} tasarla.`,
    `Korunacaklar: aynı metal rengi ve yüzey işlemi, aynı teknik (filigre/gravür/döküm), aynı dekoratif motifler, aynı taş rengi ve yerleşimi.`,
    `Değişecek: sadece takı tipi — ${takiTr} olacak, referansın formu değil.`,
    formStr ? `Form karakteri: ${formStr}.` : "",
    temaEn ? `Theme: ${temaEn}.` : "",
    `Camera: ${kamera}. Studio background (black or white). No hands, no model, no body parts. Single centered jewelry piece. Professional jewelry photography quality. Ultra detailed metal surface.`,
  ].filter(Boolean).join(" ");

  const raw  = referansGorsel.includes(",") ? referansGorsel.split(",")[1] : referansGorsel;
  const mime = (referansGorsel.match(/data:([^;]+);/)?.[1] ?? "image/jpeg");

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: googleKey });

    const results: string[] = [];
    const count = Math.min(numImages, 4);

    // Paralel üretim
    await Promise.all(Array.from({ length: count }, async (_, i) => {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-image-preview",
        contents: [
          { text: prompt },
          { inlineData: { mimeType: mime, data: raw } },
        ],
        config: {
          responseModalities: ["IMAGE"],
        } as any,
      });

      // Thought olmayan image part'ı bul
      const parts = response.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if (!part.thought && part.inlineData?.mimeType?.startsWith("image/")) {
          results[i] = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
    }));

    const images = results.filter(Boolean);
    if (images.length === 0)
      return NextResponse.json({ error: "Görsel üretilemedi." }, { status: 500 });

    return NextResponse.json({ images });

  } catch (err: unknown) {
    console.error("[gemini-uret] error:", err);
    const e = err as { message?: string };
    return NextResponse.json({ error: e?.message ?? "Gemini üretimi başarısız." }, { status: 500 });
  }
}
