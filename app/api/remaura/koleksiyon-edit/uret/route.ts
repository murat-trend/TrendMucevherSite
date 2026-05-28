import { loadEnvConfig } from "@next/env";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { buildRingThreeQuarterBlock } from "@/lib/remaura/internal-visual-rules";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 300;

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

async function translateToEnglish(text: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !text.trim()) return text;
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system: "Translate this jewelry description to English for AI image generation. Return only the translation.",
      messages: [{ role: "user", content: text }],
    });
    const block = msg.content[0];
    return block?.type === "text" ? block.text.trim() : text;
  } catch {
    return text;
  }
}

// Referans görselin SADECE stilini analiz et — şekil/harf/konu içermemeli
async function analyzeStyleWithVision(base64: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return "";
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });
    const raw = base64.includes(",") ? base64.split(",")[1] : base64;
    const mime = (base64.match(/data:([^;]+);/)?.[1] ?? "image/jpeg") as
      | "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system:
        "You are a luxury jewelry style analyst. Extract the EXACT visual style from this reference image in 15-20 English keywords. " +
        "YOU MUST INCLUDE: (1) exact metal color (oxidized silver / yellow gold / rose gold etc), " +
        "(2) surface technique (filigree wirework / repoussé / casting / engraving etc), " +
        "(3) specific decorative motifs (roses and butterflies / acanthus leaves / geometric stars etc), " +
        "(4) stone treatment (small amethyst accents / no stones / pavé diamonds etc), " +
        "(5) mood and finish (antique oxidized / high polish / dramatic dark etc). " +
        "NEVER mention jewelry type (ring/earring/necklace/bracelet). " +
        "This style will be applied to DIFFERENT jewelry types — only describe the visual DNA. " +
        "Format: comma-separated keywords only.",
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mime, data: raw } },
            { type: "text", text: "Extract the jewelry craftsmanship style keywords." },
          ],
        },
      ],
    });
    const block = msg.content[0];
    return block?.type === "text" ? block.text.trim() : "";
  } catch (e) {
    console.error("[uret] vision analysis failed:", e);
    return "";
  }
}

async function toFalUrl(image: string, fal: { storage: { upload: (f: File) => Promise<string> } }): Promise<string> {
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  const raw = image.includes(",") ? image.split(",")[1] : image;
  const buf = Buffer.from(raw, "base64");
  const file = new File([new Uint8Array(buf)], "image.jpg", { type: "image/jpeg" });
  return await fal.storage.upload(file);
}

const TAKI_TIPI_EN: Record<string, string> = {
  "Yüzük": "ring",
  "Kolye": "necklace",
  "Küpe": "earring",
  "Bilezik": "bracelet",
  "Broş": "brooch",
};

const KAMERA_ACISI: Record<string, string> = {
  // Yüzük: dinamik olarak buildRingThreeQuarterBlock ile hesaplanır (aşağıya bak)
  "Kolye": "front-facing view, pendant centered, chain visible on both sides, slight downward angle, pure white background",
  "Küpe": "front-facing view, pair of earrings side by side, symmetric composition, slight 3/4 angle, pure white background",
  "Bilezik": "three-quarter elevated 3/4 angle, camera at 45 degrees above, bracelet displayed on a slight diagonal tilt showing depth and curvature, inner hollow and outer surface both visible, entire bracelet in frame with margin, e-commerce jewelry standard angle, pure white background",
  "Broş": "perfectly flat front-facing view, entire brooch visible, no perspective distortion, pure white background",
};

/** "yüzük" ve dillerdeki çevirilerini tespit eder */
function temaContainsRing(text: string): boolean {
  return new RegExp(
    "(^|[^\\p{L}\\p{N}])(yüzük|yuzuk|alyans|ring|wedding band|eternity ring|signet|trauring|ehering|кольцо)(?=[^\\p{L}\\p{N}]|$)",
    "iu"
  ).test(text);
}

/** "bilezik" ve dillerdeki çevirilerini tespit eder */
function temaContainsBracelet(text: string): boolean {
  return /\b(bilezik|bracelet|bangle|armband|armreif)\b/i.test(text);
}

const METAL_RENGI_EN: Record<string, string> = {
  "Sarı Altın": "yellow gold",
  "Rose Gold": "rose gold",
  "Beyaz Altın": "white gold",
  "Gümüş": "silver",
  "Oksitlenmiş Gümüş": "oxidized silver",
};

const FORM_EN: Record<string, string> = {
  "İnce & Zarif": "thin and delicate",
  "Geometrik": "geometric",
  "Organik": "organic",
  "Filigran": "filigree",
  "Kabartmalı": "embossed",
  "Asimetrik": "asymmetric",
};

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    return NextResponse.json({ error: "Servis yapılandırılmamış, lütfen yöneticiye bildirin." }, { status: 500 });
  }

  const body = await req.json() as {
    takiTipi?: string;
    tema?: string;
    formKarakterleri?: string[];
    metalRengi?: string;
    referansGorsel?: string;
    numImages?: number;
    stilKartiId?: string;
    stilPrompt?: string;
  };

  const { takiTipi, tema, formKarakterleri, metalRengi,
          referansGorsel, numImages = 1, stilKartiId, stilPrompt } = body;

  if (!tema?.trim() && !referansGorsel && !stilPrompt && !stilKartiId) {
    return NextResponse.json({ error: "Tema, referans görsel veya stil kartı gerekli." }, { status: 400 });
  }

  const takiTipiEn  = TAKI_TIPI_EN[takiTipi ?? ""] ?? "jewelry";
  const metalEn     = METAL_RENGI_EN[metalRengi ?? ""] ?? "gold";
  const formStr     = Array.isArray(formKarakterleri) && formKarakterleri.length > 0
    ? formKarakterleri.map(f => FORM_EN[f] ?? f.toLowerCase()).join(", ") : "";
  const temaEn      = tema?.trim() ? await translateToEnglish(tema) : "";

  // ── Kamera açısı: dropdown seçimini öncelikle al; seçim yoksa tema'dan tespit et ──
  let kameraAcisi: string;
  const metalSource = [tema, metalRengi].filter(Boolean).join(" ");
  if (takiTipi === "Yüzük" || (!takiTipi?.trim() && temaContainsRing(tema ?? ""))) {
    // Ana sayfayla aynı detaylı üç-çeyrek perspektif kuralı
    kameraAcisi = buildRingThreeQuarterBlock(metalSource || "ring");
  } else if (takiTipi && KAMERA_ACISI[takiTipi]) {
    kameraAcisi = KAMERA_ACISI[takiTipi];
  } else if (!takiTipi?.trim() && temaContainsBracelet(tema ?? "")) {
    kameraAcisi = KAMERA_ACISI["Bilezik"];
  } else {
    kameraAcisi = "professional e-commerce jewelry product photography angle, entire piece visible, pure white background";
  }

  const { fal } = await import("@fal-ai/client");
  fal.config({ credentials: falKey });

  // ── Stil kaynağını belirle + Üretim ─────────────────────
  try {
    let stilDescription = "";
    let referansUrl: string | null = null;

    if (stilKartiId) {
      // Kaydedilmiş stil kartından al
      const admin = (() => {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) return null;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { createClient: sc } = require("@supabase/supabase-js");
        return sc(url, key, { auth: { persistSession: false } });
      })();
      if (admin) {
        const { data } = await admin.from("stil_kartlari").select("*").eq("id", stilKartiId).single();
        if (data) {
          stilDescription = data.stil_prompt;
          referansUrl = data.referans_gorsel_url ?? null;
        }
      }
    } else if (stilPrompt) {
      // Analiz sonucundan gelen hazır stil açıklaması
      stilDescription = stilPrompt
        .replace(/\b(ring|necklace|earring|bracelet|brooch|pendant|bangle|choker)\b/gi, "")
        .replace(/\s+/g, " ").trim();
    } else if (referansGorsel) {
      // Referans görsel — CDN URL'e yükle + stil analizi
      referansUrl = await toFalUrl(referansGorsel, fal);
      stilDescription = await analyzeStyleWithVision(referansGorsel);
    }

    if (referansUrl) {
      // Referans görselli üretim (görsel bazlı stil transferi)
      const prompt = [
        `Generate a new ${metalEn} ${takiTipiEn}.`,
        `STYLE LOCK: Keep the EXACT same craftsmanship technique, decorative motifs, metal finish and surface texture from the reference. Create a new ${takiTipiEn} — not a copy of the reference piece.`,
        `CAMERA: ${kameraAcisi}`,
        temaEn,
        formStr,
        `Pure white background. No model, no hands, no body parts. Single centered jewelry piece. Studio lighting. Ultra detailed.`,
      ].filter(Boolean).join(" ");

      const result = await (fal.subscribe as (model: string, opts: { input: Record<string, unknown>; logs: boolean }) => Promise<{ data: unknown }>)("fal-ai/flux-pro/kontext", {
        input: {
          prompt,
          image_url: referansUrl,
          num_images: Math.min(numImages, 4),
          aspect_ratio: "1:1",
          output_format: "jpeg",
          safety_tolerance: 3,
        },
        logs: false,
      });

      type FalImage = { url: string };
      const images = ((result.data as { images?: FalImage[] })?.images ?? []).map(i => i.url);
      if (images.length === 0) {
        return NextResponse.json({ error: "Görsel üretilemedi, lütfen tekrar deneyin." }, { status: 500 });
      }
      return NextResponse.json({ images, seed: 0, stilDescription });

    } else {
      // Metin bazlı üretim
      const prompt = [
        `A single ${metalEn} ${takiTipiEn}, luxury jewelry product photography.`,
        kameraAcisi,
        stilDescription || temaEn,
        formStr,
        `Ultra detailed metal surface, intricate craftsmanship, sharp focus.`,
        `Pure white background, centered, studio lighting, no hands, no model.`,
      ].filter(Boolean).join(". ");

      const seed = Math.floor(Math.random() * 1_000_000);
      const result = await (fal.subscribe as (model: string, opts: { input: Record<string, unknown>; logs: boolean }) => Promise<{ data: unknown }>)("fal-ai/flux-pro/v1.1-ultra", {
        input: {
          prompt,
          num_images: Math.min(numImages, 4),
          seed,
          aspect_ratio: "1:1",
          output_format: "jpeg",
          safety_tolerance: 3,
        },
        logs: false,
      });

      type FalImage = { url: string };
      const images = ((result.data as { images?: FalImage[] })?.images ?? []).map(i => i.url);
      if (images.length === 0) {
        return NextResponse.json({ error: "Görsel üretilemedi, lütfen tekrar deneyin." }, { status: 500 });
      }
      return NextResponse.json({ images, seed, stilDescription });
    }
  } catch (err: unknown) {
    console.error("[uret] error:", err);
    const e = err as { status?: number; message?: string; body?: { detail?: string } };
    // Hata koduna göre kullanıcı dostu mesaj — servis adı gösterilmez
    const status = e?.status ?? 500;
    let userMsg = "Görsel üretimi başarısız oldu, lütfen tekrar deneyin.";
    if (status === 401 || status === 403) userMsg = "Yetkilendirme hatası, lütfen yöneticiye bildirin.";
    else if (status === 429) userMsg = "İstek limiti aşıldı, lütfen birkaç dakika sonra tekrar deneyin.";
    else if (status === 503 || status === 504) userMsg = "Servis geçici olarak meşgul, lütfen tekrar deneyin.";
    return NextResponse.json({ error: userMsg }, { status: 500 });
  }
}
