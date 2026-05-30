"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";

// Referans görseli sıkıştır (max 1024px, JPEG 0.88)
function compressImage(dataUrl: string): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const max = 1024;
      const ratio = Math.min(max / img.width, max / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.88));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// ─── Client-side watermark ────────────────────────────────────────────────────

function addWatermark(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(dataUrl), 10_000); // 10s failsafe
    const img = new Image();
    img.crossOrigin = "anonymous"; // CDN URL'leri için CORS izni
    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        const paddingX = Math.round(canvas.width * 0.025);
        const paddingY = Math.round(canvas.height * 0.025);
        const size1 = Math.max(18, Math.round(canvas.width * 0.026));
        const size2 = Math.max(12, Math.round(canvas.width * 0.016));
        const size3 = Math.max(11, Math.round(canvas.width * 0.014));
        const x  = canvas.width  - paddingX;
        const y3 = canvas.height - paddingY;
        const y2 = y3 - size3 * 1.5;
        const y1 = y2 - size2 * 1.5;
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.shadowColor = "rgba(183,110,121,0.25)";
        ctx.shadowBlur = 6;
        ctx.font = `700 ${size1}px Georgia, serif`;
        ctx.fillStyle = "#b76e79";
        ctx.fillText("Trend Mücevher", x, y1);
        ctx.font = `400 ${size2}px Georgia, serif`;
        ctx.fillStyle = "rgba(183,110,121,0.8)";
        ctx.fillText("by Murat Kaynaroğlu", x, y2);
        ctx.font = `400 ${size3}px sans-serif`;
        ctx.fillStyle = "rgba(183,110,121,0.65)";
        ctx.fillText("trendmucevher.com", x, y3);
        resolve(canvas.toDataURL("image/jpeg", 0.92));
      } catch {
        // Canvas tainted (CORS) veya başka hata — orijinali döndür
        resolve(dataUrl);
      }
    };
    img.onerror = () => { clearTimeout(timeout); resolve(dataUrl); };
    img.src = dataUrl;
  });
}

// Metal ID → stil kartı prompt özeti (sabit, dil bağımsız)
const METAL_LABEL_EN: Record<string, string> = {
  "yellow-gold": "Yellow Gold",
  "rose-gold":   "Rose Gold",
  "white-gold":  "White Gold",
  "silver":      "Silver",
};

// Font/metal/deco prompt özeti (stil kartı için)
const FONT_STYLE_SHORT: Record<string, string> = {
  "cursive-thin": "elegant thin cursive script, hairline strokes, delicate swirls",
  "cursive-bold": "bold dramatic cursive script, thick flowing strokes",
  "block-serif":  "classic bold block serif, solid monogram style",
  "wire-minimal": "ultra-thin wire script, single-stroke hairline cursive",
};
const DECO_SHORT: Record<string, string> = {
  "plain":     "plain polished metal",
  "diamond":   "pavé diamond-set",
  "floral":    "floral enamel with diamond accents",
  "colorful":  "colorful mixed gemstone pavé",
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = "#b76e79";

const FONT_STYLES = [
  { id: "cursive-thin",  preview: "𝒜" },
  { id: "cursive-bold",  preview: "𝓐" },
  { id: "block-serif",   preview: "A"  },
  { id: "wire-minimal",  preview: "𝘈" },
] as const;
type FontStyleId = (typeof FONT_STYLES)[number]["id"];

const METALS = [
  { id: "yellow-gold",  hex: "#D4AF37" },
  { id: "rose-gold",    hex: "#B76E79" },
  { id: "white-gold",   hex: "#E8E8E8" },
  { id: "silver",       hex: "#C0C0C0" },
] as const;
type MetalId = (typeof METALS)[number]["id"];

const DECORATIONS = [
  { id: "plain",    icon: "◯" },
  { id: "diamond",  icon: "◈" },
  { id: "floral",   icon: "✿" },
  { id: "colorful", icon: "◉" },
] as const;
type DecorationId = (typeof DECORATIONS)[number]["id"];

// ─── Small UI primitives ──────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.35em", color: "rgba(255,255,255,0.35)" }}>
      {children}
    </span>
  );
}

function Spinner() {
  return (
    <span
      style={{
        display: "inline-block", width: 14, height: 14,
        borderRadius: "50%", border: "2px solid rgba(255,255,255,0.15)",
        borderTopColor: "rgba(255,255,255,0.7)",
        animation: "spin 0.7s linear infinite",
      }}
    />
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function IsimKolyeClient() {
  const { t } = useLanguage();
  const ik = t.isimKolye;

  // Form state
  const [mode, setMode]             = useState<"letter" | "name">("letter");
  const [text, setText]             = useState("");
  const [fontStyle, setFontStyle]   = useState<FontStyleId>("cursive-thin");
  const [metal, setMetal]           = useState<MetalId>("yellow-gold");
  const [decoration, setDecoration] = useState<DecorationId>("plain");
  const [count, setCount]           = useState(1);

  // Referans görsel
  const [refImage, setRefImage]   = useState<string | null>(null);
  const [refDragging, setRefDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Output state
  const [images, setImages]   = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Lightbox
  const [lightbox, setLightbox] = useState<number | null>(null);

  // Galeri kayıt
  const [galeriKaydediliyor, setGaleriKaydediliyor] = useState<number | null>(null);
  const [galeriKaydedildi, setGaleriKaydedildi]     = useState<Set<number>>(new Set());

  // Referans görsel analiz
  const [analiz, setAnaliz] = useState<{
    stilPrompt: string;
    oneriler: string[];
    takiTipi: string;
    konu: string;
    mevcutSahne: string;
  } | null>(null);
  const [analizYukleniyor, setAnalizYukleniyor] = useState(false);

  // Stil kartı modal
  const [stilModal, setStilModal]             = useState(false);
  const [stilIsim, setStilIsim]               = useState("");
  const [stilKaydediliyor, setStilKaydediliyor] = useState(false);

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  // ─── Handlers ──────────────────────────────────────────────────────────────

  function handleTextChange(val: string) {
    if (mode === "letter") {
      setText(val.toUpperCase().charAt(0) || "");
    } else {
      setText(val.slice(0, 18));
    }
  }

  function handleModeChange(m: "letter" | "name") {
    setMode(m);
    setText("");
    setImages([]);
  }

  async function handleRefFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = async e => {
      const raw = e.target?.result as string;
      const compressed = await compressImage(raw);
      setRefImage(compressed);
      setImages([]);

      // Analiz tetikle
      setAnaliz(null);
      setAnalizYukleniyor(true);
      try {
        const res = await fetch("/api/remaura/koleksiyon-edit/analiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: compressed }),
        });
        const data = await res.json() as {
          stilPrompt?: string; oneriler?: string[];
          takiTipi?: string; konu?: string; mevcutSahne?: string;
        };
        if (res.ok) setAnaliz({
          stilPrompt:   data.stilPrompt   ?? "",
          oneriler:     data.oneriler     ?? [],
          takiTipi:     data.takiTipi     ?? "",
          konu:         data.konu         ?? "",
          mevcutSahne:  data.mevcutSahne  ?? "",
        });
      } catch { /* sessiz */ }
      finally { setAnalizYukleniyor(false); }
    };
    reader.readAsDataURL(file);
  }

  async function handleUret() {
    if (!text.trim()) {
      setError(mode === "letter" ? ik.errLetter : ik.errName);
      return;
    }
    setLoading(true);
    setError(null);
    setImages([]);

    try {
      const res = await fetch("/api/remaura/isim-kolye/uret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode, text, fontStyle, metal, decoration, count,
          referenceImage: refImage ?? undefined,
          stilPrompt: analiz?.stilPrompt ?? undefined,
        }),
      });

      let data: { images?: string[]; error?: string } = {};
      try {
        data = await res.json();
      } catch {
        setError(`Sunucu hatası (${res.status})`);
        return;
      }

      if (!res.ok || !data.images?.length) {
        setError(data.error ?? `${ik.errLetter} (${res.status})`);
      } else {
        const watermarkedImgs = await Promise.all(data.images.map(addWatermark));
        setImages(watermarkedImgs);
      }
    } catch {
      setError(ik.toastConnError);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(src: string, idx: number) {
    const a = document.createElement("a");
    a.href = src;
    a.download = `isim-kolye-${text}-${idx + 1}.png`;
    a.click();
  }

  async function handleDownloadAll() {
    for (let i = 0; i < images.length; i++) {
      await new Promise<void>(resolve => {
        setTimeout(() => {
          handleDownload(images[i], i);
          resolve();
        }, i * 300);
      });
    }
  }

  // ─── Galeri kayıt ─────────────────────────────────────────────────────────

  async function handleGaleriKaydet(idx: number) {
    if (galeriKaydediliyor !== null) return;
    setGaleriKaydediliyor(idx);
    try {
      const tema = [
        text.trim(),
        FONT_STYLE_SHORT[fontStyle] ?? fontStyle,
        DECO_SHORT[decoration] ?? decoration,
      ].join(", ");

      const res = await fetch("/api/remaura/koleksiyon-edit/kaydet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gorselUrl: images[idx],
          koleksiyonAdi: text.trim() || "İsim Kolye",
          tip: "Kolye Ucu",
          tema,
          metal: ({ "yellow-gold": ik.metalYellowGold, "rose-gold": ik.metalRoseGold, "white-gold": ik.metalWhiteGold, "silver": ik.metalSilver } as Record<string,string>)[metal] ?? METAL_LABEL_EN[metal] ?? metal,
        }),
      });
      const data: { error?: string } = await res.json();
      if (!res.ok) { showToast(`Hata: ${data.error ?? "kaydedilemedi"}`); return; }
      setGaleriKaydedildi(prev => new Set([...prev, idx]));
      showToast(ik.toastGaleriSaved);
    } catch {
      showToast(ik.toastConnError);
    } finally {
      setGaleriKaydediliyor(null);
    }
  }

  // ─── Stil kartı kayıt ─────────────────────────────────────────────────────

  async function handleStilKaydet() {
    if (!stilIsim.trim()) return;
    setStilKaydediliyor(true);
    try {
      const stilPrompt = [
        "Initial/name pendant necklace.",
        FONT_STYLE_SHORT[fontStyle] ?? fontStyle,
        `Metal: ${METAL_LABEL_EN[metal] ?? metal}.`,
        DECO_SHORT[decoration] ?? decoration,
      ].join(" ");

      const res = await fetch("/api/remaura/koleksiyon-edit/stil-karti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isim: stilIsim.trim(),
          stil_prompt: stilPrompt,
          metal: METAL_LABEL_EN[metal] ?? null,
        }),
      });
      const data: { error?: string } = await res.json();
      if (!res.ok) { showToast(`Hata: ${data.error ?? "kaydedilemedi"}`); return; }
      setStilModal(false);
      setStilIsim("");
      showToast(ik.toastStilSaved);
    } catch {
      showToast(ik.toastConnError);
    } finally {
      setStilKaydediliyor(false);
    }
  }

  // ─── Derived ───────────────────────────────────────────────────────────────

  const canGenerate = !loading && !!text.trim();

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        minHeight: "calc(100vh - 5rem)",
        background: "#080808",
        color: "#fff",
        fontFamily: "'Inter', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Top bar */}
      <div
        style={{
          height: 52,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          gap: 16,
          flexShrink: 0,
        }}
      >
        <Link
          href="/remaura"
          style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, textDecoration: "none", letterSpacing: "0.05em" }}
        >
          {ik.back}
        </Link>
        <span style={{ color: "rgba(255,255,255,0.08)" }}>|</span>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)" }}>
          {ik.pageTitle}
        </span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "visible" }}>

        {/* ── Left Panel ───────────────────────────────────────────────────── */}
        <div
          style={{
            width: 300,
            flexShrink: 0,
            borderRight: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            flexDirection: "column",
            gap: 0,
            padding: "20px 16px 24px",
          }}
        >
          {/* Mode toggle */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            <Label>{ik.modeLabel}</Label>
            <div style={{ display: "flex", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
              {(["letter", "name"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => handleModeChange(m)}
                  style={{
                    flex: 1, padding: "8px 0", fontSize: 10, fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.2em",
                    border: "none", cursor: "pointer",
                    background: mode === m ? ACCENT : "transparent",
                    color: mode === m ? "#fff" : "rgba(255,255,255,0.3)",
                    transition: "all 0.15s",
                  }}
                >
                  {m === "letter" ? ik.letterMode : ik.nameMode}
                </button>
              ))}
            </div>
          </div>

          {/* Text input */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            <Label>{mode === "letter" ? ik.letterLabel : ik.nameLabel}</Label>
            <input
              value={text}
              onChange={e => handleTextChange(e.target.value)}
              placeholder={mode === "letter" ? "A" : "Sophia"}
              maxLength={mode === "letter" ? 1 : 18}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                color: "#fff",
                fontSize: mode === "letter" ? 28 : 18,
                fontWeight: 700,
                letterSpacing: mode === "letter" ? "0.3em" : "0.05em",
                padding: "12px 14px",
                textAlign: mode === "letter" ? "center" : "left",
                outline: "none",
                width: "100%",
                boxSizing: "border-box",
              }}
            />
            {mode === "name" && (
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", textAlign: "right" }}>
                {text.length}/18
              </span>
            )}
          </div>

          {/* ── Referans Görsel ─────────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            <Label>
              {ik.refTitle}
              <span style={{ textTransform: "none", letterSpacing: "normal", fontWeight: 400, color: "rgba(255,255,255,0.2)", marginLeft: 6 }}>
                {ik.refOptional}
              </span>
            </Label>

            {refImage ? (
              /* Önizleme */
              <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(183,110,121,0.35)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={refImage} alt="referans" style={{ width: "100%", height: "auto", display: "block", maxHeight: 140, objectFit: "contain", background: "#1a1a1a" }} />
                <button
                  onClick={() => { setRefImage(null); setImages([]); setAnaliz(null); setAnalizYukleniyor(false); }}
                  style={{
                    position: "absolute", top: 6, right: 6,
                    background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 6, color: "rgba(255,255,255,0.7)", fontSize: 11,
                    padding: "3px 8px", cursor: "pointer", lineHeight: 1,
                  }}
                >
                  {ik.refRemove}
                </button>
                <div style={{ padding: "6px 10px", background: "rgba(183,110,121,0.1)", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: ACCENT }}>
                  {ik.refStyleHint}
                </div>
              </div>
            ) : (
              /* Drop zone */
              <div
                onDragOver={e => { e.preventDefault(); setRefDragging(true); }}
                onDragLeave={() => setRefDragging(false)}
                onDrop={e => {
                  e.preventDefault(); setRefDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleRefFile(f);
                }}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `1px dashed ${refDragging ? ACCENT : "rgba(255,255,255,0.15)"}`,
                  borderRadius: 10,
                  padding: "16px 10px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: refDragging ? "rgba(183,110,121,0.07)" : "rgba(255,255,255,0.02)",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 6, opacity: 0.4 }}>⊕</div>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(255,255,255,0.3)" }}>
                  {ik.refUpload}
                </div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", marginTop: 4 }}>
                  {ik.refUploadSub}
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleRefFile(f); e.target.value = ""; }}
            />
          </div>

          {/* ── Analiz sonucu ────────────────────────────────────────────── */}
          {analizYukleniyor && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", marginBottom: 8 }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", border: `2px solid ${ACCENT}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.2em" }}>Stil analiz ediliyor…</span>
            </div>
          )}

          {analiz && !analizYukleniyor && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3em", color: ACCENT }}>{analiz.takiTipi}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>{analiz.konu}</span>
              {analiz.mevcutSahne ? (
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>{analiz.mevcutSahne}</span>
              ) : null}
              {analiz.oneriler.length > 0 && (
                <>
                  <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "2px 0" }} />
                  <span style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.25em", color: "rgba(255,255,255,0.25)" }}>Stil önerileri</span>
                  {analiz.oneriler.map((oneri, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setText(mode === "letter" ? (text || "") : oneri.slice(0, 18))}
                      style={{
                        textAlign: "left", padding: "6px 10px", borderRadius: 7, fontSize: 10,
                        color: "rgba(255,255,255,0.55)", background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer",
                        transition: "border-color 0.15s",
                      }}
                    >
                      {oneri}
                    </button>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Font style */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20, opacity: refImage ? 0.35 : 1, pointerEvents: refImage ? "none" : "auto", transition: "opacity 0.2s" }}>
            <Label>
              {ik.fontStyleLabel}
              {refImage && <span style={{ textTransform: "none", letterSpacing: "normal", fontWeight: 400, color: "rgba(255,255,255,0.2)", marginLeft: 6 }}>{ik.fontFromRef}</span>}
            </Label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {FONT_STYLES.map(f => {
                const fontLabels: Record<string, { label: string; sub: string }> = {
                  "cursive-thin": { label: ik.fontCursiveThin,  sub: ik.fontCursiveThinSub  },
                  "cursive-bold": { label: ik.fontCursiveBold,  sub: ik.fontCursiveBoldSub  },
                  "block-serif":  { label: ik.fontBlockSerif,   sub: ik.fontBlockSerifSub   },
                  "wire-minimal": { label: ik.fontWireMinimal,  sub: ik.fontWireMinimalSub  },
                };
                const { label, sub } = fontLabels[f.id] ?? { label: f.id, sub: "" };
                return (
                  <button
                    key={f.id}
                    onClick={() => setFontStyle(f.id)}
                    style={{
                      padding: "10px 8px",
                      borderRadius: 8,
                      border: fontStyle === f.id
                        ? `1px solid ${ACCENT}`
                        : "1px solid rgba(255,255,255,0.07)",
                      background: fontStyle === f.id
                        ? "rgba(183,110,121,0.12)"
                        : "rgba(255,255,255,0.03)",
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ fontSize: 22, marginBottom: 4, fontFamily: "serif", color: fontStyle === f.id ? ACCENT : "rgba(255,255,255,0.6)" }}>
                      {f.preview}
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: fontStyle === f.id ? ACCENT : "rgba(255,255,255,0.4)" }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>
                      {sub}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Metal */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            <Label>{ik.metalLabel}</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {METALS.map(m => {
                const metalLabels: Record<string, string> = {
                  "yellow-gold": ik.metalYellowGold,
                  "rose-gold":   ik.metalRoseGold,
                  "white-gold":  ik.metalWhiteGold,
                  "silver":      ik.metalSilver,
                };
                return (
                  <button
                    key={m.id}
                    onClick={() => setMetal(m.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "9px 12px", borderRadius: 8,
                      border: metal === m.id
                        ? `1px solid ${ACCENT}`
                        : "1px solid rgba(255,255,255,0.06)",
                      background: metal === m.id ? "rgba(183,110,121,0.1)" : "rgba(255,255,255,0.02)",
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    <div style={{ width: 14, height: 14, borderRadius: "50%", background: m.hex, flexShrink: 0, boxShadow: "0 0 0 1px rgba(255,255,255,0.1)" }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: metal === m.id ? "#fff" : "rgba(255,255,255,0.45)" }}>
                      {metalLabels[m.id] ?? m.id}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Decoration */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            <Label>{ik.decoLabel}</Label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {DECORATIONS.map(d => {
                const decoLabels: Record<string, string> = {
                  "plain":    ik.decoPlain,
                  "diamond":  ik.decoDiamond,
                  "floral":   ik.decoFloral,
                  "colorful": ik.decoColorful,
                };
                return (
                  <button
                    key={d.id}
                    onClick={() => setDecoration(d.id)}
                    style={{
                      padding: "9px 8px",
                      borderRadius: 8,
                      border: decoration === d.id
                        ? `1px solid ${ACCENT}`
                        : "1px solid rgba(255,255,255,0.07)",
                      background: decoration === d.id ? "rgba(183,110,121,0.12)" : "rgba(255,255,255,0.03)",
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ fontSize: 18, marginBottom: 3, color: decoration === d.id ? ACCENT : "rgba(255,255,255,0.4)" }}>
                      {d.icon}
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: decoration === d.id ? ACCENT : "rgba(255,255,255,0.35)" }}>
                      {decoLabels[d.id] ?? d.id}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Varyasyon */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            <Label>{ik.variationLabel}</Label>
            <div style={{ display: "flex", gap: 6 }}>
              {[1, 2, 3, 4].map(n => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  style={{
                    flex: 1, padding: "8px 0",
                    borderRadius: 8, border: count === n ? `1px solid ${ACCENT}` : "1px solid rgba(255,255,255,0.08)",
                    background: count === n ? "rgba(183,110,121,0.15)" : "rgba(255,255,255,0.03)",
                    color: count === n ? "#fff" : "rgba(255,255,255,0.35)",
                    fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "rgba(248,113,113,0.9)", fontSize: 11, marginBottom: 12 }}>
              {error}
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={handleUret}
            disabled={!canGenerate}
            style={{
              width: "100%", padding: "13px 0", borderRadius: 12,
              fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3em",
              border: `1px solid ${canGenerate ? "rgba(183,110,121,0.5)" : "rgba(255,255,255,0.08)"}`,
              background: canGenerate ? "rgba(183,110,121,0.15)" : "rgba(255,255,255,0.03)",
              color: canGenerate ? ACCENT : "rgba(255,255,255,0.2)",
              cursor: canGenerate ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 0.15s",
            }}
          >
            {loading && <Spinner />}
            {loading
              ? ik.generating
              : text.trim()
                ? `${ik.generateBtn} · ${text.trim().toUpperCase()}`
                : ik.generateBtn}
          </button>
        </div>

        {/* ── Right: Results ──────────────────────────────────────────────── */}
        <div style={{ flex: 1, padding: 24 }}>
          {images.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.25em", color: "rgba(255,255,255,0.3)" }}>
                {images.length} {ik.resultCount}
              </span>
              {images.length > 1 && (
                <button
                  onClick={handleDownloadAll}
                  style={{
                    fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em",
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 7, color: "rgba(255,255,255,0.4)", padding: "6px 12px", cursor: "pointer",
                  }}
                >
                  {ik.downloadAll}
                </button>
              )}
            </div>
          )}

          {/* Grid */}
          {images.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: images.length === 1
                  ? "minmax(0, 360px)"
                  : "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 16,
                justifyContent: images.length === 1 ? "center" : "start",
              }}
            >
              {images.map((src, i) => (
                <div
                  key={i}
                  style={{
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "#111",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Görsel — tıklayınca lightbox */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`${text} kolye ${i + 1}`}
                    onClick={() => setLightbox(i)}
                    style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block", cursor: "zoom-in" }}
                  />

                  {/* Aksiyon butonları — her zaman görünür */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 6,
                    padding: "10px 10px 10px",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                  }}>
                    {/* İndir */}
                    <button
                      onClick={() => handleDownload(src, i)}
                      style={{
                        padding: "8px 0", borderRadius: 8,
                        fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em",
                        background: "rgba(183,110,121,0.12)", border: `1px solid ${ACCENT}`,
                        color: ACCENT, cursor: "pointer",
                      }}
                    >
                      {ik.download}
                    </button>

                    {/* Galeriye Kayıt */}
                    <button
                      onClick={() => handleGaleriKaydet(i)}
                      disabled={galeriKaydedildi.has(i) || galeriKaydediliyor !== null}
                      style={{
                        padding: "8px 0", borderRadius: 8,
                        fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em",
                        background: galeriKaydedildi.has(i) ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.04)",
                        border: galeriKaydedildi.has(i) ? "1px solid rgba(74,222,128,0.4)" : "1px solid rgba(255,255,255,0.12)",
                        color: galeriKaydedildi.has(i) ? "rgba(74,222,128,0.9)" : "rgba(255,255,255,0.5)",
                        cursor: galeriKaydedildi.has(i) || galeriKaydediliyor !== null ? "default" : "pointer",
                      }}
                    >
                      {galeriKaydedildi.has(i) ? ik.galeriSaved : galeriKaydediliyor === i ? "…" : ik.galeriSave}
                    </button>

                    {/* Edit'te Düzenle */}
                    <button
                      onClick={() => {
                        try { localStorage.setItem("koleksiyon_edit_gorsel", src); } catch { /* ignore */ }
                        window.open("/remaura/koleksiyon-edit", "_blank");
                      }}
                      style={{
                        padding: "8px 0", borderRadius: 8,
                        fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em",
                        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                        color: "rgba(255,255,255,0.45)", cursor: "pointer",
                      }}
                    >
                      {ik.editOpen}
                    </button>

                    {/* Stili Kayıt Et */}
                    <button
                      onClick={() => setStilModal(true)}
                      style={{
                        padding: "8px 0", borderRadius: 8,
                        fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em",
                        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                        color: "rgba(255,255,255,0.45)", cursor: "pointer",
                      }}
                    >
                      {ik.stilSave}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 16 }}>
              <Spinner />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em" }}>
                {count > 1 ? `${count} ${ik.loadingMulti}` : ik.loadingSingle}
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 12 }}>
              <div style={{ fontSize: 48, opacity: 0.08 }}>✦</div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.15)", textAlign: "center", lineHeight: 1.7, maxWidth: 280 }}>
                {mode === "letter" ? ik.emptyHintLetter : ik.emptyHintName}
                <br />
                {ik.emptyHintBody}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Lightbox ─────────────────────────────────────────────────────────── */}
      {lightbox !== null && images[lightbox] && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 60,
            background: "rgba(0,0,0,0.93)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "60px 24px 24px",
          }}
          onClick={e => { if (e.target === e.currentTarget) setLightbox(null); }}
        >
          {/* Close */}
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: "absolute", top: 16, right: 16,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, color: "rgba(255,255,255,0.55)", fontSize: 14,
              padding: "6px 12px", cursor: "pointer", lineHeight: 1,
            }}
          >
            ✕
          </button>

          {/* Prev / Next */}
          {lightbox > 0 && (
            <button
              onClick={e => { e.stopPropagation(); setLightbox(l => (l ?? 0) - 1); }}
              style={{
                position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, color: "rgba(255,255,255,0.55)", fontSize: 18,
                padding: "10px 14px", cursor: "pointer",
              }}
            >‹</button>
          )}
          {lightbox < images.length - 1 && (
            <button
              onClick={e => { e.stopPropagation(); setLightbox(l => (l ?? 0) + 1); }}
              style={{
                position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, color: "rgba(255,255,255,0.55)", fontSize: 18,
                padding: "10px 14px", cursor: "pointer",
              }}
            >›</button>
          )}

          {/* Image — kısıtlı boyut, aksiyonlar için yer bırak */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[lightbox]}
            alt={`${text} kolye ${lightbox + 1}`}
            style={{
              maxWidth: "min(480px, 80vw)",
              maxHeight: "min(480px, 55vh)",
              objectFit: "contain",
              borderRadius: 12,
              flexShrink: 0,
            }}
          />

          {/* Counter */}
          <span style={{ marginTop: 10, fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>
            {lightbox + 1} / {images.length}
          </span>

          {/* Actions — sabit, her zaman görünür */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16, justifyContent: "center" }}>

            {/* İndir */}
            <button
              onClick={() => handleDownload(images[lightbox!], lightbox!)}
              style={{
                padding: "10px 18px", borderRadius: 9,
                fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em",
                background: "rgba(183,110,121,0.15)", border: `1px solid ${ACCENT}`,
                color: ACCENT, cursor: "pointer",
              }}
            >
              {ik.download}
            </button>

            {/* Galeriye Kayıt Et */}
            <button
              onClick={() => handleGaleriKaydet(lightbox!)}
              disabled={galeriKaydedildi.has(lightbox!) || galeriKaydediliyor !== null}
              style={{
                padding: "10px 18px", borderRadius: 9,
                fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em",
                background: galeriKaydedildi.has(lightbox!) ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.06)",
                border: galeriKaydedildi.has(lightbox!) ? "1px solid rgba(74,222,128,0.4)" : "1px solid rgba(255,255,255,0.15)",
                color: galeriKaydedildi.has(lightbox!) ? "rgba(74,222,128,0.9)" : "rgba(255,255,255,0.6)",
                cursor: galeriKaydedildi.has(lightbox!) || galeriKaydediliyor !== null ? "default" : "pointer",
                opacity: galeriKaydediliyor !== null && galeriKaydediliyor !== lightbox ? 0.5 : 1,
              }}
            >
              {galeriKaydedildi.has(lightbox!) ? ik.galeriSaved : galeriKaydediliyor === lightbox ? ik.stilSaving : ik.galeriSave}
            </button>

            {/* Stili Kayıt Et */}
            <button
              onClick={() => setStilModal(true)}
              style={{
                padding: "10px 18px", borderRadius: 9,
                fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em",
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.6)", cursor: "pointer",
              }}
            >
              {ik.stilSave}
            </button>

            {/* Koleksiyon Edit'te Aç */}
            <button
              onClick={() => {
                try { localStorage.setItem("koleksiyon_edit_gorsel", images[lightbox!]); } catch { /* ignore */ }
                window.open("/remaura/koleksiyon-edit", "_blank");
              }}
              style={{
                padding: "10px 18px", borderRadius: 9,
                fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.45)", cursor: "pointer",
              }}
            >
              {ik.editOpen}
            </button>

            {/* Kapat */}
            <button
              onClick={() => setLightbox(null)}
              style={{
                padding: "10px 18px", borderRadius: 9,
                fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em",
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.25)", cursor: "pointer",
              }}
            >
              {t.koleksiyonEdit.cancel}
            </button>
          </div>
        </div>
      )}

      {/* ── Stil Kartı Modal ─────────────────────────────────────────────────── */}
      {stilModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 70,
            background: "rgba(0,0,0,0.8)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={e => { if (e.target === e.currentTarget) setStilModal(false); }}
        >
          <div style={{
            background: "#141414", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16, padding: "28px 28px 24px", width: 320, display: "flex", flexDirection: "column", gap: 16,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3em", color: ACCENT }}>
              {ik.stilModalTitle}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>
              {FONT_STYLE_SHORT[fontStyle] ?? fontStyle}<br />
              {METAL_LABEL_EN[metal] ?? metal} · {DECO_SHORT[decoration] ?? decoration}
            </div>
            <input
              value={stilIsim}
              onChange={e => setStilIsim(e.target.value)}
              placeholder={ik.stilNamePlaceholder}
              autoFocus
              style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8, color: "#fff", fontSize: 13, padding: "10px 12px", outline: "none",
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleStilKaydet}
                disabled={!stilIsim.trim() || stilKaydediliyor}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 8,
                  fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em",
                  background: stilIsim.trim() ? "rgba(183,110,121,0.15)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${stilIsim.trim() ? ACCENT : "rgba(255,255,255,0.08)"}`,
                  color: stilIsim.trim() ? ACCENT : "rgba(255,255,255,0.2)",
                  cursor: stilIsim.trim() && !stilKaydediliyor ? "pointer" : "not-allowed",
                }}
              >
                {stilKaydediliyor ? ik.stilSaving : ik.stilSaveBtn}
              </button>
              <button
                onClick={() => setStilModal(false)}
                style={{
                  padding: "10px 16px", borderRadius: 8,
                  fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em",
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.25)", cursor: "pointer",
                }}
              >
                {ik.stilCancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ────────────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
          zIndex: 80, background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 10, padding: "10px 22px",
          fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.8)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          pointerEvents: "none",
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
