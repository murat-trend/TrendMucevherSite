import { NextResponse } from "next/server";
import { requireBlogAdminJson } from "@/lib/admin/blog-admin-auth";
import { getSiteSettings, updateSiteSettings } from "@/lib/site/settings-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireBlogAdminJson();
  if (!gate.ok) return gate.response;

  try {
    const settings = await getSiteSettings();
    return NextResponse.json({ settings });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ayarlar alınamadı";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const gate = await requireBlogAdminJson();
  if (!gate.ok) return gate.response;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  try {
    const updated = await updateSiteSettings(body);
    return NextResponse.json({ settings: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ayarlar kaydedilemedi";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
