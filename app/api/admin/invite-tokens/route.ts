import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type InviteTokenRow = {
  id: string;
  token: string;
  credits: number;
  note: string | null;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
  created_by: string | null;
  created_at: string;
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createServiceClient(url, key);
}

async function requireAdmin() {
  const cookieStore = await cookies();
  const auth = createClient(cookieStore);
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;
  const { data: profile } = await auth.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!isRemauraSuperAdminUserId(user.id) && profile?.role !== "admin") return null;
  return user;
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Yapılandırma eksik" }, { status: 500 });

  const { data, error } = await sb
    .from("invite_tokens")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tokens: data ?? [] });
}

export async function POST(req: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Yapılandırma eksik" }, { status: 500 });

  let body: { credits?: number; note?: string; days?: number };
  try { body = (await req.json()) as typeof body; }
  catch { return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 }); }

  const credits = Math.floor(Number(body.credits ?? 1));
  if (!Number.isFinite(credits) || credits < 1) {
    return NextResponse.json({ error: "credits en az 1 olmalı" }, { status: 400 });
  }
  const days = Math.min(Math.max(Math.floor(Number(body.days ?? 30)), 1), 365);
  const note = typeof body.note === "string" ? body.note.trim() || null : null;

  const { data, error } = await sb
    .from("invite_tokens")
    .insert({ credits, note, created_by: user.id, expires_at: new Date(Date.now() + days * 86400_000).toISOString() })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ token: data }, { status: 201 });
}

export async function DELETE(req: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Yapılandırma eksik" }, { status: 500 });

  const id = new URL(req.url).searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  const { error } = await sb.from("invite_tokens").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
