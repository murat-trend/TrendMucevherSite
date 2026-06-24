import { loadEnvConfig } from "@next/env";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 120;

// ─── Auth ─────────────────────────────────────────────────────────────────────

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

// ─── Translation ─────────────────────────────────────────────────────────────

/**
 * Kullanıcının yazdığı metinden SADECE aranacak nesneyi çıkarır.
 * "aslan kafalarını kaldır" → "lion heads"
 * "the lion heads" → "lion heads"
 */
async function extractSearchObject(text: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !text.trim()) return text;
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 60,
      system:
        "You extract the OBJECT NAME from a jewelry editing instruction. " +
        "Return ONLY the short English noun phrase describing the element to find in the image. " +
        "No verbs, no commands, no extra words. " +
        "Examples: 'aslan kafalarını kaldır' → 'lion heads', " +
        "'the gemstone on top' → 'gemstone on top', " +
        "'taşları değiştir' → 'gemstones'.",
      messages: [{ role: "user", content: text }],
    });
    const block = msg.content[0];
    return block?.type === "text" ? block.text.trim() : text;
  } catch {
    return text;
  }
}

/**
 * Kullanıcının yazdığı metinden SADECE yerleştirilecek nesneyi çıkarır.
 * "onun yerine kurt kafası koy" → "wolf head"
 * "twisted rope pattern" → "twisted rope pattern"
 */
async function extractReplaceObject(text: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !text.trim()) return text;
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 60,
      system:
        "You extract the REPLACEMENT OBJECT description from a jewelry editing instruction. " +
        "Return ONLY the short English noun phrase describing what should appear in the image instead. " +
        "No verbs, no commands, no extra words. " +
        "Examples: 'onun yerine kurt kafası koy' → 'wolf head', " +
        "'replace with twisted rope pattern' → 'twisted rope pattern', " +
        "'rose gold metal yap' → 'rose gold metal'.",
      messages: [{ role: "user", content: text }],
    });
    const block = msg.content[0];
    return block?.type === "text" ? block.text.trim() : text;
  } catch {
    return text;
  }
}

/**
 * Görseli analiz edip replacement prompt'una takı bağlamını ekler.
 * "wolf head" → "wolf head motif, yellow gold filigree wirework, luxury jewelry, same style as surrounding metal"
 */
async function buildContextualReplacePrompt(
  replaceObject: string,
  imgBuf: Buffer
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return replaceObject;
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });
    const base64 = imgBuf.toString("base64");
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 120,
      system:
        "You are a jewelry photography prompt writer. " +
        "The user wants to replace a small decorative motif in a jewelry photo with a new motif. " +
        "Analyze the jewelry's visual style (metal color, finish, technique) " +
        "and write a SHORT English prompt (max 25 words) describing the replacement as a " +
        "SMALL CARVED METAL RELIEF MOTIF that is fully integrated into the existing piece. " +
        "CRITICAL: it must be a tiny sculpted detail made of the SAME metal as the jewelry, " +
        "NOT a realistic standalone object, NOT a separate sculpture, NOT replacing the whole piece. " +
        "Always include phrases like 'small carved gold relief', 'integrated into the ring', " +
        "'same metal and finish as surrounding jewelry'. " +
        "Return ONLY the prompt, nothing else.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: "image/png", data: base64 },
            },
            {
              type: "text",
              text: `Write the replacement prompt for: "${replaceObject}"`,
            },
          ],
        },
      ],
    });
    const block = msg.content[0];
    return block?.type === "text" ? block.text.trim() : replaceObject;
  } catch {
    return replaceObject;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * URL veya data: base64 → Buffer
 * R2, fal CDN veya herhangi bir https:// URL çalışır.
 */
async function resolveImageBuffer(input: string): Promise<Buffer> {
  let buf: Buffer;
  if (input.startsWith("http://") || input.startsWith("https://")) {
    const res = await fetch(input, { cache: "no-store" });
    if (!res.ok) throw new Error(`Görsel fetch başarısız: ${res.status} — ${input}`);
    buf = Buffer.from(await res.arrayBuffer());
  } else {
    const raw = input.includes(",") ? input.split(",")[1] : input;
    buf = Buffer.from(raw, "base64");
  }
  return capImagePixels(buf);
}

// Stability girdi limiti: en fazla 4,194,304 piksel (≈2048²). Aşan görseli
// küçülterek "unsupported dimensions" 400 hatasını önler.
async function capImagePixels(buf: Buffer, maxPixels = 4_000_000): Promise<Buffer> {
  try {
    const sharp = (await import("sharp")).default;
    const meta = await sharp(buf).metadata();
    const w = meta.width ?? 0, h = meta.height ?? 0;
    if (!w || !h || w * h <= maxPixels) return buf;
    const scale = Math.sqrt(maxPixels / (w * h));
    const nw = Math.max(1, Math.floor(w * scale));
    const nh = Math.max(1, Math.floor(h * scale));
    return await sharp(buf).resize(nw, nh, { fit: "inside" }).png().toBuffer();
  } catch {
    return buf;
  }
}

function bufferToBlob(buf: Buffer, mime = "image/png"): Blob {
  return new Blob([new Uint8Array(buf)], { type: mime });
}

async function stabilityPost(
  endpoint: string,
  form: FormData,
  apiKey: string
): Promise<NextResponse> {
  const res = await fetch(`https://api.stability.ai${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "image/*",
    },
    body: form,
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error(`[stability] ${endpoint} error ${res.status}:`, txt);
    return NextResponse.json(
      { error: `Stability AI hatası (${res.status}): ${txt.slice(0, 200)}` },
      { status: res.status }
    );
  }

  const buf = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get("content-type") ?? "image/png";
  return NextResponse.json({ image: `data:${ct};base64,${buf.toString("base64")}` });
}

// ─── Operations ───────────────────────────────────────────────────────────────

async function removeBg(imgBuf: Buffer, apiKey: string): Promise<NextResponse> {
  const form = new FormData();
  form.append("image", bufferToBlob(imgBuf), "image.png");
  form.append("output_format", "png");
  return stabilityPost("/v2beta/stable-image/edit/remove-background", form, apiKey);
}

async function upscale(imgBuf: Buffer, apiKey: string): Promise<NextResponse> {
  const form = new FormData();
  form.append("image", bufferToBlob(imgBuf), "image.png");
  form.append("prompt", "jewelry product photo, ultra high detail, sharp edges, professional photography");
  form.append("output_format", "png");

  // conservative upscale asenkron — önce 202 + id döner, sonra poll gerekir
  const initRes = await fetch("https://api.stability.ai/v2beta/stable-image/upscale/conservative", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    body: form,
  });

  if (!initRes.ok) {
    const txt = await initRes.text();
    console.error("[stability] upscale init error:", initRes.status, txt);
    return NextResponse.json(
      { error: `Stability AI upscale başlatılamadı (${initRes.status}): ${txt.slice(0, 200)}` },
      { status: initRes.status }
    );
  }

  const { id } = await initRes.json() as { id: string };
  if (!id) {
    return NextResponse.json({ error: "Upscale işlem ID alınamadı." }, { status: 502 });
  }

  // Poll — max 90 saniye, 5s aralıklarla
  const pollUrl = `https://api.stability.ai/v2beta/stable-image/upscale/conservative/result/${id}`;
  const maxAttempts = 18;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const pollRes = await fetch(pollUrl, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "image/*" },
    });

    if (pollRes.status === 202) continue; // hâlâ işleniyor

    if (pollRes.ok) {
      const buf = Buffer.from(await pollRes.arrayBuffer());
      const ct = pollRes.headers.get("content-type") ?? "image/png";
      return NextResponse.json({ image: `data:${ct};base64,${buf.toString("base64")}` });
    }

    const txt = await pollRes.text();
    console.error("[stability] upscale poll error:", pollRes.status, txt);
    return NextResponse.json(
      { error: `Upscale işlemi başarısız (${pollRes.status}): ${txt.slice(0, 200)}` },
      { status: pollRes.status }
    );
  }

  return NextResponse.json({ error: "Upscale zaman aşımına uğradı (90s). Lütfen tekrar deneyin." }, { status: 504 });
}

async function searchReplace(
  imgBuf: Buffer,
  searchPrompt: string,
  replacePrompt: string,
  apiKey: string
): Promise<NextResponse> {
  const form = new FormData();
  form.append("image", bufferToBlob(imgBuf), "image.png");
  form.append("prompt", replacePrompt);
  form.append("search_prompt", searchPrompt);
  // Maskeyi dar tut — sadece bulunan motifin sınırına yakın değiştir, tüm yüzeyi yeniden çizme
  form.append("grow_mask", "2");
  // Tüm parçanın gerçekçi bir nesneye dönüşmesini engelle
  form.append(
    "negative_prompt",
    "human skull, realistic bone, photograph of a real object, detached object, floating object, " +
    "full object replacing the jewelry, plain studio object, anatomical model, full size head, " +
    "losing jewelry details, changing background, changing metal color"
  );
  form.append("output_format", "png");
  return stabilityPost("/v2beta/stable-image/edit/search-and-replace", form, apiKey);
}

async function searchRecolor(
  imgBuf: Buffer,
  selectPrompt: string,
  colorPrompt: string,
  apiKey: string
): Promise<NextResponse> {
  const form = new FormData();
  form.append("image", bufferToBlob(imgBuf), "image.png");
  form.append("prompt", colorPrompt);
  form.append("select_prompt", selectPrompt);
  form.append("output_format", "png");
  // ✅ Doğru endpoint: "search-and-recolor" (Stability v2beta resmi adı)
  return stabilityPost("/v2beta/stable-image/edit/search-and-recolor", form, apiKey);
}

async function opErase(imgBuf: Buffer, maskBuf: Buffer, apiKey: string): Promise<NextResponse> {
  const form = new FormData();
  form.append("image", bufferToBlob(imgBuf), "image.png");
  form.append("mask", bufferToBlob(maskBuf), "mask.png");
  form.append("output_format", "png");
  return stabilityPost("/v2beta/stable-image/edit/erase", form, apiKey);
}

/**
 * Takının stilini analiz edip inpaint prompt'u üretir.
 * Kullanıcı bir alanı silip "Doldur" dediğinde, etraftaki desene uygun
 * bir dolgu istiyordur — kör bir metal yüzey değil.
 */
async function buildInpaintPrompt(imgBuf: Buffer): Promise<string> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return "matching decorative metal surface, seamlessly continuing the surrounding jewelry pattern";
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: anthropicKey });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 80,
      system:
        "You are a jewelry inpainting prompt writer. " +
        "A small area of this jewelry photo has been masked out. " +
        "Analyze the surrounding design: metal color, surface finish, texture, decorative motifs, relief style. " +
        "Write a SHORT English prompt (max 20 words) describing what should fill the masked area " +
        "so it blends seamlessly with the rest of the piece. " +
        "Focus on: exact metal color, surface texture, and how the surrounding decorative pattern should continue. " +
        "Return ONLY the prompt, nothing else.",
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/png", data: imgBuf.toString("base64") } },
            { type: "text", text: "Write the inpainting prompt to fill the masked area matching the surrounding jewelry design." },
          ],
        },
      ],
    });
    const block = msg.content[0];
    const prompt = block?.type === "text" ? block.text.trim() : "";
    console.log("[stability] inpaint contextual prompt:", prompt);
    return prompt || "matching decorative metal surface, seamlessly continuing the surrounding jewelry pattern";
  } catch {
    return "matching decorative metal surface, seamlessly continuing the surrounding jewelry pattern";
  }
}

async function opInpaint(imgBuf: Buffer, maskBuf: Buffer, apiKey: string): Promise<NextResponse> {
  const prompt = await buildInpaintPrompt(imgBuf);
  const form = new FormData();
  form.append("image", bufferToBlob(imgBuf), "image.png");
  form.append("mask", bufferToBlob(maskBuf), "mask.png");
  form.append("prompt", prompt);
  form.append("negative_prompt", "random object, detached element, logo, text, watermark, skull, button, cap, unrelated motif");
  form.append("output_format", "png");
  return stabilityPost("/v2beta/stable-image/edit/inpaint", form, apiKey);
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const apiKey = process.env.STABILITY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "STABILITY_API_KEY yapılandırılmamış." }, { status: 500 });
  }

  const body = await req.json() as {
    action: string;
    image: string;        // https:// URL veya data: base64
    mask?: string;        // data: base64 PNG binary mask
    searchPrompt?: string;
    replacePrompt?: string;
    selectPrompt?: string;
    colorPrompt?: string;
  };

  const { action, image, mask, searchPrompt, replacePrompt, selectPrompt, colorPrompt } = body;

  if (!image) {
    return NextResponse.json({ error: "Görsel gerekli." }, { status: 400 });
  }

  try {
    const imgBuf = await resolveImageBuffer(image);

    switch (action) {
      case "remove-background":
        return removeBg(imgBuf, apiKey);

      case "upscale":
        return upscale(imgBuf, apiKey);

      case "search-replace": {
        if (!searchPrompt || !replacePrompt) {
          return NextResponse.json(
            { error: "searchPrompt ve replacePrompt gerekli." },
            { status: 400 }
          );
        }
        const [spEn, rawRpEn] = await Promise.all([
          extractSearchObject(searchPrompt),
          extractReplaceObject(replacePrompt),
        ]);
        // Görseli analiz edip replacement prompt'una takı stilini ekle
        const rpEn = await buildContextualReplacePrompt(rawRpEn, imgBuf);
        console.log("[stability] search-replace extracted:", { spEn, rawRpEn, rpEn });
        return searchReplace(imgBuf, spEn, rpEn, apiKey);
      }

      case "recolor": {
        if (!selectPrompt || !colorPrompt) {
          return NextResponse.json(
            { error: "selectPrompt ve colorPrompt gerekli." },
            { status: 400 }
          );
        }
        const [selEn, colEn] = await Promise.all([
          extractSearchObject(selectPrompt),
          extractReplaceObject(colorPrompt),
        ]);
        console.log("[stability] recolor extracted:", { selEn, colEn });
        return searchRecolor(imgBuf, selEn, colEn, apiKey);
      }

      case "erase": {
        if (!mask) return NextResponse.json({ error: "Maske gerekli." }, { status: 400 });
        const maskBuf = await resolveImageBuffer(mask);
        return opErase(imgBuf, maskBuf, apiKey);
      }

      case "inpaint": {
        if (!mask) return NextResponse.json({ error: "Maske gerekli." }, { status: 400 });
        const maskBuf = await resolveImageBuffer(mask);
        return opInpaint(imgBuf, maskBuf, apiKey);
      }

      default:
        return NextResponse.json({ error: `Geçersiz action: ${action}` }, { status: 400 });
    }
  } catch (err: unknown) {
    console.error("[stability] unhandled error:", err);
    const e = err as { message?: string };
    return NextResponse.json({ error: e?.message ?? "İşlem başarısız." }, { status: 500 });
  }
}
