import { NextRequest, NextResponse } from "next/server";
import { requireRemauraUserAndCredits } from "@/lib/remaura/api-billing-guard";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const billing = await requireRemauraUserAndCredits(String(formData.get("userId") ?? ""));
    if (!billing.ok) return billing.response;

    const image = formData.get("image") as File | null;

    if (!image) {
      return NextResponse.json({ error: "Görsel eksik" }, { status: 400 });
    }

    const apiKey = process.env.STABILITY_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key bulunamadı" }, { status: 500 });
    }

    const outForm = new FormData();
    outForm.append("image", new Blob([await image.arrayBuffer()], { type: image.type }), image.name);
    outForm.append("prompt", "jewelry product photo, high detail, sharp focus, professional photography");
    outForm.append("output_format", "png");

    const response = await fetch("https://api.stability.ai/v2beta/stable-image/upscale/conservative", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "image/*",
      },
      body: outForm,
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: err }, { status: response.status });
    }

    const buffer = await response.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": 'inline; filename="netlestirild.png"',
      },
    });
  } catch (err) {
    console.error("gorseli-netlestir error:", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
