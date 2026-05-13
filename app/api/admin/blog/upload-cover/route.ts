import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { createClient } from "@/utils/supabase/server";

export const runtime = 'nodejs';
export const dynamic = "force-dynamic";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

function adminAllowed(userId: string, role: string | null | undefined): boolean {
  return isRemauraSuperAdminUserId(userId) || role === "admin";
}

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const auth = createClient(cookieStore);
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
    }

    const { data: me } = await auth.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (!adminAllowed(user.id, me?.role)) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    }

    const endpoint = process.env.R2_ENDPOINT?.trim();
    const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
    const bucket = process.env.R2_BUCKET_NAME?.trim();
    const publicBase = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "").trim();
    if (!endpoint || !accessKeyId || !secretAccessKey || !bucket || !publicBase) {
      return NextResponse.json({ error: "R2 yapılandırması eksik" }, { status: 500 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
    }

    const mime = file.type || "application/octet-stream";
    if (!ALLOWED.has(mime)) {
      return NextResponse.json({ error: "Desteklenen türler: JPEG, PNG, WebP, GIF" }, { status: 400 });
    }

    const uuid = randomUUID();
    const key = `blog/covers/${uuid}.webp`;
    const input = Buffer.from(await file.arrayBuffer());
    const webpBuffer = await sharp(input).webp({ quality: 85 }).toBuffer();

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: webpBuffer,
        ContentType: "image/webp",
      }),
    );

    const url = `${publicBase}/blog/covers/${uuid}.webp`;
    return NextResponse.json({ url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Yükleme başarısız";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
