import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const runtime = "nodejs";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function GET(req: NextRequest) {
  const requireAuth = req.nextUrl.searchParams.get("auth") === "true";

  if (requireAuth) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
    }
  }

  const key = req.nextUrl.searchParams.get("key");
  const bucket = req.nextUrl.searchParams.get("bucket") ?? "private";

  if (!key) {
    return NextResponse.json({ error: "key parametresi gerekli" }, { status: 400 });
  }

  if (key.includes("..") || key.startsWith("/")) {
    return NextResponse.json({ error: "Geçersiz key" }, { status: 400 });
  }

  // bucket parametresine göre doğru bucket'ı seç
  const bucketName = bucket === "private"
    ? process.env.R2_PRIVATE_BUCKET_NAME!
    : process.env.R2_BUCKET_NAME!;

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    return NextResponse.json({ url });
  } catch (err: unknown) {
    console.error("[r2-signed-url] hata:", err);
    return NextResponse.json({ error: "URL üretilemedi" }, { status: 500 });
  }
}
