import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function safeSlug(input: string): string {
  return input
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const slugRaw = String(formData.get("slug") ?? "").trim();
    const slug = safeSlug(slugRaw);
    const glb = formData.get("glb") ?? formData.get("file");
    const stlRaw = formData.get("stl");

    if (!slug) {
      return NextResponse.json({ error: "Slug gerekli." }, { status: 400 });
    }

    const hasGlb = glb instanceof File;
    const hasStl = stlRaw instanceof File;

    if (!hasGlb && !hasStl) {
      return NextResponse.json({ error: "GLB veya STL dosyası gerekli." }, { status: 400 });
    }

    if (hasGlb && !glb.name.toLowerCase().endsWith(".glb")) {
      return NextResponse.json({ error: "GLB dosyası .glb uzantılı olmalı." }, { status: 400 });
    }
    if (hasStl && !stlRaw.name.toLowerCase().endsWith(".stl")) {
      return NextResponse.json({ error: "STL dosyası .stl uzantılı olmalı." }, { status: 400 });
    }

    const publicDir = path.join(process.cwd(), "public");
    const modelsDir = path.join(publicDir, "models");
    await mkdir(modelsDir, { recursive: true });

    const payload: { slug: string; glbUrl?: string; stlUrl?: string } = { slug };

    if (hasGlb) {
      const glbBuffer = Buffer.from(await glb.arrayBuffer());
      const glbPath = path.join(modelsDir, `${slug}.glb`);
      await writeFile(glbPath, glbBuffer);
      payload.glbUrl = `/models/${slug}.glb`;
    }

    if (hasStl) {
      const stlBuffer = Buffer.from(await stlRaw.arrayBuffer());
      const stlPath = path.join(modelsDir, `${slug}.stl`);
      await writeFile(stlPath, stlBuffer);
      payload.stlUrl = `/models/${slug}.stl`;
    }

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Yükleme başarısız.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

