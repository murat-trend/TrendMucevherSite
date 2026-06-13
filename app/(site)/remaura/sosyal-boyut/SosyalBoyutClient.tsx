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
 * Orijinal neon arayüz; CSS .sbpRoot altında KAPSAMLI (siteyi bozmaz).
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

function Switch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" className={`sw${on ? " on" : ""}`} onClick={onToggle}>
      <span className="knob" />
    </button>
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
    <div className="sbpRoot">
      <style>{CSS}</style>
      <div className="bgGlow" />
      <div className="bgGrid" />

      <main className="sbpMain">
        <div className="titleRow">
          <div className="logoBox">
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="#2BFFB3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2v14a2 2 0 0 0 2 2h14" />
              <path d="M18 22V8a2 2 0 0 0-2-2H2" />
            </svg>
          </div>
          <div>
            <div className="brand">SOSYAL <span>BOYUTLAYICI</span></div>
            <div className="brandSub">AI Görsel Format Motoru · işlem tarayıcıda</div>
          </div>
        </div>

        {/* KAYNAK */}
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => addFiles(e.target.files)} />
        {files.length === 0 ? (
          <button id="drop" onClick={() => fileRef.current?.click()}>
            <div className="grid2" />
            <div className="upIcon">
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#2BFFB3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 16v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
              </svg>
            </div>
            <div style={{ textAlign: "center", position: "relative" }}>
              <div style={{ fontFamily: "var(--grot)", fontSize: 21, fontWeight: 600, color: "#f1f3f5" }}>Görseli sürükle ya da seç</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "#6c7280", marginTop: 9 }}>JPG · PNG — birden fazla desteklenir</div>
            </div>
            <span className="neonBtn">⬆ GÖRSEL SEÇ</span>
          </button>
        ) : (
          <div className="glass srcPanel">
            <div className="prevBox">
              <div className="grid3" />
              {srcUrl && <img src={srcUrl} alt="kaynak" />}
              <div className="corner c-tl" /><div className="corner c-tr" /><div className="corner c-bl" /><div className="corner c-br" />
            </div>
            <div className="srcInfo">
              <div>
                <div className="secTitle">KAYNAK GÖRSEL</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#eef0f3", marginTop: 12 }}>
                  {files.length === 1 ? files[0].name : `${files.length} görsel seçildi`}
                </div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#717886", marginTop: 3 }}>
                  {(files[0].name.split(".").pop() || "IMG").toUpperCase()} · {totalMb} MB
                </div>
                <div style={{ marginTop: 12, fontSize: 13, color: "#9fe9cd" }}>
                  <strong style={{ fontFamily: "var(--mono)" }}>{secCount}</strong> format çıktıya hazır
                </div>
              </div>
              <div style={{ display: "flex", gap: 9 }}>
                <button className="ghostBtn" style={{ flex: 1 }} onClick={() => fileRef.current?.click()}>⟳ Değiştir / Ekle</button>
                <button className="dangerBtn" onClick={() => { setFiles([]); setOutputs([]); setSrcUrl(""); }}>🗑 Kaldır</button>
              </div>
            </div>
          </div>
        )}

        {/* FORMATLAR */}
        <section className="glass">
          <div className="rowBet" style={{ flexWrap: "wrap", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <div className="secTitle">FORMATLAR</div>
              <div className="badge">{secCount}/{formats.length}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="miniBtn" onClick={() => selectAllFormats(true)}>TÜMÜ</button>
              <button className="miniBtn" onClick={() => selectAllFormats(false)}>TEMİZLE</button>
            </div>
          </div>
          <div id="formats">
            {formats.map((f) => {
              const MAX = 46;
              let fw: number, fh: number;
              if (f.w >= f.h) { fw = MAX; fh = Math.max(8, Math.round((MAX * f.h) / f.w)); }
              else { fh = MAX; fw = Math.max(8, Math.round((MAX * f.w) / f.h)); }
              return (
                <button key={f.id} className={`fmt${f.on ? " sel" : ""}`} onClick={() => toggleFormat(f.id)}>
                  <span className="ring" />
                  <div className="row1">
                    <div className="thumbbox">
                      <div className="thumb" style={{ width: fw, height: fh }}>
                        {srcUrl && <img src={srcUrl} alt="" />}
                      </div>
                    </div>
                    <div className="chk">
                      <span className="in">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#04140d" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                      </span>
                    </div>
                  </div>
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <div className="fname">{f.ad}</div>
                    <div className="fsub">{f.sub}</div>
                  </div>
                  <div className="fdim">{f.w} × {f.h}</div>
                </button>
              );
            })}
          </div>
          <div className="ozelRow">
            <span>ÖZEL BOYUT</span>
            <input type="number" value={ozelW} onChange={(e) => setOzelW(e.target.value)} placeholder="genişlik" />
            <span>×</span>
            <input type="number" value={ozelH} onChange={(e) => setOzelH(e.target.value)} placeholder="yükseklik" />
            <button className="miniBtn" onClick={addOzel}>+ EKLE</button>
          </div>
        </section>

        {/* AYARLAR */}
        <section className="glass">
          <div className="secTitle" style={{ marginBottom: 18 }}>AYARLAR</div>
          <div className="setGrid">
            {/* Yerleşim */}
            <div className="card">
              <div className="cardTitle">🗔 Yerleşim &amp; Dolgu</div>
              <div>
                <div className="lbl" style={{ marginBottom: 6 }}>Yerleşim</div>
                <div className="selWrap">
                  <select value={s.layout} onChange={(e) => up({ layout: e.target.value as Layout })}>
                    <option value="fit">Sığdır — boşlukları doldur</option>
                    <option value="crop">Kırp — çerçeveyi doldur</option>
                    <option value="blur">Sığdır — bulanık arka plan</option>
                  </select>
                </div>
              </div>
              <div>
                <div className="lbl" style={{ marginBottom: 6 }}>Boşluk dolgusu</div>
                <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
                  <div className="selWrap" style={{ flex: 1 }}>
                    <select value={s.gapFill} onChange={(e) => up({ gapFill: e.target.value as GapFill })}>
                      <option value="smart">Akıllı — fonu analiz et</option>
                      <option value="color">Düz renk →</option>
                      <option value="white">Beyaz</option>
                      <option value="black">Siyah</option>
                    </select>
                  </div>
                  <input type="color" value={s.fillColor} onChange={(e) => up({ fillColor: e.target.value })} />
                </div>
              </div>
            </div>

            {/* Kalite */}
            <div className="card">
              <div className="cardTitle">✦ Kalite &amp; Keskinlik</div>
              <div>
                <div className="rowBet"><span className="lbl">JPEG kalitesi</span><span className="monoVal" style={{ color: "var(--neon)" }}>{s.quality}</span></div>
                <input type="range" min={40} max={100} value={s.quality} onChange={(e) => up({ quality: Number(e.target.value) })} style={{ margin: "9px 0 2px" }} />
              </div>
              <div className="rowBet"><span style={{ fontSize: 13, color: "#c5cad3", fontWeight: 600 }}>Hafif keskinleştir</span><Switch on={s.sharpen} onToggle={() => up({ sharpen: !s.sharpen })} /></div>
              <div className="rowBet">
                <span style={{ fontSize: 13, color: "#c5cad3", fontWeight: 600 }}>Kaliteyi yükselt — sadık <span className="proTag">PRO</span></span>
                <Switch on={s.upscale} onToggle={() => up({ upscale: !s.upscale })} />
              </div>
              <div style={{ fontSize: 11, color: "#8c91a0", marginTop: -4 }}>Conservative upscale: çözünürlüğü artırır, detay uydurmaz.</div>
            </div>

            {/* İnce ayar */}
            <div className="card">
              <div className="cardTitle">𝄚 İnce Ayar</div>
              {(["brightness", "contrast", "saturation"] as const).map((k) => (
                <div key={k}>
                  <div className="rowBet">
                    <span className="lbl">{k === "brightness" ? "Parlaklık" : k === "contrast" ? "Kontrast" : "Doygunluk"}</span>
                    <span className="monoVal">{s[k] > 0 ? "+" : ""}{s[k]}</span>
                  </div>
                  <input type="range" min={-100} max={100} value={s[k]} onChange={(e) => up({ [k]: Number(e.target.value) } as Partial<UISettings>)} style={{ margin: "7px 0 2px" }} />
                </div>
              ))}
            </div>

            {/* Logo PRO */}
            <div className="card">
              <div className="cardTitle">▣ Logo / Filigran (PNG) <span className="proTag">PRO</span></div>
              <input ref={logoRef} type="file" accept="image/png" style={{ display: "none" }} onChange={(e) => onLogo(e.target.files?.[0])} />
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button className="ghostBtn" onClick={() => logoRef.current?.click()}>PNG SEÇ</button>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "#737a87" }}>{logoName}</span>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div className="lbl" style={{ marginBottom: 6 }}>Konum</div>
                  <div className="selWrap">
                    <select value={s.logoPos} onChange={(e) => up({ logoPos: e.target.value as Pos })}>
                      {POS_OPTS.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="rowBet"><span className="lbl">Boy</span><span className="monoVal" style={{ color: "var(--neon)" }}>{s.logoSize}%</span></div>
                  <input type="range" min={4} max={40} value={s.logoSize} onChange={(e) => up({ logoSize: Number(e.target.value) })} style={{ margin: "13px 0 2px" }} />
                </div>
              </div>
            </div>

            {/* PRO arka plan */}
            <div className="card proCard">
              <div className="rowBet">
                <div className="cardTitle" style={{ color: "#ece9ff" }}>✧ Arka Planı Yenile <span className="proTag">PRO</span></div>
                <Switch on={s.pro} onToggle={() => up({ pro: !s.pro })} />
              </div>
              <div style={{ fontSize: 12, color: "#8c91a0", lineHeight: 1.5 }}>Nesneyi keser (model-tabanlı), tuvale yeni zemin döşer — dikiş olmaz.</div>
              <div className="selWrap">
                <select value={s.bgMode} onChange={(e) => up({ bgMode: e.target.value as BgMode })}>
                  <option value="orig">Fon: orijinal ton</option>
                  <option value="studio">Stüdyo gri</option>
                  <option value="gradient">Yumuşak gradyan</option>
                  <option value="custom">Özel renk →</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input type="color" value={s.bgCustom} onChange={(e) => up({ bgCustom: e.target.value })} />
                <label className="rowBet" style={{ flex: 1, cursor: "pointer" }}>
                  <span style={{ fontSize: 12.5, color: "#c5cad3", fontWeight: 600 }}>Şeffaf PNG&apos;yi de üret</span>
                  <Switch on={s.png} onToggle={() => up({ png: !s.png })} />
                </label>
              </div>
            </div>

            {/* Metin filigranı */}
            <div className="card">
              <div className="rowBet">
                <div className="cardTitle">𝐓 Metin Filigranı</div>
                <Switch on={s.textMark} onToggle={() => up({ textMark: !s.textMark })} />
              </div>
              <div style={{ display: "flex", gap: 9 }}>
                <input type="text" value={s.wm1} onChange={(e) => up({ wm1: e.target.value })} placeholder="Marka adı" style={{ flex: 1, minWidth: 0, fontWeight: 600 }} />
                <input type="text" value={s.wm2} onChange={(e) => up({ wm2: e.target.value })} placeholder="alt satır" style={{ flex: 1, minWidth: 0 }} />
              </div>
              <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
                <input type="text" value={s.wm3} onChange={(e) => up({ wm3: e.target.value })} placeholder="site.com" style={{ flex: 1, minWidth: 0, fontFamily: "var(--mono)", fontSize: 12 }} />
                <input type="color" value={s.wmColor} onChange={(e) => up({ wmColor: e.target.value })} />
                <div className="selWrap" style={{ width: 110, flex: "none" }}>
                  <select value={s.wmPos} onChange={(e) => up({ wmPos: e.target.value as Pos })}>
                    {POS_OPTS.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ÜRET */}
        <button id="run" className={running ? "busy" : ""} onClick={run}>
          <span className="shim" />
          {running ? (
            <svg className="spin" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#04130d" strokeWidth="2.4" strokeLinecap="round" style={{ position: "relative" }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="#04130d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "relative" }}><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z" /></svg>
          )}
          <span style={{ position: "relative" }}>{running ? `İŞLENİYOR · ${progress.done}/${progress.total}` : "FORMATLARI ÜRET"}</span>
          <span className="cnt" style={{ position: "relative" }}>{secCount} format</span>
          <div id="runProg" style={{ width: progress.total ? `${(progress.done / progress.total) * 100}%` : "0%" }} />
        </button>
        {error && <div style={{ color: "#ff8a9b", fontSize: 13 }}>{error}</div>}

        {/* ÇIKTILAR */}
        {outputs.length > 0 && (
          <section className="glass">
            <div className="rowBet" style={{ flexWrap: "wrap", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <div className="secTitle">ÇIKTILAR</div>
                <div className="badge">{outputs.length} hazır</div>
              </div>
              <button className="neonBtn" onClick={zipAll}>📦 TÜMÜNÜ ZIP İNDİR</button>
            </div>
            <div className="resGrid">
              {outputs.map((o, i) => {
                const key = `${i}`;
                const st = saved[key];
                return (
                  <div key={i} className="res">
                    <div className="media" style={{ aspectRatio: `${o.w} / ${o.h}` }} onClick={() => setLightbox(o)}>
                      <img src={o.url} alt={o.name} />
                      <div className="grid4" />
                      <div className="dimTag">{o.dim}</div>
                    </div>
                    <div className="meta">
                      <div style={{ minWidth: 0 }}>
                        <div className="nm">{o.label}</div>
                        <div className="kb">{(o.blob.size / 1024).toFixed(0)} KB</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        <a className="dlBtn" href={o.url} download={o.name}>⬇ indir</a>
                        <button className="dlBtn saveBtn" disabled={st === "saving" || st === "done"} onClick={() => saveToGallery(o, key)}>
                          {st === "saving" ? "…" : st === "done" ? "✓ kayıtlı" : st === "error" ? "hata" : "★ kaydet"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {lightbox && (
        <div id="lb" onClick={(e) => { if (e.target === e.currentTarget) setLightbox(null); }}>
          <img src={lightbox.url} alt={lightbox.name} />
          <div className="bar">
            <span>{lightbox.label} — {lightbox.dim}</span>
            <a href={lightbox.url} download={lightbox.name}>⬇ İNDİR</a>
            <button onClick={() => setLightbox(null)}>kapat · Esc</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Orijinal neon tema — .sbpRoot altında KAPSAMLI (siteyi etkilemez) ===== */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
.sbpRoot{--neon:#2BFFB3;--neon2:#13d894;--blue:#67d3ff;--mor:#b79bff;--ink:#e9ebee;--mut:#9097a3;--mono:'JetBrains Mono',monospace;--grot:'Space Grotesk',sans-serif;position:relative;min-height:100%;background:#06070A;color:var(--ink);font-family:'Manrope',system-ui,sans-serif;overflow:hidden;border-radius:18px}
.sbpRoot *{box-sizing:border-box}
.sbpRoot .bgGlow{position:absolute;inset:0;z-index:0;background:radial-gradient(1200px 680px at 12% -12%,rgba(41,240,174,.11),transparent 60%),radial-gradient(1000px 760px at 102% -6%,rgba(69,140,255,.12),transparent 55%),radial-gradient(900px 760px at 50% 128%,rgba(157,134,255,.09),transparent 60%),#06070A}
.sbpRoot .bgGrid{position:absolute;inset:0;z-index:0;opacity:.55;background-image:linear-gradient(rgba(255,255,255,.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.022) 1px,transparent 1px);background-size:42px 42px;-webkit-mask-image:radial-gradient(circle at 50% 24%,#000 0%,transparent 72%);mask-image:radial-gradient(circle at 50% 24%,#000 0%,transparent 72%)}
.sbpRoot .sbpMain{position:relative;z-index:1;max-width:1180px;margin:0 auto;padding:30px 26px 90px;display:flex;flex-direction:column;gap:22px}
.sbpRoot .titleRow{display:flex;align-items:center;gap:12px}
.sbpRoot .logoBox{width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,rgba(41,240,174,.14),rgba(41,240,174,.02));border:1px solid rgba(41,240,174,.35);box-shadow:0 0 24px -4px rgba(41,240,174,.55),inset 0 0 14px rgba(41,240,174,.08)}
.sbpRoot .brand{font-family:var(--grot);font-weight:700;font-size:17px;color:#f3f5f7}
.sbpRoot .brand span{color:var(--neon)}
.sbpRoot .brandSub{font-family:var(--mono);font-size:9.5px;letter-spacing:.24em;color:#5d646f;margin-top:5px;text-transform:uppercase}
.sbpRoot .glass{position:relative;background:linear-gradient(180deg,rgba(21,24,31,.62),rgba(13,15,20,.62));border:1px solid rgba(255,255,255,.07);border-radius:22px;box-shadow:0 22px 60px -34px rgba(0,0,0,.85);padding:22px}
.sbpRoot .secTitle{font-family:var(--mono);font-size:11px;letter-spacing:.2em;color:#737a87;text-transform:uppercase;display:flex;align-items:center;gap:9px}
.sbpRoot .secTitle::before{content:'';width:16px;height:1px;background:var(--neon)}
.sbpRoot .badge{font-family:var(--mono);font-size:11px;color:#04140d;background:var(--neon);padding:2px 9px;border-radius:6px;font-weight:600;box-shadow:0 0 14px -2px rgba(41,240,174,.6)}
.sbpRoot #drop{width:100%;min-height:280px;cursor:pointer;border-radius:24px;border:1.5px dashed rgba(41,240,174,.32);background:linear-gradient(180deg,rgba(41,240,174,.035),rgba(13,15,20,.4));display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;color:inherit;transition:.2s;position:relative;overflow:hidden;font-family:inherit}
.sbpRoot #drop:hover{border-color:rgba(41,240,174,.6)}
.sbpRoot #drop .grid2{position:absolute;inset:0;opacity:.4;background-image:linear-gradient(rgba(41,240,174,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(41,240,174,.05) 1px,transparent 1px);background-size:30px 30px;pointer-events:none}
.sbpRoot .upIcon{width:74px;height:74px;border-radius:21px;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 28%,rgba(41,240,174,.2),rgba(41,240,174,.02));border:1px solid rgba(41,240,174,.34);box-shadow:0 0 44px -8px rgba(41,240,174,.55),inset 0 0 20px rgba(41,240,174,.08)}
.sbpRoot .neonBtn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px 22px;border-radius:11px;background:linear-gradient(180deg,#2BFFB3,#16cf92);color:#04140d;font-weight:700;font-size:13px;box-shadow:0 8px 24px -8px rgba(41,240,174,.6);border:none;cursor:pointer;font-family:inherit}
.sbpRoot .srcPanel{display:flex;gap:20px;flex-wrap:wrap}
.sbpRoot .prevBox{position:relative;flex:1 1 320px;min-width:280px;min-height:280px;max-height:380px;border-radius:16px;overflow:hidden;background:#070809;border:1px solid rgba(255,255,255,.07);display:flex;align-items:center;justify-content:center}
.sbpRoot .prevBox .grid3{position:absolute;inset:0;opacity:.5;background-image:linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px);background-size:32px 32px;pointer-events:none}
.sbpRoot .prevBox img{max-width:100%;max-height:380px;object-fit:contain;display:block;position:relative}
.sbpRoot .corner{position:absolute;width:18px;height:18px;border-color:rgba(41,240,174,.7);border-style:solid;border-width:0}
.sbpRoot .c-tl{top:9px;left:9px;border-left-width:2px;border-top-width:2px}.sbpRoot .c-tr{top:9px;right:9px;border-right-width:2px;border-top-width:2px}.sbpRoot .c-bl{bottom:9px;left:9px;border-left-width:2px;border-bottom-width:2px}.sbpRoot .c-br{bottom:9px;right:9px;border-right-width:2px;border-bottom-width:2px}
.sbpRoot .srcInfo{flex:1 1 240px;min-width:230px;display:flex;flex-direction:column;justify-content:space-between;gap:16px;padding:6px}
.sbpRoot .ghostBtn{cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:10px 14px;border-radius:11px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);color:#dfe2e7;font-size:12.5px;font-weight:600}
.sbpRoot .ghostBtn:hover{border-color:rgba(41,240,174,.4)}
.sbpRoot .dangerBtn{cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:6px;padding:10px 14px;border-radius:11px;border:1px solid rgba(255,93,115,.22);background:rgba(255,93,115,.05);color:#ff8a9b;font-size:12.5px;font-weight:600}
.sbpRoot #formats{display:grid;grid-template-columns:repeat(auto-fill,minmax(186px,1fr));gap:12px}
.sbpRoot .fmt{position:relative;text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:12px;padding:14px;border-radius:16px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.018);transition:.15s;font-family:inherit;color:inherit}
.sbpRoot .fmt:hover{border-color:rgba(41,240,174,.38);background:rgba(41,240,174,.035);transform:translateY(-2px)}
.sbpRoot .fmt .ring{display:none;position:absolute;inset:-1px;border-radius:16px;border:1.5px solid var(--neon);box-shadow:0 0 0 1px rgba(41,240,174,.25),0 12px 30px -12px rgba(41,240,174,.45);pointer-events:none}
.sbpRoot .fmt.sel .ring{display:block}
.sbpRoot .fmt .row1{position:relative;z-index:1;display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.sbpRoot .thumbbox{width:54px;height:54px;flex:none;display:flex;align-items:center;justify-content:center;border-radius:9px;background:rgba(0,0,0,.32);border:1px solid rgba(255,255,255,.06)}
.sbpRoot .thumb{border-radius:3px;overflow:hidden;background:#0c0e12;border:1px solid rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center}
.sbpRoot .thumb img{width:100%;height:100%;object-fit:cover;display:block}
.sbpRoot .chk{width:23px;height:23px;border-radius:7px;flex:none;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.03);position:relative}
.sbpRoot .chk .in{display:none;position:absolute;inset:-1px;border-radius:7px;background:linear-gradient(180deg,#2BFFB3,#16cf92);align-items:center;justify-content:center;box-shadow:0 0 13px rgba(41,240,174,.6)}
.sbpRoot .fmt.sel .chk .in{display:flex}
.sbpRoot .fname{font-size:13.5px;font-weight:700;color:#eaecef;line-height:1.25}
.sbpRoot .fsub{font-size:11.5px;color:#7c838f;margin-top:3px}
.sbpRoot .fdim{align-self:flex-start;font-family:var(--mono);font-size:10.5px;color:#7fb6c9;background:rgba(69,200,255,.07);border:1px solid rgba(69,200,255,.16);padding:3px 8px;border-radius:6px;position:relative;z-index:1}
.sbpRoot .miniBtn{cursor:pointer;font-family:var(--mono);font-size:11px;padding:7px 12px;border-radius:9px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.03);color:#c2c7d0}
.sbpRoot .miniBtn:hover{border-color:rgba(41,240,174,.4);color:var(--neon)}
.sbpRoot .ozelRow{display:flex;gap:8px;align-items:center;margin-top:14px;font-family:var(--mono);font-size:11px;color:#737a87}
.sbpRoot .setGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:14px}
.sbpRoot .card{background:rgba(255,255,255,.022);border:1px solid rgba(255,255,255,.06);border-radius:15px;padding:16px;display:flex;flex-direction:column;gap:13px}
.sbpRoot .cardTitle{display:flex;align-items:center;gap:9px;font-family:var(--grot);font-size:13.5px;font-weight:600;color:#e6e8ec}
.sbpRoot .lbl{font-size:12px;color:var(--mut);font-weight:600}
.sbpRoot .selWrap{position:relative}
.sbpRoot .selWrap select{appearance:none;-webkit-appearance:none;width:100%;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1);color:#e6e8ec;border-radius:11px;padding:11px 36px 11px 13px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer}
.sbpRoot .selWrap::after{content:'▾';position:absolute;right:13px;top:50%;transform:translateY(-50%);color:#7b828f;pointer-events:none;font-size:12px}
.sbpRoot select option{background:#101319;color:#e6e8ec}
.sbpRoot input[type=text],.sbpRoot input[type=number]{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1);color:#e6e8ec;border-radius:10px;padding:10px 12px;font-family:inherit;font-size:13px;width:100%}
.sbpRoot .ozelRow input[type=number]{width:92px}
.sbpRoot input[type=color]{-webkit-appearance:none;appearance:none;width:40px;height:40px;padding:0;border:1px solid rgba(255,255,255,.14);border-radius:10px;background:transparent;cursor:pointer;flex:none}
.sbpRoot input[type=color]::-webkit-color-swatch-wrapper{padding:3px}
.sbpRoot input[type=color]::-webkit-color-swatch{border:none;border-radius:6px}
.sbpRoot input[type=range]{-webkit-appearance:none;appearance:none;outline:none;width:100%;height:6px;border-radius:999px;cursor:pointer;background:rgba(255,255,255,.1)}
.sbpRoot input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:#0a0c10;border:2px solid var(--neon);box-shadow:0 0 0 3px rgba(41,240,174,.16),0 0 12px rgba(41,240,174,.6);cursor:pointer;margin-top:-5px}
.sbpRoot input[type=range]::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:#0a0c10;border:2px solid var(--neon);cursor:pointer}
.sbpRoot .monoVal{font-family:var(--mono);font-size:12px;color:#cdd2da}
.sbpRoot .rowBet{display:flex;align-items:center;justify-content:space-between;gap:10px}
.sbpRoot .sw{width:44px;height:25px;border-radius:999px;padding:3px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.11);cursor:pointer;display:flex;align-items:center;transition:.2s;flex:none}
.sbpRoot .sw .knob{width:17px;height:17px;border-radius:50%;background:#fff;transform:translateX(0);transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.4)}
.sbpRoot .sw.on{background:linear-gradient(90deg,#17b683,var(--neon));border-color:rgba(41,240,174,.5);box-shadow:0 0 15px rgba(41,240,174,.45)}
.sbpRoot .sw.on .knob{transform:translateX(19px)}
.sbpRoot .proCard{background:linear-gradient(180deg,rgba(157,134,255,.06),rgba(41,240,174,.03));border:1px solid rgba(157,134,255,.22)}
.sbpRoot .proTag{font-family:var(--mono);font-size:9px;letter-spacing:.12em;padding:2px 7px;border-radius:5px;background:linear-gradient(90deg,#9d86ff,var(--neon));color:#0a0814;font-weight:600}
.sbpRoot #run{position:relative;width:100%;cursor:pointer;border:none;overflow:hidden;border-radius:18px;padding:20px;font-family:var(--grot);font-weight:700;font-size:16px;letter-spacing:.06em;color:#04130d;background:linear-gradient(180deg,#34ffba,#13d894);box-shadow:0 14px 40px -12px rgba(41,240,174,.55),inset 0 1px 0 rgba(255,255,255,.55);display:flex;align-items:center;justify-content:center;gap:12px}
.sbpRoot #run .shim{position:absolute;inset:0;background:linear-gradient(110deg,transparent 20%,rgba(255,255,255,.4) 50%,transparent 80%);background-size:200% 100%;animation:sbpShim 3.4s linear infinite;pointer-events:none}
.sbpRoot #run .cnt{font-family:var(--mono);font-size:12px;letter-spacing:0;background:rgba(4,19,13,.18);padding:3px 9px;border-radius:6px}
.sbpRoot #run.busy{pointer-events:none;opacity:.92}
.sbpRoot #run .spin{animation:sbpSpin .8s linear infinite}
.sbpRoot #runProg{position:absolute;left:0;bottom:0;height:3px;background:#04130d;opacity:.5;transition:width .1s linear}
.sbpRoot .resGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(184px,1fr));gap:14px;align-items:start}
.sbpRoot .res{position:relative;border-radius:15px;overflow:hidden;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02)}
.sbpRoot .res .media{position:relative;background:#0a0c10;max-height:230px;display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:zoom-in}
.sbpRoot .res .media img{width:100%;height:100%;object-fit:cover;display:block}
.sbpRoot .res .media .grid4{position:absolute;inset:0;opacity:.4;background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:26px 26px;pointer-events:none}
.sbpRoot .res .dimTag{position:absolute;top:8px;left:8px;font-family:var(--mono);font-size:10px;color:#9fe9cd;background:rgba(4,12,9,.66);padding:3px 8px;border-radius:6px;border:1px solid rgba(41,240,174,.28)}
.sbpRoot .res .meta{padding:11px 13px;display:flex;align-items:center;justify-content:space-between;gap:9px}
.sbpRoot .res .nm{font-size:12.5px;font-weight:700;color:#e9ebee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sbpRoot .res .kb{font-family:var(--mono);font-size:10.5px;color:#6f7682;margin-top:2px}
.sbpRoot .dlBtn{cursor:pointer;flex:none;font-family:inherit;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:6px 11px;border-radius:9px;border:1px solid rgba(41,240,174,.3);background:rgba(41,240,174,.07);color:var(--neon);font-size:11px;font-weight:700;text-decoration:none}
.sbpRoot .dlBtn:hover{background:rgba(41,240,174,.16)}
.sbpRoot .dlBtn.saveBtn{border-color:rgba(157,134,255,.35);background:rgba(157,134,255,.08);color:#cdbcff}
.sbpRoot .dlBtn:disabled{opacity:.6;cursor:default}
.sbpRoot #lb{position:fixed;inset:0;background:rgba(3,4,6,.94);z-index:90;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;backdrop-filter:blur(8px)}
.sbpRoot #lb img{max-width:92vw;max-height:78vh;border:1px solid rgba(41,240,174,.25);border-radius:8px;background:#0a0c10}
.sbpRoot #lb .bar{display:flex;gap:12px;align-items:center;color:#aab;font-family:var(--mono);font-size:12px}
.sbpRoot #lb .bar a{background:linear-gradient(180deg,#34ffba,#13d894);color:#04130d;padding:10px 26px;border-radius:9px;text-decoration:none;font-weight:700;font-family:'Manrope',sans-serif;font-size:13px}
.sbpRoot #lb .bar button{background:#1a1e26;color:#cfd3da;border:1px solid rgba(255,255,255,.12);padding:10px 16px;border-radius:9px;cursor:pointer;font-family:inherit}
@keyframes sbpShim{0%{background-position:-180% 0}100%{background-position:180% 0}}
@keyframes sbpSpin{to{transform:rotate(360deg)}}
`;
