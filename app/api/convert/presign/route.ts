import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import { getConvertR2Client } from "@/lib/modeller/r2-convert-storage";
import { requireRemauraUserAndCredits } from "@/lib/remaura/api-billing-guard";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

const MAX_INPUT_BYTES = 200 * 1024 * 1024;

function safeBaseName(name: string): string {
  const stem = name.replace(/\.[^.]+$/, "");
  return stem.toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "") || "model";
}

/**
 * Büyük GLB için tarayıcıdan doğrudan R2 PUT (Vercel ~4.5MB istek limitini aşmak için).
 * R2 bucket CORS: PUT, Origin = site + localhost, AllowedHeaders *.
 */
export async function POST(req: NextRequest) {
  let body: { userId?: string; fileName?: string; fileSize?: number };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON." }, { status: 400 });
  }

  const billing = await requireRemauraUserAndCredits(String(body.userId ?? ""));
  if (!billing.ok) return billing.response;
  const { userId } = billing;

  const fileSize = Number(body.fileSize);
  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_INPUT_BYTES) {
    return NextResponse.json(
      { error: `Geçersiz dosya boyutu (max ${Math.floor(MAX_INPUT_BYTES / (1024 * 1024))} MB).` },
      { status: 400 },
    );
  }

  const fileName = typeof body.fileName === "string" ? body.fileName : "model.glb";
  if (!fileName.toLowerCase().endsWith(".glb")) {
    return NextResponse.json({ error: "Yalnızca .glb dosyası." }, { status: 400 });
  }

  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  const base = safeBaseName(fileName);
  const key = `convert/uploads/${userId}/${nonce}-${base}.glb`;

  try {
    const { s3, bucket } = getConvertR2Client();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: "model/gltf-binary",
    });
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });
    return NextResponse.json({ uploadUrl, key, method: "PUT" as const });
  } catch (e) {
    console.error("[convert/presign]", e);
    const msg = e instanceof Error ? e.message : "Presign hatası";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
