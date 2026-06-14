import { loadEnvConfig } from "@next/env";
import { GoogleGenAI } from "@google/genai";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * KOLEKSİYON LAB — izole deney route'u.
 *
 * Production'daki `koleksiyon-edit/gemini-uret` route'una DOKUNMADAN, koleksiyon
 * tutarlılığı için üç iyileştirmeyi A/B test etmek üzere açıldı:
 *   1. Yüksek çözünürlüklü referans  → filigran/gravür/taş DNA detayı korunur.
 *   2. Tek-tur doğrudan koşullama     → görseli "metne özetleme" darboğazını atlar.
 *   3. Çoklu referans (2-4 görünüm)   → DNA tek kareden daha iyi kilitlenir.
 *
 * Olgunlaşınca farklar tek tek production'a taşınacak.
 */

const MODEL = "gemini-3.1-flash-image-preview";

const DEFAULT_REF_MAX_PX = 1024; // production 512 → lab 1024 (DNA detayı)
const DEFAULT_REF_QUALITY = 90; // production q80 → lab q90

// ─── Maps (production ile aynı; izolasyon için kopyalandı) ──────────────────────

const TAKI_EN: Record<string, string> = {
  "Yüzük": "ring",
  "Kolye Ucu": "pendant",
  "Kolye": "necklace",
  "Küpe": "earring",
  "Bilezik": "bracelet",
  "Broş": "brooch",
};

const METAL_EN: Record<string, string> = {
  "Sarı Altın": "18k yellow gold",
  "Rose Gold": "18k rose gold",
  "Beyaz Altın": "18k white gold",
  "Gümüş": "sterling silver",
  "Oksitlenmiş Gümüş": "oxidized silver",
};

const KAMERA: Record<string, string> = {
  "Yüzük": "three-quarter elevated angle, ring tilted 45 degrees showing both the band and top face, pure white background",
  "Kolye Ucu": "front-facing view, pendant perfectly centered, upper chain visible, pure white background",
  "Kolye": "front-facing view, pendant centered, chain visible on both sides, slight downward angle, pure white background",
  "Küpe": "front-facing view, pair of earrings side by side, symmetric composition, slight 3/4 angle, pure white background",
  "Bilezik": "three-quarter elevated 3/4 angle, camera at 45 degrees above, bracelet on slight diagonal tilt showing depth and curvature, pure white background",
  "Broş": "perfectly flat front-facing view, entire brooch visible, no perspective distortion, pure white background",
};

const FORM_EN: Record<string, string> = {
  "İnce & Zarif": "thin, delicate and refined lines",
  "Geometrik": "geometric with clean architectural lines",
  "Organik": "organic, flowing nature-inspired forms",
  "Filigran": "intricate filigree wirework",
  "Kabartmalı": "sculptural embossed relief",
  "Asimetrik": "bold asymmetric composition",
};

// ─── Yaratıcılık (İYİLEŞTİRME 4: form/kompozisyona hayal gücü) ──────────────────
// DNA kilitli kalır (metal/teknik/motif/taş); yalnızca silüet ve kompozisyon serbestleşir.
const CREATIVITY_CLAUSES: string[] = [
  "", // 0 — Birebir: ek yaratıcılık yok
  "Allow subtle, tasteful variation in the silhouette while staying close to the reference.",
  "Reinterpret the form with balanced creative freedom — vary silhouette, proportions and composition — while keeping the exact metal, technique, motifs and stones of the reference.",
  "Be boldly creative and original with the form, silhouette and composition. Surprise with a fresh design, but keep the EXACT decorative DNA (metal finish, surface technique, motifs, stone treatment) unchanged.",
  "Push this into an imaginative, editorial, high-jewelry concept — dramatic silhouette and unexpected composition — while strictly preserving the reference's metal, technique, motifs and stone treatment.",
];

// ─── Watermark kırpma (production ile aynı) ─────────────────────────────────────

async function cropGeminiWatermark(base64: string, vivid = false): Promise<string> {
  try {
    const sharp = (await import("sharp")).default;
    const buf = Buffer.from(base64, "base64");
    const meta = await sharp(buf).metadata();
    const w = meta.width ?? 1024;
    const h = meta.height ?? 1024;
    const cropH = Math.floor(h * 0.94); // son %6 kırp (watermark)
    const STD = 1024; // standart kare çıktı — tüm görseller aynı boyut
    let pipeline = sharp(buf)
      .extract({ left: 0, top: 0, width: w, height: cropH })
      // Beyaz dolgu ile 1024×1024'e sığdır: hiçbir şey kesilmez, boyut sabitlenir
      .resize(STD, STD, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } });
    if (vivid) {
      // Sosyal paylaşım için canlı renk — taşların soluk çıkışını telafi eder
      pipeline = pipeline.modulate({ saturation: 1.18, brightness: 1.02 }).sharpen();
    }
    const result = await pipeline.jpeg({ quality: 95 }).toBuffer();
    return result.toString("base64");
  } catch {
    return base64;
  }
}

// ─── Auth ───────────────────────────────────────────────────────────────────────

async function requireSuperAdmin(): Promise<
  { ok: true } | { ok: false; response: NextResponse }
> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Oturum gerekli" }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!isRemauraSuperAdminUserId(user.id) && profile?.role !== "admin") {
    return { ok: false, response: NextResponse.json({ error: "Yetkisiz" }, { status: 403 }) };
  }
  return { ok: true };
}

// ─── Gemini sonuç ayıklayıcı ────────────────────────────────────────────────────

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

  const textParts = (parts as Array<{ text?: string; thought?: boolean }>)
    .filter((p) => !p.thought && p.text)
    .map((p) => p.text)
    .join(" ");
  if (textParts) console.log("[koleksiyon-lab] text:", textParts.slice(0, 150));

  const imgPart = (parts as Array<{ thought?: boolean; inlineData?: { mimeType: string; data: string } }>)
    .find((p) => !p.thought && p.inlineData?.mimeType?.startsWith("image/"));

  if (!imgPart?.inlineData) {
    throw new Error(
      `no_image | finishReason=${finishReason} | parts=${parts.length} | text=${textParts.slice(0, 80)}`,
    );
  }
  return `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
}

// ─── Referans görsel hazırlama (İYİLEŞTİRME 1: yüksek çözünürlük) ────────────────

type PreparedRef = { mimeType: "image/jpeg"; data: string };

async function prepareReference(dataUrl: string, maxPx: number, quality: number): Promise<PreparedRef> {
  const base64Data = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  try {
    const sharp = (await import("sharp")).default;
    const buf = Buffer.from(base64Data, "base64");
    const resized = await sharp(buf)
      .resize(maxPx, maxPx, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer();
    return { mimeType: "image/jpeg", data: resized.toString("base64") };
  } catch {
    return { mimeType: "image/jpeg", data: base64Data };
  }
}

// ─── Route ──────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const rawKey = process.env.GOOGLE_API_KEY ?? "";
  const googleKey =
    rawKey
      .split("")
      .filter((ch) => ch.charCodeAt(0) > 31 && ch.charCodeAt(0) < 256)
      .join("")
      .trim() || undefined;

  if (!googleKey) {
    return NextResponse.json({ error: "Servis yapılandırılmamış, lütfen yöneticiye bildirin." }, { status: 500 });
  }

  try {
    const body = (await req.json()) as {
      takiTipi?: string;
      tema?: string;
      metalRengi?: string;
      formKarakterleri?: string[];
      // İYİLEŞTİRME 3: tek görsel (geriye dönük) VEYA çoklu referans
      referansGorsel?: string;
      referansGorseller?: string[];
      numImages?: number;
      stilPrompt?: string;
      // İYİLEŞTİRME 2: A/B modu — "direct" (yeni) vs "multi-turn" (eski)
      mode?: "direct" | "multi-turn";
      // İYİLEŞTİRME 1: ayarlanabilir referans çözünürlüğü (A/B için)
      refMaxPx?: number;
      refQuality?: number;
      // İYİLEŞTİRME 4: yaratıcılık seviyesi (0-4) + ilham dili (ops.)
      creativity?: number;
      ilham?: string;
      // İYİLEŞTİRME 5: sosyal paylaşım için canlı renk (taş solukluğu telafisi)
      vivid?: boolean;
    };

    const {
      takiTipi,
      tema,
      metalRengi,
      formKarakterleri,
      referansGorsel,
      referansGorseller,
      numImages = 1,
      stilPrompt,
      mode = "direct",
      refMaxPx = DEFAULT_REF_MAX_PX,
      refQuality = DEFAULT_REF_QUALITY,
      creativity = 0,
      ilham,
      vivid = false,
    } = body;

    // Referansları topla (çoklu öncelikli, tek görsel geriye dönük destek)
    const refSources = (
      Array.isArray(referansGorseller) && referansGorseller.length > 0
        ? referansGorseller
        : referansGorsel
          ? [referansGorsel]
          : []
    )
      .filter((s) => typeof s === "string" && s.trim().length > 0)
      .slice(0, 4); // en fazla 4 referans

    if (refSources.length === 0 || !takiTipi) {
      return NextResponse.json(
        { error: "Eksik parametre: en az bir referansGorsel ve takiTipi gerekli." },
        { status: 400 },
      );
    }

    const ai = new GoogleGenAI({ apiKey: googleKey });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout_240s — üretim çok uzun sürdü")), 240_000),
    );

    // Tüm referansları yüksek çözünürlükte hazırla (paralel)
    const safeMaxPx = Math.max(256, Math.min(refMaxPx, 1536));
    const safeQuality = Math.max(50, Math.min(refQuality, 100));
    const refs = await Promise.all(refSources.map((src) => prepareReference(src, safeMaxPx, safeQuality)));
    const imageParts = refs.map((r) => ({ inlineData: { mimeType: r.mimeType, data: r.data } }));

    // ── Prompt parçaları ──────────────────────────────────────────────────────
    const takiEn = TAKI_EN[takiTipi] ?? takiTipi.toLowerCase();
    const metalEn = METAL_EN[metalRengi ?? ""] ?? "gold";
    const kamera = KAMERA[takiTipi] ?? "professional e-commerce jewelry photography, pure white background";
    const temaEn = tema?.trim() ?? "";
    const formEn =
      Array.isArray(formKarakterleri) && formKarakterleri.length > 0
        ? formKarakterleri.map((f) => FORM_EN[f] ?? f).join(", ")
        : "";

    const refClause =
      refs.length > 1
        ? `You are given ${refs.length} reference images of the SAME jewelry design from different views.`
        : `You are given a reference image of a jewelry design.`;

    // Yaratıcılık: DNA kilidini bozmadan forma hayal gücü
    const creativityClause = CREATIVITY_CLAUSES[Math.max(0, Math.min(Math.round(creativity), 4))] ?? "";
    const ilhamEn = typeof ilham === "string" ? ilham.trim() : "";

    const generatePrompt = [
      `${refClause} Replicate the EXACT decorative style shown — metal finish, surface technique, motifs and stones — onto a brand new ${metalEn} ${takiEn}.`,
      `The jewelry type must be: ${takiEn}. Do not generate any other jewelry type.`,
      `The new piece must look like it belongs to the exact same collection as the reference.`,
      temaEn ? `Theme: ${temaEn}.` : "",
      formEn ? `Form: ${formEn}.` : "",
      creativityClause,
      ilhamEn
        ? `Draw creative inspiration from a ${ilhamEn} design language, applied to form and composition only — never altering the locked metal, technique, motifs or stones.`
        : "",
      `If the design contains gemstones, render them with rich, saturated, true-to-life color and brilliant sparkle — never washed-out or pale.`,
      `Camera: ${kamera}.`,
      `White studio background. No hands, no model. Single centered piece. Professional jewelry photography.`,
    ]
      .filter(Boolean)
      .join(" ");

    // ── İYİLEŞTİRME 2: mod seçimi ───────────────────────────────────────────────
    // direct     → üretim turunda referans GÖRSELLERİ context'te (piksel koşullama)
    // multi-turn → eski yöntem: görseli metne özetle, sonra metinden üret
    const styleAnalysis = stilPrompt ?? "elegant metalwork style";

    const contents =
      mode === "multi-turn"
        ? [
            {
              role: "user" as const,
              parts: [
                ...imageParts,
                {
                  text: "Analyze ONLY the decorative style. Describe metal, technique, motifs, stones, mood. Do NOT mention jewelry type.",
                },
              ],
            },
            { role: "model" as const, parts: [{ text: styleAnalysis }] },
            { role: "user" as const, parts: [{ text: generatePrompt }] },
          ]
        : [
            {
              role: "user" as const,
              parts: [...imageParts, { text: generatePrompt }],
            },
          ];

    const tasks = Array.from({ length: Math.min(Math.max(numImages, 1), 4) }, () =>
      Promise.race([
        ai.models.generateContent({
          model: MODEL,
          contents,
          config: { responseModalities: ["IMAGE", "TEXT"], thinkingConfig: { thinkingBudget: 0 } } as never,
        }),
        timeoutPromise,
      ]).then(async (result) => {
        const dataUrl = extractImageFromResult(result as GeminiResult);
        const raw = dataUrl.split(",")[1] ?? dataUrl;
        const watermarked = await cropGeminiWatermark(raw, vivid);
        return `data:image/jpeg;base64,${watermarked}`;
      }),
    );

    const results = await Promise.allSettled(tasks);

    for (const r of results) {
      if (r.status === "rejected") {
        console.error(
          "[koleksiyon-lab] task rejected:",
          r.reason instanceof Error ? r.reason.message : String(r.reason),
        );
      }
    }

    const images = results
      .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
      .map((r) => r.value);

    if (images.length === 0) {
      return NextResponse.json({ error: "Görsel üretilemedi, lütfen tekrar deneyin." }, { status: 500 });
    }

    return NextResponse.json({
      images,
      meta: {
        mode,
        refCount: refs.length,
        refMaxPx: safeMaxPx,
        refQuality: safeQuality,
        creativity: Math.max(0, Math.min(Math.round(creativity), 4)),
        model: MODEL,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("[koleksiyon-lab] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
