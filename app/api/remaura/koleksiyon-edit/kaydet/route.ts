import { loadEnvConfig } from "@next/env";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!isRemauraSuperAdminUserId(user.id) && profile?.role !== "admin") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const body = await req.json();
  const { koleksiyonAdi, gorselUrl, tip, tema, metal } = body as {
    koleksiyonAdi?: string;
    gorselUrl?: string;
    tip?: string;
    tema?: string;
    metal?: string;
  };

  if (!gorselUrl) {
    return NextResponse.json({ error: "Görsel URL gerekli." }, { status: 400 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Veritabanı bağlantısı kurulamadı." }, { status: 500 });
  }

  const { data, error } = await admin
    .from("koleksiyonlar")
    .insert({
      koleksiyon_adi: koleksiyonAdi || null,
      gorsel_url: gorselUrl,
      tip: tip || null,
      tema: tema || null,
      metal: metal || null,
      user_id: user.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[koleksiyon-edit/kaydet] insert error:", error);
    return NextResponse.json({ error: "Kayıt başarısız." }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
