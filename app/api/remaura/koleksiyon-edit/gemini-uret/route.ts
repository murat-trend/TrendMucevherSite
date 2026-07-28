import { loadEnvConfig } from "@next/env";
import { GoogleGenAI } from "@google/genai";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { logWarning } from "@/lib/remaura/warnings/log";
import type { AnalizSonucu } from "../analiz/route";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 300;

// ─── Watermark ────────────────────────────────────────────────────────────────

async function cropGeminiWatermark(base64: string): Promise<string> {
  // NOT: eskiden alttan %6 tam bant KESİLİYORDU — parça kadrajı doldurunca
  // ayak/alt kenar da gidiyordu (2026-07-28 Murat: "görseller alttan kesik").
  // Kesmek yerine filigranın oturduğu ALT KÖŞELERE beyaz yama basıyoruz:
  // fon stüdyo beyazı olduğundan yama görünmez, parçanın orta-alt bölgesi
  // (ayaklar, kilit, damla ucu) dokunulmadan kalır.
  try {
    const sharp = (await import("sharp")).default;
    const buf = Buffer.from(base64, "base64");
    const meta = await sharp(buf).metadata();
    const w = meta.width ?? 1024;
    const h = meta.height ?? 1024;
    const patchW = Math.floor(w * 0.3);
    const patchH = Math.floor(h * 0.07);
    const patch = { create: { width: patchW, height: patchH, channels: 3 as const, background: "#ffffff" } };
    const result = await sharp(buf)
      .composite([
        { input: await sharp(patch).jpeg().toBuffer(), left: 0, top: h - patchH },          // sol alt
        { input: await sharp(patch).jpeg().toBuffer(), left: w - patchW, top: h - patchH }, // sağ alt
      ])
      .jpeg({ quality: 92 })
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

// ─── Maps ─────────────────────────────────────────────────────────────────────

const TAKI_EN: Record<string, string> = {
  "Yüzük":     "ring",
  "Kolye Ucu": "pendant",
  "Kolye":     "necklace",
  "Küpe":      "earring",
  "Bilezik":   "bracelet",
  "Broş":      "brooch",
  "Charm":     "charm",
};

// Taş / mine tercihi → prompt cümleleri.
// "Taşsız"/"Minesiz" bilinçli olarak SERT yazıldı: görsel modeller takıya
// kendiliğinden taş/renk ekleme eğiliminde; yumuşak ifade dinlenmiyor.
// "Farketmez" (veya parametre yok) → boş string → prompt değişmez (eski davranış).
const TAS_PROMPT: Record<string, string> = {
  "Taşlı":  "The piece MUST include gemstone settings: at least one clearly visible set gemstone (or pavé group) integrated into the design.",
  "Taşsız": "STRICT: The piece must contain NO gemstones whatsoever — no diamonds, no colored stones, no pavé, no crystal, no cubic zirconia. Surfaces are plain metal only; any decoration comes from metalwork (engraving, filigree, texture), never from stones.",
};
const MINE_PROMPT: Record<string, string> = {
  "Mineli":  "The piece MUST feature vitreous enamel work: smooth colored enamel fills (cloisonné/champlevé style) with crisp metal borders, as a clearly visible part of the design.",
  "Minesiz": "STRICT: The piece must contain NO enamel and NO colored fills of any kind — bare metal surfaces only (polished, brushed or oxidized), with all decoration achieved purely through metalwork.",
};

const METAL_EN: Record<string, string> = {
  "Sarı Altın":        "18k yellow gold",
  "Rose Gold":         "18k rose gold",
  "Beyaz Altın":       "18k white gold",
  "Gümüş":             "sterling silver",
  "Oksitlenmiş Gümüş": "oxidized silver",
};

const KAMERA: Record<string, string> = {
  "Charm":     "front-facing macro view, single small charm centered with its attachment loop visible at top, pure white background",
  "Yüzük":     "three-quarter elevated angle, ring tilted 45 degrees showing both the band and top face, pure white background",
  "Kolye Ucu": "front-facing view, pendant perfectly centered, upper chain visible, pure white background",
  "Kolye":     "front-facing view, pendant centered, chain visible on both sides, slight downward angle, pure white background",
  "Küpe":      "front-facing view, pair of earrings side by side, symmetric composition, slight 3/4 angle, pure white background",
  "Bilezik":   "three-quarter elevated 3/4 angle, camera at 45 degrees above, bracelet on slight diagonal tilt showing depth and curvature, pure white background",
  "Broş":      "perfectly flat front-facing view, entire brooch visible, no perspective distortion, pure white background",
};

const FORM_EN: Record<string, string> = {
  "İnce & Zarif": "thin and delicate",
  "Geometrik":    "geometric",
  "Organik":      "organic",
  "Filigran":     "filigree",
  "Kabartmalı":   "embossed",
  "Asimetrik":    "asymmetric",
};

const MODEL = "gemini-3.1-flash-image";

// ─── Gemini multimodal result extractor ──────────────────────────────────────

type GeminiResult = {
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: unknown[] } | null;
  }> | null;
};

function extractImageFromResult(result: GeminiResult): string {
  const candidate = result.candidates?.[0];
  const finishReason = candidate?.finishReason;
  const parts = candidate?.content?.parts ?? [];

  const textParts = (parts as Array<{ text?: string; inlineData?: unknown; thought?: boolean }>)
    .filter(p => !p.thought && p.text).map(p => p.text).join(" ");
  if (textParts) console.log("[gemini-uret] text:", textParts.slice(0, 150));

  const imgPart = (parts as Array<{ thought?: boolean; inlineData?: { mimeType: string; data: string } }>)
    .find(p => !p.thought && p.inlineData?.mimeType?.startsWith("image/"));

  if (!imgPart?.inlineData) {
    throw new Error(`no_image | finishReason=${finishReason} | parts=${parts.length} | text=${textParts.slice(0, 80)}`);
  }
  return `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

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
    logWarning({ tool: "koleksiyon-edit", action: "Koleksiyon Üret", provider: "gemini", status: 500, raw: "GOOGLE_API_KEY yapılandırılmamış" });
    return NextResponse.json({ error: "Servis yapılandırılmamış, lütfen yöneticiye bildirin." }, { status: 500 });
  }

  try {
    const body = await req.json() as {
      // Eski format (geriye dönük uyumluluk)
      styleLock?: AnalizSonucu["styleLock"];
      new_design_concept?: string;
      // Yeni format
      takiTipi?: string;
      tasSecenek?: string;
      mineSecenek?: string;
      tema?: string;
      /** Tasarımcının birebir uyulacak serbest talimatı */
      ozelIstek?: string;
      metalRengi?: string;
      formKarakterleri?: string[];
      referansGorsel?: string;
      numImages?: number;
      stilPrompt?: string;
    };

    const {
      styleLock, new_design_concept,
      takiTipi, tasSecenek, mineSecenek,
      tema, ozelIstek, metalRengi, formKarakterleri, referansGorsel,
      numImages = 1, stilPrompt,
    } = body;

    const ai = new GoogleGenAI({ apiKey: googleKey });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout_240s — üretim çok uzun sürdü")), 240_000)
    );

    // ── Yeni format: referansGorsel + takiTipi → Gemini multi-turn ────────────
    if (referansGorsel && takiTipi) {
      const mimeMatch = referansGorsel.match(/^data:([^;]+);base64,/);
      const mimeType = (mimeMatch?.[1] ?? "image/jpeg") as
        "image/jpeg" | "image/png" | "image/gif" | "image/webp";
      const base64Data = referansGorsel.includes(",")
        ? referansGorsel.split(",")[1]
        : referansGorsel;

      // Görseli küçült — büyük görseller Gemini API'yi yavaşlatıyor
      let processedBase64 = base64Data;
      try {
        const sharp = (await import("sharp")).default;
        const buf = Buffer.from(base64Data, "base64");
        const resized = await sharp(buf)
          .resize(512, 512, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer();
        processedBase64 = resized.toString("base64");
      } catch {
        processedBase64 = base64Data;
      }

      const takiEn  = TAKI_EN[takiTipi]        ?? takiTipi.toLowerCase();
      const metalEn = METAL_EN[metalRengi ?? ""] ?? "gold";
      const kamera  = KAMERA[takiTipi]           ?? "professional e-commerce jewelry photography, pure white background";
      const temaEn  = tema?.trim() ?? "";
      const formEn  = Array.isArray(formKarakterleri) && formKarakterleri.length > 0
        ? formKarakterleri.map(f => FORM_EN[f] ?? f).join(", ")
        : "";

      const styleAnalysis = stilPrompt ?? "elegant metalwork style";

      const tasEn  = TAS_PROMPT[tasSecenek ?? ""] ?? "";
      const mineEn = MINE_PROMPT[mineSecenek ?? ""] ?? "";
      // "Taşsız" seçiliyken stil kopyası taşları da taşımasın diye
      // "and stones" ibaresi koşullu — aksi halde iki talimat çelişir.
      const stilAktarim = tasEn && tasSecenek === "Taşsız"
        ? `Apply the same metal finish, technique and motifs to the ${takiEn} form.`
        : `Apply the same metal finish, technique, motifs and stones to the ${takiEn} form.`;

      const generatePrompt = [
        // Tasarımcı talimatı EN BAŞTA — KONUYU bu tanımlar. Ortaya gömülünce
        // model onu tema önerisi sanıp es geçiyordu (2026-07-28: "kedi" istendi,
        // pusula geldi). Referans yalnız STİL kaynağıdır, konu kaynağı değil.
        ozelIstek?.trim()
          ? `DESIGNER'S BRIEF — ABSOLUTE PRIORITY, obey exactly (may be written in Turkish): ${ozelIstek.trim()}. This brief defines the SUBJECT and requirements of the new piece. The reference image supplies ONLY the style, never the subject.`
          : "",
        `Using the exact style described, create a new ${metalEn} ${takiEn}.`,
        `The jewelry type must be: ${takiEn}. Do not generate any other jewelry type.`,
        // Kopya yasağı: referans tip ile istenen tip aynı olduğunda (örn. charm
        // referansından charm istemek) model referansı birebir yeniden çiziyordu.
        // Stil DNA'sı taşınır, tasarım TAŞINMAZ.
        `IMPORTANT: This must be a BRAND-NEW original design. Do NOT reproduce, copy or closely imitate the reference image's design, silhouette, composition or motif arrangement. Carry over ONLY its style DNA (metal character, surface technique, motif vocabulary, mood) into a clearly different design.`,
        stilAktarim,
        // Soluk çıktı şikâyeti (2026-07-28): renk sadakati emri yoktu, model
        // stil tarifini soldurarak yorumluyordu.
        `Color fidelity: match the reference's color richness EXACTLY — the same deep saturated metal tone and the same enamel color intensity. Do NOT wash out, lighten, mute or desaturate the colors.`,
        tasEn,
        mineEn,
        temaEn ? `Theme: ${temaEn}.` : "",
        formEn ? `Form: ${formEn}.` : "",
        `Camera: ${kamera}.`,
        // Kadraj payı: parça kenara/alt banda taşarsa filigran yaması ve olası
        // kırpmalar parçayı yer — model baştan pay bıraksın.
        `Composition: the ENTIRE piece fully visible inside the frame with a clear white margin on all sides (at least 8% of image size). Nothing may touch or extend beyond the image edges — especially the bottom edge.`,
        `White studio background. No hands, no model. Single centered piece. Professional jewelry photography.`,
      ].filter(Boolean).join(" ");

      // TURN 3 — Görsel üretim (IMAGE) — numImages kadar paralel
      const tasks = Array.from({ length: Math.min(numImages, 4) }, () =>
        Promise.race([
          ai.models.generateContent({
            model: MODEL,
            contents: [
              {
                role: "user",
                parts: [
                  { inlineData: { mimeType, data: processedBase64 } },
                  { text: "Analyze ONLY the decorative style. Describe metal, technique, motifs, stones, mood. Do NOT mention jewelry type." },
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
            config: { responseModalities: ["IMAGE", "TEXT"], thinkingConfig: { thinkingBudget: 0 } } as never,
          }),
          timeoutPromise,
        ]).then(async (result) => {
          const dataUrl = extractImageFromResult(result as GeminiResult);
          const raw = dataUrl.split(",")[1] ?? dataUrl;
          const watermarked = await cropGeminiWatermark(raw);
          return `data:image/jpeg;base64,${watermarked}`;
        })
      );

      const results = await Promise.allSettled(tasks);

      let firstReason = "";
      for (const r of results) {
        if (r.status === "rejected") {
          const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
          if (!firstReason) firstReason = msg;
          console.error("[gemini-uret] task rejected:", msg);
        }
      }

      const images = results
        .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
        .map(r => r.value);

      if (images.length === 0) {
        const rej = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
        const st = (rej?.reason as { status?: number })?.status ?? null;
        logWarning({ tool: "koleksiyon-edit", action: "Koleksiyon Üret", provider: "gemini", status: st, raw: firstReason || "Görsel üretilemedi" });
        return NextResponse.json({ error: "Görsel üretilemedi, lütfen tekrar deneyin." }, { status: 500 });
      }
      return NextResponse.json({ images });
    }

    // ── Eski format: styleLock + new_design_concept → Imagen 3 ───────────────
    if (!styleLock || !new_design_concept) {
      return NextResponse.json(
        { error: "Eksik parametre: styleLock ve new_design_concept ya da takiTipi ve referansGorsel gerekli." },
        { status: 400 }
      );
    }

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

    const response = await Promise.race([
      ai.models.generateImages({
        // imagen-3.0-generate-002 kapatıldı (404 "Model is not found", 2026-07 doğrulandı).
        // Halefi: imagen-4.0-generate-001 — aynı predict yüzeyi, aynı çağrı şekli.
        model: "imagen-4.0-generate-001",
        prompt: finalPrompt,
        config: {
          numberOfImages: 1,
          aspectRatio: "1:1",
          outputMimeType: "image/jpeg",
          // @ts-expect-error — compressionQuality is valid but not typed yet in SDK
          compressionQuality: 95,
        },
      }),
      timeoutPromise,
    ]);

    const imageBytes = (response as { generatedImages?: Array<{ image?: { imageBytes?: string } }> })
      .generatedImages?.[0]?.image?.imageBytes;

    if (!imageBytes) {
      return NextResponse.json({ error: "Görsel üretilemedi, lütfen tekrar deneyin." }, { status: 500 });
    }

    const watermarked = await cropGeminiWatermark(imageBytes);
    return NextResponse.json({ images: [`data:image/jpeg;base64,${watermarked}`] });

  } catch (err: unknown) {
    console.error("[gemini-uret] error:", err);
    const e = err as { status?: number; message?: string };
    const status = e?.status ?? 500;
    logWarning({ tool: "koleksiyon-edit", action: "Koleksiyon Üret", provider: "gemini", status: e?.status ?? null, raw: e?.message ?? String(err) });
    let userMsg = "Görsel üretimi başarısız oldu, lütfen tekrar deneyin.";
    if (status === 401 || status === 403) userMsg = "Yetkilendirme hatası, lütfen yöneticiye bildirin.";
    else if (status === 429) userMsg = "İstek limiti aşıldı, lütfen birkaç dakika sonra tekrar deneyin.";
    else if (status === 503 || status === 504) userMsg = "Servis geçici olarak meşgul, lütfen tekrar deneyin.";
    return NextResponse.json({ error: userMsg }, { status: 500 });
  }
}
