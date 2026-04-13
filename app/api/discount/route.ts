import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Hoş geldin — yalnızca ilk ödenmiş siparişte geçerli (%10). */
const CODE_TO_PERCENT = new Map<string, number>([["HOSGELDIN10", 10]]);

function normalizeCode(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Sunucu yapılandırması eksik" }, { status: 500 });
  }

  const cookieStore = await cookies();
  const auth = createClient(cookieStore);
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz gövde" }, { status: 400 });
  }

  const codeRaw = typeof body === "object" && body !== null && "code" in body ? String((body as { code: unknown }).code) : "";
  const normalized = normalizeCode(codeRaw);
  const percentOff = CODE_TO_PERCENT.get(normalized);
  if (percentOff == null) {
    return NextResponse.json({ ok: false as const, error: "Geçersiz kod" }, { status: 400 });
  }

  const admin = createServiceClient(url, serviceKey);

  const { count, error: countErr } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("buyer_id", user.id)
    .eq("payment_status", "paid");

  if (countErr) {
    console.error("[api/discount] orders count", countErr);
    return NextResponse.json({ error: "Sipariş kontrolü başarısız" }, { status: 500 });
  }

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { ok: false as const, error: "Bu kod yalnızca ilk siparişinizde geçerlidir." },
      { status: 403 },
    );
  }

  const iso = new Date().toISOString();
  const { error: ledErr } = await admin.from("billing_ledger").insert({
    user_id: user.id,
    amount: 0,
    type: "discount_code",
    description: JSON.stringify({
      code: normalized,
      percentOff,
      at: iso,
      source: "api/discount",
    }),
  });

  if (ledErr) {
    console.error("[api/discount] billing_ledger", ledErr);
    return NextResponse.json({ error: "Kayıt yazılamadı" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true as const,
    code: normalized,
    percentOff,
    message: `İndirim: %${percentOff}`,
  });
}
