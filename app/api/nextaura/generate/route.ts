import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const { prompt, firmId, lang } = await req.json() as {
    prompt: string;
    firmId: string;
    lang: string;
  };

  if (!prompt?.trim() || !firmId) {
    return NextResponse.json({ error: "Prompt ve firma gerekli." }, { status: 400 });
  }

  // Firma kredi kontrolü
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: firm } = await supabase
    .from("nextaura_firms")
    .select("id, credits, plan")
    .eq("id", firmId)
    .eq("active", true)
    .maybeSingle();

  if (!firm) {
    return NextResponse.json({ error: "Firma bulunamadı." }, { status: 404 });
  }
  if (firm.credits < 1) {
    return NextResponse.json({ error: "Yetersiz kredi. Lütfen kuyumcu ile iletişime geçin." }, { status: 402 });
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Servis yapılandırılmamış." }, { status: 500 });
  }

  // Prompt'u AI ile optimize et
  const optimizedPrompt = await optimizePrompt(prompt, lang, apiKey);

  // Görsel üret — Imagen 3
  try {
    const genRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt: optimizedPrompt }],
          parameters: { sampleCount: 2, aspectRatio: "1:1" },
        }),
      }
    );

    const genData = await genRes.json();
    if (!genRes.ok) {
      console.error("Imagen error:", genData);
      return NextResponse.json({ error: "Görsel üretilemedi." }, { status: 502 });
    }

    const images: string[] = (genData.predictions ?? []).map(
      (p: { bytesBase64Encoded?: string }) =>
        `data:image/png;base64,${p.bytesBase64Encoded ?? ""}`
    ).filter((s: string) => s.length > 30);

    if (images.length === 0) {
      return NextResponse.json({ error: "Görsel üretilemedi." }, { status: 502 });
    }

    // Kredi düş + ledger kaydı (service role ile — RLS bypass)
    const svcUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    const newCredits = firm.credits - 1;

    if (svcUrl && svcKey) {
      const svc = createServiceClient(svcUrl, svcKey);
      await svc.from("nextaura_firms").update({ credits: newCredits }).eq("id", firmId);
      await svc.from("nextaura_credit_ledger").insert({
        firm_id: firmId,
        amount: -1,
        type: "spend",
        description: `Tasarım üretimi — "${prompt.slice(0, 60)}${prompt.length > 60 ? "…" : ""}"`,
        balance_after: newCredits,
        actor: "system",
      });
    } else {
      await supabase.from("nextaura_firms").update({ credits: newCredits }).eq("id", firmId);
    }

    return NextResponse.json({ images, optimizedPrompt });
  } catch (e: unknown) {
    const err = e as { message?: string };
    return NextResponse.json({ error: err?.message ?? "Üretim başarısız." }, { status: 500 });
  }
}

async function optimizePrompt(userPrompt: string, lang: string, apiKey: string): Promise<string> {
  try {
    const systemInstruction = `You are a jewelry design prompt optimizer for AI image generation.
Convert the user's description into a detailed English prompt for generating a professional jewelry product photo.
Focus on: jewelry type, metal color, gemstones, style, craftsmanship details.
Format: professional product photography, white background, studio lighting, ultra detailed, 8k.
Return ONLY the optimized prompt, nothing else.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { maxOutputTokens: 200, temperature: 0.7 },
        }),
      }
    );

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
    return text?.trim() || userPrompt;
  } catch {
    return userPrompt;
  }
}
