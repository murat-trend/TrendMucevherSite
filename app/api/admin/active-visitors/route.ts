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

  const rows = (data ?? []) as {
    session_id: string | null;
    ip_address: string | null;
    page_path: string;
    created_at: string;
  }[];

  // group by identifier → keep most recent page_path
  const byId = new Map<string, { page_path: string; created_at: string }>();
  for (const r of rows) {
    const id = r.session_id ? `s:${r.session_id}` : r.ip_address ? `ip:${r.ip_address}` : null;
    if (!id) continue;
    const prev = byId.get(id);
    if (!prev || r.created_at > prev.created_at) {
      byId.set(id, { page_path: r.page_path, created_at: r.created_at });
    }
  }

  const now = Date.now();
  const sessions = Array.from(byId.values())
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((s) => ({
      page_path: s.page_path,
      since_seconds: Math.floor((now - new Date(s.created_at).getTime()) / 1000),
    }));

  return NextResponse.json({ count: byId.size, sessions, since });
}
