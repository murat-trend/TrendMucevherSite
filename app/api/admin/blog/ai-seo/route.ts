import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { requireBlogAdminJson } from "@/lib/admin/blog-admin-auth";
import { getAnthropicApiKey } from "@/lib/api/anthropic";
import { generateSlug } from "@/lib/blog/slugify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `Sen bir SEO uzmanısın. Google'ın E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) kriterlerini ve arama motoru optimizasyon kurallarını çok iyi biliyorsun.

Verilen blog yazısı başlığı ve içeriğine göre şunları üret:
1. SEO başlık (60 karakter altında, anahtar kelime başta, marka sonda)
2. Meta description (155 karakter altında, anahtar kelime içeren, tıklanmayı teşvik eden)
3. Önerilen anahtar kelimeler (5 adet, virgülle ayrılmış)
4. Slug önerisi (URL dostu, Türkçe karaktersiz)

Yanıtı sadece JSON formatında ver:
{
  "seoTitle": "...",
  "seoDescription": "...",
  "keywords": "...",
  "slug": "..."
}`;

const DEFAULT_MODEL = "claude-opus-4-6";

type SeoPayload = {
  seoTitle: string;
  seoDescription: string;
  keywords: string;
  slug: string;
};

function parseSeoJson(raw: string): SeoPayload {
  const clean = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(clean) as unknown;
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Geçersiz JSON");
  }
  const o = parsed as Record<string, unknown>;
  const seoTitle = typeof o.seoTitle === "string" ? o.seoTitle.trim() : "";
  const seoDescription = typeof o.seoDescription === "string" ? o.seoDescription.trim() : "";
  const keywords = typeof o.keywords === "string" ? o.keywords.trim() : "";
  const slug = typeof o.slug === "string" ? o.slug.trim() : "";
  if (!seoTitle || !seoDescription || !keywords || !slug) {
    throw new Error("Eksik alanlar");
  }
  return { seoTitle, seoDescription, keywords, slug };
}

export async function POST(req: Request) {
  const gate = await requireBlogAdminJson();
  if (!gate.ok) return gate.response;

  let body: { title?: string; content?: string };
  try {
    body = (await req.json()) as { title?: string; content?: string };
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "Başlık gerekli" }, { status: 400 });
  }
  const content = typeof body.content === "string" ? body.content : "";

  const userMessage = `Başlık:\n${title}\n\nİçerik:\n${content || "(boş)"}`;

  try {
    const apiKey = getAnthropicApiKey();
    const model = process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model,
      max_tokens: 2048,
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
    });

    const raw = message.content.map((c) => (c.type === "text" ? c.text : "")).join("").trim();
    if (!raw) {
      return NextResponse.json({ error: "Model boş yanıt döndü" }, { status: 502 });
    }

    const parsed = parseSeoJson(raw);
    return NextResponse.json({
      seoTitle: parsed.seoTitle,
      seoDescription: parsed.seoDescription,
      keywords: parsed.keywords,
      slug: generateSlug(parsed.slug),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI hatası";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
