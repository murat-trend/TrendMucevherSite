"use client";

import { useCallback, useRef, useState } from "react";
import type { CSSProperties, FC } from "react";
import Script from "next/script";
import Image from "next/image";

// model-viewer web bileşeni (CDN) — GLB önizleme için tipli alias
const ModelViewer = "model-viewer" as unknown as FC<{
  src?: string;
  "camera-controls"?: boolean;
  "auto-rotate"?: boolean;
  exposure?: string;
  style?: CSSProperties;
}>;

type Kategori = "Yüzük" | "Kolye Ucu";
type Metal = "Sarı Altın" | "Rose Gold" | "Beyaz Altın" | "Gümüş" | "Oksitlenmiş Gümüş";
type Engine = "meshy" | "tripo";

const KATEGORILER: Kategori[] = ["Yüzük", "Kolye Ucu"];
const METALLER: Metal[] = ["Sarı Altın", "Rose Gold", "Beyaz Altın", "Gümüş", "Oksitlenmiş Gümüş"];

type EngineState = {
  busy: boolean;
  status: string | null;
  progress: number | null;
  modelUrl: string | null;
  error: string | null;
};

const initialEngineState: EngineState = {
  busy: false,
  status: null,
  progress: null,
  modelUrl: null,
  error: null,
};

const ROSE = "#b76e79";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Dosya okunamadı."));
    reader.readAsDataURL(file);
  });
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error ?? `İstek başarısız (${res.status})`);
  return data as T;
}

export function Uretim3DClient() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [workingImage, setWorkingImage] = useState<string | null>(null); // 3D'ye gidecek kaynak
  const [preparedImage, setPreparedImage] = useState<string | null>(null);
  const [kategori, setKategori] = useState<Kategori>("Yüzük");
  const [metal, setMetal] = useState<Metal>("Sarı Altın");

  const [tasBusy, setTasBusy] = useState(false);
  const [hazirlaBusy, setHazirlaBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [meshy, setMeshy] = useState<EngineState>(initialEngineState);
  const [tripo, setTripo] = useState<EngineState>(initialEngineState);

  const setEngine = (engine: Engine) => (engine === "meshy" ? setMeshy : setTripo);

  const resetForNewImage = useCallback((dataUrl: string) => {
    setOriginalImage(dataUrl);
    setWorkingImage(dataUrl);
    setPreparedImage(null);
    setMeshy(initialEngineState);
    setTripo(initialEngineState);
    setNotice(null);
  }, []);

  const handleFile = useCallback(
    async (file: File | undefined | null) => {
      if (!file) return;
      const dataUrl = await readFileAsDataUrl(file);
      resetForNewImage(dataUrl);
    },
    [resetForNewImage]
  );

  // ── Taş kaldır (yükleme penceresinde) ──────────────────────────────────────
  const handleTasKaldir = useCallback(async () => {
    if (!workingImage || tasBusy) return;
    setTasBusy(true);
    setNotice(null);
    try {
      const data = await postJson<{ image: string }>("/api/remaura/uretim-3d/tas-kaldir", {
        image: workingImage,
      });
      setWorkingImage(data.image);
      setPreparedImage(null); // taş değişti → yeniden hazırlanmalı
      setNotice("Taşlar kaldırıldı.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Taş kaldırma başarısız.");
    } finally {
      setTasBusy(false);
    }
  }, [workingImage, tasBusy]);

  // ── Gizli hazırlama (açı + işçilik) ────────────────────────────────────────
  const handleHazirla = useCallback(async () => {
    if (!workingImage || hazirlaBusy) return;
    setHazirlaBusy(true);
    setNotice(null);
    try {
      const data = await postJson<{ image: string }>("/api/remaura/uretim-3d/hazirla", {
        image: workingImage,
        kategori,
        metalRengi: metal,
      });
      setPreparedImage(data.image);
      setNotice("Görsel 3D için hazır.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Hazırlama başarısız.");
    } finally {
      setHazirlaBusy(false);
    }
  }, [workingImage, hazirlaBusy, kategori, metal]);

  // ── Durum yoklama ──────────────────────────────────────────────────────────
  const pollStatus = useCallback(async (engine: Engine, taskId: string) => {
    const set = setEngine(engine);
    for (let i = 0; i < 80; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const res = await fetch(
        `/api/remaura/uretim-3d/${engine}/status?taskId=${encodeURIComponent(taskId)}`,
        { cache: "no-store" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        set((s) => ({ ...s, error: (data as { error?: string })?.error ?? "Durum alınamadı." }));
        return;
      }
      const status = String((data as { status?: string }).status ?? "PENDING").toUpperCase();
      const progress = (data as { progress?: number }).progress ?? null;
      const modelUrl = (data as { modelUrl?: string }).modelUrl ?? null;
      set((s) => ({ ...s, status, progress }));
      if (status === "SUCCEEDED" || status === "SUCCESS" || status === "COMPLETED") {
        set((s) => ({ ...s, modelUrl, status }));
        return;
      }
      if (status === "FAILED" || status === "ERROR" || status === "CANCELED") {
        set((s) => ({ ...s, error: "3D üretimi başarısız oldu." }));
        return;
      }
    }
    set((s) => ({ ...s, error: "Zaman aşımı — lütfen tekrar deneyin." }));
  }, []);

  // ── Üret (motor penceresinden) ─────────────────────────────────────────────
  const handleUret = useCallback(
    async (engine: Engine) => {
      const source = preparedImage ?? workingImage;
      if (!source) {
        setNotice("Önce bir görsel yükleyin (ve tercihen Hazırla'ya basın).");
        return;
      }
      const set = setEngine(engine);
      set({ ...initialEngineState, busy: true, status: "PENDING" });
      try {
        let payloadImage = source;
        if (engine === "meshy") {
          // Meshy alfa PNG ister → hazırlanan görseli arka plandan ayır
          const bg = await postJson<{ image: string }>("/api/remaura/uretim-3d/remove-bg", {
            image: source,
          });
          payloadImage = bg.image;
        }
        const created = await postJson<{ taskId: string | null; status?: string }>(
          `/api/remaura/uretim-3d/${engine}/create`,
          engine === "meshy" ? { image: payloadImage, mode: "production" } : { image: payloadImage }
        );
        if (!created.taskId) throw new Error("Görev başlatılamadı.");
        set((s) => ({ ...s, status: created.status ?? "PENDING" }));
        await pollStatus(engine, created.taskId);
      } catch (e) {
        set((s) => ({ ...s, error: e instanceof Error ? e.message : "3D üretimi başarısız." }));
      } finally {
        set((s) => ({ ...s, busy: false }));
      }
    },
    [preparedImage, workingImage, pollStatus]
  );

  const previewSrc = preparedImage ?? workingImage ?? originalImage;

  return (
    <div className="min-h-screen bg-[#07080a] px-4 py-8 text-[#f5f3f0]">
      <Script
        type="module"
        src="https://unpkg.com/@google/model-viewer@3.5.0/dist/model-viewer.min.js"
        strategy="afterInteractive"
      />

      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6">
          <h1 className="font-display text-2xl font-medium tracking-[-0.03em]" style={{ color: ROSE }}>
            Remaura 3D Üret
          </h1>
          <p className="mt-1 text-sm text-white/50">
            Tek görsel yükle → arka planda hazırla (açı + işçilik) → V1 veya V2 ile 3D.
          </p>
        </header>

        {notice && (
          <div className="mb-4 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white/70">
            {notice}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          {/* ── 1) Yükleme penceresi ── */}
          <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <h2 className="mb-3 text-sm font-medium text-white/70">1 · Görsel</h2>

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-white/15 bg-black/30 transition hover:border-white/30"
            >
              {previewSrc ? (
                <Image
                  src={previewSrc}
                  alt="Yüklenen görsel"
                  fill
                  unoptimized
                  className="object-contain"
                />
              ) : (
                <span className="px-4 text-center text-xs text-white/40">
                  Görsel yüklemek için tıkla
                </span>
              )}
            </button>

            {/* Kategori */}
            <div className="mt-3 flex gap-2">
              {KATEGORILER.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKategori(k)}
                  className="flex-1 rounded-lg border px-2 py-1.5 text-xs transition"
                  style={
                    kategori === k
                      ? { borderColor: ROSE, color: ROSE, background: "rgba(183,110,121,0.08)" }
                      : { borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }
                  }
                >
                  {k}
                </button>
              ))}
            </div>

            {/* Metal */}
            <select
              value={metal}
              onChange={(e) => setMetal(e.target.value as Metal)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white/70 outline-none"
            >
              {METALLER.map((m) => (
                <option key={m} value={m} className="bg-[#0a0b0e]">
                  {m}
                </option>
              ))}
            </select>

            {/* Aksiyonlar */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void handleTasKaldir()}
                disabled={!workingImage || tasBusy}
                className="rounded-lg border border-white/10 px-2 py-2 text-xs text-white/70 transition hover:border-white/30 disabled:opacity-40"
              >
                {tasBusy ? "Kaldırılıyor…" : "Taşı Kaldır"}
              </button>
              <button
                type="button"
                onClick={() => void handleHazirla()}
                disabled={!workingImage || hazirlaBusy}
                className="rounded-lg px-2 py-2 text-xs font-medium text-[#1c1917] transition disabled:opacity-40"
                style={{ background: ROSE }}
              >
                {hazirlaBusy ? "Hazırlanıyor…" : "Hazırla"}
              </button>
            </div>
            {preparedImage && (
              <p className="mt-2 text-[11px] text-white/40">
                ✓ Hazırlandı — kategori: {kategori}. Üret penceresinden 3D al.
              </p>
            )}
          </section>

          {/* ── 2) Sonuç pencereleri ── */}
          <EngineWindow
            title="V1 · Meshy"
            engine="meshy"
            state={meshy}
            disabled={!workingImage}
            onUret={() => void handleUret("meshy")}
          />
          <EngineWindow
            title="V2 · Tripo"
            engine="tripo"
            state={tripo}
            disabled={!workingImage}
            onUret={() => void handleUret("tripo")}
          />
        </div>
      </div>
    </div>
  );
}

function EngineWindow({
  title,
  state,
  disabled,
  onUret,
}: {
  title: string;
  engine: Engine;
  state: EngineState;
  disabled: boolean;
  onUret: () => void;
}) {
  return (
    <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <h2 className="mb-3 text-sm font-medium text-white/70">{title}</h2>

      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-white/[0.06] bg-black/40">
        {state.modelUrl ? (
          <ModelViewer
            src={state.modelUrl}
            camera-controls
            auto-rotate
            exposure="1.0"
            style={{ width: "100%", height: "100%", background: "transparent" }}
          />
        ) : state.busy ? (
          <div className="flex flex-col items-center gap-2 text-xs text-white/40">
            <div
              className="h-6 w-6 animate-spin rounded-full border-2 border-white/15"
              style={{ borderTopColor: ROSE }}
            />
            <span>
              {state.status ?? "Üretiliyor"}
              {typeof state.progress === "number" ? ` · %${state.progress}` : "…"}
            </span>
          </div>
        ) : (
          <span className="px-4 text-center text-xs text-white/30">
            3D model burada görünecek
          </span>
        )}
      </div>

      {state.error && <p className="mt-2 text-[11px] text-red-300/80">{state.error}</p>}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onUret}
          disabled={disabled || state.busy}
          className="flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition disabled:opacity-40"
          style={{ borderColor: ROSE, color: ROSE, background: "rgba(183,110,121,0.08)" }}
        >
          {state.busy ? "Üretiliyor…" : "Üret"}
        </button>
        {state.modelUrl && (
          <a
            href={state.modelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70 transition hover:border-white/30"
          >
            GLB
          </a>
        )}
      </div>
    </section>
  );
}
