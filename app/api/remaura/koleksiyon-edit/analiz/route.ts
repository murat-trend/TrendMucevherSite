import { loadEnvConfig } from "@next/env";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { getOpenAIApiKey } from "@/lib/api/openai";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 60;

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

export type AnalizSonucu = {
  takiTipi: string;          // "kolye ucu / madalyon"
  konu: string;              // "Medusa — Yunan mitolojisi Gorgon"
  mevcutSahne: string;       // "Medusa yılanla savaşıyor, çığlık atan yüz"
  stilAciklamasi: string;    // Türkçe özet (kullanıcıya gösterilir)
  stilPrompt: string;        // İngilizce generation prompt (flux için)
  oneriler: string[];        // 4 Türkçe kompozisyon önerisi
};

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI API anahtarı yapılandırılmamış." }, { status: 500 });
  }

  const { image } = await req.json() as { image: string };
  if (!image) {
    return NextResponse.json({ error: "Görsel gerekli." }, { status: 400 });
  }

  // base64 data URL'den saf base64 ve mime çıkar
  const mime = (image.match(/data:([^;]+);/)?.[1] ?? "image/jpeg");
  const base64Data = image.includes(",") ? image.split(",")[1] : image;

  try {
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey });

    const systemPrompt = `Sen bir lüks mücevher stil analiz uzmanısın.
Sana bir referans mücevher görseli verilecek.
Bu görseli analiz edip aşağıdaki JSON formatında döndür. Başka hiçbir şey yazma.

KRİTİK KURALLAR:
1. stilPrompt SADECE teknik stil bilgisi içermeli — takı tipi (yüzük/küpe/kolye) ASLA yazma
2. stilPrompt metal rengini, yüzey dokusunu, işçilik tekniğini, motifi kesin olarak belirt
3. Öneriler fotoğraf sahnesi değil — aynı stil DNA'sıyla yapılabilecek YENİ takı tasarım fikirleri olmalı

{
  "takiTipi": "kolye ucu / yüzük / bilezik / küpe vb.",
  "konu": "Görseldeki ana motif veya konu (Türkçe, 1-2 cümle)",
  "mevcutSahne": "Mevcut tasarımın kısa teknik açıklaması (Türkçe)",
  "stilAciklamasi": "Malzeme, teknik ve estetik dilin Türkçe özeti (2-3 cümle)",
  "stilPrompt": "ONLY IN ENGLISH — describe EXACTLY: (1) metal color and finish, (2) surface technique, (3) decorative motifs, (4) stone treatment, (5) overall mood. FORMAT: '[metal] [finish], [technique], [motifs], [stone details], [mood]'. NEVER mention jewelry type. Example: 'oxidized silver, filigree wirework technique, rose and butterfly botanical motifs, small amethyst accent stones, dark dramatic antique mood, high detail craftsmanship'",
  "oneriler": [
    "Bu referansın STİL DNA'sını kullanan yeni bir takı tasarım fikri — kısa, üretilebilir tema (Türkçe). Örnek: 'Aynı filigre tekniğiyle lotus ve yusufçuk motifli kolye ucu'",
    "İkinci öneri — farklı motif ama aynı metal ve işçilik tekniği",
    "Üçüncü öneri — aynı koleksiyona ait olabilecek tamamlayıcı parça fikri",
    "Dördüncü öneri — aynı stil ama farklı bir kültürel motif veya sembol"
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 800,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mime};base64,${base64Data}`, detail: "high" },
            },
            { type: "text", text: "Bu mücevher görselini analiz et ve JSON döndür." },
          ],
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "";

    // JSON blok varsa çıkar
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? raw.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? jsonMatch[1] : raw;

    let sonuc: AnalizSonucu;
    try {
      sonuc = JSON.parse(jsonStr.trim());
    } catch {
      console.error("[analiz] JSON parse failed:", raw);
      return NextResponse.json({ error: "Analiz sonucu işlenemedi." }, { status: 500 });
    }

    return NextResponse.json(sonuc);
  } catch (err: unknown) {
    console.error("[analiz] error:", err);
    return NextResponse.json({ error: "Stil analizi başarısız oldu." }, { status: 500 });
  }
}
