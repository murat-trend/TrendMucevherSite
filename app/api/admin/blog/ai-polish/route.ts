import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { requireBlogAdminJson } from "@/lib/admin/blog-admin-auth";
import { getAnthropicApiKey } from "@/lib/api/anthropic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `Sen bir editörsün. Kullanıcının ham, içten yazısını al.
İmla ve dilbilgisi hatalarını düzelt.
Akışı güzel ve okunabilir hale getir.
Kullanıcının sesini ve duygusunu koru — yapay veya soğuk olmasın.
Türkçe yaz. Paragraflar arasında doğal geçişler olsun.
Sonucu sadece düzenlenmiş metin olarak ver, başka açıklama ekleme.`;

const DEFAULT_MODEL = "claude-opus-4-6";

export async function POST(req: Request) {
  const gate = await requireBlogAdminJson();
  if (!gate.ok) return gate.response;

  let body: { text?: string };
  try {
    body = (await req.json()) as { text?: string };
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text : "";
  if (!text.trim()) {
    return NextResponse.json({ error: "Metin gerekli" }, { status: 400 });
  }

  try {
    const apiKey = getAnthropicApiKey();
    const model = process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model,
      max_tokens: 8192,
      system: SYSTEM,
      messages: [{ role: "user", content: text }],
    });

    const polished = message.content.map((c) => (c.type === "text" ? c.text : "")).join("").trim();
    if (!polished) {
      return NextResponse.json({ error: "Model boş yanıt döndü" }, { status: 502 });
    }

    return NextResponse.json({ text: polished });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI hatası";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
