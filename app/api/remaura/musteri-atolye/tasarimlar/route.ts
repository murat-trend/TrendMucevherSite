import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/remaura/uretim-3d/auth";
import { getAdminClient, isMissingTable, MIGRATION_MESAJI } from "@/lib/remaura/musteri-atolye/db";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";

/**
 * MÜŞTERİ ATÖLYESİ — müşteriye ait tasarım galerisi.
 *
 * GET    ?musteriId=…  → o müşterinin tasarımları
 * POST   { musteriId, gorselUrl, baslik? } → galeriye ekle
 * DELETE { id }        → kayıttan çıkar
 *
 * Görsel zaten hazırlama adımında R2'ye yazıldı; burada yalnız kayıt tutulur.
 */

function dbYok() {
  return NextResponse.json({ error: "Veritabanı bağlantısı kurulamadı." }, { status: 500 });
}

export async function GET(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const musteriId = new URL(req.url).searchParams.get("musteriId");
  if (!musteriId) return NextResponse.json({ error: "musteriId zorunlu." }, { status: 400 });

  const admin = getAdminClient();
  if (!admin) return dbYok();

  const { data, error } = await admin
    .from("koleksiyonlar")
    .select("id, created_at, gorsel_url, koleksiyon_adi, tip, musteri_id")
    .eq("musteri_id", musteriId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTable(error)) {
      return NextResponse.json({ error: MIGRATION_MESAJI, migration: true }, { status: 503 });
    }
    console.error("[musteri-atolye/tasarimlar GET]", error);
    return NextResponse.json({ error: "Tasarımlar okunamadı." }, { status: 500 });
  }

  return NextResponse.json({ tasarimlar: data ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  let body: { musteriId?: string; gorselUrl?: string; baslik?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  if (!body.musteriId) return NextResponse.json({ error: "Müşteri seçili değil." }, { status: 400 });
  if (!body.gorselUrl) return NextResponse.json({ error: "Görsel gerekli." }, { status: 400 });

  const admin = getAdminClient();
  if (!admin) return dbYok();

  const { data, error } = await admin
    .from("koleksiyonlar")
    .insert({
      musteri_id: body.musteriId,
      gorsel_url: body.gorselUrl,
      koleksiyon_adi: body.baslik?.trim() || null,
      tip: "musteri-atolye",
      user_id: auth.userId,
    })
    .select("id, created_at, gorsel_url, koleksiyon_adi, tip, musteri_id")
    .single();

  if (error) {
    if (error.code === "42703") {
      return NextResponse.json({ error: MIGRATION_MESAJI, migration: true }, { status: 503 });
    }
    console.error("[musteri-atolye/tasarimlar POST]", error);
    return NextResponse.json({ error: "Tasarım kaydedilemedi." }, { status: 500 });
  }

  return NextResponse.json({ tasarim: data });
}

export async function DELETE(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  let id: string;
  try {
    id = ((await req.json()) as { id?: string }).id ?? "";
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  if (!id) return NextResponse.json({ error: "id zorunlu." }, { status: 400 });

  const admin = getAdminClient();
  if (!admin) return dbYok();

  const { error } = await admin.from("koleksiyonlar").delete().eq("id", id);
  if (error) {
    console.error("[musteri-atolye/tasarimlar DELETE]", error);
    return NextResponse.json({ error: "Silme başarısız." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
