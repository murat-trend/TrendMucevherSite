import { NextRequest, NextResponse } from "next/server";

const HOLLOW_SERVER = process.env.HOLLOW_SERVER_URL ?? "http://127.0.0.1:5001";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const wallThicknessMm = form.get("wallThicknessMm") ?? "1.5";
    const method = form.get("method") ?? "fast";

    if (!file) {
      return NextResponse.json({ error: "Dosya gönderilmedi." }, { status: 400 });
    }

    // Python server'a ilet
    const upstream = new FormData();
    upstream.append("file", file);
    upstream.append("wallThicknessMm", String(wallThicknessMm));
    upstream.append("method", String(method));

    const res = await fetch(`${HOLLOW_SERVER}/hollow`, {
      method: "POST",
      body: upstream,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "İşlem başarısız." }));
      return NextResponse.json({ error: err.error ?? "İşlem başarısız." }, { status: 500 });
    }

    // İstatistikleri header'dan çek
    const stats = {
      wallThicknessMm: Number(res.headers.get("X-Wall-Mm") ?? wallThicknessMm),
      volumeBeforeCm3: Number(res.headers.get("X-Volume-Before") ?? 0),
      volumeAfterCm3: Number(res.headers.get("X-Volume-After") ?? 0),
      weightSavedGr: Number(res.headers.get("X-Weight-Saved") ?? 0),
    };

    // STL binary'yi client'a gönder
    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "model/stl",
        "Content-Disposition": "attachment; filename=hollow_output.stl",
        "X-Stats": JSON.stringify(stats),
      },
    });
  } catch (err) {
    console.error("[hollow/process]", err);
    return NextResponse.json({ error: "Servis bağlantısı kurulamadı." }, { status: 503 });
  }
}
