"use client";

import { useCallback, useRef, useState } from "react";

/**
 * KOLEKSİYON LAB — izole deney arayüzü.
 * Production'daki koleksiyon-edit akışına dokunmadan tutarlılık iyileştirmelerini
 * A/B test etmek için. Endpoint: /api/remaura/koleksiyon-lab/uret
 */

const TAKI_TIPLERI = ["Yüzük", "Kolye Ucu", "Kolye", "Küpe", "Bilezik", "Broş"] as const;
const METAL_RENKLERI = ["Sarı Altın", "Rose Gold", "Beyaz Altın", "Gümüş", "Oksitlenmiş Gümüş"] as const;
const FORM_KARAKTERLERI = ["İnce & Zarif", "Geometrik", "Organik", "Filigran", "Kabartmalı", "Asimetrik"] as const;

const REF_PX_SECENEKLERI = [512, 768, 1024] as const; // 512 = production ayarı
const MODLAR = [
  { id: "direct", label: "Doğrudan (yeni)", desc: "Referans görsel üretim turunda — piksel koşullama" },
  { id: "multi-turn", label: "Multi-turn (eski)", desc: "Görseli metne özetle, sonra üret" },
  { id: "compare", label: "Karşılaştır (A/B)", desc: "İkisini de çalıştır, yan yana göster" },
] as const;

type Mode = (typeof MODLAR)[number]["id"];

// Yaratıcılık seviyeleri (0-4) — DNA sabit, form/kompozisyon serbestleşir
const YARATICILIK = ["Birebir", "Hafif", "Dengeli", "Cesur", "Editöryel"] as const;
// İlham dili (opsiyonel) — yalnızca form/kompozisyona uygulanır
const ILHAM_SECENEKLERI = [
  "Art Nouveau",
  "Art Deco",
  "Barok",
  "Osmanlı / Klasik",
  "Modern Minimal",
  "Organik Doğa",
  "Geometrik Avangart",
] as const;

type ResultMeta = {
  mode: string;
  refCount: number;
  refMaxPx: number;
  refQuality: number;
  creativity?: number;
  model: string;
};
type ResultBlock = { label: string; images: string[]; meta?: ResultMeta };

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function KoleksiyonLabClient() {
  const [refs, setRefs] = useState<string[]>([]);
  const [takiTipi, setTakiTipi] = useState<string>("Yüzük");
  const [metalRengi, setMetalRengi] = useState<string>("Sarı Altın");
  const [tema, setTema] = useState<string>("");
  const [formKarakterleri, setFormKarakterleri] = useState<string[]>([]);
  const [numImages, setNumImages] = useState<number>(2);
  const [mode, setMode] = useState<Mode>("direct");
  const [refMaxPx, setRefMaxPx] = useState<number>(1024);
  const [refQuality, setRefQuality] = useState<number>(90);
  const [creativity, setCreativity] = useState<number>(0);
  const [ilham, setIlham] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ResultBlock[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onPickFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const slots = Math.max(0, 4 - refs.length);
    const picked = Array.from(files).slice(0, slots);
    const urls = await Promise.all(picked.map(readFileAsDataUrl));
    setRefs((prev) => [...prev, ...urls].slice(0, 4));
  }, [refs.length]);

  const removeRef = (i: number) => setRefs((prev) => prev.filter((_, idx) => idx !== i));

  const toggleForm = (f: string) =>
    setFormKarakterleri((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  const callApi = useCallback(
    async (apiMode: "direct" | "multi-turn"): Promise<ResultBlock> => {
      const res = await fetch("/api/remaura/koleksiyon-lab/uret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referansGorseller: refs,
          takiTipi,
          metalRengi,
          tema,
          formKarakterleri,
          numImages,
          mode: apiMode,
          refMaxPx,
          refQuality,
          creativity,
          ilham,
        }),
      });
      const data = (await res.json()) as { images?: string[]; meta?: ResultMeta; error?: string };
      if (!res.ok || !data.images) throw new Error(data.error ?? "Üretim başarısız");
      const label = apiMode === "direct" ? "Doğrudan (yeni)" : "Multi-turn (eski)";
      return { label, images: data.images, meta: data.meta };
    },
    [refs, takiTipi, metalRengi, tema, formKarakterleri, numImages, refMaxPx, refQuality, creativity, ilham],
  );

  const onGenerate = useCallback(async () => {
    if (refs.length === 0) {
      setError("En az bir referans görsel yükleyin.");
      return;
    }
    setError(null);
    setLoading(true);
    setResults([]);
    try {
      if (mode === "compare") {
        const [a, b] = await Promise.all([callApi("direct"), callApi("multi-turn")]);
        setResults([a, b]);
      } else {
        const block = await callApi(mode);
        setResults([block]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bilinmeyen hata");
    } finally {
      setLoading(false);
    }
  }, [mode, refs.length, callApi]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 text-zinc-100">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Koleksiyon Lab</h1>
        <p className="mt-1 text-sm text-zinc-400">
          İzole deney alanı — production akışına dokunmaz. Tutarlılık iyileştirmelerini (yüksek çözünürlük referans,
          tek-tur koşullama, çoklu referans) A/B test eder.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[320px_1fr]">
        {/* ── Sol panel: ayarlar ──────────────────────────────────────────── */}
        <div className="space-y-5 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          {/* Referanslar */}
          <div>
            <label className="mb-2 block text-sm font-medium">Referans görsel(ler) · 1-4</label>
            <div className="grid grid-cols-4 gap-2">
              {refs.map((src, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-zinc-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`ref-${i}`} className="h-full w-full object-cover" />
                  <button
                    onClick={() => removeRef(i)}
                    className="absolute right-0.5 top-0.5 rounded bg-black/70 px-1 text-xs text-white"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {refs.length < 4 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-zinc-600 text-2xl text-zinc-500 hover:border-zinc-400"
                >
                  +
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => onPickFiles(e.target.files)}
            />
            <p className="mt-1 text-xs text-zinc-500">Aynı tasarımın ön / açı / makro görünümleri DNA&apos;yı daha iyi kilitler.</p>
          </div>

          {/* Takı tipi */}
          <div>
            <label className="mb-1 block text-sm font-medium">Hedef takı tipi</label>
            <select
              value={takiTipi}
              onChange={(e) => setTakiTipi(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
            >
              {TAKI_TIPLERI.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Metal */}
          <div>
            <label className="mb-1 block text-sm font-medium">Metal</label>
            <select
              value={metalRengi}
              onChange={(e) => setMetalRengi(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
            >
              {METAL_RENKLERI.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Tema */}
          <div>
            <label className="mb-1 block text-sm font-medium">Tema (opsiyonel)</label>
            <input
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              placeholder="ör. çiçek motifleri, antika doku"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
            />
          </div>

          {/* Form karakterleri */}
          <div>
            <label className="mb-1 block text-sm font-medium">Form karakterleri</label>
            <div className="flex flex-wrap gap-1.5">
              {FORM_KARAKTERLERI.map((f) => (
                <button
                  key={f}
                  onClick={() => toggleForm(f)}
                  className={`rounded-full border px-2.5 py-1 text-xs ${
                    formKarakterleri.includes(f)
                      ? "border-amber-400 bg-amber-400/20 text-amber-200"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Görsel sayısı */}
          <div>
            <label className="mb-1 block text-sm font-medium">Görsel sayısı: {numImages}</label>
            <input
              type="range"
              min={1}
              max={4}
              value={numImages}
              onChange={(e) => setNumImages(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* ── Deney ayarları ── */}
          <div className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-800/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-300/80">Deney ayarları</p>

            <div>
              <label className="mb-1 block text-sm font-medium">Mod</label>
              <div className="space-y-1.5">
                {MODLAR.map((m) => (
                  <label key={m.id} className="flex cursor-pointer items-start gap-2 text-sm">
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === m.id}
                      onChange={() => setMode(m.id)}
                      className="mt-1"
                    />
                    <span>
                      <span className="font-medium">{m.label}</span>
                      <span className="block text-xs text-zinc-500">{m.desc}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Referans çözünürlüğü</label>
              <div className="flex gap-1.5">
                {REF_PX_SECENEKLERI.map((px) => (
                  <button
                    key={px}
                    onClick={() => setRefMaxPx(px)}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-xs ${
                      refMaxPx === px
                        ? "border-amber-400 bg-amber-400/20 text-amber-200"
                        : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                    }`}
                  >
                    {px}px{px === 512 ? " (prod)" : ""}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">JPEG kalite: {refQuality}</label>
              <input
                type="range"
                min={50}
                max={100}
                value={refQuality}
                onChange={(e) => setRefQuality(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* ── Yaratıcılık paneli ── */}
          <div className="space-y-3 rounded-lg border border-fuchsia-700/50 bg-fuchsia-900/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-fuchsia-300/80">Yaratıcılık</p>
            <p className="text-xs text-zinc-500">
              DNA (metal · teknik · motif · taş) sabit kalır; yalnızca <strong>silüet ve kompozisyon</strong> serbestleşir.
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Seviye: <span className="text-fuchsia-300">{YARATICILIK[creativity]}</span>
              </label>
              <input type="range" min={0} max={4} value={creativity}
                onChange={(e) => setCreativity(Number(e.target.value))}
                className="w-full accent-fuchsia-400" />
              <div className="mt-1 flex justify-between text-[10px] text-zinc-600">
                {YARATICILIK.map((y) => (<span key={y}>{y}</span>))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">İlham dili (opsiyonel)</label>
              <div className="flex flex-wrap gap-1.5">
                {ILHAM_SECENEKLERI.map((opt) => (
                  <button key={opt}
                    onClick={() => setIlham((prev) => (prev === opt ? "" : opt))}
                    className={`rounded-full border px-2.5 py-1 text-xs ${
                      ilham === opt
                        ? "border-fuchsia-400 bg-fuchsia-400/20 text-fuchsia-200"
                        : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                    }`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={onGenerate}
            disabled={loading || refs.length === 0}
            className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Üretiliyor…" : mode === "compare" ? "A/B Üret" : "Üret"}
          </button>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        {/* ── Sağ panel: sonuçlar ─────────────────────────────────────────── */}
        <div>
          {results.length === 0 && !loading && (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-xl border border-dashed border-zinc-800 text-sm text-zinc-600">
              Sonuçlar burada görünecek
            </div>
          )}
          {loading && (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-xl border border-zinc-800 text-sm text-zinc-400">
              Üretiliyor… (Gemini 3.1 — birkaç saniye)
            </div>
          )}
          <div className={`grid gap-4 ${results.length > 1 ? "md:grid-cols-2" : "grid-cols-1"}`}>
            {results.map((block, bi) => (
              <div key={bi} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">{block.label}</span>
                  {block.meta && (
                    <span className="text-xs text-zinc-500">
                      {block.meta.refCount} ref · {block.meta.refMaxPx}px · q{block.meta.refQuality}{typeof block.meta.creativity === "number" ? ` · ${YARATICILIK[block.meta.creativity]}` : ""}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {block.images.map((img, ii) => (
                    <a key={ii} href={img} download={`koleksiyon-lab-${bi}-${ii}.jpg`} className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img}
                        alt={`sonuç-${bi}-${ii}`}
                        className="aspect-square w-full rounded-lg border border-zinc-700 object-cover"
                      />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
