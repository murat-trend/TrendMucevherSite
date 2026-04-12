import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function clientIp(req: Request): string | null {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real?.trim()) return real.trim();
  return null;
}

function isAllowedOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  if (/localhost|127\.0\.0\.1/i.test(origin)) return true;
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "").trim();
  if (!site) return true;
  try {
    const o = new URL(origin);
    const s = new URL(site.startsWith("http") ? site : `https://${site}`);
    return o.hostname === s.hostname;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Sunucu yapılandırması eksik" }, { status: 500 });
  }

  if (!isAllowedOrigin(req)) {
    return NextResponse.json({ error: "İzin verilmeyen kaynak" }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const page_path = typeof body.page_path === "string" ? body.page_path.trim() : "";
  if (!page_path.startsWith("/")) {
    return NextResponse.json({ error: "page_path gerekli (/ ile başlamalı)" }, { status: 400 });
  }

  const source = typeof body.source === "string" && body.source.trim() ? body.source.trim() : "direct";
  const user_id = typeof body.user_id === "string" && body.user_id.trim() ? body.user_id.trim() : null;
  const session_id = typeof body.session_id === "string" && body.session_id.trim() ? body.session_id.trim() : null;
  const product_id = typeof body.product_id === "string" && body.product_id.trim() ? body.product_id.trim() : null;

  const ip_address = clientIp(req);
  const user_agent = req.headers.get("user-agent") || null;
  const country =
    req.headers.get("x-vercel-ip-country")?.trim() ||
    (typeof body.country === "string" && body.country.trim() ? body.country.trim() : null);

  const supabase = createServiceClient(url, serviceKey);

  const row: Record<string, unknown> = {
    page_path,
    source,
    ip_address,
    user_agent,
    country,
    user_id,
    session_id,
  };
  if (product_id) row.product_id = product_id;

  const { error } = await supabase.from("page_views").insert(row);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
