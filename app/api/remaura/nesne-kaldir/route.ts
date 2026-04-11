import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get("image") as File | null;
    const prompt = formData.get("prompt") as string | null;

    if (!image || !prompt) {
      return NextResponse.json({ error: "Görsel veya açıklama eksik" }, { status: 400 });
    }

    const apiKey = process.env.STABILITY_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key bulunamadı" }, { status: 500 });
    }

    const outForm = new FormData();
    outForm.append("image", new Blob([await image.arrayBuffer()], { type: image.type }), image.name);
    outForm.append("search_prompt", prompt);
    outForm.append("prompt", "empty background, clean surface");
    outForm.append("output_format", "png");

    const response = await fetch("https://api.stability.ai/v2beta/stable-image/edit/search-and-replace", {
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
        "Content-Disposition": 'inline; filename="result.png"',
      },
    });
  } catch (err) {
    console.error("nesne-kaldir error:", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
