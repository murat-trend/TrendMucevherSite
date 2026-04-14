import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import {
  buildProductTranslationsFromSource,
  normalizeContentSourceLocale,
  productTranslationsNeedsFill,
  productTranslationsToDbPatch,
} from "@/lib/modeller/product-translations-anthropic";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type Row = {
  id: string;
  name: string;
  story: string | null;
  seller_note: string | null;
  translations: unknown;
  content_source_locale: string | null;
};

export async function POST() {
  const cookieStore = await cookies();
  const auth = createClient(cookieStore);
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
  }
  if (!isRemauraSuperAdminUserId(user.id)) {
    return NextResponse.json({ error: "Yalnızca süper admin" }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Sunucu yapılandırması eksik" }, { status: 500 });
  }

  const admin = createServiceClient(url, serviceKey);
  const { data: rows, error: selErr } = await admin
    .from("products_3d")
    .select("id, name, story, seller_note, translations, content_source_locale")
    .order("created_at", { ascending: false });

  if (selErr) {
    console.error("[translate-all-products] select", selErr);
    return NextResponse.json({ error: selErr.message }, { status: 500 });
  }

  const list = (rows ?? []) as Row[];
  const targets = list.filter((r) => productTranslationsNeedsFill(r.translations) && r.name?.trim());

  const results: { id: string; ok: boolean; error?: string }[] = [];
  let done = 0;

  for (const row of targets) {
    const sourceLang = normalizeContentSourceLocale(row.content_source_locale);
    const translations = await buildProductTranslationsFromSource(sourceLang, row.name, row.story ?? "", row.seller_note ?? "");
    if (!translations) {
      results.push({ id: row.id, ok: false, error: "Çeviri başarısız" });
      await sleep(500);
      continue;
    }
    const patch = productTranslationsToDbPatch(translations, sourceLang);
    const { error: upErr } = await admin.from("products_3d").update(patch).eq("id", row.id);
    if (upErr) {
      results.push({ id: row.id, ok: false, error: upErr.message });
    } else {
      done += 1;
      results.push({ id: row.id, ok: true });
    }
    await sleep(500);
  }

  return NextResponse.json({
    ok: true,
    scanned: list.length,
    needingTranslation: targets.length,
    translated: done,
    results,
  });
}
