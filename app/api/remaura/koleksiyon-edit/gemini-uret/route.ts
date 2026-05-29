import { loadEnvConfig } from "@next/env";
import { GoogleGenAI } from "@google/genai";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import type { AnalizSonucu } from "../analiz/route";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 120;

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

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  // BOM (charCode 65279) ve diger gorunmez/non-Latin1 karakterleri temizle
  const rawKey = process.env.GOOGLE_API_KEY ?? "";
  const googleKey = rawKey
    .split("")
    .filter((ch) => ch.charCodeAt(0) > 31 && ch.charCodeAt(0) < 256)
    .join("")
    .trim() || undefined;

  if (!googleKey) {
    return NextResponse.json({ error: "Servis yapılandırılmamış, lütfen yöneticiye bildirin." }, { status: 500 });
  }

  try {
    const { styleLock, new_design_concept } = await req.json() as {
      styleLock: AnalizSonucu["styleLock"];
      new_design_concept: string;
    };

    if (!styleLock || !new_design_concept) {
      return NextResponse.json(
        { error: "Eksik parametre: styleLock ve new_design_concept gerekli." },
        { status: 400 }
      );
    }

    // ── STYLE LOCK prompt — kilitli DNA doğrudan embed ediliyor ─────────────
    const finalPrompt = `
**STYLE LOCK — ABSOLUTE PRIORITY:**
The following design DNA must be replicated with 100% fidelity. All stylistic decisions MUST conform to this locked specification. No creative deviation is permitted.

METAL_FINISH: ${styleLock.metal_finish}
SURFACE_TECHNIQUE: ${styleLock.surface_technique}
DECORATIVE_MOTIFS: ${styleLock.decorative_motifs}
STONE_TREATMENT: ${styleLock.stone_treatment}
OVERALL_MOOD: ${styleLock.overall_mood}
**END STYLE LOCK.**

---

**GENERATION TASK:**
Create a high-end luxury jewelry studio photograph of: ${new_design_concept}

**STRICT APPLICATION RULES:**
1. REPLICATE THE EXACT STYLE: Every visual characteristic in the STYLE LOCK above (metal finish, surface technique, decorative motifs, stone treatment, mood) MUST be precisely applied to this piece.
2. NO DEVIATIONS: Do NOT introduce any new stylistic elements, techniques, or interpretations not present in the STYLE LOCK. The piece must look like it belongs to the exact same collection as the reference.
3. PHOTOGRAPHIC PRESENTATION: ${styleLock.photography_setting}
4. NEGATIVE: No hands, no model, no body parts, no text overlays, no watermarks, no blurred elements.
`.trim();

    const ai = new GoogleGenAI({ apiKey: googleKey });

    const response = await ai.models.generateImages({
      model: "imagen-3.0-generate-002",
      prompt: finalPrompt,
      config: {
        numberOfImages: 1,
        aspectRatio: "1:1",
        outputMimeType: "image/jpeg",
        // @ts-expect-error — compressionQuality is valid but not typed yet in SDK
        compressionQuality: 95,
      },
    });

    const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;

    if (!imageBytes) {
      return NextResponse.json({ error: "Görsel üretilemedi, lütfen tekrar deneyin." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      image: `data:image/jpeg;base64,${imageBytes}`,
    });

  } catch (err: unknown) {
    console.error("[gemini-uret] error:", err);
    const e = err as { status?: number; message?: string };
    const status = e?.status ?? 500;
    let userMsg = "Görsel üretimi başarısız oldu, lütfen tekrar deneyin.";
    if (status === 401 || status === 403) userMsg = "Yetkilendirme hatası, lütfen yöneticiye bildirin.";
    else if (status === 429) userMsg = "İstek limiti aşıldı, lütfen birkaç dakika sonra tekrar deneyin.";
    else if (status === 503 || status === 504) userMsg = "Servis geçici olarak meşgul, lütfen tekrar deneyin.";
    return NextResponse.json({ error: userMsg }, { status: 500 });
  }
}
