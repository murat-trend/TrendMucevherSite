import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import JSZip from "jszip";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import type { Document } from "@gltf-transform/core";
import { NodeIO } from "@gltf-transform/core";
import { KHRDracoMeshCompression } from "@gltf-transform/extensions";
import { draco } from "@gltf-transform/functions";
import draco3d from "draco3dgltf";
import { debitCredits } from "@/lib/billing/store";
import { getConvertR2Client } from "@/lib/modeller/r2-convert-storage";
import { requireRemauraUserAndCredits } from "@/lib/remaura/api-billing-guard";

export const runtime = "nodejs";

if (typeof (globalThis as { self?: unknown }).self === "undefined") {
  (globalThis as { self: typeof globalThis }).self = globalThis;
}

/** glTF / WebGL TRIANGLES */
const TRIANGLES_MODE = 4;

type ConvertResult = {
  url: string;
  size: number;
  label: string;
};

function safeBaseName(name: string): string {
  const stem = name.replace(/\.[^.]+$/, "");
  return stem.toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "") || "model";
}

async function uploadFromTmpFile(localPath: string, key: string, contentType: string): Promise<{ url: string; size: number }> {
  const { s3, bucket, publicBase } = getConvertR2Client();
  const body = await readFile(localPath);
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return { url: `${publicBase}/${key}`, size: body.byteLength };
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

function sub3(a: number[], b: number[], out: number[]) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
}

function cross3(a: number[], b: number[], out: number[]) {
  out[0] = a[1] * b[2] - a[2] * b[1];
  out[1] = a[2] * b[0] - a[0] * b[2];
  out[2] = a[0] * b[1] - a[1] * b[0];
}

function normalize3(v: number[]) {
  const len = Math.hypot(v[0], v[1], v[2]);
  if (len < 1e-12) return;
  v[0] /= len;
  v[1] /= len;
  v[2] /= len;
}

type StlTri = { n: number[]; v0: number[]; v1: number[]; v2: number[] };

/**
 * glTF belgesinden üçgenleri toplayıp binary STL üretir (@gltf-transform / manuel STL, THREE yok).
 */
function buildBinaryStlFromDocument(document: Document): Buffer {
  const tris: StlTri[] = [];
  const v0: number[] = [0, 0, 0];
  const v1: number[] = [0, 0, 0];
  const v2: number[] = [0, 0, 0];
  const ab: number[] = [0, 0, 0];
  const ac: number[] = [0, 0, 0];
  const n: number[] = [0, 0, 0];

  const root = document.getRoot();
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const mode = prim.getMode();
      if (mode !== TRIANGLES_MODE) continue;

      const pos = prim.getAttribute("POSITION");
      if (!pos || pos.getType() !== "VEC3") continue;

      const idx = prim.getIndices();
      if (idx) {
        const ic = idx.getCount();
        if (ic % 3 !== 0) continue;
        for (let t = 0; t < ic; t += 3) {
          const i0 = idx.getScalar(t);
          const i1 = idx.getScalar(t + 1);
          const i2 = idx.getScalar(t + 2);
          pos.getElement(i0, v0);
          pos.getElement(i1, v1);
          pos.getElement(i2, v2);
          sub3(v1, v0, ab);
          sub3(v2, v0, ac);
          cross3(ab, ac, n);
          normalize3(n);
          tris.push({
            n: [n[0], n[1], n[2]],
            v0: [v0[0], v0[1], v0[2]],
            v1: [v1[0], v1[1], v1[2]],
            v2: [v2[0], v2[1], v2[2]],
          });
        }
      } else {
        const vc = pos.getCount();
        if (vc % 3 !== 0) continue;
        for (let t = 0; t < vc; t += 3) {
          pos.getElement(t, v0);
          pos.getElement(t + 1, v1);
          pos.getElement(t + 2, v2);
          sub3(v1, v0, ab);
          sub3(v2, v0, ac);
          cross3(ab, ac, n);
          normalize3(n);
          tris.push({
            n: [n[0], n[1], n[2]],
            v0: [v0[0], v0[1], v0[2]],
            v1: [v1[0], v1[1], v1[2]],
            v2: [v2[0], v2[1], v2[2]],
          });
        }
      }
    }
  }

  if (tris.length === 0) {
    throw new Error("STL için üçgen (mesh/POSITION) bulunamadı.");
  }

  const header = Buffer.alloc(80);
  Buffer.from("Remaura GLB convert", "utf8").copy(header, 0);
  const triCount = Buffer.alloc(4);
  triCount.writeUInt32LE(tris.length, 0);
  const body = Buffer.alloc(tris.length * 50);
  let o = 0;
  for (const tri of tris) {
    body.writeFloatLE(tri.n[0], o);
    body.writeFloatLE(tri.n[1], o + 4);
    body.writeFloatLE(tri.n[2], o + 8);
    body.writeFloatLE(tri.v0[0], o + 12);
    body.writeFloatLE(tri.v0[1], o + 16);
    body.writeFloatLE(tri.v0[2], o + 20);
    body.writeFloatLE(tri.v1[0], o + 24);
    body.writeFloatLE(tri.v1[1], o + 28);
    body.writeFloatLE(tri.v1[2], o + 32);
    body.writeFloatLE(tri.v2[0], o + 36);
    body.writeFloatLE(tri.v2[1], o + 40);
    body.writeFloatLE(tri.v2[2], o + 44);
    body.writeUInt16LE(0, o + 48);
    o += 50;
  }

  return Buffer.concat([header, triCount, body]);
}

async function convertGlbToStlBuffer(input: Buffer): Promise<Buffer> {
  const decoder = await draco3d.createDecoderModule();
  const io = new NodeIO()
    .registerExtensions([KHRDracoMeshCompression])
    .registerDependencies({
      "draco3d.decoder": decoder,
    });
  const document = await io.readBinary(new Uint8Array(input));
  return buildBinaryStlFromDocument(document);
}

async function s3ObjectToBuffer(body: unknown): Promise<Buffer> {
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (Buffer.isBuffer(body)) return body;
  const stream = body as {
    transformToByteArray?: () => Promise<Uint8Array>;
  } & AsyncIterable<Uint8Array>;
  if (typeof stream.transformToByteArray === "function") {
    return Buffer.from(await stream.transformToByteArray());
  }
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function runConvertPipeline(args: {
  input: Buffer;
  originalFileName: string;
  userId: string;
  doDraco: boolean;
  doStl: boolean;
}): Promise<NextResponse> {
  const { input, originalFileName, userId, doDraco, doStl } = args;
  if (!doDraco && !doStl) {
    return NextResponse.json({ error: "En az bir donusum secmelisiniz." }, { status: 400 });
  }

  let workDir: string | null = null;
  try {
    const originalSize = input.byteLength;
    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const base = safeBaseName(originalFileName);

    workDir = path.join(tmpdir(), `convert-${nonce}`);
    await mkdir(workDir, { recursive: true });

    const outputs: { draco: ConvertResult | null; stlZip: ConvertResult | null } = {
      draco: null,
      stlZip: null,
    };

    if (doDraco) {
      const compressed = await compressGlbDraco(input);
      const dracoName = `${base}-${nonce}-draco.glb`;
      const localPath = path.join(workDir, dracoName);
      await writeFile(localPath, Buffer.from(compressed));
      const r2Key = `convert/${nonce}/${dracoName}`;
      const { url, size } = await uploadFromTmpFile(localPath, r2Key, "model/gltf-binary");
      outputs.draco = { url, size, label: "Draco GLB" };
    }

    if (doStl) {
      const stlBuffer = await convertGlbToStlBuffer(input);
      const zip = new JSZip();
      zip.file(`${base}.stl`, stlBuffer);
      const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 } });
      const zipName = `${base}-${nonce}.stl.zip`;
      const localZip = path.join(workDir, zipName);
      await writeFile(localZip, zipBuffer);
      const r2Key = `convert/${nonce}/${zipName}`;
      const { url, size } = await uploadFromTmpFile(localZip, r2Key, "application/zip");
      outputs.stlZip = { url, size, label: "STL ZIP" };
    }

    const debit = await debitCredits(userId, 1, "3D Format Dönüştürme");
    if (!debit.ok) {
      return NextResponse.json({ error: "Yetersiz bakiye (kredi düşülemedi)." }, { status: 402 });
    }

    return NextResponse.json({
      originalSize,
      outputs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Donusum hatasi";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (workDir) {
      await rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    let body: { userId?: string; key?: string; draco?: boolean; stl?: boolean };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Geçersiz JSON." }, { status: 400 });
    }

    const billing = await requireRemauraUserAndCredits(String(body.userId ?? ""));
    if (!billing.ok) return billing.response;
    const { userId } = billing;

    const key = String(body.key ?? "").trim();
    const expectedPrefix = `convert/uploads/${userId}/`;
    if (!key.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: "Geçersiz dosya yolu." }, { status: 400 });
    }

    const { s3, bucket } = getConvertR2Client();
    let input: Buffer;
    try {
      const out = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      if (!out.Body) {
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => {});
        return NextResponse.json({ error: "Dosya bulunamadı veya boş." }, { status: 400 });
      }
      input = await s3ObjectToBuffer(out.Body);
    } catch (e) {
      console.error("[convert] GetObject", e);
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => {});
      return NextResponse.json({ error: "Geçici dosya okunamadı." }, { status: 502 });
    }

    const nameFromKey = key.split("/").pop() ?? "model.glb";
    try {
      return await runConvertPipeline({
        input,
        originalFileName: nameFromKey,
        userId,
        doDraco: Boolean(body.draco),
        doStl: Boolean(body.stl),
      });
    } finally {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => {});
    }
  }

  try {
    const form = await req.formData();
    const billing = await requireRemauraUserAndCredits(String(form.get("userId") ?? ""));
    if (!billing.ok) return billing.response;
    const { userId } = billing;

    const file = form.get("file");
    const doDraco = String(form.get("draco") ?? "false") === "true";
    const doStl = String(form.get("stl") ?? "false") === "true";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "GLB dosyasi gerekli." }, { status: 400 });
    }

    const input = Buffer.from(await file.arrayBuffer());
    return runConvertPipeline({
      input,
      originalFileName: file.name,
      userId,
      doDraco,
      doStl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Donusum hatasi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
