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

async function checkAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) return { error: "config", status: 500 as const };

  const cookieStore = await cookies();
  const auth = createClient(cookieStore);
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { error: "auth", status: 401 as const };

  const { data: me } = await auth.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!adminAllowed(user.id, me?.role)) return { error: "forbidden", status: 403 as const };

  return { supabase: createServiceClient(url, serviceKey) };
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const result = await checkAdmin();
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const { id } = await params;

  const { data: firm, error } = await result.supabase
    .from("nextaura_firms")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!firm) return NextResponse.json({ error: "Firma bulunamadı" }, { status: 404 });

  const { data: sessions } = await result.supabase
    .from("nextaura_sessions")
    .select("id, customer_name, customer_phone, status, deposit_amount, created_at")
    .eq("firm_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: ledger } = await result.supabase
    .from("nextaura_credit_ledger")
    .select("id, amount, type, description, balance_after, actor, created_at")
    .eq("firm_id", id)
    .order("created_at", { ascending: false })
    .limit(100);

  return NextResponse.json({ firm, sessions: sessions ?? [], ledger: ledger ?? [] });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const result = await checkAdmin();
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const { id } = await params;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 }); }

  const allowed = ["name", "slug", "logo_url", "theme_color", "plan", "active", "extra_languages"];
  const update: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) update[k] = body[k];
  }
  if (update.plan && !["starter", "pro", "plus"].includes(update.plan as string)) {
    return NextResponse.json({ error: "Geçersiz plan" }, { status: 400 });
  }

  const { data: firm, error } = await result.supabase
    .from("nextaura_firms")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ firm });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const result = await checkAdmin();
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const { id } = await params;

  const { error } = await result.supabase.from("nextaura_firms").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
