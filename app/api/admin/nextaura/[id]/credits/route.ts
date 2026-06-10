import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function adminAllowed(userId: string, role: string | null | undefined): boolean {
  return isRemauraSuperAdminUserId(userId) || role === "admin";
}

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Sunucu yapılandırması eksik" }, { status: 500 });
  }

  const cookieStore = await cookies();
  const auth = createClient(cookieStore);
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });

  const { data: me } = await auth.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!adminAllowed(user.id, me?.role)) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const supabase = createServiceClient(url, serviceKey);
  const { id } = await params;

  let body: { amount?: number; type?: "add" | "deduct" };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 }); }

  const amount = Math.floor(Number(body.amount));
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "amount pozitif tam sayı olmalı" }, { status: 400 });
  }
  const type = body.type === "deduct" ? "deduct" : "add";

  // Atomic credit update using RPC or read-modify-write
  const { data: firm, error: fetchErr } = await supabase
    .from("nextaura_firms")
    .select("id, credits")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !firm) return NextResponse.json({ error: "Firma bulunamadı" }, { status: 404 });

  const newCredits = type === "add"
    ? firm.credits + amount
    : Math.max(0, firm.credits - amount);

  const { data: updated, error: updateErr } = await supabase
    .from("nextaura_firms")
    .update({ credits: newCredits })
    .eq("id", id)
    .select("id, credits")
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  return NextResponse.json({ ok: true, credits: updated.credits });
}
