import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { requireBlogAdminJson } from "@/lib/admin/blog-admin-auth";
import { generateSlug } from "@/lib/blog/slugify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseTags(raw: unknown): string[] | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t).trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    const parts = raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    return parts.length ? parts : null;
  }
  return null;
}

function estimateReadMinutes(content: string | null | undefined): number {
  const text = (content ?? "").trim();
  if (!text) return 5;
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.min(120, Math.ceil(words / 200)));
}

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) return null;
  return createServiceClient(url, serviceKey);
}

function getIdFromUrl(req: Request): string | null {
  const id = new URL(req.url).searchParams.get("id")?.trim();
  return id || null;
}

export async function GET() {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Sunucu yapılandırması eksik" }, { status: 500 });
  }

  const gate = await requireBlogAdminJson();
  if (!gate.ok) return gate.response;

  const { data, error } = await supabase.from("posts").select("*").order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ posts: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Sunucu yapılandırması eksik" }, { status: 500 });
  }

  const gate = await requireBlogAdminJson();
  if (!gate.ok) return gate.response;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "Başlık gerekli" }, { status: 400 });
  }

  const slugRaw = typeof body.slug === "string" ? body.slug.trim() : "";
  const baseSlug = generateSlug(slugRaw || title);

  let slug = baseSlug;
  for (let i = 0; i < 50; i++) {
    const trySlug = i === 0 ? baseSlug : `${baseSlug}-${i + 1}`;
    const { data: existing } = await supabase.from("posts").select("id").eq("slug", trySlug).maybeSingle();
    if (!existing) {
      slug = trySlug;
      break;
    }
  }

  const isPublished = Boolean(body.is_published);
  const content = typeof body.content === "string" ? body.content : null;
  const excerpt = typeof body.excerpt === "string" ? body.excerpt.trim() || null : null;
  const cover_image_url = typeof body.cover_image_url === "string" ? body.cover_image_url.trim() || null : null;
  const category = typeof body.category === "string" && body.category.trim() ? body.category.trim() : "genel";
  const tags = parseTags(body.tags);
  const seo_title = typeof body.seo_title === "string" ? body.seo_title.trim() || null : null;
  const seo_description = typeof body.seo_description === "string" ? body.seo_description.trim() || null : null;
  const read_time =
    typeof body.read_time_minutes === "number" && Number.isFinite(body.read_time_minutes)
      ? Math.max(1, Math.floor(body.read_time_minutes))
      : estimateReadMinutes(content);

  const now = new Date().toISOString();
  const row = {
    title,
    slug,
    content,
    excerpt,
    cover_image_url,
    category,
    tags,
    is_published: isPublished,
    author_id: gate.user.id,
    seo_title,
    seo_description,
    read_time_minutes: read_time,
    published_at: isPublished ? now : null,
  };

  const { data: inserted, error } = await supabase.from("posts").insert(row).select("*").single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Bu slug zaten kullanılıyor." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ post: inserted });
}

function parseTagsPatch(raw: unknown): string[] | null | undefined {
  if (raw === undefined) return undefined;
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t).trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    const parts = raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    return parts.length ? parts : null;
  }
  return null;
}

export async function PATCH(req: Request) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Sunucu yapılandırması eksik" }, { status: 500 });
  }

  const gate = await requireBlogAdminJson();
  if (!gate.ok) return gate.response;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const id = getIdFromUrl(req) || (typeof body.id === "string" ? body.id.trim() : "");
  if (!id) {
    return NextResponse.json({ error: "id gerekli (sorgu: ?id= veya gövdede id)" }, { status: 400 });
  }

  const { data: existing, error: fetchErr } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Yazı bulunamadı" }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};

  if (typeof body.title === "string") patch.title = body.title.trim();
  if (typeof body.content === "string") patch.content = body.content;
  if (typeof body.excerpt === "string") patch.excerpt = body.excerpt.trim() || null;
  if (typeof body.cover_image_url === "string") patch.cover_image_url = body.cover_image_url.trim() || null;
  if (typeof body.category === "string") patch.category = body.category.trim() || "genel";
  if (body.tags !== undefined) patch.tags = parseTagsPatch(body.tags);
  if (typeof body.seo_title === "string") patch.seo_title = body.seo_title.trim() || null;
  if (typeof body.seo_description === "string") patch.seo_description = body.seo_description.trim() || null;

  if (typeof body.slug === "string" && body.slug.trim()) {
    patch.slug = generateSlug(body.slug.trim());
  }

  if (typeof body.read_time_minutes === "number" && Number.isFinite(body.read_time_minutes)) {
    patch.read_time_minutes = Math.max(1, Math.floor(body.read_time_minutes));
  }

  if (typeof body.is_published === "boolean") {
    patch.is_published = body.is_published;
    const wasPub = Boolean(existing.is_published);
    if (body.is_published && !wasPub) {
      patch.published_at = new Date().toISOString();
    }
    if (!body.is_published) {
      patch.published_at = null;
    }
  }

  const nextContent = typeof patch.content === "string" ? patch.content : (existing.content as string | null);
  if (patch.read_time_minutes === undefined && typeof patch.content === "string") {
    patch.read_time_minutes = estimateReadMinutes(nextContent);
  }

  const { data: updated, error } = await supabase.from("posts").update(patch).eq("id", id).select("*").single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Bu slug zaten kullanılıyor." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ post: updated });
}

export async function DELETE(req: Request) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Sunucu yapılandırması eksik" }, { status: 500 });
  }

  const gate = await requireBlogAdminJson();
  if (!gate.ok) return gate.response;

  const id = getIdFromUrl(req);
  if (!id) {
    return NextResponse.json({ error: "id gerekli (?id=)" }, { status: 400 });
  }

  const { error } = await supabase.from("posts").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
