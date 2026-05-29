import { loadEnvConfig } from "@next/env";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { getConvertR2Client } from "@/lib/modeller/r2-convert-storage";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 60;

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function requireSuperAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Oturum gerekli" }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!isRemauraSuperAdminUserId(user.id) && profile?.role !== "admin") {
    return { ok: false, response: NextResponse.json({ error: "Yetkisiz" }, { status: 403 }) };
  }
  return { ok: true, userId: user.id };
}

// ─── Supabase service role ────────────────────────────────────────────────────

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}

// ─── R2 upload ────────────────────────────────────────────────────────────────

/**
 * Accepts a URL (https://) or data: base64.
 * Uploads to R2 under koleksiyonlar/{uuid}.jpg and returns the public URL.
 */
async function uploadToR2(imageInput: string): Promise<string> {
  let buf: Buffer;
  let contentType = "image/jpeg";

  if (imageInput.startsWith("http://") || imageInput.startsWith("https://")) {
    const res = await fetch(imageInput);
    buf = Buffer.from(await res.arrayBuffer());
    contentType = res.headers.get("content-type") ?? "image/jpeg";
  } else {
    const raw = imageInput.includes(",") ? imageInput.split(",")[1] : imageInput;
    const mimeMatch = imageInput.match(/data:([^;]+);/);
    contentType = mimeMatch?.[1] ?? "image/jpeg";
    buf = Buffer.from(raw, "base64");
  }

  const ext = contentType.includes("png") ? "png" : "jpg";
  const key = `koleksiyonlar/${randomUUID()}.${ext}`;

  const { s3, bucket, publicBase } = getConvertR2Client();
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buf,
      ContentType: contentType,
    })
  );

  return `${publicBase}/${key}`;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json() as {
    gorselUrl: string;
    koleksiyonAdi?: string;
    tip?: string;
    tema?: string;
    metal?: string;
  };

  const { gorselUrl, koleksiyonAdi, tip, tema, metal } = body;

  if (!gorselUrl) {
    return NextResponse.json({ error: "Görsel URL gerekli." }, { status: 400 });
  }

  // Upload to R2 first
  let r2Url: string;
  try {
    r2Url = await uploadToR2(gorselUrl);
  } catch (err: unknown) {
    console.error("[kaydet] R2 upload failed:", err);
    const e = err as { message?: string };
    return NextResponse.json({ error: `R2 yükleme başarısız: ${e?.message ?? ""}` }, { status: 500 });
  }

  // Save to Supabase
  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Veritabanı bağlantısı kurulamadı." }, { status: 500 });
  }

  const { data, error } = await admin
    .from("koleksiyonlar")
    .insert({
      koleksiyon_adi: koleksiyonAdi ?? null,
      gorsel_url: r2Url,
      tip: tip ?? null,
      tema: tema ?? null,
      metal: metal ?? null,
      user_id: auth.userId,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[kaydet] supabase insert failed:", error);
    return NextResponse.json({ error: "Veritabanı kaydı başarısız." }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, gorselUrl: r2Url });
}

// ─── DELETE — koleksiyon kaydını sil ─────────────────────────────────────────

export async function DELETE(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  let id: string;
  try {
    const body = await req.json() as { id?: string };
    id = body.id ?? "";
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  if (!id) return NextResponse.json({ error: "id zorunlu." }, { status: 400 });

  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "Veritabanı bağlantısı kurulamadı." }, { status: 500 });

  const { error } = await admin.from("koleksiyonlar").delete().eq("id", id);
  if (error) {
    console.error("[kaydet DELETE] error:", error);
    return NextResponse.json({ error: "Silme başarısız." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
