import { NextResponse } from "next/server";
import { runMeshProcess } from "@/lib/remaura/mesh-process-runner";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "STL dosyası gerekli." }, { status: 400 });
    }

    const cleanup = formData.get("cleanup") === "true";
    const repair = formData.get("repair") === "true";
    const smooth = formData.get("smooth") === "true";
    const decimate = formData.get("decimate") === "true";
    const targetFaces = parseInt(String(formData.get("targetFaces") ?? "250000"), 10);
    const maxHoleSize = parseInt(String(formData.get("maxHoleSize") ?? "1000"), 10);

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    console.log("[mesh/process] STL alındı:", {
      size: `${(inputBuffer.length / (1024 * 1024)).toFixed(2)} MB`,
      cleanup,
      repair,
      smooth,
      decimate,
      targetFaces,
      maxHoleSize,
    });

    const result = await runMeshProcess(inputBuffer, {
      cleanup,
      repair,
      smooth,
      decimate,
      targetFaces: Number.isFinite(targetFaces) && targetFaces > 0 ? targetFaces : 250000,
      maxHoleSize: Number.isFinite(maxHoleSize) && maxHoleSize > 0 ? maxHoleSize : 1000,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: "Mesh işleme başarısız.", log: result.log },
        { status: 500 }
      );
    }

    const headers = new Headers();
    headers.set("Content-Type", "model/stl");
    headers.set("Content-Disposition", 'attachment; filename="remura-mesh-processed.stl"');
    headers.set("X-Mesh-Log", encodeURIComponent(result.log.slice(0, 2000)));

    return new NextResponse(result.buffer, { status: 200, headers });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { error: err?.message ?? "Mesh işleme isteği başarısız." },
      { status: 500 }
    );
  }
}
