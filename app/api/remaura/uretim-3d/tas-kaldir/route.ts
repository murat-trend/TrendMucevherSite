import { loadEnvConfig } from "@next/env";
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/remaura/uretim-3d/auth";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Taş kaldır — KOPYA (kaynak: koleksiyon-edit/tas-kaldir).
 * Yükleme penceresinde kullanıcı taşlı parçayı yükleyip taşları çıkarabilir,
 * sonra hazırla → 3D zincirine yollar. Orijinal rota bozulmadan kalır.
 */
export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const rawKey = process.env.GOOGLE_API_KEY ?? "";
  const googleKey =
    rawKey
      .split("")
      .filter((ch) => ch.charCodeAt(0) > 31 && ch.charCodeAt(0) < 256)
      .join("")
      .trim() || undefined;

  if (!googleKey) {
    return NextResponse.json({ error: "Servis yapılandırılmamış." }, { status: 500 });
  }

  let image: string;
  try {
    const body = (await req.json()) as { image?: string };
    image = body.image ?? "";
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  if (!image) {
    return NextResponse.json({ error: "Görsel gerekli." }, { status: 400 });
  }

  try {
    let base64Data: string;
    let mimeType: string;
    if (image.startsWith("http://") || image.startsWith("https://")) {
      const res = await fetch(image);
      if (!res.ok) throw new Error(`Görsel indirilemedi: ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      mimeType = res.headers.get("content-type") ?? "image/jpeg";
      base64Data = buf.toString("base64");
    } else {
      mimeType = image.match(/data:([^;]+);/)?.[1] ?? "image/jpeg";
      base64Data = image.includes(",") ? image.split(",")[1] : image;
    }

    const ai = new GoogleGenAI({ apiKey: googleKey });
    const result = await ai.models.generateContent({
      model: "gemini-3.1-flash-image",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            {
              text: [
                "This is a jewelry piece. Perform the following edit precisely:",
                "",
                "REMOVE: All gemstones — diamonds, rubies, sapphires, emeralds, amethysts, citrines, topazes, crystals, and any other colored or clear stones.",
                "",
                "REPLACE WITH: The empty metal setting that was holding each stone — the bezel cup, prong basket, or claw structure should remain clearly visible and open/empty.",
                "",
                "PRESERVE EXACTLY (do NOT change any of these):",
                "- The overall jewelry design and silhouette",
                "- Metal color and finish (gold, silver, rose gold — exactly as shown)",
                "- All filigree, scrollwork, floral motifs, and decorative metalwork",
                "- The band, shank, or chain as-is",
                "- Background, lighting, shadows, and photo composition",
                "",
                "RESULT: The piece should look like the same exact jewelry but with empty settings — ready to be set with new stones.",
              ].join("\n"),
            },
          ],
        },
      ],
      config: { responseModalities: ["IMAGE", "TEXT"] } as never,
    });

    const parts = (result.candidates?.[0]?.content?.parts ?? []) as {
      thought?: boolean;
      inlineData?: { mimeType: string; data: string };
      text?: string;
    }[];

    const imgPart = parts.find(
      (p) => !p.thought && p.inlineData?.mimeType?.startsWith("image/")
    );
    if (!imgPart?.inlineData) {
      console.error("[uretim-3d/tas-kaldir] görsel parçası yok:", JSON.stringify(parts).slice(0, 300));
      return NextResponse.json({ error: "Görsel işlenemedi, lütfen tekrar deneyin." }, { status: 500 });
    }

    return NextResponse.json({
      image: `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`,
    });
  } catch (err: unknown) {
    console.error("[uretim-3d/tas-kaldir] error:", err);
    return NextResponse.json({ error: "İşlem başarısız oldu, lütfen tekrar deneyin." }, { status: 500 });
  }
}
