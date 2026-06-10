import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";
import { requireRemauraUserAndCredits } from "@/lib/remaura/api-billing-guard";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 60;

function bufferToBlob(buf: Buffer, type = "image/png"): Blob {
  return new Blob([new Uint8Array(buf)], { type });
}

async function dataUrlToBuffer(dataUrl: string): Promise<Buffer> {
  const base64 = dataUrl.replace(/^data:[^;]+;base64,/, "");
  return Buffer.from(base64, "base64");
}

async function urlToBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Görsel indirilemedi: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const billing = await requireRemauraUserAndCredits((body as { userId?: string })?.userId);
  if (!billing.ok) return billing.response;

  const apiKey = process.env.STABILITY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Servis yapılandırılmamış." }, { status: 500 });
  }

  const image: string | undefined = (body as { image?: string }).image;
  if (!image) {
    return NextResponse.json({ error: "Görsel gerekli." }, { status: 400 });
  }

  try {
    const imgBuf = image.startsWith("data:")
      ? await dataUrlToBuffer(image)
      : await urlToBuffer(image);

    const form = new FormData();
    form.append("image", bufferToBlob(imgBuf), "image.png");
    form.append("output_format", "png");

    const stabilityRes = await fetch(
      "https://api.stability.ai/v2beta/stable-image/edit/remove-background",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "image/*" },
        body: form,
      }
    );

    if (!stabilityRes.ok) {
      const errText = await stabilityRes.text().catch(() => "");
      console.error("Stability remove-bg error:", stabilityRes.status, errText);
      return NextResponse.json({ error: "Arka plan kaldırılamadı." }, { status: 502 });
    }

    const resultBuf = Buffer.from(await stabilityRes.arrayBuffer());
    const resultDataUrl = `data:image/png;base64,${resultBuf.toString("base64")}`;
    return NextResponse.json({ image: resultDataUrl });
  } catch (e: unknown) {
    const err = e as { message?: string };
    return NextResponse.json({ error: err?.message ?? "Arka plan kaldırma başarısız." }, { status: 500 });
  }
}
