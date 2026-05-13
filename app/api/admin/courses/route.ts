import { NextResponse } from "next/server";
import { requireBlogAdminJson } from "@/lib/admin/blog-admin-auth";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type CourseRow = {
  id: string;
  slug: string;
  title_tr: string;
  title_en: string | null;
  description_tr: string | null;
  description_en: string | null;
  price_try: number;
  thumbnail_url: string | null;
  category: string;
  whatsapp_message: string | null;
  is_published: boolean;
  modules: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key);
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-") || "kurs";
}

function parseModules(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === "string") return raw.split("\n").map((s) => s.trim()).filter(Boolean);
  return [];
}

export async function GET() {
  const gate = await requireBlogAdminJson();
  if (!gate.ok) return gate.response;

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Yapılandırma eksik" }, { status: 500 });

  const { data, error } = await sb
    .from("courses")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ courses: data ?? [] });
}

export async function POST(req: Request) {
  const gate = await requireBlogAdminJson();
  if (!gate.ok) return gate.response;

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Yapılandırma eksik" }, { status: 500 });

  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 }); }

  const title_tr = typeof body.title_tr === "string" ? body.title_tr.trim() : "";
  if (!title_tr) return NextResponse.json({ error: "Başlık zorunludur" }, { status: 400 });

  const slug = typeof body.slug === "string" && body.slug.trim()
    ? slugify(body.slug)
    : slugify(title_tr);

  const row = {
    slug,
    title_tr,
    title_en:          typeof body.title_en === "string"          ? body.title_en.trim() || null          : null,
    description_tr:    typeof body.description_tr === "string"    ? body.description_tr.trim() || null    : null,
    description_en:    typeof body.description_en === "string"    ? body.description_en.trim() || null    : null,
    price_try:         typeof body.price_try === "number"         ? body.price_try                        : 0,
    thumbnail_url:     typeof body.thumbnail_url === "string"     ? body.thumbnail_url.trim() || null     : null,
    category:          typeof body.category === "string"          ? body.category.trim() || "genel"       : "genel",
    whatsapp_message:  typeof body.whatsapp_message === "string"  ? body.whatsapp_message.trim() || null  : null,
    is_published:      Boolean(body.is_published),
    modules:           parseModules(body.modules),
    sort_order:        typeof body.sort_order === "number"        ? body.sort_order                       : 0,
  };

  const { data, error } = await sb.from("courses").insert(row).select("*").single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Bu slug zaten kullanımda" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ course: data }, { status: 201 });
}

export async function PATCH(req: Request) {
  const gate = await requireBlogAdminJson();
  if (!gate.ok) return gate.response;

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Yapılandırma eksik" }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 }); }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.title_tr === "string")         patch.title_tr = body.title_tr.trim();
  if (typeof body.title_en === "string")         patch.title_en = body.title_en.trim() || null;
  if (typeof body.description_tr === "string")   patch.description_tr = body.description_tr.trim() || null;
  if (typeof body.description_en === "string")   patch.description_en = body.description_en.trim() || null;
  if (typeof body.price_try === "number")        patch.price_try = body.price_try;
  if (typeof body.thumbnail_url === "string")    patch.thumbnail_url = body.thumbnail_url.trim() || null;
  if (typeof body.category === "string")         patch.category = body.category.trim() || "genel";
  if (typeof body.whatsapp_message === "string") patch.whatsapp_message = body.whatsapp_message.trim() || null;
  if (typeof body.is_published === "boolean")    patch.is_published = body.is_published;
  if (body.modules !== undefined)                patch.modules = parseModules(body.modules);
  if (typeof body.sort_order === "number")       patch.sort_order = body.sort_order;
  if (typeof body.slug === "string" && body.slug.trim()) patch.slug = slugify(body.slug);

  const { data, error } = await sb.from("courses").update(patch).eq("id", id).select("*").single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Bu slug zaten kullanımda" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ course: data });
}

export async function DELETE(req: Request) {
  const gate = await requireBlogAdminJson();
  if (!gate.ok) return gate.response;

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Yapılandırma eksik" }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  const { error } = await sb.from("courses").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
