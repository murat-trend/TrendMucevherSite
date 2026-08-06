import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/remaura/uretim-3d/auth";
import { getAdminClient, isMissingTable, MIGRATION_MESAJI } from "@/lib/remaura/musteri-atolye/db";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";

/**
 * MÜŞTERİ ATÖLYESİ — müşteri kayıtları.
 *
 * GET    → müşteri listesi (her birinin tasarım sayısıyla)
 * POST   → yeni müşteri  { ad, telefon?, notlar? }
 * PATCH  → müşteri güncelle { id, ad?, telefon?, notlar? }
 * DELETE → müşteri sil   { id }  — tasarımlar silinmez, müşterisiz kalır
 */

function dbYok() {
  return NextResponse.json({ error: "Veritabanı bağlantısı kurulamadı." }, { status: 500 });
}

export async function GET() {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const admin = getAdminClient();
  if (!admin) return dbYok();

  const { data, error } = await admin
    .from("remaura_musteriler")
    .select("id, created_at, ad, telefon, notlar")
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTable(error)) {
      return NextResponse.json({ error: MIGRATION_MESAJI, migration: true }, { status: 503 });
    }
    console.error("[musteri-atolye/musteriler GET]", error);
    return NextResponse.json({ error: "Müşteriler okunamadı." }, { status: 500 });
  }

  // Müşteri başına tasarım sayısı — tek sorgu, istemcide say.
  const { data: sayimlar } = await admin
    .from("koleksiyonlar")
    .select("musteri_id")
    .not("musteri_id", "is", null);

  const sayac = new Map<string, number>();
  for (const satir of (sayimlar ?? []) as Array<{ musteri_id: string }>) {
    sayac.set(satir.musteri_id, (sayac.get(satir.musteri_id) ?? 0) + 1);
  }

  return NextResponse.json({
    musteriler: (data ?? []).map((m) => ({ ...m, tasarimSayisi: sayac.get(m.id) ?? 0 })),
  });
}

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  let body: { ad?: string; telefon?: string; notlar?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const ad = (body.ad ?? "").trim();
  if (!ad) return NextResponse.json({ error: "Müşteri adı gerekli." }, { status: 400 });

  const admin = getAdminClient();
  if (!admin) return dbYok();

  const { data, error } = await admin
    .from("remaura_musteriler")
    .insert({
      ad,
      telefon: body.telefon?.trim() || null,
      notlar: body.notlar?.trim() || null,
      user_id: auth.userId,
    })
    .select("id, created_at, ad, telefon, notlar")
    .single();

  if (error) {
    if (isMissingTable(error)) {
      return NextResponse.json({ error: MIGRATION_MESAJI, migration: true }, { status: 503 });
    }
    if (error.code === "23505") {
      return NextResponse.json({ error: "Bu isimde bir müşteri zaten var." }, { status: 409 });
    }
    console.error("[musteri-atolye/musteriler POST]", error);
    return NextResponse.json({ error: "Müşteri kaydedilemedi." }, { status: 500 });
  }

  return NextResponse.json({ musteri: { ...data, tasarimSayisi: 0 } });
}

export async function PATCH(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  let body: { id?: string; ad?: string; telefon?: string; notlar?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  if (!body.id) return NextResponse.json({ error: "id zorunlu." }, { status: 400 });

  const yama: Record<string, string | null> = {};
  if (body.ad !== undefined) {
    const ad = body.ad.trim();
    if (!ad) return NextResponse.json({ error: "Müşteri adı boş olamaz." }, { status: 400 });
    yama.ad = ad;
  }
  if (body.telefon !== undefined) yama.telefon = body.telefon.trim() || null;
  if (body.notlar !== undefined) yama.notlar = body.notlar.trim() || null;

  if (Object.keys(yama).length === 0) {
    return NextResponse.json({ error: "Güncellenecek alan yok." }, { status: 400 });
  }

  const admin = getAdminClient();
  if (!admin) return dbYok();

  const { data, error } = await admin
    .from("remaura_musteriler")
    .update(yama)
    .eq("id", body.id)
    .select("id, created_at, ad, telefon, notlar")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Bu isimde bir müşteri zaten var." }, { status: 409 });
    }
    console.error("[musteri-atolye/musteriler PATCH]", error);
    return NextResponse.json({ error: "Müşteri güncellenemedi." }, { status: 500 });
  }

  return NextResponse.json({ musteri: data });
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

  // Tasarımlar silinmez — musteri_id null'a düşer (migration'da ON DELETE SET NULL).
  const { error } = await admin.from("remaura_musteriler").delete().eq("id", id);
  if (error) {
    console.error("[musteri-atolye/musteriler DELETE]", error);
    return NextResponse.json({ error: "Müşteri silinemedi." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
