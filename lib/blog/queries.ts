import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { PostRow } from "./types";

const MIGRATION_HINT =
  "Apply supabase/migrations/20260415180000_posts_blog.sql in Supabase Dashboard → SQL Editor.";

function logPostsQueryError(context: string, error: { message: string; code?: string }) {
  const missingTable =
    error.code === "PGRST205" ||
    error.message.includes("schema cache") ||
    /relation ["']?public\.posts["']? does not exist/i.test(error.message);
  if (missingTable && process.env.NODE_ENV === "development") {
    console.warn(`[blog] ${context}: table public.posts is missing. ${MIGRATION_HINT}`);
    return;
  }
  console.error(`[blog] ${context}:`, error.message);
}

export async function fetchPublishedPosts(category?: string | null): Promise<PostRow[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  let q = supabase
    .from("posts")
    .select("*")
    .eq("is_published", true)
    .order("published_at", { ascending: false, nullsFirst: false });

  if (category && category !== "tumu" && category !== "") {
    q = q.eq("category", category);
  }

  const { data, error } = await q;
  if (error) {
    logPostsQueryError("fetchPublishedPosts", error);
    return [];
  }
  return (data ?? []) as PostRow[];
}

export async function fetchPublishedPostBySlug(slug: string): Promise<PostRow | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    logPostsQueryError("fetchPublishedPostBySlug", error);
    return null;
  }
  return data as PostRow | null;
}

/** Aynı kategoriden önce, sonra genel son yayınlar (özet liste). */
export async function fetchOtherPublishedPosts(excludeSlug: string, category: string | null, limit = 4): Promise<PostRow[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const out: PostRow[] = [];
  const seen = new Set<string>();

  if (category) {
    const { data: catData } = await supabase
      .from("posts")
      .select("*")
      .eq("is_published", true)
      .eq("category", category)
      .neq("slug", excludeSlug)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit);
    for (const row of catData ?? []) {
      const p = row as PostRow;
      if (!seen.has(p.id)) {
        out.push(p);
        seen.add(p.id);
      }
    }
  }

  if (out.length < limit) {
    const { data: rest } = await supabase
      .from("posts")
      .select("*")
      .eq("is_published", true)
      .neq("slug", excludeSlug)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit * 2);
    for (const row of rest ?? []) {
      if (out.length >= limit) break;
      const p = row as PostRow;
      if (!seen.has(p.id)) {
        out.push(p);
        seen.add(p.id);
      }
    }
  }

  return out.slice(0, limit);
}
