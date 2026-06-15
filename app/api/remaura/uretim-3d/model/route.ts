import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";
import { getMeshyApiKey } from "@/lib/api/meshy";
import { getTripoApiKey, TRIPO_BASE } from "@/lib/api/tripo";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 60;

const MESHY_IMAGE_TO_3D_URL = "https://api.meshy.ai/openapi/v1/image-to-3d";

/**
 * Same-origin GLB proxy — model-viewer önizlemesi için.
 * Sağlayıcı CDN'i cross-origin'e kapalı olabileceğinden, modeli kendi
 * origin'imizden akıtırız. URL client'tan ALINMAZ; taskId'den sunucuda
 * çözülür (SSRF yok). İndirme değil, önizleme amaçlı (inline).
 */
function firstString(...values: unknown[]): string | null {
  for (const v of values) if (typeof v === "string" && v.trim()) return v;
  return null;
}

async function resolveMeshyGlb(taskId: string): Promise<string | null> {
  const apiKey = getMeshyApiKey();
  if (!apiKey) return null;
  const res = await fetch(`${MESHY_IMAGE_TO_3D_URL}/${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => ({}))) as {
    model_url?: string;
    model_urls?: { glb?: string; gltf?: string };
  };
  return firstString(data.model_url, data.model_urls?.glb, data.model_urls?.gltf);
}

async function resolveTripoGlb(taskId: string): Promise<string | null> {
  const apiKey = getTripoApiKey();
  if (!apiKey) return null;
  const res = await fetch(`${TRIPO_BASE}/task/${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => ({}))) as {
    data?: { output?: { model?: string; pbr_model?: string } };
  };
  return firstString(data.data?.output?.pbr_model, data.data?.output?.model);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const engine = searchParams.get("engine");
  const taskId = searchParams.get("taskId")?.trim();
  if (!taskId || (engine !== "meshy" && engine !== "tripo")) {
    return NextResponse.json({ error: "engine ve taskId gerekli." }, { status: 400 });
  }

  try {
    const glbUrl =
      engine === "meshy" ? await resolveMeshyGlb(taskId) : await resolveTripoGlb(taskId);
    if (!glbUrl) {
      return NextResponse.json({ error: "Model henüz hazır değil." }, { status: 404 });
    }

    const fileRes = await fetch(glbUrl, { cache: "no-store" });
    if (!fileRes.ok || !fileRes.body) {
      return NextResponse.json({ error: "Model indirilemedi." }, { status: 502 });
    }

    const headers = new Headers();
    headers.set("Content-Type", "model/gltf-binary");
    headers.set("Cache-Control", "private, max-age=300");
    headers.set("Content-Disposition", 'inline; filename="remaura-3d.glb"');
    return new NextResponse(fileRes.body, { status: 200, headers });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json({ error: err?.message ?? "Model proxy başarısız." }, { status: 500 });
  }
}
