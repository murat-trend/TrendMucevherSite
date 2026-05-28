import { loadEnvConfig } from "@next/env";
import { createHash } from "crypto";
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

// Evrensel Stil Transfer Motoru — Tip Tanımı
export type AnalizSonucu = {
  takiTipi: string;          // "Kolye ucu / yüzük vb." — Türkçe
  konu: string;              // "Medusa — Yunan mitolojisi Gorgon"
  mevcutSahne: string;       // "Medusa yılanla savaşıyor, çığlık atan yüz"
  stilAciklamasi: string;    // Müşteriye gösterilecek Türkçe özet (2-3 cümle)
  styleLock: {
    metal_finish: string;        // "high-shine polished 18k yellow gold, smooth raised borders"
    surface_technique: string;   // "micro-pave stone setting tightly framed by gold edges"
    decorative_motifs: string;   // "asymmetric organic vine tendrils, delicate gold wire scrolls"
    stone_treatment: string;     // "brilliant-cut clear diamonds with marquise-cut soft pastel pink accents"
    overall_mood: string;        // "whimsical romantic luxury, vintage Victorian haute joaillerie"
    photography_setting: string; // "clean seamless solid white background, soft studio lighting"
  };
  oneriler: string[];        // 4 Türkçe yeni tasarım fikri
};

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "Servis yapılandırılmamış, lütfen yöneticiye bildirin." }, { status: 500 });
  }

  let image: string;
  try {
    const body = await req.json() as { image?: string };
    image = body.image ?? "";
  } catch {
    return NextResponse.json({ error: "Görsel okunamadı. Lütfen tekrar deneyin." }, { status: 400 });
  }
  if (!image) {
    return NextResponse.json({ error: "Görsel gerekli." }, { status: 400 });
  }

  // URL mi, base64 mi? — R2/CDN URL'leri sunucu tarafında fetch edip base64'e çeviriyoruz
  let mime: string;
  let base64Data: string;

  if (image.startsWith("http://") || image.startsWith("https://")) {
    try {
      const fetched = await fetch(image);
      if (!fetched.ok) {
        return NextResponse.json({ error: "Görsel indirilemedi." }, { status: 400 });
      }
      const arrayBuf = await fetched.arrayBuffer();
      mime = fetched.headers.get("content-type") ?? "image/jpeg";
      base64Data = Buffer.from(arrayBuf).toString("base64");
    } catch {
      return NextResponse.json({ error: "Görsel indirilemedi." }, { status: 400 });
    }
  } else {
    mime = image.match(/data:([^;]+);/)?.[1] ?? "image/jpeg";
    base64Data = image.includes(",") ? image.split(",")[1] : image;
  }

  // ── Cache kontrolü ────────────────────────────────────────────────────────
  const imageHash = createHash("sha256").update(base64Data).digest("hex");

  try {
    const { createClient: createAdminClient } = await import("@supabase/supabase-js");
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: cached } = await admin
      .from("cache_analiz")
      .select("analiz_sonucu")
      .eq("image_hash", imageHash)
      .maybeSingle();

    if (cached?.analiz_sonucu) {
      // Cache hit — OpenAI'a gitme, istatistikleri güncelle (fire-and-forget)
      void admin.rpc("cache_analiz_hit", { p_hash: imageHash });
      console.log("[analiz] cache hit:", imageHash.slice(0, 12));
      return NextResponse.json(cached.analiz_sonucu);
    }
  } catch (cacheErr) {
    // Cache okuma hatası — sessizce geç, OpenAI'a git
    console.warn("[analiz] cache read error (table may not exist yet):", (cacheErr as Error)?.message);
  }

  try {
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey });

    const systemPrompt = `Sen lüks mücevher tasarım dünyasında stil ve işçilik DNA'sını izole eden bir ekspertiz yazılımısın.
Sana yüklenen mücevher görselini yapısal olarak analiz et ve KESİNTİSİZ bir JSON objesi döndür.

CRITICAL INSTRUCTIONS FOR STYLE LOCK:
1. Inside the "styleLock" object, ALL fields must be written strictly in ENGLISH.
2. DO NOT mention any specific jewelry types (like ring, necklace, earring, bracelet) inside the "styleLock" fields. Focus ONLY on textures, materials, techniques, motifs and concepts.
3. The goal is to extract design genes so they can be seamlessly transferred to ANY other object or subject matter later.
4. Be extremely specific — describe exact metal finish types, exact technique names, exact stone cuts and colors.

Return exactly this JSON structure:
{
  "takiTipi": "Takının türü (Türkçe — kolye ucu / yüzük / küpe / bilezik / broş vb.)",
  "konu": "Görseldeki ana figür, harf veya tema açıklaması (Türkçe, 1-2 cümle)",
  "mevcutSahne": "Tasarımın yerleşim ve kompozisyon detayı (Türkçe, teknik)",
  "stilAciklamasi": "Müşteriye gösterilecek malzeme ve estetik dilin Türkçe özeti (2-3 cümle)",
  "styleLock": {
    "metal_finish": "Describe metal color, purity indicator, and exact surface finish (e.g., high-shine polished 18k yellow gold, smooth raised borders with matte recessed areas)",
    "surface_technique": "Describe the primary visual craftsmanship technique in precise detail (e.g., micro-pavé stone setting tightly framed by polished gold bezel edges, hand-engraved scrollwork)",
    "decorative_motifs": "Describe ALL secondary ornamental elements (e.g., asymmetric organic vine tendrils, delicate gold wire scrolls, miniature floral clusters at intersections)",
    "stone_treatment": "Describe gemstone types, cuts, color palette, and setting style. If no stones: 'no gemstones, metal only'. (e.g., brilliant-cut clear diamonds with marquise-cut soft pastel pink and light aquamarine blue accent stones in bezel settings)",
    "overall_mood": "The design era, aesthetic tier and emotional quality (e.g., whimsical romantic luxury, vintage Victorian haute joaillerie, bold modern minimalism)",
    "photography_setting": "Camera angle, lighting style and background to clone the photo composition (e.g., 45-degree overhead angle, soft diffused studio lighting, clean seamless solid white background, high-end product photography)"
  },
  "oneriler": [
    "Bu referansın STİL DNA'sını kullanan yeni bir takı tasarım fikri (Türkçe). Örnek: 'Aynı filigre tekniğiyle lotus ve yusufçuk motifli yeni tasarım'",
    "İkinci öneri — farklı motif ama aynı metal ve işçilik tekniği",
    "Üçüncü öneri — aynı koleksiyona ait olabilecek tamamlayıcı parça fikri",
    "Dördüncü öneri — aynı stil ama farklı bir kültürel motif veya sembol"
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mime};base64,${base64Data}`, detail: "high" },
            },
            { type: "text", text: "Analyze this jewelry design and extract its complete style DNA into the specified JSON schema." },
          ],
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "";

    let sonuc: AnalizSonucu;
    try {
      sonuc = JSON.parse(raw.trim());
    } catch {
      console.error("[analiz] JSON parse failed:", raw);
      return NextResponse.json({ error: "Analiz sonucu işlenemedi." }, { status: 500 });
    }

    // ── Cache'e kaydet (fire-and-forget, hata olursa sessiz geç) ────────────
    try {
      const { createClient: createAdminClient } = await import("@supabase/supabase-js");
      const admin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
      );
      await admin.from("cache_analiz").upsert(
        { image_hash: imageHash, analiz_sonucu: sonuc, hit_count: 0, last_hit_at: new Date().toISOString() },
        { onConflict: "image_hash", ignoreDuplicates: true }
      );
      console.log("[analiz] cached:", imageHash.slice(0, 12));
    } catch (saveErr) {
      console.warn("[analiz] cache save error:", (saveErr as Error)?.message);
    }

    return NextResponse.json(sonuc);
  } catch (err: unknown) {
    console.error("[analiz] error:", err);
    return NextResponse.json({ error: "Stil analizi başarısız oldu." }, { status: 500 });
  }
}
