import { loadEnvConfig } from "@next/env";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";

loadEnvConfig(process.cwd());
export const runtime = "nodejs";
export const maxDuration = 30;

async function requireAdmin() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user)
    return { ok: false as const, response: NextResponse.json({ error: "Oturum gerekli" }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!isRemauraSuperAdminUserId(user.id) && profile?.role !== "admin")
    return { ok: false as const, response: NextResponse.json({ error: "Yetkisiz" }, { status: 403 }) };
  return { ok: true as const, userId: user.id };
}

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}

// GET — tüm stil kartlarını listele
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const admin = getAdmin();
  if (!admin) return NextResponse.json({ error: "DB bağlantısı yok" }, { status: 500 });
  const { data, error } = await admin
    .from("stil_kartlari")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ kartlar: data });
}

// POST — yeni stil kartı kaydet
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const admin = getAdmin();
  if (!admin) return NextResponse.json({ error: "DB bağlantısı yok" }, { status: 500 });

  const body = await req.json() as {
    isim: string;
    metal?: string;
    teknik?: string;
    motif?: string;
    tas_detay?: string;
    mood?: string;
    stil_prompt: string;
    referans_gorsel_url?: string;
    ornek_uretim_url?: string;
  };

  if (!body.isim || !body.stil_prompt)
    return NextResponse.json({ error: "İsim ve stil_prompt zorunlu" }, { status: 400 });

  const { data, error } = await admin
    .from("stil_kartlari")
    .insert({ ...body, user_id: auth.userId })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

// DELETE — stil kartı sil
export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const admin = getAdmin();
  if (!admin) return NextResponse.json({ error: "DB bağlantısı yok" }, { status: 500 });

  const { id } = await req.json() as { id: string };
  if (!id) return NextResponse.json({ error: "id zorunlu" }, { status: 400 });

  const { error } = await admin.from("stil_kartlari").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
