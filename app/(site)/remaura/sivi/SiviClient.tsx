"use client";

import { useCallback, useRef, useState } from "react";
import {
  analyzeMesh,
  castFromImage,
  createEmptyDocument,
  imageFromRGBA,
  meshToBinaryStl,
  packRema,
  type IndexedMesh,
  type MeshStats,
  type RemaDocument,
  type SourceImage,
} from "@/lib/remaura/sivi";
import { SiviViewer } from "./SiviViewer";

const MAX_DECODE = 360; // görseli bu boyuta indirip oku (hız)

type Mold = {
  footprintMm: number;
  baseMm: number;
  reliefMm: number;
  maskThreshold: number;
  pitchMm: number;
};

const DEFAULT_MOLD: Mold = {
  footprintMm: 40,
  baseMm: 1.0,
  reliefMm: 6.0,
  maskThreshold: 60,
  pitchMm: 0.3,
};

export function SiviClient() {
  const [source, setSource] = useState<SourceImage | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageBytes, setImageBytes] = useState<Uint8Array | null>(null);
  const [mold, setMold] = useState<Mold>(DEFAULT_MOLD);
  const [mesh, setMesh] = useState<IndexedMesh | null>(null);
  const [stats, setStats] = useState<MeshStats | null>(null);
  const [busy, setBusy] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const onFile = useCallback(async (file: File) => {
    setError(null);
    setMesh(null);
    setStats(null);
    const bytes = new Uint8Array(await file.arrayBuffer());
    setImageBytes(bytes);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_DECODE / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) { setError("Görsel okunamadı."); return; }
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      setSource(imageFromRGBA(w, h, new Uint8Array(data.buffer)));
      setPreview(url);
    };
    img.onerror = () => setError("Görsel yüklenemedi.");
    img.src = url;
  }, []);

  const dok = useCallback(() => {
    if (!source) return;
    setBusy(true);
    setError(null);
    setMesh(null);
    setStats(null);
    // spinner görünsün diye bir sonraki frame'de ağır işi çalıştır
    setTimeout(() => {
      try {
        const m = castFromImage(source, mold);
        if (m.indices.length === 0) {
          setError("Döküm boş çıktı — eşik değerini düşürmeyi dene.");
        } else {
          setMesh(m);
          setStats(analyzeMesh(m));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Döküm hatası.");
      } finally {
        setBusy(false);
      }
    }, 40);
  }, [source, mold]);

  const download = useCallback((bytes: Uint8Array, name: string) => {
    const blob = new Blob([bytes.slice().buffer], { type: "application/octet-stream" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }, []);

  const downloadStl = useCallback(() => {
    if (!mesh) return;
    download(meshToBinaryStl(mesh), "rem-dokum.stl");
  }, [mesh, download]);

  const downloadRema = useCallback(async () => {
    if (!mesh || !stats) return;
    const stl = meshToBinaryStl(mesh);
    const d = stats.bbox;
    const doc: RemaDocument = {
      ...createEmptyDocument("base.stl"),
      operations: [
        {
          id: "dokum1",
          type: "gorselDokum",
          enabled: true,
          params: { ...mold, imageRef: imageBytes ? "thumbnail" : undefined },
          label: "gorselDokum",
        },
      ],
    };
    const rema = await packRema({
      document: doc,
      base: stl,
      meta: {
        dimensionsMm: [d.max[0] - d.min[0], d.max[1] - d.min[1], d.max[2] - d.min[2]],
        watertight: stats.watertight,
        productionReady: stats.watertight,
      },
      thumbnail: imageBytes ?? undefined,
      app: "remaura-sivi",
    });
    download(rema, "rem-dokum.rema");
  }, [mesh, stats, mold, imageBytes, download]);

  const set = (k: keyof Mold) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setMold((m) => ({ ...m, [k]: Number(e.target.value) }));

  return (
    <div className="min-h-screen bg-[#07080a] text-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6">
          <h1 className="font-display text-3xl font-medium tracking-[-0.03em] text-white">Sıvı — Kalıp Döküm</h1>
          <p className="mt-2 text-sm text-[#c9a88a]">
            Görseli kalıba koy, sıvıyı dök, kalıbı at — geriye görselin 3B dökümü kalır.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          {/* Sol: girdi + ayarlar */}
          <div className="space-y-5 rounded-2xl border border-white/[0.06] bg-[#0a0b0e] p-5">
            <div>
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-xl border border-dashed border-[#b76e79]/40 bg-[#b76e79]/[0.06] px-4 py-6 text-sm text-[#c9a88a] transition-colors hover:border-[#b76e79]/70"
              >
                {preview ? "Görseli değiştir" : "Görsel yükle"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); }}
              />
              {preview && (
                <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.06] bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="kaynak" className="mx-auto max-h-40 object-contain" />
                </div>
              )}
              {source && (
                <p className="mt-2 text-xs text-white/40">{source.width}×{source.height} px okundu</p>
              )}
            </div>

            <div className="space-y-4 border-t border-white/[0.06] pt-4">
              <Slider label="Kalıp boyu (en uzun kenar)" unit="mm" min={10} max={120} step={1} value={mold.footprintMm} onChange={set("footprintMm")} />
              <Slider label="Hacim (ton derinliği)" unit="mm" min={0.5} max={20} step={0.5} value={mold.reliefMm} onChange={set("reliefMm")} />
              <Slider label="Taban kalınlığı" unit="mm" min={0.2} max={5} step={0.1} value={mold.baseMm} onChange={set("baseMm")} />
              <Slider label="Silüet eşiği" unit="" min={5} max={250} step={5} value={mold.maskThreshold} onChange={set("maskThreshold")} />
              <Slider label="Çözünürlük (sıvı inceliği)" unit="mm" min={0.12} max={0.6} step={0.02} value={mold.pitchMm} onChange={set("pitchMm")} />
            </div>

            <button
              onClick={dok}
              disabled={!source || busy}
              className="w-full rounded-full bg-[linear-gradient(135deg,#c4838b,#b76e79,#a65f69)] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "Sıvı dökülüyor…" : "Dök"}
            </button>

            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>

          {/* Sağ: 3B önizleme */}
          <div className="flex flex-col rounded-2xl border border-white/[0.06] bg-[#0a0b0e] p-3">
            <div className="relative min-h-[420px] flex-1 overflow-hidden rounded-xl bg-[#07080a]">
              <SiviViewer mesh={mesh} wireframe={wireframe} />
              {!mesh && !busy && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-white/30">
                  Görsel yükle, sonra Dök
                </div>
              )}
              {busy && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#b76e79]/30 border-t-[#b76e79]" />
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-white/60">
                <input type="checkbox" checked={wireframe} onChange={(e) => setWireframe(e.target.checked)} /> Tel kafes
              </label>
              {stats && (
                <span className="text-xs text-white/50">
                  {stats.triangleCount.toLocaleString("tr")} üçgen ·{" "}
                  <span className={stats.watertight ? "text-emerald-400" : "text-amber-400"}>
                    {stats.watertight ? "watertight ✓" : `${stats.openEdges} açık kenar`}
                  </span>
                </span>
              )}
              <div className="ml-auto flex gap-2">
                <button
                  onClick={downloadStl}
                  disabled={!mesh}
                  className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/80 transition-colors hover:border-white/30 disabled:opacity-30"
                >
                  STL indir
                </button>
                <button
                  onClick={() => void downloadRema()}
                  disabled={!mesh}
                  className="rounded-full bg-[#b76e79] px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-30"
                >
                  .rema indir
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Slider({ label, unit, min, max, step, value, onChange }: {
  label: string; unit: string; min: number; max: number; step: number;
  value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-xs text-white/70">{label}</span>
        <span className="font-mono text-xs text-[#c9a88a]">{value}{unit && ` ${unit}`}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={onChange} className="range-slider w-full" />
    </label>
  );
}
