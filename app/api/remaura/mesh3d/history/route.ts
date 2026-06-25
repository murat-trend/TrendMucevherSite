import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

const BUCKET = "mesh-inputs";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }

  const now = new Date().toISOString();

  const { data: jobs, error } = await supabase
    .from("mesh_jobs")
    .select("id, task_id, image_path, engine, created_at, expires_at")
    .eq("user_id", user.id)
    .gt("expires_at", now)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: "Geçmiş alınamadı." }, { status: 500 });
  }

  // Her kayıt için input görselinin signed URL'ini üret (1 saatlik)
  const items = await Promise.all(
    (jobs ?? []).map(async (job) => {
      let imageUrl: string | null = null;
      if (job.image_path) {
        const { data } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(job.image_path, 3600);
        imageUrl = data?.signedUrl ?? null;
      }
      return {
        id: job.id,
        taskId: job.task_id,
        engine: (job.engine as string) ?? "rv1",
        imageUrl,
        createdAt: job.created_at,
        expiresAt: job.expires_at,
      };
    })
  );

  return NextResponse.json({ items });
}

// Süresi geçmiş kayıtları temizle (kullanıcı kendi kayıtlarını siler)
export async function DELETE() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: true });

  const now = new Date().toISOString();

  // Süresi dolmuş kayıtların görsel path'lerini bul
  const { data: expired } = await supabase
    .from("mesh_jobs")
    .select("id, image_path")
    .eq("user_id", user.id)
    .lte("expires_at", now);

  if (expired && expired.length > 0) {
    const paths = expired.map((r) => r.image_path).filter(Boolean) as string[];
    if (paths.length > 0) {
      await supabase.storage.from(BUCKET).remove(paths);
    }
    const ids = expired.map((r) => r.id);
    await supabase.from("mesh_jobs").delete().in("id", ids);
  }

  return NextResponse.json({ ok: true });
}
