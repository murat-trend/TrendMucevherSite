import { NextResponse } from "next/server";
import { isSuperAdminRequest } from "@/lib/remaura/warnings/auth";
import { classifyError } from "@/lib/remaura/warnings/classify";
import { PROVIDERS, PROVIDER_IDS } from "@/lib/remaura/warnings/registry";
import type { ProviderId } from "@/lib/remaura/warnings/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Süper-admin görsün diye sağlayıcı meta özeti (etiket + ödeme URL + etkilenen butonlar). */
const PROVIDER_META = Object.fromEntries(
  PROVIDER_IDS.map((id) => [
    id,
    {
      label: PROVIDERS[id].label,
      billingUrl: PROVIDERS[id].billingUrl,
      usedBy: PROVIDERS[id].usedBy,
    },
  ]),
);

// ─── GET: açık uyarıları listele ───────────────────────────────────────────────
export async function GET() {
  if (!(await isSuperAdminRequest())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }
  const db = await admin();
  if (!db) return NextResponse.json({ warnings: [], providers: PROVIDER_META, dbReady: false });

  const { data, error } = await db
    .from("remaura_warnings")
    .select("*")
    .eq("resolved", false)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    // Tablo yoksa şerit sessizce boş kalsın (migration bekliyor).
    return NextResponse.json({ warnings: [], providers: PROVIDER_META, dbReady: false });
  }

  return NextResponse.json({ warnings: data ?? [], providers: PROVIDER_META, dbReady: true });
}

// ─── PATCH: uyarı(ları) çözüldü işaretle ───────────────────────────────────────
export async function PATCH(req: Request) {
  if (!(await isSuperAdminRequest())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }
  const db = await admin();
  if (!db) return NextResponse.json({ error: "DB yok" }, { status: 500 });

  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    provider?: string;
    all?: boolean;
  };

  let q = db.from("remaura_warnings").update({ resolved: true }).eq("resolved", false);
  if (body.id) q = q.eq("id", body.id);
  else if (body.provider) q = q.eq("provider", body.provider);
  else if (!body.all) return NextResponse.json({ error: "id | provider | all gerekli" }, { status: 400 });

  const { error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// ─── POST: istemci-tespitli hatayı kaydet (yedek yol) ──────────────────────────
export async function POST(req: Request) {
  if (!(await isSuperAdminRequest())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }
  const db = await admin();
  if (!db) return NextResponse.json({ error: "DB yok" }, { status: 500 });

  const body = (await req.json().catch(() => ({}))) as {
    tool?: string;
    action?: string;
    provider?: string;
    status?: number;
    raw?: string;
  };

  if (!body.tool || !body.provider || !PROVIDER_IDS.includes(body.provider as ProviderId)) {
    return NextResponse.json({ error: "tool + geçerli provider gerekli" }, { status: 400 });
  }

  const { kind, reason } = classifyError(body.status ?? null, body.raw ?? null);
  const { error } = await db.from("remaura_warnings").insert({
    tool: body.tool,
    action: body.action ?? null,
    provider: body.provider,
    kind,
    status: body.status ?? null,
    reason: reason.slice(0, 500),
    source: "live",
    resolved: false,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
