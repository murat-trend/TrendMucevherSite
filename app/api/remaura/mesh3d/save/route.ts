import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const BUCKET = "mesh-inputs";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }

  const body = await req.json() as { taskId: string; image?: string; engine?: string };
  const { taskId, image, engine = "rv1" } = body;

  if (!taskId) {
    return NextResponse.json({ error: "taskId gerekli." }, { status: 400 });
  }

  let imagePath: string | null = null;

  // Input görseli storage'a kaydet (base64 → PNG)
  if (image) {
    try {
      const base64 = image.includes(",") ? image.split(",")[1] : image;
      const buf = Buffer.from(base64, "base64");
      const filename = `${user.id}/${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filename, buf, { contentType: "image/png", upsert: false });
      if (!uploadError) imagePath = filename;
    } catch {
      // görsel kaydedilemese de devam et
    }
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("mesh_jobs").insert({
    user_id: user.id,
    task_id: taskId,
    image_path: imagePath,
    engine,
    expires_at: expiresAt,
  });

  if (error) {
    console.error("[mesh/save]", error.message);
    return NextResponse.json({ error: "Kayıt başarısız." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
