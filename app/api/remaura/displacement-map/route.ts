import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";
import { getReplicateApiKey } from "@/lib/api/replicate";
import Replicate from "replicate";
import { depthToDisplacementMap } from "@/lib/ai/depth/depth-to-displacement";

loadEnvConfig(process.cwd());

const DEPTH_MODEL = "chenxwh/depth-anything-v2:b239ea33cff32bb7abb5db39ffe9a09c14cbc2894331d1ef66fe096eed88ebd4";

export async function POST(req: Request) {
  try {
    const apiKey = getReplicateApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Replicate API anahtarı yapılandırılmamış. .env.local dosyasında REPLICATE_API_TOKEN=... ekleyin." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const imageData = body.image as string | undefined;
    const depthMapData = body.depthMap as string | undefined;

    let depthBuffer: Buffer;

    if (depthMapData?.startsWith("data:image")) {
      const base64 = depthMapData.replace(/^data:[^;]+;base64,/, "");
      depthBuffer = Buffer.from(base64, "base64");
    } else if (imageData?.startsWith("data:image")) {
      const replicate = new Replicate({ auth: apiKey });
      const output = await replicate.run(DEPTH_MODEL, {
        input: { image: imageData, model_size: "Large" },
      }) as { grey_depth?: string; color_depth?: string };

      const greyUrl = output?.grey_depth ?? output?.color_depth;
      if (!greyUrl) {
        return NextResponse.json(
          { error: "Derinlik haritası üretilemedi." },
          { status: 500 }
        );
      }

      const depthRes = await fetch(greyUrl);
      if (!depthRes.ok) {
        return NextResponse.json(
          { error: "Derinlik görseli alınamadı." },
          { status: 500 }
        );
      }
      depthBuffer = Buffer.from(await depthRes.arrayBuffer());
    } else {
      return NextResponse.json(
        { error: "Görsel veya derinlik haritası (data URL) gerekli." },
        { status: 400 }
      );
    }

    const displacementBuffer = await depthToDisplacementMap(depthBuffer);
    const displacementBase64 = displacementBuffer.toString("base64");

    return NextResponse.json({
      displacementMap: `data:image/png;base64,${displacementBase64}`,
    });
  } catch (error: unknown) {
    console.error("DISPLACEMENT MAP ERROR:", error);
    const err = error as { message?: string };
    return NextResponse.json(
      { error: err?.message ?? "Displacement map üretilemedi." },
      { status: 500 }
    );
  }
}
