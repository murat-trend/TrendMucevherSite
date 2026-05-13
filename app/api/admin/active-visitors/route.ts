import { NextResponse } from "next/server";
import { requireBlogAdminJson } from "@/lib/admin/blog-admin-auth";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireBlogAdminJson();
  if (!gate.ok) return gate.response;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    return NextResponse.json({ error: "Yapılandırma eksik" }, { status: 500 });
  }

  const supabase = createClient(url, key);
  const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  // distinct session_id; null session_id → distinct ip_address fallback
  const { data, error } = await supabase
    .from("page_views")
    .select("session_id, ip_address")
    .gte("created_at", since);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as { session_id: string | null; ip_address: string | null }[];

  const identifiers = new Set<string>();
  for (const r of rows) {
    if (r.session_id) {
      identifiers.add(`s:${r.session_id}`);
    } else if (r.ip_address) {
      identifiers.add(`ip:${r.ip_address}`);
    }
  }

  return NextResponse.json({ count: identifiers.size, since });
}
