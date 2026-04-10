import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";
import { getMeshyApiKey } from "@/lib/api/meshy";

loadEnvConfig(process.cwd());

const MESHY_IMAGE_TO_3D_URL = "https://api.meshy.ai/openapi/v1/image-to-3d";
const MESHY_REMESH_URL = "https://api.meshy.ai/openapi/v1/remesh";
const ALLOWED_FORMATS = new Set(["glb", "gltf", "obj", "stl", "fbx", "usdz"]);

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const apiKey = getMeshyApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: "Meshy API anahtarı yapılandırılmamış." }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId")?.trim();
    const remeshTaskId = searchParams.get("remeshTaskId")?.trim();
    const formatReq = searchParams.get("format")?.trim().toLowerCase() ?? "glb";
    const kind = searchParams.get("kind")?.trim() ?? "view";

    // Dış çap ölçekleme parametresi (mm)
    const diameterParam = searchParams.get("diameterMm");
    const diameterMm = diameterParam ? parseFloat(diameterParam) : null;

    if (!taskId && !remeshTaskId) {
      return NextResponse.json({ error: "taskId veya remeshTaskId gerekli." }, { status: 400 });
    }

    const format = ALLOWED_FORMATS.has(formatReq) ? formatReq : "glb";
    const asAttachment = kind === "download";

    // Remesh task ID varsa remesh endpoint'ini kullan, yoksa image-to-3d
    const fetchUrl = remeshTaskId
      ? `${MESHY_REMESH_URL}/${encodeURIComponent(remeshTaskId)}`
      : `${MESHY_IMAGE_TO_3D_URL}/${encodeURIComponent(taskId!)}`;

    const taskRes = await fetch(fetchUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
    const taskData = await taskRes.json().catch(() => ({}));
    if (!taskRes.ok) {
      return NextResponse.json({ error: "Meshy gorev detayi alinamadi." }, { status: taskRes.status || 500 });
    }

    const normalized = taskData as {
      model_url?: string;
      model_urls?: Record<string, string | undefined>;
    };

    // Önce istenen formatı ara; bulunamazsa sadece GLB için fallback yap
    const directByFormat = normalized.model_urls?.[format] ?? null;
    const selectedUrl =
      directByFormat ??
      (format === "glb"
        ? firstString(normalized.model_url, normalized.model_urls?.glb)
        : null);

    if (!selectedUrl) {
      return NextResponse.json(
        { error: `${format.toUpperCase()} formatı henüz hazır değil veya bu görevde mevcut değil.` },
        { status: 404 }
      );
    }

    const fileRes = await fetch(selectedUrl, { method: "GET", cache: "no-store" });
    if (!fileRes.ok) {
      return NextResponse.json({ error: "Model dosyasi indirilemedi." }, { status: fileRes.status || 500 });
    }

    const rawBuffer = await fileRes.arrayBuffer();
    if (rawBuffer.byteLength < 1024) {
      return NextResponse.json(
        { error: "İndirilen model dosyası geçersiz veya boş." },
        { status: 422 }
      );
    }
    // Use the requested format as the download extension (not the CDN URL extension)
    const outputExt = format;

    const CONTENT_TYPES: Record<string, string> = {
      glb: "model/gltf-binary",
      gltf: "model/gltf+json",
      obj: "text/plain",
      stl: "model/stl",
      fbx: "application/octet-stream",
      usdz: "model/vnd.usdz+zip",
    };
    const contentType = CONTENT_TYPES[outputExt] ?? "application/octet-stream";

    // Outer-diameter scaling: ALWAYS use GLB as input (GLTF spec = meters, deterministic unit).
    // Meshy STL coordinates are inconsistent; GLB is always in meters.
    let finalBuffer: ArrayBuffer = rawBuffer;
    if (diameterMm !== null && Number.isFinite(diameterMm) && diameterMm > 0) {
      try {
        const { applyRingScale } = await import("@/lib/remaura/ring-scale-runner");

        // Fetch the GLB version for Python (meters unit is reliable)
        let glbBuffer: ArrayBuffer = rawBuffer;
        let inputExtForPython = outputExt;

        if (outputExt !== "glb") {
          const glbUrl =
            normalized.model_urls?.["glb"] ??
            firstString(normalized.model_url, normalized.model_urls?.glb) ??
            null;
          if (glbUrl) {
            const glbRes = await fetch(glbUrl, { method: "GET", cache: "no-store" });
            if (glbRes.ok) {
              glbBuffer = await glbRes.arrayBuffer();
              inputExtForPython = "glb";
              console.log("[file/route] GLB alindi, ring_scale.py'a gonderiliyor (GLB → meters)");
            }
          }
        }

        const result = await applyRingScale(
          Buffer.from(glbBuffer),
          inputExtForPython, // always "glb" when possible
          outputExt,         // export in user-requested format (stl / glb)
          diameterMm
        );
        if (result.scaled) {
          const sliced = result.buffer.buffer.slice(
            result.buffer.byteOffset,
            result.buffer.byteOffset + result.buffer.byteLength
          );
          finalBuffer = sliced as ArrayBuffer;
        }
      } catch (e) {
        console.warn("[file/route] ring_scale failed, returning original:", e);
      }
    }

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Cache-Control", "no-store");
    headers.set(
      "Content-Disposition",
      `${asAttachment ? "attachment" : "inline"}; filename="remaura-3d-ai.${outputExt}"`
    );

    return new NextResponse(finalBuffer, { status: 200, headers });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json({ error: err?.message ?? "Dosya proxy istegi basarisiz." }, { status: 500 });
  }
}
