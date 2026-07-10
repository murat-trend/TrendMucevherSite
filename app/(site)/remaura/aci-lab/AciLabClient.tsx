"use client";

import { useState } from "react";

interface SideState {
  image: string | null;
  promptUsed: string | null;
  loading: boolean;
  error: string | null;
  note?: string;
}

const EMPTY: SideState = { image: null, promptUsed: null, loading: false, error: null };

export function AciLabClient() {
  const [showPrompt, setShowPrompt] = useState(false);

  // ── Poz Normalize (kötü açı → ideal) ──
  const [srcImage, setSrcImage] = useState<string | null>(null);
  const [jewelryType, setJewelryType] = useState<"yuzuk" | "madalyon">("yuzuk");
  const [upscaleFirst, setUpscaleFirst] = useState(true);
  const [upscaleScale, setUpscaleScale] = useState(4);
  const [upscaleModel, setUpscaleModel] = useState<"clarity" | "aura-sr" | "esrgan">("clarity");
  const [upscaled, setUpscaled] = useState<SideState>(EMPTY);
  const [repozOpenai, setRepozOpenai] = useState<SideState>(EMPTY);
  const [repozGemini, setRepozGemini] = useState<SideState>(EMPTY);

  // ── Orkestratör (üretim hattı: upscale → normalize) ──
  const [autoStep, setAutoStep] = useState<"idle" | "upscale" | "normalize" | "done" | "error">("idle");
  const [autoResult, setAutoResult] = useState<SideState>(EMPTY);

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSrcImage(reader.result as string);
      setUpscaled(EMPTY);
      setRepozOpenai(EMPTY);
      setRepozGemini(EMPTY);
      setAutoResult(EMPTY);
      setAutoStep("idle");
    };
    reader.readAsDataURL(file);
  }

  async function runUpscale() {
    if (!srcImage) return;
    setUpscaled({ ...EMPTY, loading: true });
    try {
      const res = await fetch("/api/remaura/aci-lab/upscale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: srcImage, scale: upscaleScale, model: upscaleModel }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUpscaled({ ...EMPTY, error: data.error || "Hata" });
        return;
      }
      setUpscaled({ image: data.image, promptUsed: null, loading: false, error: null });
    } catch (e) {
      setUpscaled({ ...EMPTY, error: e instanceof Error ? e.message : "Ağ hatası" });
    }
  }

  async function runRepoz(engine: "openai" | "gemini") {
    if (!srcImage) return;
    const setSide = engine === "openai" ? setRepozOpenai : setRepozGemini;
    setSide({ ...EMPTY, loading: true });
    try {
      const res = await fetch("/api/remaura/aci-lab/repoz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: srcImage,
          engine,
          type: jewelryType,
          upscaleFirst,
          upscaleScale,
          upscaleModel,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSide({ ...EMPTY, error: data.error || "Hata" });
        return;
      }
      // Netleştirme istendi ama uygulanamadıysa nötr not (kullanıcı sessiz kalmasın).
      const note =
        upscaleFirst && data.meta && data.meta.upscaled === false
          ? "Netleştirme uygulanamadı — orijinalle devam edildi."
          : undefined;
      setSide({ image: data.image, promptUsed: data.promptUsed, loading: false, error: null, note });
    } catch (e) {
      setSide({ ...EMPTY, error: e instanceof Error ? e.message : "Ağ hatası" });
    }
  }

  /** Orkestratör: upscale → normalize (Gemini) zincirini otomatik akıtır. */
  async function runAuto() {
    if (!srcImage) return;
    setAutoResult({ ...EMPTY, loading: true });
    setUpscaled(EMPTY);
    setAutoStep("upscale");
    try {
      // 1) Upscale (netleştir)
      const up = await fetch("/api/remaura/aci-lab/upscale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: srcImage, scale: upscaleScale, model: upscaleModel }),
      });
      const upData = await up.json();
      if (!up.ok) throw new Error(upData.error || "Netleştirme hatası");
      setUpscaled({ image: upData.image, promptUsed: null, loading: false, error: null });

      // 2) Normalize — tekrar upscale etme (upscaleFirst:false)
      setAutoStep("normalize");
      const rp = await fetch("/api/remaura/aci-lab/repoz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: upData.image,
          engine: "gemini",
          type: jewelryType,
          upscaleFirst: false,
        }),
      });
      const rpData = await rp.json();
      if (!rp.ok) throw new Error(rpData.error || "Normalize hatası");
      setAutoResult({ image: rpData.image, promptUsed: rpData.promptUsed, loading: false, error: null });
      setAutoStep("done");
    } catch (e) {
      setAutoResult({ ...EMPTY, error: e instanceof Error ? e.message : "Ağ hatası" });
      setAutoStep("error");
    }
  }

  const steps = [
    { key: "upscale", label: "1 · Netleştir", done: autoStep === "normalize" || autoStep === "done" },
    { key: "normalize", label: "2 · Normalize", done: autoStep === "done" },
    { key: "done", label: "3 · Hazır", done: autoStep === "done" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-[#b76e79]">Açı Lab — Poz Normalize</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Kötü açılı/bulanık mücevher görselini üretim-hazır hale getirir:{" "}
            <strong>netleştir → ideal açı + boş kasa + gölgesiz normalize</strong>. İzole süper-admin
            deney; canlı akışa dokunmaz.
          </p>
        </header>

        {/* ⚡ Orkestratör — üretim hattı (netleştir → normalize) */}
        <div className="rounded-xl border border-[#b76e79]/40 bg-[#b76e79]/[0.06] p-4">
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={runAuto}
              disabled={autoResult.loading || !srcImage}
              className="rounded-lg bg-[#b76e79] px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {autoResult.loading ? "İşleniyor…" : "⚡ Tek tık: otomatik işle"}
            </button>
            <div className="flex items-center gap-2 text-xs">
              {steps.map((s, i) => {
                const active = autoStep === s.key;
                return (
                  <span key={s.key} className="flex items-center gap-2">
                    {i > 0 && <span className="text-zinc-600">→</span>}
                    <span
                      className={`rounded-full px-2.5 py-1 ${
                        s.done
                          ? "bg-emerald-500/20 text-emerald-300"
                          : active
                            ? "animate-pulse bg-[#b76e79]/30 text-[#e0a0aa]"
                            : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {s.label}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
          {(autoResult.image || autoResult.loading || autoResult.error || upscaled.image) && (
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                <h3 className="mb-2 text-xs font-semibold text-zinc-400">Orijinal</h3>
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
                  {srcImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={srcImage} alt="orijinal" className="h-full w-full object-contain" />
                  ) : null}
                </div>
              </div>
              <SidePanel title="1 · Netleştirildi" accent="border-sky-700/50" state={upscaled} onRegen={runUpscale} showPrompt={false} />
              <SidePanel title="Sonuç (üretim-hazır)" accent="border-emerald-700/50" state={autoResult} onRegen={runAuto} showPrompt={showPrompt} />
            </div>
          )}
        </div>

        {/* Manuel kontroller (deney / A-B) */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:border-zinc-500">
            Görsel yükle
            <input type="file" accept="image/*" className="hidden" onChange={onPickImage} />
          </label>
          <select
            value={jewelryType}
            onChange={(e) => setJewelryType(e.target.value as "yuzuk" | "madalyon")}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
          >
            <option value="yuzuk">Yüzük (3/4 45°)</option>
            <option value="madalyon">Madalyon / yüz (cephe)</option>
          </select>
          <label className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={upscaleFirst}
              onChange={(e) => setUpscaleFirst(e.target.checked)}
              className="h-4 w-4 accent-[#b76e79]"
            />
            Önce netleştir
          </label>
          <select
            value={upscaleModel}
            onChange={(e) => setUpscaleModel(e.target.value as "clarity" | "aura-sr" | "esrgan")}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
            title="Netleştirme motoru"
          >
            <option value="clarity">clarity (detay ekler)</option>
            <option value="aura-sr">aura-sr (keskin GAN)</option>
            <option value="esrgan">esrgan (hafif)</option>
          </select>
          <select
            value={upscaleScale}
            onChange={(e) => setUpscaleScale(Number(e.target.value))}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
            title="Netleştirme kat sayısı"
          >
            <option value={2}>2x</option>
            <option value={4}>4x</option>
          </select>
          <button
            onClick={runUpscale}
            disabled={upscaled.loading || !srcImage}
            className="rounded-lg border border-sky-700/50 px-3 py-2 text-xs text-sky-300 transition hover:border-sky-500 disabled:opacity-50"
            title="Yalnız netleştirme sonucunu gör (before/after)"
          >
            {upscaled.loading ? "Netleştir…" : "Sadece netleştir test et"}
          </button>
          <button
            onClick={() => runRepoz("gemini")}
            disabled={repozGemini.loading || !srcImage}
            className="rounded-lg bg-[#b76e79] px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {repozGemini.loading ? "Çevriliyor…" : "İdeal açıya çevir (Gemini)"}
          </button>
          <button
            onClick={() => runRepoz("openai")}
            disabled={repozOpenai.loading || !srcImage}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 transition hover:border-zinc-500 disabled:opacity-50"
            title="Yavaş — yalnız karşılaştırma için"
          >
            {repozOpenai.loading ? "gpt çalışıyor…" : "gpt-image-2 ile de dene (yavaş)"}
          </button>
          <button
            onClick={() => setShowPrompt((v) => !v)}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-500"
          >
            {showPrompt ? "Promptu gizle" : "Modele giden promptu göster"}
          </button>
        </div>

        {/* Manuel A/B grid */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h3 className="mb-3 text-sm font-semibold">Orijinal (müşteri)</h3>
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
              {srcImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={srcImage} alt="orijinal" className="h-full w-full object-contain" />
              ) : (
                <span className="text-sm text-zinc-600">Görsel yükle</span>
              )}
            </div>
          </div>
          <SidePanel title={`Netleştirildi (${upscaleModel})`} accent="border-sky-700/50" state={upscaled} onRegen={runUpscale} showPrompt={false} />
          <SidePanel title="gpt-image-2 (edit)" accent="border-amber-700/50" state={repozOpenai} onRegen={() => runRepoz("openai")} showPrompt={showPrompt} />
          <SidePanel title="Gemini (image)" accent="border-violet-700/50" state={repozGemini} onRegen={() => runRepoz("gemini")} showPrompt={showPrompt} />
        </div>
      </div>
    </div>
  );
}

function SidePanel({
  title,
  accent,
  state,
  onRegen,
  showPrompt,
}: {
  title: string;
  accent: string;
  state: SideState;
  onRegen: () => void;
  showPrompt: boolean;
}) {
  return (
    <div className={`rounded-xl border ${accent} bg-zinc-900/60 p-4`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <button
          onClick={onRegen}
          disabled={state.loading}
          className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:border-zinc-500 disabled:opacity-50"
        >
          {state.loading ? "…" : "Tekrar üret"}
        </button>
      </div>

      <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
        {state.loading ? (
          <span className="text-sm text-zinc-500">Üretiliyor…</span>
        ) : state.error ? (
          <span className="px-4 text-center text-sm text-red-400">{state.error}</span>
        ) : state.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={state.image} alt={title} className="h-full w-full object-contain" />
        ) : (
          <span className="text-sm text-zinc-600">Henüz üretilmedi</span>
        )}
      </div>

      {state.note ? (
        <p className="mt-2 rounded-md border border-amber-600/40 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-300">
          {state.note}
        </p>
      ) : null}

      {showPrompt && state.promptUsed ? (
        <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-[11px] leading-relaxed text-zinc-400">
          {state.promptUsed}
        </pre>
      ) : null}
    </div>
  );
}
