import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  buildProductTranslationsFromSource,
  normalizeContentSourceLocale,
  productTranslationsToDbPatch,
} from "@/lib/modeller/product-translations-anthropic";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Oturum açmış kullanıcı: name + story için translations + legacy kolon patch (satıcı güncelleme / admin).
 */
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
  }

  let body: { name?: string; story?: string; sourceLang?: string };
  try {
    body = (await req.json()) as { name?: string; story?: string; sourceLang?: string };
  } catch {
    return NextResponse.json({ error: "Geçersiz gövde" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name : "";
  const story = typeof body.story === "string" ? body.story : "";
  const sourceLang = normalizeContentSourceLocale(body.sourceLang);
  if (!name.trim()) {
    return NextResponse.json({ error: "Ürün adı gerekli" }, { status: 400 });
  }

  const translations = await buildProductTranslationsFromSource(sourceLang, name, story);
  if (!translations) {
    return NextResponse.json({ ok: false as const, error: "Çeviri üretilemedi", patch: null });
  }

  const patch = productTranslationsToDbPatch(translations, sourceLang);
  return NextResponse.json({ ok: true as const, translations, patch });
}
