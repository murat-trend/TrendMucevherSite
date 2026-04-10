import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

const MAX_FILES = 8;
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

function extFromMime(mime: string): string | null {
  const m = mime.toLowerCase();
  if (m === "image/jpeg") return "jpg";
  if (m === "image/png") return "png";
  if (m === "image/webp") return "webp";
  if (m === "image/gif") return "gif";
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const customerName = String(form.get("customerName") ?? "").trim();
    const customerEmail = String(form.get("customerEmail") ?? "").trim();
    const notes = String(form.get("notes") ?? "").trim();

    if (!customerName || customerName.length > 200) {
      return NextResponse.json({ error: "Geçerli bir ad girin." }, { status: 400 });
    }
    if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) || customerEmail.length > 254) {
      return NextResponse.json({ error: "Geçerli bir e-posta girin." }, { status: 400 });
    }
    if (notes.length > 8000) {
      return NextResponse.json({ error: "Notlar çok uzun (en fazla 8000 karakter)." }, { status: 400 });
    }

    const submissionId = randomUUID();
    const baseDir = path.join(process.cwd(), "public", "uploads", "custom-order-requests", submissionId);
    await mkdir(baseDir, { recursive: true });

    const rawFiles = form.getAll("images");
    const savedNames: string[] = [];

    for (const entry of rawFiles) {
      if (!(entry instanceof File) || entry.size === 0) continue;
      if (savedNames.length >= MAX_FILES) break;
      if (entry.size > MAX_BYTES) {
        return NextResponse.json(
          { error: `Her görsel en fazla ${MAX_BYTES / (1024 * 1024)} MB olabilir.` },
          { status: 400 },
        );
      }
      if (!entry.type.startsWith("image/")) {
        continue;
      }
      const extFromName = entry.name.split(".").pop()?.toLowerCase();
      const rawExt =
        extFromMime(entry.type) ??
        (extFromName && extFromName !== "" ? (extFromName === "jpeg" ? "jpg" : extFromName) : null);
      const normExt = rawExt === "jpeg" ? "jpg" : rawExt;
      if (!normExt || !ALLOWED_EXT.has(normExt)) {
        return NextResponse.json({ error: "Yalnızca JPG, PNG, WebP veya GIF yükleyin." }, { status: 400 });
      }
      const fname = `${randomUUID()}.${normExt}`;
      const buf = Buffer.from(await entry.arrayBuffer());
      await writeFile(path.join(baseDir, fname), buf);
      savedNames.push(fname);
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const fileLinks = savedNames.map((fn) => `${siteUrl}/uploads/custom-order-requests/${submissionId}/${fn}`);

    const notifyTo = process.env.CUSTOM_ORDER_NOTIFY_EMAIL?.trim();
    if (process.env.RESEND_API_KEY && notifyTo) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const linksHtml =
        fileLinks.length > 0
          ? `<ul>${fileLinks.map((u) => `<li><a href="${u}">${u}</a></li>`).join("")}</ul>`
          : "<p>(Görsel eklenmedi.)</p>";

      await resend.emails.send({
        from: "Trend Mücevher <no-reply@no-reply.trendmucevher.com>",
        to: notifyTo,
        replyTo: customerEmail,
        subject: `Özel sipariş talebi — ${customerName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 640px; line-height: 1.5; color: #1a1a1a;">
            <h2 style="color: #8b6914;">Yeni özel sipariş talebi</h2>
            <p><strong>Talep no:</strong> ${submissionId}</p>
            <p><strong>Ad:</strong> ${escapeHtml(customerName)}</p>
            <p><strong>E-posta:</strong> ${escapeHtml(customerEmail)}</p>
            <p><strong>Notlar:</strong></p>
            <pre style="white-space: pre-wrap; background: #f5f5f5; padding: 12px; border-radius: 6px;">${escapeHtml(
              notes || "(—)",
            )}</pre>
            <p><strong>Yüklenen görseller:</strong></p>
            ${linksHtml}
          </div>
        `,
      });
    }

    return NextResponse.json({
      ok: true,
      submissionId,
      fileCount: savedNames.length,
      emailed: Boolean(process.env.RESEND_API_KEY && notifyTo),
    });
  } catch (e) {
    console.error("[custom-order]", e);
    return NextResponse.json({ error: "Gönderim başarısız. Lütfen tekrar deneyin." }, { status: 500 });
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
