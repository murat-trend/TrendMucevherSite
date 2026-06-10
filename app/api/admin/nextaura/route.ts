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

async function getAdminClients() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) return null;

  const cookieStore = await cookies();
  const auth = createClient(cookieStore);
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;

  const { data: me } = await auth.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!adminAllowed(user.id, me?.role)) return null;

  const supabase = createServiceClient(url, serviceKey);
  return { supabase };
}

export async function GET() {
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

  const { data: firms, error } = await supabase
    .from("nextaura_firms")
    .select("id, slug, name, logo_url, theme_color, plan, credits, active, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Bu ay toplam kredi kullanımı: sessions created_at bu ay
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { count: monthlyUsage } = await supabase
    .from("nextaura_sessions")
    .select("id", { count: "exact", head: true })
    .gte("created_at", monthStart);

  return NextResponse.json({ firms: firms ?? [], monthlyUsage: monthlyUsage ?? 0 });
}

export async function POST(req: Request) {
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

  let body: { slug?: string; name?: string; theme_color?: string; plan?: string; credits?: number };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 }); }

  const slug = body.slug?.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const name = body.name?.trim();
  if (!slug || !name) return NextResponse.json({ error: "slug ve name gerekli" }, { status: 400 });

  const { data: firm, error } = await supabase
    .from("nextaura_firms")
    .insert({
      slug,
      name,
      theme_color: body.theme_color?.trim() || "#b76e79",
      plan: ["starter", "pro", "plus"].includes(body.plan ?? "") ? body.plan : "starter",
      credits: Math.max(0, Math.floor(Number(body.credits) || 0)),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ firm });
}
