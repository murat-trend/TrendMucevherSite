import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { NextRequest, NextResponse } from "next/server";
import * as THREE from "three";
import { NodeIO } from "@gltf-transform/core";
import { KHRDracoMeshCompression } from "@gltf-transform/extensions";
import { draco } from "@gltf-transform/functions";
import draco3d from "draco3dgltf";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export const runtime = "nodejs";

if (typeof (globalThis as { self?: unknown }).self === "undefined") {
  (globalThis as { self: typeof globalThis }).self = globalThis;
}

type ConvertResult = {
  url: string;
  size: number;
  label: string;
};

function safeBaseName(name: string): string {
  const stem = name.replace(/\.[^.]+$/, "");
  return stem.toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "") || "model";
}

async function compressGlbDraco(input: Buffer): Promise<Uint8Array> {
  const encoder = await draco3d.createEncoderModule();
  const io = new NodeIO()
    .registerExtensions([KHRDracoMeshCompression])
    .registerDependencies({
      "draco3d.encoder": encoder,
    });
  const document = await io.readBinary(new Uint8Array(input));
  await document.transform(draco());
  return io.writeBinary(document);
}

async function convertGlbToStl(input: Buffer): Promise<Buffer> {
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
  loader.setDRACOLoader(dracoLoader);
  const gltf = await new Promise<THREE.Group>((resolve, reject) => {
    loader.parse(
      input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength),
      "",
      (parsed) => resolve(parsed.scene),
      (err) => reject(err),
    );
  });

  const exporter = new STLExporter();
  const stl = exporter.parse(gltf, { binary: true });

  if (typeof stl === "string") return Buffer.from(stl, "utf8");
  if (stl instanceof DataView) return Buffer.from(stl.buffer, stl.byteOffset, stl.byteLength);
  if (stl instanceof ArrayBuffer) return Buffer.from(stl);
  return Buffer.from(stl as ArrayLike<number>);
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const doDraco = String(form.get("draco") ?? "false") === "true";
    const doStl = String(form.get("stl") ?? "false") === "true";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "GLB dosyasi gerekli." }, { status: 400 });
    }
    if (!doDraco && !doStl) {
      return NextResponse.json({ error: "En az bir donusum secmelisiniz." }, { status: 400 });
    }

    const input = Buffer.from(await file.arrayBuffer());
    const originalSize = input.byteLength;
    const outDir = path.join(process.cwd(), "public", "convert-output");
    await mkdir(outDir, { recursive: true });

    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const base = safeBaseName(file.name);
    const outputs: { draco: ConvertResult | null; stlZip: ConvertResult | null } = {
      draco: null,
      stlZip: null,
    };

    if (doDraco) {
      const compressed = await compressGlbDraco(input);
      const dracoName = `${base}-${nonce}-draco.glb`;
      await writeFile(path.join(outDir, dracoName), Buffer.from(compressed));
      outputs.draco = {
        url: `/convert-output/${dracoName}`,
        size: compressed.byteLength,
        label: "Draco GLB",
      };
    }

    if (doStl) {
      const stlBuffer = await convertGlbToStl(input);
      const zip = new JSZip();
      zip.file(`${base}.stl`, stlBuffer);
      const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 } });
      const zipName = `${base}-${nonce}.stl.zip`;
      await writeFile(path.join(outDir, zipName), zipBuffer);
      outputs.stlZip = {
        url: `/convert-output/${zipName}`,
        size: zipBuffer.byteLength,
        label: "STL ZIP",
      };
    }

    return NextResponse.json({
      originalSize,
      outputs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Donusum hatasi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

