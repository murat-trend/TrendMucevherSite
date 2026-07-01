import { loadEnvConfig } from "@next/env";
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/remaura/uretim-3d/auth";
import {
  buildKameraBlock,
  ISCILIK_KALITE_BLOCK,
  METAL_RENGI_EN,
  TAKI_TIPI_EN,
  type Uretim3DKategori,
} from "@/lib/remaura/uretim-3d/prompts";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 300;

const MODEL = "gemini-3.1-flash-image";

const GECERLI_KATEGORILER: Uretim3DKategori[] = ["Yüzük", "Kolye Ucu"];

/**
 * GİZLİ HAZIRLAMA İSTASYONU (3D öncesi):
 * Kullanıcının yüklediği GERÇEK parçayı alır; geometrisini/tasarımını koruyarak
 * 3D motoru için doğru üretim açısına getirir ve işçiliğini netleştirir.
 *
 * Neden img2img (Gemini) — ControlNet açı döndüremez (girişin hatlarına kilitlenir);
 * Tripo/Meshy girişin açısını koruduğu için 2D'yi doğru açıyla vermek ZORUNLUDUR.
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
    return NextResponse.json(
      { error: "Servis yapılandırılmamış, lütfen yöneticiye bildirin." },
      { status: 500 }
    );
  }

  let image = "";
  let kategori: Uretim3DKategori = "Yüzük";
  let metalRengi = "";
  try {
    const body = (await req.json()) as {
      image?: string;
      kategori?: string;
      metalRengi?: string;
    };
    image = body.image ?? "";
    if (body.kategori && (GECERLI_KATEGORILER as string[]).includes(body.kategori)) {
      kategori = body.kategori as Uretim3DKategori;
    }
    metalRengi = body.metalRengi ?? "";
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  if (!image) {
    return NextResponse.json({ error: "Görsel gerekli." }, { status: 400 });
  }

  try {
    // ── Görsel → base64 ──────────────────────────────────────────────────────
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

    const metalContext = [metalRengi].filter(Boolean).join(" ");
    const metalEn = METAL_RENGI_EN[metalRengi] ?? "";
    const takiEn = TAKI_TIPI_EN[kategori];
    const kameraBlock = buildKameraBlock(kategori, metalContext);

    // Gizli üretim promtu — parçayı KORU, sadece açı + işçilik
    const editPrompt = [
      `This is a real photograph of a single ${metalEn ? metalEn + " " : ""}${takiEn}.`,
      "TASK: Re-render THIS EXACT same piece — same design, same silhouette, same proportions, " +
        "same stones and same decorative metalwork — as a clean studio product image at the " +
        "correct production camera angle described below. This image will be fed to a 3D " +
        "reconstruction engine, so the camera angle must be exactly right.",
      "",
      "PRESERVE EXACTLY (do NOT redesign, do NOT invent new shapes or motifs):",
      "- The overall geometry, silhouette and proportions of the piece",
      "- Metal color and finish exactly as shown",
      "- Every stone (count, placement, cut) and all filigree / engraving / scrollwork",
      "",
      kameraBlock,
      "",
      ISCILIK_KALITE_BLOCK,
    ].join("\n");

    const ai = new GoogleGenAI({ apiKey: googleKey });
    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: editPrompt },
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
      console.error(
        "[uretim-3d/hazirla] görsel parçası yok, parts:",
        JSON.stringify(parts).slice(0, 300)
      );
      return NextResponse.json(
        { error: "Görsel hazırlanamadı, lütfen tekrar deneyin." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      image: `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`,
      kategori,
    });
  } catch (err: unknown) {
    console.error("[uretim-3d/hazirla] error:", err);
    return NextResponse.json(
      { error: "Hazırlama başarısız oldu, lütfen tekrar deneyin." },
      { status: 500 }
    );
  }
}
