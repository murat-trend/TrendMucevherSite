// .rema okuma/yazma — zip kabı (JSZip). Tarayıcı + Node ikisinde de çalışır.
// Binary alışveriş Uint8Array üzerinden (ortam-bağımsız).

import JSZip from "jszip";
import {
  REMA_FORMAT,
  REMA_VERSION,
  type RemaDocument,
  type RemaManifest,
  type RemaMeta,
  type RemaProject,
} from "./types";

const FILE = {
  manifest: "manifest.json",
  document: "document.json",
  meta: "meta.json",
  baked: "baked.glb",
  thumbnail: "thumbnail.webp",
  signature: "signature.txt",
} as const;

export type PackInput = {
  document: RemaDocument;
  base: Uint8Array; // taban geometri (GLB)
  baked?: Uint8Array;
  meta?: RemaMeta;
  thumbnail?: Uint8Array;
  signature?: string;
  app?: string;
  createdAt?: string; // korumak için (yeniden paketlerken)
};

/** Projeyi tek bir .rema (zip) byte dizisine paketle. */
export async function packRema(input: PackInput): Promise<Uint8Array> {
  const now = new Date().toISOString();
  const manifest: RemaManifest = {
    format: REMA_FORMAT,
    version: REMA_VERSION,
    createdAt: input.createdAt ?? now,
    updatedAt: now,
    app: input.app,
  };

  const zip = new JSZip();
  zip.file(FILE.manifest, JSON.stringify(manifest, null, 2));
  zip.file(FILE.document, JSON.stringify(input.document, null, 2));
  // taban geometri, document.base'in işaret ettiği adla yazılır
  zip.file(input.document.base, input.base);
  if (input.baked) zip.file(FILE.baked, input.baked);
  if (input.meta) zip.file(FILE.meta, JSON.stringify(input.meta, null, 2));
  if (input.thumbnail) zip.file(FILE.thumbnail, input.thumbnail);
  if (input.signature) zip.file(FILE.signature, input.signature);

  return zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

export type UnpackResult = RemaProject & {
  /** manifest.version > desteklenen sürüm ise true (forward-compat uyarısı). */
  fromNewerVersion: boolean;
};

/** Bir .rema byte dizisini belleğe aç. Bilinmeyen alanlar korunur/yoksayılır. */
export async function unpackRema(data: Uint8Array): Promise<UnpackResult> {
  const zip = await JSZip.loadAsync(data);

  const readJson = async <T>(name: string): Promise<T | undefined> => {
    const f = zip.file(name);
    if (!f) return undefined;
    return JSON.parse(await f.async("string")) as T;
  };
  const readBin = async (name: string): Promise<Uint8Array | undefined> => {
    const f = zip.file(name);
    if (!f) return undefined;
    return f.async("uint8array");
  };

  const manifest = await readJson<RemaManifest>(FILE.manifest);
  if (!manifest || manifest.format !== REMA_FORMAT) {
    throw new Error("Geçersiz dosya: .rema değil.");
  }

  const document = await readJson<RemaDocument>(FILE.document);
  if (!document) throw new Error("Bozuk .rema: tarif (document) bulunamadı.");

  const base = await readBin(document.base);
  if (!base) throw new Error(`Bozuk .rema: taban geometri yok (${document.base}).`);

  const signatureFile = zip.file(FILE.signature);

  return {
    manifest,
    document,
    base,
    baked: await readBin(FILE.baked),
    meta: await readJson<RemaMeta>(FILE.meta),
    thumbnail: await readBin(FILE.thumbnail),
    signature: signatureFile ? await signatureFile.async("string") : undefined,
    fromNewerVersion: manifest.version > REMA_VERSION,
  };
}
