"use client";

import { useCallback, useRef, useState } from "react";

type Oran = "square" | "portrait" | "story" | "landscape";
type Style = "AUTO" | "REALISTIC" | "DESIGN" | "GENERAL";
type Speed = "TURBO" | "BALANCED" | "QUALITY";

const ORANLAR: { id: Oran; label: string }[] = [
  { id: "square", label: "1:1" },
  { id: "portrait", label: "4:5" },
  { id: "story", label: "9:16" },
  { id: "landscape", label: "16:9" },
];
const STYLES: { id: Style; label: string }[] = [
  { id: "AUTO", label: "Oto" },
  { id: "REALISTIC", label: "Gerçekçi" },
  { id: "DESIGN", label: "Tasarım" },
  { id: "GENERAL", label: "Genel" },
];
const SPEEDS: { id: Speed; label: string }[] = [
  { id: "TURBO", label: "Hızlı" },
  { id: "BALANCED", label: "Dengeli" },
  { id: "QUALITY", label: "Kalite" },
];
const SAYILAR = [1, 2, 4];

const ROSE = "#b76e79";
const ORNEK =
  "Bu, ZBrush'ta modellediğim bir kolye ucu. Etsy'de 3D model satan bir tasarımcıyım, B2B çalışıyorum. " +
  "Etsy listing görseli yap: solda ham kırmızı wax döküm, sağda yüksek parlak 18k altın + zincir; üstte zarif başlık.";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Dosya okunamadı."));
    r.readAsDataURL(file);
  });
}
// İki limit: Vercel ~4.5MB istek gövdesi (413) + servis piksel sınırı (400).
async function shrinkForUpload(dataUrl: string, maxBytes = 3_200_000, maxPixels = 4_000_000): Promise<string> {
  const approxBytes = (s: string) => Math.ceil((s.length - s.indexOf(",") - 1) * 0.75);
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new window.Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });
  const pixels = img.width * img.height;
  if (approxBytes(dataUrl) <= maxBytes && pixels <= maxPixels) return dataUrl;

  const pxScale = pixels > maxPixels ? Math.sqrt(maxPixels / pixels) : 1;
  let out = dataUrl;
  for (const mul of [1, 0.85, 0.7, 0.55]) {
    const scale = pxScale * mul;
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const x = c.getContext("2d");
    if (!x) return out;
    x.drawImage(img, 0, 0, w, h);
    out = c.toDataURL("image/jpeg", 0.85);
    if (approxBytes(out) <= maxBytes && w * h <= maxPixels) return out;
  }
  return out;
}

function compressDataUrl(dataUrl: string, maxSide = 1280, quality = 0.9): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const x = c.getContext("2d");
      if (!x) return resolve(dataUrl);
      x.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function Pill<T extends string | number>({
  options, value, onChange,
}: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={String(o.id)} type="button" onClick={() => onChange(o.id)}
          className="rounded-lg border px-2.5 py-1 text-[11px] transition"
          style={value === o.id
            ? { borderColor: ROSE, color: ROSE, background: "rgba(183,110,121,0.08)" }
            : { borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.55)" }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SosyalPostClient() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [oran, setOran] = useState<Oran>("square");
  const [style, setStyle] = useState<Style>("DESIGN");
  const [speed, setSpeed] = useState<Speed>("BALANCED");
  const [magic, setMagic] = useState(true);
  const [sayi, setSayi] = useState(2);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [results, setResults] = useState<string[]>([]);

  const handleFile = useCallback(async (file: File | undefined | null) => {
    if (!file) return;
    setImage(await compressDataUrl(await readFileAsDataUrl(file)));
    setResults([]); setError(null); setDetail(null);
  }, []);

  const handleUret = useCallback(async () => {
    if (!image || !prompt.trim() || busy) return;
    setBusy(true); setError(null); setDetail(null);
    try {
      const safeImage = await shrinkForUpload(image);
      const res = await fetch("/api/remaura/sosyal-post/uret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: safeImage, prompt, oran,
          style, renderSpeed: speed, magicPrompt: magic, numImages: sayi,
        }),
      });
      let data: { error?: string; detail?: string; images?: string[] } = {};
      try { data = await res.json(); } catch { /* yanıt JSON değil */ }
      if (!res.ok) {
        setDetail(data.detail ?? null);
        throw new Error(data.error ?? `Hata (${res.status})`);
      }
      setResults(data.images ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Üretim başarısız.");
    } finally {
      setBusy(false);
    }
  }, [image, prompt, busy, oran, style, speed, magic, sayi]);

  return (
    <div className="min-h-screen bg-[#07080a] px-4 py-8 text-[#f5f3f0]">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-5">
          <h1 className="font-display text-2xl font-medium tracking-[-0.03em]" style={{ color: ROSE }}>
            Remaura Sosyal Post
          </h1>
          <p className="mt-1 text-sm text-white/50">
            {"Görselini yükle, ne istediğini yaz → tasarlanmış post. Türkçe yazabilirsin, arka planda İngilizce'ye çevrilir."}
          </p>
        </header>

        {/* Prompt kutusu (kahraman) */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input ref={inputRef} type="file" accept="image/*" className="sr-only"
              onChange={(e) => void handleFile(e.target.files?.[0])} />
            <button type="button" onClick={() => inputRef.current?.click()}
              className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/15 bg-black/30 transition hover:border-white/30">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="Görsel" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <span className="px-2 text-center text-[11px] text-white/40">Görsel ekle</span>
              )}
            </button>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={ORNEK}
              rows={4}
              className="min-h-[112px] flex-1 resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white/85 outline-none placeholder:text-white/25 focus:border-white/30"
            />
          </div>

          {/* Ayarlar satırı */}
          <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-3">
            <div><span className="mb-1 block text-[10px] uppercase tracking-wide text-white/35">Oran</span><Pill options={ORANLAR} value={oran} onChange={setOran} /></div>
            <div><span className="mb-1 block text-[10px] uppercase tracking-wide text-white/35">Stil</span><Pill options={STYLES} value={style} onChange={setStyle} /></div>
            <div><span className="mb-1 block text-[10px] uppercase tracking-wide text-white/35">Hız</span><Pill options={SPEEDS} value={speed} onChange={setSpeed} /></div>
            <div><span className="mb-1 block text-[10px] uppercase tracking-wide text-white/35">Adet</span><Pill options={SAYILAR.map((n) => ({ id: n, label: String(n) }))} value={sayi} onChange={setSayi} /></div>
            <button type="button" onClick={() => setMagic((m) => !m)}
              className="rounded-lg border px-2.5 py-1 text-[11px] transition"
              style={magic
                ? { borderColor: ROSE, color: ROSE, background: "rgba(183,110,121,0.08)" }
                : { borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
              ✨ Magic Prompt {magic ? "Açık" : "Kapalı"}
            </button>
            <button type="button" onClick={() => void handleUret()} disabled={!image || !prompt.trim() || busy}
              className="ml-auto rounded-xl px-5 py-2 text-sm font-medium text-[#1c1917] transition disabled:opacity-40"
              style={{ background: ROSE }}>
              {busy ? "Üretiliyor…" : "Üret"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-red-400/20 bg-red-400/[0.04] px-3 py-2 text-xs text-red-300/90">
            {error}
            {detail && <div className="mt-1 break-words font-mono text-[10px] text-red-300/60">{detail}</div>}
          </div>
        )}

        {/* Sonuçlar */}
        <div className="mt-4">
          {results.length === 0 ? (
            <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] text-xs text-white/30">
              {busy ? "Post hazırlanıyor…" : "Üretilen postlar burada görünecek"}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((url, i) => (
                <div key={i} className="overflow-hidden rounded-xl border border-white/[0.06] bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Post ${i + 1}`} className="w-full object-contain" />
                  <a href={url} download={`remaura-post-${i + 1}.png`}
                    className="block px-3 py-2 text-center text-xs text-white/70 transition hover:text-white">
                    İndir
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
