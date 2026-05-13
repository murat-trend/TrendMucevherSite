import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { creditCredits } from "@/lib/billing/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const auth = createClient(cookieStore);
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return NextResponse.json({ error: "Yapılandırma eksik" }, { status: 500 });

  let body: { token?: string };
  try { body = (await req.json()) as typeof body; }
  catch { return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 }); }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) return NextResponse.json({ error: "token gerekli" }, { status: 400 });

  const sb = createServiceClient(url, key);

  // Fetch token row
  const { data: row, error: fetchErr } = await sb
    .from("invite_tokens")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Geçersiz davet linki" }, { status: 404 });

  const r = row as {
    id: string; token: string; credits: number;
    expires_at: string; used_at: string | null; used_by: string | null;
  };

  if (r.used_at) return NextResponse.json({ error: "Bu davet linki zaten kullanıldı" }, { status: 409 });
  if (new Date(r.expires_at) < new Date()) return NextResponse.json({ error: "Davet linkinin süresi dolmuş" }, { status: 410 });

  // Mark as used
  const { error: updateErr } = await sb
    .from("invite_tokens")
    .update({ used_at: new Date().toISOString(), used_by: user.id })
    .eq("id", r.id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Credit the user
  const wallet = await creditCredits(user.id, r.credits, `invite_token: ${r.id}`);

  return NextResponse.json({ ok: true, credits: r.credits, balance: wallet.balanceCredits });
}
