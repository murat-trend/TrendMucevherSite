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
 * Trend Mücevher tasarım dili: marka token'ları (bg-card/border-border/text-foreground/
 * text-muted/bg-accent/font-display) + .section-title + .range-slider. Açık/koyu mod uyumlu.
 * Motor: lib/remaura/sosyal-boyut/engine.ts. PRO arka plan/upscale: koleksiyon-edit/stability.
 * Lab/galeri köprüsü: localStorage["sosyal_boyut_gorsel"].
 */

const PRO_ENABLED = true; // v1 süper-admin → PRO açık. Müşteriye açılırken yetkiye bağlanacak.
const OZEL_KEY = "sbp_ozel";
const AYAR_KEY = "sbp_ayarlar_v2";
const KOPRU_KEY = "sosyal_boyut_gorsel";

type Output = { name: string; blob: Blob; url: string; folder: string; label: string; dim: string; w: number; h: number };

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
  upscale: false,
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

const POS_OPTS: { v: Pos; l: string }[] = [
  { v: "br", l: "Sağ alt" },
  { v: "bl", l: "Sol alt" },
  { v: "tr", l: "Sağ üst" },
  { v: "tl", l: "Sol üst" },
  { v: "c", l: "Orta" },
];

// ── Marka bileşenleri (token tabanlı) ──────────────────────────────────────────
const CARD = "rounded-2xl border border-border bg-card p-5";
const INPUT = "w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-foreground outline-none focus:border-accent";
const PRO_BADGE = (
  <span className="ml-1.5 rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-accent">PRO</span>
);

function Switch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative h-6 w-11 flex-none rounded-full border transition-colors ${
        on ? "border-accent bg-accent" : "border-border bg-surface-alt-2"
      }`}
      aria-pressed={on}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}
function Field({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-muted">{label}</span>
      <span className={`font-mono text-xs ${accent ? "text-accent" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

export function SosyalBoyutClient() {
  const [files, setFiles] = useState<File[]>([]);
  const [srcUrl, setSrcUrl] = useState<string>("");
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
  const [lightbox, setLightbox] = useState<Output | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  const up = (patch: Partial<UISettings>) => setS((prev) => ({ ...prev, ...patch }));

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let gorsel: string | null = null;
    try {
      gorsel = localStorage.getItem(KOPRU_KEY);
      if (gorsel) localStorage.removeItem(KOPRU_KEY);
    } catch {
      /* yok say */
    }
    if (gorsel)
      dataUrlToFile(gorsel, "lab-gorsel.jpg")
        .then((f) => {
          setFiles([f]);
          setSrcUrl(URL.createObjectURL(f));
        })
        .catch(() => {});
  }, []);

  const addFiles = useCallback((list: FileList | null) => {
    if (!list) return;
    const yeni = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (yeni.length) {
      setFiles(yeni);
      setSrcUrl(URL.createObjectURL(yeni[0]));
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
        const raw = await loadImageFromUrl(URL.createObjectURL(file));
        const stats = borderStats(raw);
        let subject: HTMLImageElement = raw;

        if (proBg || useUpscale) {
          let workUrl = await blobToDataUrl(file);
          if (useUpscale) workUrl = await callStability("upscale", workUrl);
          if (proBg) workUrl = await callStability("remove-background", workUrl);
          subject = await loadImageFromUrl(workUrl);
        }

        const base = file.name.replace(/\.[^.]+$/, "");
        for (const f of secili) {
          await new Promise((r) => setTimeout(r, 0));
          const canvas = renderFormat({ image: subject, stats, width: f.w, height: f.h, settings });
          const blob = await canvasToBlob(canvas, "image/jpeg", s.quality / 100);
          done++;
          setProgress({ done, total });
          out.push({
            name: `${base}_${f.id}_${f.w}x${f.h}.jpg`,
            blob,
            url: URL.createObjectURL(blob),
            folder: base,
            label: `${f.ad} · ${f.sub}`,
            dim: `${f.w} × ${f.h}`,
            w: f.w,
            h: f.h,
          });
          setOutputs([...out]);
        }

        if (proBg && s.png) {
          const cc = document.createElement("canvas");
          cc.width = subject.width;
          cc.height = subject.height;
          cc.getContext("2d")!.drawImage(subject, 0, 0);
          const pblob = await canvasToBlob(cc, "image/png");
          out.push({
            name: `${base}_seffaf.png`,
            blob: pblob,
            url: URL.createObjectURL(pblob),
            folder: base,
            label: "Şeffaf PNG · kesik ürün",
            dim: `${subject.width} × ${subject.height}`,
            w: subject.width,
            h: subject.height,
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
  const totalMb = (files.reduce((a, f) => a + f.size, 0) / 1048576).toFixed(1);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Başlık */}
      <header className="mb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Remaura · Görsel Stüdyo</p>
        <h1 className="section-title mt-2">Sosyal Boyutlayıcı</h1>
        <p className="section-subtitle max-w-2xl">
          Tek görseli tüm sosyal platform formatlarına dönüştürür. Boyutlandırma tarayıcıda (maliyetsiz); arka plan
          yenileme ve sadık kalite yükseltme PRO. Lab ve galeriden görsel otomatik aktarılır.
        </p>
      </header>

      {/* Kaynak */}
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
      {files.length === 0 ? (
        <button
          onClick={() => fileRef.current?.click()}
          className="flex min-h-[220px] w-full flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-surface-alt transition-colors hover:border-accent"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 text-accent">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 16v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
            </svg>
          </span>
          <span className="text-center">
            <span className="block font-display text-xl text-foreground">Görseli sürükle ya da seç</span>
            <span className="mt-1 block text-sm text-muted">JPG · PNG — birden fazla desteklenir</span>
          </span>
        </button>
      ) : (
        <div className={`${CARD} flex flex-wrap gap-5`}>
          <div className="flex min-h-[240px] flex-1 basis-72 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-alt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {srcUrl && <img src={srcUrl} alt="kaynak" className="max-h-[320px] w-auto object-contain" />}
          </div>
          <div className="flex flex-1 basis-56 flex-col justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Kaynak görsel</p>
              <p className="mt-2 font-medium text-foreground">{files.length === 1 ? files[0].name : `${files.length} görsel seçildi`}</p>
              <p className="mt-1 font-mono text-xs text-muted">{(files[0].name.split(".").pop() || "IMG").toUpperCase()} · {totalMb} MB</p>
              <p className="mt-3 text-sm text-accent"><strong className="font-mono">{secCount}</strong> format çıktıya hazır</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => fileRef.current?.click()} className="flex-1 rounded-xl border border-border px-3 py-2 text-sm text-foreground hover:border-accent">⟳ Değiştir</button>
              <button onClick={() => { setFiles([]); setOutputs([]); setSrcUrl(""); }} className="rounded-xl border border-border px-3 py-2 text-sm text-muted hover:text-foreground">Kaldır</button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Sol: formatlar + üret + çıktılar */}
        <div className="space-y-6">
          {/* Formatlar */}
          <section className={CARD}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="font-display text-lg text-foreground">Formatlar</h2>
                <span className="rounded-md bg-accent/15 px-2 py-0.5 font-mono text-xs text-accent">{secCount}/{formats.length}</span>
              </div>
              <div className="flex gap-2 text-xs">
                <button onClick={() => selectAllFormats(true)} className="rounded-lg border border-border px-2.5 py-1 text-muted hover:text-accent">TÜMÜ</button>
                <button onClick={() => selectAllFormats(false)} className="rounded-lg border border-border px-2.5 py-1 text-muted hover:text-accent">TEMİZLE</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {formats.map((f) => {
                const MAX = 40;
                let fw: number, fh: number;
                if (f.w >= f.h) { fw = MAX; fh = Math.max(8, Math.round((MAX * f.h) / f.w)); }
                else { fh = MAX; fw = Math.max(8, Math.round((MAX * f.w) / f.h)); }
                return (
                  <button
                    key={f.id}
                    onClick={() => toggleFormat(f.id)}
                    className={`flex flex-col gap-2.5 rounded-xl border p-3 text-left transition-all ${
                      f.on ? "border-accent bg-accent/10" : "border-border hover:border-accent/40"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-surface-alt-2">
                        <span className="overflow-hidden rounded-sm border border-border bg-surface-alt-3" style={{ width: fw, height: fh }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {srcUrl && <img src={srcUrl} alt="" className="h-full w-full object-cover" />}
                        </span>
                      </span>
                      <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${f.on ? "border-accent bg-accent text-accent-foreground" : "border-border"}`}>
                        {f.on && (
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                        )}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{f.ad}</div>
                      <div className="text-xs text-muted">{f.sub}</div>
                    </div>
                    <div className="self-start rounded-md border border-border px-2 py-0.5 font-mono text-[10px] text-muted">{f.w} × {f.h}</div>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
              <span>ÖZEL</span>
              <input type="number" value={ozelW} onChange={(e) => setOzelW(e.target.value)} placeholder="en" className="w-20 rounded-lg border border-border bg-surface-alt px-2 py-1 text-foreground" />
              <span>×</span>
              <input type="number" value={ozelH} onChange={(e) => setOzelH(e.target.value)} placeholder="boy" className="w-20 rounded-lg border border-border bg-surface-alt px-2 py-1 text-foreground" />
              <button onClick={addOzel} className="rounded-lg border border-border px-2.5 py-1 hover:text-accent">+ EKLE</button>
            </div>
          </section>

          {/* Üret */}
          <button
            onClick={run}
            disabled={running || files.length === 0}
            className="relative w-full overflow-hidden rounded-2xl bg-accent px-5 py-4 font-display text-lg font-medium tracking-wide text-accent-foreground transition disabled:opacity-50"
          >
            {running ? `İşleniyor · ${progress.done}/${progress.total}` : `Formatları Üret · ${secCount}`}
            {running && (
              <span className="absolute bottom-0 left-0 h-1 bg-black/30 transition-all" style={{ width: progress.total ? `${(progress.done / progress.total) * 100}%` : "0%" }} />
            )}
          </button>
          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Çıktılar */}
          {outputs.length > 0 && (
            <section className={CARD}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="font-display text-lg text-foreground">Çıktılar</h2>
                  <span className="rounded-md bg-accent/15 px-2 py-0.5 font-mono text-xs text-accent">{outputs.length} hazır</span>
                </div>
                <button onClick={zipAll} className="rounded-xl bg-accent px-3.5 py-2 text-sm font-medium text-accent-foreground">📦 Tümünü ZIP</button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {outputs.map((o, i) => {
                  const key = `${i}`;
                  const st = saved[key];
                  return (
                    <div key={i} className="overflow-hidden rounded-xl border border-border bg-surface-alt">
                      <button className="relative block w-full cursor-zoom-in bg-surface-alt-2" onClick={() => setLightbox(o)} style={{ aspectRatio: `${o.w} / ${o.h}` }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={o.url} alt={o.name} className="h-full w-full object-cover" />
                        <span className="absolute left-2 top-2 rounded-md border border-border bg-card/80 px-2 py-0.5 font-mono text-[10px] text-foreground">{o.dim}</span>
                      </button>
                      <div className="space-y-1.5 p-2.5">
                        <div className="truncate text-xs font-semibold text-foreground">{o.label}</div>
                        <div className="font-mono text-[10px] text-muted">{(o.blob.size / 1024).toFixed(0)} KB</div>
                        <div className="flex gap-1.5 text-[11px]">
                          <a href={o.url} download={o.name} className="flex-1 rounded-lg border border-accent/40 bg-accent/10 py-1 text-center font-medium text-accent">İndir</a>
                          <button
                            onClick={() => saveToGallery(o, key)}
                            disabled={st === "saving" || st === "done"}
                            className="flex-1 rounded-lg border border-border py-1 font-medium text-foreground disabled:opacity-60"
                          >
                            {st === "saving" ? "…" : st === "done" ? "✓ Kayıtlı" : st === "error" ? "Hata" : "★ Kaydet"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Sağ: ayarlar */}
        <div className="space-y-5">
          {/* Yerleşim */}
          <section className={`${CARD} space-y-3`}>
            <h3 className="font-display text-base text-foreground">Yerleşim &amp; Dolgu</h3>
            <select value={s.layout} onChange={(e) => up({ layout: e.target.value as Layout })} className={INPUT}>
              <option value="fit">Sığdır — boşlukları doldur</option>
              <option value="crop">Kırp — çerçeveyi doldur</option>
              <option value="blur">Sığdır — bulanık arka plan</option>
            </select>
            <div className="flex gap-2">
              <select value={s.gapFill} onChange={(e) => up({ gapFill: e.target.value as GapFill })} className={INPUT}>
                <option value="smart">Akıllı — fonu analiz et</option>
                <option value="color">Düz renk →</option>
                <option value="white">Beyaz</option>
                <option value="black">Siyah</option>
              </select>
              <input type="color" value={s.fillColor} onChange={(e) => up({ fillColor: e.target.value })} className="h-9 w-10 flex-none rounded-lg border border-border bg-transparent" />
            </div>
          </section>

          {/* Kalite */}
          <section className={`${CARD} space-y-3`}>
            <h3 className="font-display text-base text-foreground">Kalite &amp; İnce Ayar</h3>
            <Field label="JPEG kalitesi" value={`${s.quality}`} accent />
            <input type="range" min={40} max={100} value={s.quality} onChange={(e) => up({ quality: Number(e.target.value) })} className="range-slider" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Hafif keskinleştir</span>
              <Switch on={s.sharpen} onToggle={() => up({ sharpen: !s.sharpen })} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Kaliteyi yükselt — sadık {PRO_BADGE}</span>
              <Switch on={s.upscale} onToggle={() => up({ upscale: !s.upscale })} />
            </div>
            <p className="text-xs text-muted">Conservative upscale: çözünürlüğü artırır, detay uydurmaz (halüsinasyon yok).</p>
            {(["brightness", "contrast", "saturation"] as const).map((k) => (
              <div key={k}>
                <Field label={k === "brightness" ? "Parlaklık" : k === "contrast" ? "Kontrast" : "Doygunluk"} value={`${s[k] > 0 ? "+" : ""}${s[k]}`} />
                <input type="range" min={-100} max={100} value={s[k]} onChange={(e) => up({ [k]: Number(e.target.value) } as Partial<UISettings>)} className="range-slider mt-1.5" />
              </div>
            ))}
          </section>

          {/* PRO arka plan */}
          <section className={`${CARD} space-y-3`}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base text-foreground">Arka Planı Yenile {PRO_BADGE}</h3>
              <Switch on={s.pro} onToggle={() => up({ pro: !s.pro })} />
            </div>
            <p className="text-xs text-muted">Nesneyi keser (model-tabanlı), tuvale yeni zemin döşer — dikiş olmaz.</p>
            <select value={s.bgMode} onChange={(e) => up({ bgMode: e.target.value as BgMode })} disabled={!s.pro} className={`${INPUT} disabled:opacity-50`}>
              <option value="orig">Fon: orijinal ton</option>
              <option value="studio">Stüdyo gri</option>
              <option value="gradient">Yumuşak gradyan</option>
              <option value="custom">Özel renk →</option>
            </select>
            <div className="flex items-center gap-3">
              <input type="color" value={s.bgCustom} onChange={(e) => up({ bgCustom: e.target.value })} disabled={!s.pro} className="h-9 w-10 flex-none rounded-lg border border-border bg-transparent disabled:opacity-50" />
              <label className="flex flex-1 items-center justify-between">
                <span className="text-sm text-foreground">Şeffaf PNG de üret</span>
                <Switch on={s.png} onToggle={() => up({ png: !s.png })} />
              </label>
            </div>
          </section>

          {/* Logo PRO */}
          <section className={`${CARD} space-y-3`}>
            <h3 className="font-display text-base text-foreground">Logo / Filigran {PRO_BADGE}</h3>
            <input ref={logoRef} type="file" accept="image/png" className="hidden" onChange={(e) => onLogo(e.target.files?.[0])} />
            <div className="flex items-center gap-2 text-xs">
              <button onClick={() => logoRef.current?.click()} className="rounded-lg border border-border px-3 py-1.5 text-foreground hover:border-accent">PNG SEÇ</button>
              <span className="text-muted">{logoName}</span>
            </div>
            <div className="flex gap-2">
              <select value={s.logoPos} onChange={(e) => up({ logoPos: e.target.value as Pos })} className={INPUT}>
                {POS_OPTS.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
              </select>
              <div className="flex-1">
                <Field label="Boy" value={`${s.logoSize}%`} accent />
                <input type="range" min={4} max={40} value={s.logoSize} onChange={(e) => up({ logoSize: Number(e.target.value) })} className="range-slider mt-1.5" />
              </div>
            </div>
          </section>

          {/* Metin filigranı */}
          <section className={`${CARD} space-y-2.5`}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base text-foreground">Metin Filigranı</h3>
              <Switch on={s.textMark} onToggle={() => up({ textMark: !s.textMark })} />
            </div>
            <div className="flex gap-2">
              <input type="text" value={s.wm1} onChange={(e) => up({ wm1: e.target.value })} placeholder="Marka adı" className={INPUT} />
              <input type="text" value={s.wm2} onChange={(e) => up({ wm2: e.target.value })} placeholder="alt satır" className={INPUT} />
            </div>
            <div className="flex gap-2">
              <input type="text" value={s.wm3} onChange={(e) => up({ wm3: e.target.value })} placeholder="site.com" className={`${INPUT} font-mono`} />
              <input type="color" value={s.wmColor} onChange={(e) => up({ wmColor: e.target.value })} className="h-9 w-10 flex-none rounded-lg border border-border bg-transparent" />
              <select value={s.wmPos} onChange={(e) => up({ wmPos: e.target.value as Pos })} className={`${INPUT} w-28`}>
                {POS_OPTS.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
              </select>
            </div>
          </section>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-4 bg-black/90 p-6" onClick={(e) => { if (e.target === e.currentTarget) setLightbox(null); }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox.url} alt={lightbox.name} className="max-h-[78vh] max-w-[92vw] rounded-lg border border-border" />
          <div className="flex items-center gap-3 font-mono text-xs text-white/80">
            <span>{lightbox.label} — {lightbox.dim}</span>
            <a href={lightbox.url} download={lightbox.name} className="rounded-lg bg-accent px-5 py-2 font-sans text-sm font-medium text-accent-foreground">⬇ İndir</a>
            <button onClick={() => setLightbox(null)} className="rounded-lg border border-white/20 px-4 py-2 text-white/80">Kapat · Esc</button>
          </div>
        </div>
      )}
    </div>
  );
}
