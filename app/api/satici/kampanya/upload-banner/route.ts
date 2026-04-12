import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

function r2Client() {
  return new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }

  if (
    !process.env.R2_ENDPOINT ||
    !process.env.R2_ACCESS_KEY_ID ||
    !process.env.R2_SECRET_ACCESS_KEY ||
    !process.env.R2_BUCKET_NAME ||
    !process.env.R2_PUBLIC_BASE_URL
  ) {
    return NextResponse.json({ error: "R2 yapılandırması eksik." }, { status: 503 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Dosya gerekli." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Dosya en fazla 8 MB olabilir." }, { status: 400 });
  }

  let webpBuffer: Buffer;
  try {
    webpBuffer = await sharp(buffer).webp({ quality: 85 }).toBuffer();
  } catch {
    return NextResponse.json({ error: "Görsel işlenemedi." }, { status: 400 });
  }

  const key = `campaign-banners/${user.id}/${randomUUID()}.webp`;
  const s3 = r2Client();
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: webpBuffer,
      ContentType: "image/webp",
    }),
  );

  const url = `${process.env.R2_PUBLIC_BASE_URL!.replace(/\/$/, "")}/${key}`;
  return NextResponse.json({ url });
}
