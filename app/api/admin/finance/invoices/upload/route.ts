import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);

function extFor(mime: string, originalName: string): string {
  const fromName = path.extname(originalName || "").toLowerCase();
  if ([".pdf", ".png", ".jpg", ".jpeg"].includes(fromName)) return fromName === ".jpeg" ? ".jpg" : fromName;
  if (mime === "application/pdf") return ".pdf";
  if (mime === "image/png") return ".png";
  return ".jpg";
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Yalnızca PDF, PNG ve JPEG dosyaları yüklenebilir." },
        { status: 400 },
      );
    }
    const max = 10 * 1024 * 1024;
    if (file.size > max) {
      return NextResponse.json({ error: "Dosya boyutu en fazla 10 MB olabilir." }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const ext = extFor(file.type, file.name);
    const storedName = `${randomUUID()}${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads", "invoices");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, storedName), buf);
    const publicPath = `/uploads/invoices/${storedName}`;
    return NextResponse.json({
      url: publicPath,
      originalName: file.name || storedName,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
