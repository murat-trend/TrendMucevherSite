"use client";

// NAKKAŞ — Desen Üretici (izole süper-admin DENEY, trendmucevher).
// TR etiketler dev içindir; remauraai üretim sürümü tam 4-dil (i18n) olacak.

import { useState } from "react";
import type { NakkasStyleKey, NakkasMode } from "@/lib/remaura/nakkas/prompts";

const STYLES: { key: NakkasStyleKey; label: string }[] = [
  { key: "osmanli", label: "Osmanlı" },
  { key: "telkari", label: "Telkari" },
  { key: "arabesk", label: "Arabesk" },
  { key: "barok", label: "Barok" },
  { key: "gotik", label: "Gotik" },
  { key: "artnouveau", label: "Art Nouveau" },
  { key: "selcuklu", label: "Selçuklu" },
  { key: "viktorya", label: "Viktorya" },
  { key: "western", label: "Western" },
  { key: "kelt", label: "Kelt" },
  { key: "artdeco", label: "Art Deco" },
  { key: "biker", label: "Biker / Kuru Kafa" },
  { key: "monogram", label: "Monogram" },
  { key: "dini", label: "Dini (Ayet/Maşallah)" },
  { key: "minimal", label: "Minimal" },
  { key: "doga", label: "Doğa / Hayvan" },
  { key: "heraldik", label: "Heraldik / Arma" },
  { key: "hindu", label: "Hinduizm" },
  { key: "budist", label: "Budizm" },
  { key: "hristiyan", label: "Hristiyanlık" },
  { key: "yahudi", label: "Yahudilik" },
  { key: "spiritual", label: "Spiritüalizm / Metafizik" },
  { key: "reiki", label: "Reiki / Çakra" },
  { key: "yoga", label: "Yoga / Meditasyon" },
  { key: "ateist", label: "Ateizm" },
  { key: "geometrik", label: "Geometrik" },
  { key: "sufi", label: "Sufi / Mevlevi" },
  { key: "nazar", label: "Nazar / Anadolu" },
  { key: "misir", label: "Antik Mısır" },
  { key: "zodyak", label: "Zodyak / Astroloji" },
  { key: "japon", label: "Japon / Uzakdoğu" },
  { key: "viking", label: "Mitoloji / Viking" },
  { key: "ask", label: "Aşk / Nişan" },
  { key: "astronomi", label: "Astronomi / Uzay" },
];

const MODES: { key: NakkasMode; label: string; desc: string }[] = [
  { key: "yuzey", label: "Yüzey deseni", desc: "tam-kare ornament → forma clip'lenir" },
  { key: "band", label: "Band deseni", desc: "seamless → yüzük bandına sarılır" },
];

export function NakkasClient() {
  const [style, setStyle] = useState<NakkasStyleKey | null>("osmanli");
  const [manual, setManual] = useState("");
  const [mode, setMode] = useState<NakkasMode>("yuzey");
  const [showPrompt, setShowPrompt] = useState(false);

  const [image, setImage] = useState<string | null>(null);
  const [promptUsed, setPromptUsed] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Form Bezeme (deseni yüzük kasasına oturt) ──
  const [ringImage, setRingImage] = useState<string | null>(null);
  const [ringNote, setRingNote] = useState("");
  const [desenUpload, setDesenUpload] = useState<string | null>(null);
  const [rawBezeleImage, setRawBezeleImage] = useState<string | null>(null);
  const [bezeleImage, setBezeleImage] = useState<string | null>(null);
  const [bezeleLoading, setBezeleLoading] = useState(false);
  const [bezeleStep, setBezeleStep] = useState<string | null>(null);
  const [bezeleError, setBezeleError] = useState<string | null>(null);
  const desenForBezele = desenUpload ?? image;

  // ── Desenden Yüzük Tasarla (uploaded kasa YOK; brief → yeni yüzük + desen) ──
  const [tasarlaPrompt, setTasarlaPrompt] = useState("");
  const [tasarlaImage, setTasarlaImage] = useState<string | null>(null);
  const [tasarlaLoading, setTasarlaLoading] = useState(false);
  const [tasarlaError, setTasarlaError] = useState<string | null>(null);

  async function generate() {
    if (!style && !manual.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/remaura/nakkas/desen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style, manual, mode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Hata");
        return;
      }
      setImage(data.image);
      setPromptUsed(data.promptUsed ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ağ hatası");
    } finally {
      setLoading(false);
    }
  }

  function download() {
    if (!image) return;
    const a = document.createElement("a");
    a.href = image;
    a.download = `nakkas-desen-${Date.now()}.jpg`;
    a.click();
  }

  function readAsDataUrl(file: File, cb: (url: string) => void) {
    const reader = new FileReader();
    reader.onload = () => cb(reader.result as string);
    reader.readAsDataURL(file);
  }
  function onPickRing(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) readAsDataUrl(f, setRingImage);
  }
  function onPickDesen(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) readAsDataUrl(f, setDesenUpload);
  }

  // Staged hat — AÇI DÜZELTME EN SON: deseni oturt (bezele) → SON ADIM açı düzelt
  // + zemini temizle + netleştir (repoz). Böylece son adım açıyı belirler, sonrasında
  // bozan generatif işlem yok → tabla eğilmez, 3D'de oval çıkmaz. Her adım tolerant.
  async function runBezele() {
    if (!desenForBezele || !ringImage) return;
    setBezeleLoading(true);
    setBezeleError(null);
    setBezeleImage(null);
    setRawBezeleImage(null);
    try {
      // 1) Deseni yüzüğe oturt (açı/zemin ham kalabilir — son adım düzeltir).
      setBezeleStep("Desen yerleştiriliyor…");
      const r1 = await fetch("/api/remaura/nakkas/bezele", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desenImage: desenForBezele, ringImage, note: ringNote.trim() || undefined }),
      });
      const d1 = await r1.json();
      if (!r1.ok || !d1.image) {
        setBezeleError(d1.error || "Hata");
        return;
      }
      const ornamented: string = d1.image;
      setRawBezeleImage(ornamented);

      // 2) SON ADIM: açıyı düzelt + zemini temizle + netleştir → 3D-ready.
      //    Bundan sonra hiçbir generatif işlem YOK (açı burada sabitlenir).
      setBezeleStep("Açı düzeltiliyor…");
      let finalImage: string = ornamented;
      try {
        const r2 = await fetch("/api/remaura/aci-lab/repoz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: ornamented,
            engine: "gemini",
            type: "yuzuk",
            upscaleFirst: true,
            shapeNote: ringNote.trim() || undefined,
          }),
        });
        const d2 = await r2.json();
        if (r2.ok && d2.image) finalImage = d2.image;
      } catch {
        /* açı-düzeltme atlandı → desenli ham görselle devam */
      }
      setBezeleImage(finalImage);
    } catch (e) {
      setBezeleError(e instanceof Error ? e.message : "Ağ hatası");
    } finally {
      setBezeleLoading(false);
      setBezeleStep(null);
    }
  }

  function downloadBezele() {
    if (!bezeleImage) return;
    const a = document.createElement("a");
    a.href = bezeleImage;
    a.download = `nakkas-yuzuk-${Date.now()}.jpg`;
    a.click();
  }

  // Desenden yeni yüzük tasarla (kasa yüklemeden). Desen + brief → Gemini sıfırdan
  // yüzük tasarlar, deseni sarar, bizim sabit 3/4 açımızla render eder.
  async function runTasarla() {
    if (!desenForBezele || !tasarlaPrompt.trim()) return;
    setTasarlaLoading(true);
    setTasarlaError(null);
    setTasarlaImage(null);
    try {
      const res = await fetch("/api/remaura/nakkas/tasarla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desenImage: desenForBezele, prompt: tasarlaPrompt }),
      });
      const data = await res.json();
      if (!res.ok || !data.image) {
        setTasarlaError(data.error || "Hata");
        return;
      }
      setTasarlaImage(data.image);
    } catch (e) {
      setTasarlaError(e instanceof Error ? e.message : "Ağ hatası");
    } finally {
      setTasarlaLoading(false);
    }
  }

  function downloadTasarla() {
    if (!tasarlaImage) return;
    const a = document.createElement("a");
    a.href = tasarlaImage;
    a.download = `nakkas-tasarim-${Date.now()}.jpg`;
    a.click();
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-[#b76e79]">Nakkaş — Desen Üretici</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Forma uygulanacak <strong>DESEN</strong> üretir (bitmiş madalyon değil) — usta-kalite,{" "}
            <strong>taşsız</strong>, derin-rölyefli, düz-açı, 3D-uygun. <strong>Yüzey</strong> (forma
            clip'lenir) veya <strong>Band</strong> (seamless, banda sarılır) modu. İzole süper-admin deney.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          {/* Kontroller */}
          <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Tarz</label>
              <div className="flex flex-wrap gap-1.5">
                {STYLES.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setStyle(style === s.key ? null : s.key)}
                    className={`rounded-full border px-2.5 py-1 text-xs transition ${
                      style === s.key
                        ? "border-[#b76e79] bg-[#b76e79]/20 text-[#e0a0aa]"
                        : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Açıklama / prompt <span className="text-zinc-500">(seçili tarzla birleşir — ne görünsün yaz)</span>
              </label>
              <textarea
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                rows={3}
                placeholder={
                  'Seçtiğin tarz NASIL görüneceğini, buraya yazdığın NE görüneceğini belirler.\n' +
                  'ör. Biker + "motosiklet, kask ve kuru kafa" · Doğa + "balık ve fil bir arada" · Osmanlı + "yoğun lale ve karanfil"'
                }
                className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm placeholder:text-zinc-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Desen modu</label>
              <div className="flex gap-2">
                {MODES.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setMode(m.key)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-left transition ${
                      mode === m.key
                        ? "border-[#b76e79] bg-[#b76e79]/20 text-[#e0a0aa]"
                        : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                    }`}
                  >
                    <span className="block text-xs font-semibold">{m.label}</span>
                    <span className="block text-[10px] text-zinc-500">{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <p className="rounded-md border border-zinc-800 bg-zinc-900/40 px-2.5 py-1.5 text-[11px] text-zinc-500">
              Desen mesh için <strong className="text-zinc-400">tek-ton mat gümüş</strong> üretilir
              (renk/iki-ton 3D&apos;yi bozar). Metal rengi üretimden sonra seçilir.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={generate}
                disabled={loading || (!style && !manual.trim())}
                className="rounded-lg bg-[#b76e79] px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {loading ? "Üretiliyor…" : "Desen üret"}
              </button>
              <button
                onClick={() => setShowPrompt((v) => !v)}
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-500"
              >
                {showPrompt ? "Promptu gizle" : "Promptu göster"}
              </button>
            </div>
          </div>

          {/* Sonuç */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Sonuç</h2>
              <button
                onClick={download}
                disabled={!image}
                className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:border-zinc-500 disabled:opacity-40"
              >
                İndir
              </button>
            </div>
            <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
              {loading ? (
                <span className="text-sm text-zinc-500">Üretiliyor…</span>
              ) : error ? (
                <span className="px-4 text-center text-sm text-red-400">{error}</span>
              ) : image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="desen" className="h-full w-full object-contain" />
              ) : (
                <span className="text-sm text-zinc-600">Henüz üretilmedi</span>
              )}
            </div>
            {showPrompt && promptUsed ? (
              <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-[11px] leading-relaxed text-zinc-400">
                {promptUsed}
              </pre>
            ) : null}
          </div>
        </div>

        {/* ── FORM BEZEME (deseni yüzük kasasına oturt) ── */}
        <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <h2 className="text-lg font-semibold text-[#b76e79]">
            Form Bezeme — deseni yüzük kasasına oturt
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Yüzük kasasını yükle (nasıl yüklersen yükle) → desen forma cuk oturur (derin rölyef +
            işçilik) → <strong>EN SON açı düzeltilir + zemin temizlenir + netleştirilir</strong> →{" "}
            <strong>izole 3D-ready</strong>. Açı son adımda sabitlenir; sonrasında bozan işlem yok.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="cursor-pointer rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:border-zinc-500">
              Yüzük kasası yükle
              <input type="file" accept="image/*" className="hidden" onChange={onPickRing} />
            </label>
            <label className="cursor-pointer rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:border-zinc-500">
              Desen yükle (ops.)
              <input type="file" accept="image/*" className="hidden" onChange={onPickDesen} />
            </label>
            <button
              onClick={runBezele}
              disabled={bezeleLoading || !ringImage || !desenForBezele}
              className="rounded-lg bg-[#b76e79] px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {bezeleLoading ? (bezeleStep ?? "İşleniyor…") : "Deseni yerleştir"}
            </button>
          </div>

          {/* Kasa geometri notu — modele tablanın/kasanın şeklini SÖYLER (oval sapmayı
              önler). Kullanıcı gerçeği bilir; bu güçlü bir geometri önbilgisidir. */}
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-zinc-300">
              Kasa notu <span className="text-zinc-500">(ops. — geometriyi anlat; oval sapmayı önler)</span>
            </label>
            <input
              type="text"
              value={ringNote}
              onChange={(e) => setRingNote(e.target.value)}
              placeholder='ör. "tabla tam yuvarlak, asla oval" · "kasa kare, köşeler keskin" · "band ince, oval kasa"'
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm placeholder:text-zinc-500"
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ImgPanel title="Yüzük kasası (yüklenen)" src={ringImage} placeholder="Kasa yükle" />
            <ImgPanel
              title={desenUpload ? "Desen (yüklenen)" : "Desen (üretilen)"}
              src={desenForBezele}
              placeholder="Önce desen üret / yükle"
            />
            <ImgPanel
              title="Desen oturmuş (ham açı)"
              src={rawBezeleImage}
              placeholder="Ara adım"
            />
            <div className="rounded-xl border border-emerald-700/40 bg-zinc-900/60 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-zinc-300">Sonuç (açı düzeltilmiş · 3D-ready)</h3>
                <button
                  onClick={downloadBezele}
                  disabled={!bezeleImage}
                  className="rounded-md border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300 hover:border-zinc-500 disabled:opacity-40"
                >
                  İndir
                </button>
              </div>
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
                {bezeleLoading ? (
                  <span className="text-sm text-zinc-500">{bezeleStep ?? "İşleniyor…"}</span>
                ) : bezeleError ? (
                  <span className="px-4 text-center text-sm text-red-400">{bezeleError}</span>
                ) : bezeleImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={bezeleImage} alt="süslenmiş yüzük" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-sm text-zinc-600">Henüz üretilmedi</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── DESENDEN YÜZÜK TASARLA (kasa yüklemeden; brief → yeni yüzük + desen) ── */}
        <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <h2 className="text-lg font-semibold text-[#b76e79]">
            Desenden Yüzük Tasarla — sıfırdan yeni yüzük
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Kasa yükleme YOK. Üstteki deseni kullan, aşağıya <strong>nasıl bir yüzük istediğini</strong>{" "}
            yaz → desen üstüne serilmiş <strong>yeni yüzük</strong> bizim sabit açımızla gelir (oksit
            gümüş, taşsız, 3D-ready).
          </p>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-300">
                  Yüzük tasarım açıklaması <span className="text-zinc-500">(ne istiyorsan yaz)</span>
                </label>
                <textarea
                  value={tasarlaPrompt}
                  onChange={(e) => setTasarlaPrompt(e.target.value)}
                  rows={4}
                  placeholder={
                    'ör. "Hindu modasına göre geniş tablalı erkek yüzüğü, deseni tüm yüzeye ser"\n' +
                    '· "ince zarif kadın yüzüğü, band deseni sarılı" · "ağır signet, üst yüz desenli"'
                  }
                  className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm placeholder:text-zinc-500"
                />
              </div>
              <p className="rounded-md border border-zinc-800 bg-zinc-900/40 px-2.5 py-1.5 text-[11px] text-zinc-500">
                Kullanılan desen: üstte <strong className="text-zinc-400">ürettiğin ya da yüklediğin</strong>{" "}
                desen (arka planda netleştirilir).
              </p>
              <button
                onClick={runTasarla}
                disabled={tasarlaLoading || !desenForBezele || !tasarlaPrompt.trim()}
                className="rounded-lg bg-[#b76e79] px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {tasarlaLoading ? "Tasarlanıyor…" : "Yüzük tasarla"}
              </button>
            </div>

            <div className="rounded-xl border border-emerald-700/40 bg-zinc-900/60 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-zinc-300">Tasarlanan yüzük (3D-ready)</h3>
                <button
                  onClick={downloadTasarla}
                  disabled={!tasarlaImage}
                  className="rounded-md border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300 hover:border-zinc-500 disabled:opacity-40"
                >
                  İndir
                </button>
              </div>
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
                {tasarlaLoading ? (
                  <span className="text-sm text-zinc-500">Tasarlanıyor…</span>
                ) : tasarlaError ? (
                  <span className="px-4 text-center text-sm text-red-400">{tasarlaError}</span>
                ) : tasarlaImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={tasarlaImage} alt="tasarlanan yüzük" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-sm text-zinc-600">Henüz üretilmedi</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImgPanel({ title, src, placeholder }: { title: string; src: string | null; placeholder: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
      <h3 className="mb-2 text-xs font-semibold text-zinc-300">{title}</h3>
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={title} className="h-full w-full object-contain" />
        ) : (
          <span className="px-4 text-center text-sm text-zinc-600">{placeholder}</span>
        )}
      </div>
    </div>
  );
}
