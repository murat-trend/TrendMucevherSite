"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SOSYAL_FORMATLAR, type SosyalFormat } from "@/lib/remaura/sosyal-boyut/formats";
import {
  borderStats,
  canvasToBlob,
  loadImageFromUrl,
  renderFormat,
  type BgMode,
  type GapFill,
  type Layout,
  type Pos,
  type RenderSettings,
} from "@/lib/remaura/sosyal-boyut/engine";

/**
 * Sosyal Boyutlayıcı — izole sayfa (süper-admin, v1).
 * Motor: lib/remaura/sosyal-boyut/engine.ts (çerçeveden bağımsız, mini-Canva ile paylaşılır).
 * PRO arka plan: mevcut /api/remaura/mesh3d/remove-bg (Stability). Ücretsiz: saf tarayıcı.
 * Lab/galeri köprüsü: localStorage["sosyal_boyut_gorsel"].
 */

// v1 süper-admin → PRO açık. Müşteriye açılırken burası yetki kontrolüne bağlanacak.
const PRO_ENABLED = true;

const OZEL_KEY = "sbp_ozel";
const AYAR_KEY = "sbp_ayarlar_v2";
const KOPRU_KEY = "sosyal_boyut_gorsel";

type Output = { name: string; blob: Blob; url: string; folder: string; label: string; dim: string };

const DEFAULTS = {
  layout: "fit" as Layout,
  gapFill: "smart" as GapFill,
  fillColor: "#0e1116",
  quality: 92,
  sharpen: true,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  pro: false,
  bgMode: "orig" as BgMode,
  bgCustom: "#f3ead9",
  png: false,
  upscale: false, // PRO — Stability conservative (sadık, detay uydurmaz)
  logoPos: "br" as Pos,
  logoSize: 18,
  textMark: false,
  wm1: "Trend Mücevher",
  wm2: "by Murat Kaynaroğlu",
  wm3: "trendmucevher.com",
  wmColor: "#b85070",
  wmPos: "br" as Pos,
};

type UISettings = typeof DEFAULTS;

async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], name, { type: blob.type || "image/jpeg" });
}
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export function SosyalBoyutClient() {
  const [files, setFiles] = useState<File[]>([]);
  const [formats, setFormats] = useState<SosyalFormat[]>(() => SOSYAL_FORMATLAR.map((f) => ({ ...f })));
  const [s, setS] = useState<UISettings>(DEFAULTS);
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);
  const [logoName, setLogoName] = useState<string>("dosya yok");
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, "saving" | "done" | "error">>({});
  const [ozelW, setOzelW] = useState("");
  const [ozelH, setOzelH] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  const up = (patch: Partial<UISettings>) => setS((prev) => ({ ...prev, ...patch }));

  // ── Ayar + özel format hafızası ───────────────────────────────────────────
  useEffect(() => {
    try {
      const ozel = JSON.parse(localStorage.getItem(OZEL_KEY) || "[]") as SosyalFormat[];
      if (ozel.length) setFormats((prev) => [...prev, ...ozel.filter((o) => !prev.some((p) => p.id === o.id))]);
      const ayar = JSON.parse(localStorage.getItem(AYAR_KEY) || "null") as UISettings | null;
      if (ayar) setS((prev) => ({ ...prev, ...ayar }));
    } catch {
      /* yok say */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(AYAR_KEY, JSON.stringify(s));
    } catch {
      /* yok say */
    }
  }, [s]);

  // ── Lab/galeri köprüsü ──────────────────────────────────────────────────────
  useEffect(() => {
    let gorsel: string | null = null;
    try {
      gorsel = localStorage.getItem(KOPRU_KEY);
      if (gorsel) localStorage.removeItem(KOPRU_KEY);
    } catch {
      /* yok say */
    }
    if (gorsel) dataUrlToFile(gorsel, "lab-gorsel.jpg").then((f) => setFiles([f])).catch(() => {});
  }, []);

  // ── Dosya seçimi ─────────────────────────────────────────────────────────────
  const addFiles = useCallback((list: FileList | null) => {
    if (!list) return;
    const yeni = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (yeni.length) {
      setFiles(yeni);
      setOutputs([]);
      setError(null);
    }
  }, []);

  const onLogo = useCallback((file: File | undefined) => {
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      setLogoImg(img);
      setLogoName(file.name);
    };
    img.src = URL.createObjectURL(file);
  }, []);

  const toggleFormat = (id: string) => setFormats((prev) => prev.map((f) => (f.id === id ? { ...f, on: !f.on } : f)));
  const selectAllFormats = (v: boolean) => setFormats((prev) => prev.map((f) => ({ ...f, on: v })));
  const addOzel = () => {
    const w = Number(ozelW),
      h = Number(ozelH);
    if (!w || !h || w < 50 || h < 50 || w > 6000 || h > 6000) {
      setError("Geçerli boyut girin (50–6000 px).");
      return;
    }
    const f: SosyalFormat = { id: `ozel_${w}x${h}`, ad: "Özel", sub: "özel boyut", w, h, on: true };
    if (formats.some((x) => x.id === f.id)) return;
    setFormats((prev) => [...prev, f]);
    try {
      const oz = JSON.parse(localStorage.getItem(OZEL_KEY) || "[]") as SosyalFormat[];
      oz.push(f);
      localStorage.setItem(OZEL_KEY, JSON.stringify(oz));
    } catch {
      /* yok say */
    }
    setOzelW("");
    setOzelH("");
  };

  const buildSettings = useCallback(
    (): RenderSettings => ({
      layout: s.layout,
      gapFill: s.gapFill,
      fillColor: s.fillColor,
      sharpen: s.sharpen,
      brightness: s.brightness,
      contrast: s.contrast,
      saturation: s.saturation,
      pro: PRO_ENABLED && s.pro,
      bgMode: s.bgMode,
      bgCustom: s.bgCustom,
      logo: PRO_ENABLED ? logoImg : null,
      logoPos: s.logoPos,
      logoSize: s.logoSize,
      textMark: s.textMark,
      wm1: s.wm1,
      wm2: s.wm2,
      wm3: s.wm3,
      wmColor: s.wmColor,
      wmPos: s.wmPos,
    }),
    [s, logoImg],
  );

  // ── Üretim ───────────────────────────────────────────────────────────────────
  const run = useCallback(async () => {
    if (running) return;
    if (!files.length) {
      fileRef.current?.click();
      return;
    }
    const secili = formats.filter((f) => f.on);
    if (!secili.length) {
      setError("En az bir format seçin.");
      return;
    }
    setError(null);
    setRunning(true);
    setOutputs([]);
    const proBg = PRO_ENABLED && s.pro;
    const useUpscale = PRO_ENABLED && s.upscale;
    const total = files.length * secili.length;
    setProgress({ done: 0, total });
    const out: Output[] = [];
    let done = 0;
    const settings = buildSettings();

    // koleksiyon-edit ile aynı Stability route'u (süper-admin). upscale = conservative (sadık).
    const callStability = async (action: string, image: string): Promise<string> => {
      const res = await fetch("/api/remaura/koleksiyon-edit/stability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, image }),
      });
      const data = (await res.json()) as { image?: string; error?: string };
      if (!res.ok || !data.image) throw new Error(data.error ?? `${action} başarısız`);
      return data.image;
    };

    try {
      for (const file of files) {
        const rawUrl = URL.createObjectURL(file);
        const raw = await loadImageFromUrl(rawUrl);
        const stats = borderStats(raw); // fon tonu orijinalden (upscale tonu değiştirmez)
        let subject: HTMLImageElement = raw;

        if (proBg || useUpscale) {
          let workUrl = await blobToDataUrl(file);
          // Sadık (conservative) upscale — detay uydurmaz, yalnızca çözünürlük
          if (useUpscale) workUrl = await callStability("upscale", workUrl);
          // Model-tabanlı arka plan kaldırma (şeffaf PNG)
          if (proBg) workUrl = await callStability("remove-background", workUrl);
          subject = await loadImageFromUrl(workUrl);
        }

        const base = file.name.replace(/\.[^.]+$/, "");
        for (const f of secili) {
          await new Promise((r) => setTimeout(r, 0)); // UI nefes alsın
          const canvas = renderFormat({ image: subject, stats, width: f.w, height: f.h, settings });
          const blob = await canvasToBlob(canvas, "image/jpeg", s.quality / 100);
          done++;
          setProgress({ done, total });
          const name = `${base}_${f.id}_${f.w}x${f.h}.jpg`;
          out.push({
            name,
            blob,
            url: URL.createObjectURL(blob),
            folder: base,
            label: `${f.ad} · ${f.sub}`,
            dim: `${f.w} × ${f.h}`,
          });
          setOutputs([...out]);
        }

        if (proBg && s.png) {
          const pblob = await canvasToBlob(
            (() => {
              const cc = document.createElement("canvas");
              cc.width = subject.width;
              cc.height = subject.height;
              cc.getContext("2d")!.drawImage(subject, 0, 0);
              return cc;
            })(),
            "image/png",
          );
          out.push({
            name: `${base}_seffaf.png`,
            blob: pblob,
            url: URL.createObjectURL(pblob),
            folder: base,
            label: "Şeffaf PNG · kesik ürün",
            dim: `${subject.width} × ${subject.height}`,
          });
          setOutputs([...out]);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Üretim hatası");
    } finally {
      setRunning(false);
    }
  }, [running, files, formats, s, buildSettings]);

  // ── ZIP ────────────────────────────────────────────────────────────────────
  const zipAll = useCallback(async () => {
    if (!outputs.length) return;
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    outputs.forEach((o) => zip.folder(o.folder)!.file(o.name, o.blob));
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sosyal_gorseller_${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
  }, [outputs]);

  // ── Galeriye kaydet (mevcut kaydet endpoint'i) ───────────────────────────────
  const saveToGallery = useCallback(async (o: Output, key: string) => {
    setSaved((p) => ({ ...p, [key]: "saving" }));
    try {
      const dataUrl = await blobToDataUrl(o.blob);
      const res = await fetch("/api/remaura/koleksiyon-edit/kaydet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gorselUrl: dataUrl, koleksiyonAdi: o.label, tip: "sosyal" }),
      });
      if (!res.ok) throw new Error("save_failed");
      setSaved((p) => ({ ...p, [key]: "done" }));
    } catch {
      setSaved((p) => ({ ...p, [key]: "error" }));
    }
  }, []);

  const secCount = formats.filter((f) => f.on).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 text-zinc-100">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Sosyal Boyutlayıcı</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Görseli sosyal platform formatlarına dönüştürür. Boyutlandırma tarayıcıda (maliyetsiz); arka plan yenileme
          PRO (model-tabanlı). Lab/galeriden görsel otomatik aktarılır.
        </p>
      </div>

      {/* Yükleme */}
      <div className="mb-5">
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
        {files.length === 0 ? (
          <button
            onClick={() => fileRef.current?.click()}
            className="flex min-h-[180px] w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-600 bg-zinc-900/40 text-zinc-400 hover:border-amber-400"
          >
            <span className="text-3xl">⬆</span>
            <span className="text-sm">Görsel seç ya da sürükle — birden fazla desteklenir</span>
          </button>
        ) : (
          <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-sm">
            <span>{files.length === 1 ? files[0].name : `${files.length} görsel seçildi`}</span>
            <div className="flex gap-2">
              <button onClick={() => fileRef.current?.click()} className="rounded border border-zinc-700 px-3 py-1 text-zinc-300 hover:border-zinc-500">
                Değiştir
              </button>
              <button onClick={() => { setFiles([]); setOutputs([]); }} className="rounded border border-red-700/50 px-3 py-1 text-red-300">
                Kaldır
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        {/* Sol: formatlar + sonuçlar */}
        <div className="space-y-5">
          {/* Formatlar */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Formatlar · {secCount}/{formats.length}</span>
              <div className="flex gap-2 text-xs">
                <button onClick={() => selectAllFormats(true)} className="rounded border border-zinc-700 px-2 py-1 text-zinc-300">TÜMÜ</button>
                <button onClick={() => selectAllFormats(false)} className="rounded border border-zinc-700 px-2 py-1 text-zinc-300">TEMİZLE</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {formats.map((f) => (
                <button
                  key={f.id}
                  onClick={() => toggleFormat(f.id)}
                  className={`rounded-lg border p-2.5 text-left text-xs ${
                    f.on ? "border-amber-400 bg-amber-400/10" : "border-zinc-700 hover:border-zinc-500"
                  }`}
                >
                  <div className="font-semibold text-zinc-200">{f.ad}</div>
                  <div className="text-zinc-500">{f.sub}</div>
                  <div className="mt-1 font-mono text-[10px] text-sky-300">{f.w} × {f.h}</div>
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
              <span>ÖZEL</span>
              <input value={ozelW} onChange={(e) => setOzelW(e.target.value)} type="number" placeholder="en" className="w-20 rounded border border-zinc-700 bg-zinc-800 px-2 py-1" />
              <span>×</span>
              <input value={ozelH} onChange={(e) => setOzelH(e.target.value)} type="number" placeholder="boy" className="w-20 rounded border border-zinc-700 bg-zinc-800 px-2 py-1" />
              <button onClick={addOzel} className="rounded border border-zinc-700 px-2 py-1 text-zinc-300">+ EKLE</button>
            </div>
          </div>

          {/* Üret */}
          <button
            onClick={run}
            disabled={running || files.length === 0}
            className="w-full rounded-xl bg-amber-500 px-4 py-3 font-semibold text-black disabled:opacity-50"
          >
            {running ? `İşleniyor · ${progress.done}/${progress.total}` : `Formatları Üret (${secCount})`}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}

          {/* Sonuçlar */}
          {outputs.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">Çıktılar · {outputs.length}</span>
                <button onClick={zipAll} className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black">📦 TÜMÜNÜ ZIP</button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {outputs.map((o, i) => {
                  const key = `${i}`;
                  const st = saved[key];
                  return (
                    <div key={i} className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={o.url} alt={o.name} className="w-full bg-zinc-900 object-contain" style={{ maxHeight: 180 }} />
                      <div className="space-y-1 p-2">
                        <div className="truncate text-[11px] font-semibold text-zinc-200">{o.label}</div>
                        <div className="font-mono text-[10px] text-zinc-500">{o.dim} · {(o.blob.size / 1024).toFixed(0)} KB</div>
                        <div className="flex gap-1 text-[11px]">
                          <a href={o.url} download={o.name} className="flex-1 rounded border border-zinc-700 py-1 text-center text-zinc-300">İndir</a>
                          <button
                            onClick={() => saveToGallery(o, key)}
                            disabled={st === "saving" || st === "done"}
                            className="flex-1 rounded border border-emerald-700/60 bg-emerald-900/20 py-1 text-emerald-300 disabled:opacity-60"
                          >
                            {st === "saving" ? "…" : st === "done" ? "✓" : st === "error" ? "Hata" : "Kaydet"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sağ: ayarlar */}
        <div className="space-y-4">
          {/* Yerleşim */}
          <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-sm font-semibold">Yerleşim & Dolgu</p>
            <select value={s.layout} onChange={(e) => up({ layout: e.target.value as Layout })} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm">
              <option value="fit">Sığdır — boşlukları doldur</option>
              <option value="crop">Kırp — çerçeveyi doldur</option>
              <option value="blur">Sığdır — bulanık arka plan</option>
            </select>
            <div className="flex gap-2">
              <select value={s.gapFill} onChange={(e) => up({ gapFill: e.target.value as GapFill })} className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm">
                <option value="smart">Akıllı — fonu analiz et</option>
                <option value="color">Düz renk →</option>
                <option value="white">Beyaz</option>
                <option value="black">Siyah</option>
              </select>
              <input type="color" value={s.fillColor} onChange={(e) => up({ fillColor: e.target.value })} className="h-9 w-10 rounded border border-zinc-700 bg-transparent" />
            </div>
          </div>

          {/* Kalite */}
          <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-sm font-semibold">Kalite & İnce Ayar</p>
            <label className="block text-xs text-zinc-400">JPEG kalitesi: {s.quality}</label>
            <input type="range" min={40} max={100} value={s.quality} onChange={(e) => up({ quality: Number(e.target.value) })} className="w-full" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={s.sharpen} onChange={(e) => up({ sharpen: e.target.checked })} /> Hafif keskinleştir
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={s.upscale} onChange={(e) => up({ upscale: e.target.checked })} className="mt-1" />
              <span>
                <span className="font-medium">Kaliteyi yükselt — sadık <span className="ml-1 rounded bg-fuchsia-500/30 px-1.5 py-0.5 text-[10px] text-fuchsia-200">PRO</span></span>
                <span className="block text-xs text-zinc-500">Conservative upscale: çözünürlüğü artırır, detay uydurmaz (halüsinasyon yok)</span>
              </span>
            </label>
            {(["brightness", "contrast", "saturation"] as const).map((k) => (
              <div key={k}>
                <label className="block text-xs text-zinc-400">
                  {k === "brightness" ? "Parlaklık" : k === "contrast" ? "Kontrast" : "Doygunluk"}: {s[k] > 0 ? "+" : ""}{s[k]}
                </label>
                <input type="range" min={-100} max={100} value={s[k]} onChange={(e) => up({ [k]: Number(e.target.value) } as Partial<UISettings>)} className="w-full" />
              </div>
            ))}
          </div>

          {/* PRO arka plan */}
          <div className="space-y-3 rounded-xl border border-fuchsia-700/50 bg-fuchsia-900/10 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Arka Planı Yenile <span className="ml-1 rounded bg-fuchsia-500/30 px-1.5 py-0.5 text-[10px] text-fuchsia-200">PRO</span></p>
              <input type="checkbox" checked={s.pro} onChange={(e) => up({ pro: e.target.checked })} />
            </div>
            <p className="text-xs text-zinc-500">Nesneyi keser (model-tabanlı), tuvale yeni zemin döşer — dikiş olmaz.</p>
            <select value={s.bgMode} onChange={(e) => up({ bgMode: e.target.value as BgMode })} disabled={!s.pro} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm disabled:opacity-50">
              <option value="orig">Fon: orijinal ton</option>
              <option value="studio">Stüdyo gri</option>
              <option value="gradient">Yumuşak gradyan</option>
              <option value="custom">Özel renk →</option>
            </select>
            <div className="flex items-center gap-2">
              <input type="color" value={s.bgCustom} onChange={(e) => up({ bgCustom: e.target.value })} disabled={!s.pro} className="h-9 w-10 rounded border border-zinc-700 bg-transparent disabled:opacity-50" />
              <label className="flex items-center gap-2 text-xs text-zinc-300">
                <input type="checkbox" checked={s.png} onChange={(e) => up({ png: e.target.checked })} disabled={!s.pro} /> Şeffaf PNG de üret
              </label>
            </div>
          </div>

          {/* Logo PRO */}
          <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-sm font-semibold">Logo / Filigran <span className="ml-1 rounded bg-fuchsia-500/30 px-1.5 py-0.5 text-[10px] text-fuchsia-200">PRO</span></p>
            <input ref={logoRef} type="file" accept="image/png" className="hidden" onChange={(e) => onLogo(e.target.files?.[0])} />
            <div className="flex items-center gap-2 text-xs">
              <button onClick={() => logoRef.current?.click()} className="rounded border border-zinc-700 px-3 py-1.5 text-zinc-300">PNG SEÇ</button>
              <span className="text-zinc-500">{logoName}</span>
            </div>
            <div className="flex gap-2">
              <select value={s.logoPos} onChange={(e) => up({ logoPos: e.target.value as Pos })} className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-2 text-sm">
                <option value="br">Sağ alt</option><option value="bl">Sol alt</option><option value="tr">Sağ üst</option><option value="tl">Sol üst</option><option value="c">Orta</option>
              </select>
              <div className="flex-1">
                <label className="block text-xs text-zinc-400">Boy: {s.logoSize}%</label>
                <input type="range" min={4} max={40} value={s.logoSize} onChange={(e) => up({ logoSize: Number(e.target.value) })} className="w-full" />
              </div>
            </div>
          </div>

          {/* Metin filigranı */}
          <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Metin Filigranı</p>
              <input type="checkbox" checked={s.textMark} onChange={(e) => up({ textMark: e.target.checked })} />
            </div>
            <input value={s.wm1} onChange={(e) => up({ wm1: e.target.value })} placeholder="Marka adı" className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm" />
            <input value={s.wm2} onChange={(e) => up({ wm2: e.target.value })} placeholder="alt satır" className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm" />
            <div className="flex gap-2">
              <input value={s.wm3} onChange={(e) => up({ wm3: e.target.value })} placeholder="site.com" className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm" />
              <input type="color" value={s.wmColor} onChange={(e) => up({ wmColor: e.target.value })} className="h-9 w-10 rounded border border-zinc-700 bg-transparent" />
              <select value={s.wmPos} onChange={(e) => up({ wmPos: e.target.value as Pos })} className="w-24 rounded border border-zinc-700 bg-zinc-800 px-1 text-sm">
                <option value="br">Sağ alt</option><option value="bl">Sol alt</option><option value="tr">Sağ üst</option><option value="tl">Sol üst</option><option value="c">Orta</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
