"use client";

import Link from "next/link";
import { useState } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = "#b76e79";

const FONT_STYLES = [
  {
    id: "cursive-thin",
    label: "Cursive İnce",
    sub: "Zarif ince akışkan",
    preview: "𝒜",
  },
  {
    id: "cursive-bold",
    label: "Cursive Kalın",
    sub: "Dramatik kalın",
    preview: "𝓐",
  },
  {
    id: "block-serif",
    label: "Blok Serif",
    sub: "Sağlam klasik",
    preview: "A",
  },
  {
    id: "wire-minimal",
    label: "Tel Minimal",
    sub: "Ultra ince tel",
    preview: "𝘈",
  },
] as const;
type FontStyleId = (typeof FONT_STYLES)[number]["id"];

const METALS = [
  { id: "yellow-gold",  label: "Sarı Altın",   hex: "#D4AF37" },
  { id: "rose-gold",    label: "Rose Gold",     hex: "#B76E79" },
  { id: "white-gold",   label: "Beyaz Altın",   hex: "#E8E8E8" },
  { id: "silver",       label: "Gümüş",         hex: "#C0C0C0" },
] as const;
type MetalId = (typeof METALS)[number]["id"];

const DECORATIONS = [
  { id: "plain",    label: "Sade",         icon: "◯" },
  { id: "diamond",  label: "Pırlanta",     icon: "◈" },
  { id: "floral",   label: "Çiçek",        icon: "✿" },
  { id: "colorful", label: "Renkli Taş",   icon: "◉" },
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
  // Form state
  const [mode, setMode]             = useState<"letter" | "name">("letter");
  const [text, setText]             = useState("");
  const [fontStyle, setFontStyle]   = useState<FontStyleId>("cursive-thin");
  const [metal, setMetal]           = useState<MetalId>("yellow-gold");
  const [decoration, setDecoration] = useState<DecorationId>("plain");
  const [count, setCount]           = useState(2);

  // Output state
  const [images, setImages]   = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Lightbox
  const [lightbox, setLightbox] = useState<number | null>(null);

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

  async function handleUret() {
    if (!text.trim()) {
      setError(mode === "letter" ? "Bir harf girin" : "İsim girin");
      return;
    }
    setLoading(true);
    setError(null);
    setImages([]);

    try {
      const res = await fetch("/api/remaura/isim-kolye/uret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, text, fontStyle, metal, decoration, count }),
      });

      let data: { images?: string[]; error?: string } = {};
      try {
        data = await res.json();
      } catch {
        setError(`Sunucu hatası (${res.status})`);
        return;
      }

      if (!res.ok || !data.images?.length) {
        setError(data.error ?? `Üretim başarısız (${res.status})`);
      } else {
        setImages(data.images);
      }
    } catch {
      setError("Bağlantı hatası — tekrar dene");
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

  // ─── Derived ───────────────────────────────────────────────────────────────

  const canGenerate = !loading && !!text.trim();

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        minHeight: "100dvh",
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
          ← Remaura
        </Link>
        <span style={{ color: "rgba(255,255,255,0.08)" }}>|</span>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)" }}>
          İsim &amp; Harf Kolye
        </span>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Left Panel ───────────────────────────────────────────────────── */}
        <div
          style={{
            width: 300,
            flexShrink: 0,
            borderRight: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            flexDirection: "column",
            gap: 0,
            overflowY: "auto",
            padding: "20px 16px 24px",
          }}
        >
          {/* Mode toggle */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            <Label>Mod</Label>
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
                  {m === "letter" ? "Tek Harf" : "İsim"}
                </button>
              ))}
            </div>
          </div>

          {/* Text input */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            <Label>{mode === "letter" ? "Harf" : "İsim"}</Label>
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

          {/* Font style */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            <Label>Font Stili</Label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {FONT_STYLES.map(f => (
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
                    {f.label}
                  </div>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>
                    {f.sub}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Metal */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            <Label>Metal</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {METALS.map(m => (
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
                    {m.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Decoration */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            <Label>Süsleme</Label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {DECORATIONS.map(d => (
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
                    {d.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Varyasyon */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            <Label>Varyasyon</Label>
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
              ? "Üretiliyor..."
              : text.trim()
                ? `Üret · ${text.trim().toUpperCase()}`
                : "Üret"}
          </button>
        </div>

        {/* ── Right: Results ──────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {images.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.25em", color: "rgba(255,255,255,0.3)" }}>
                {images.length} sonuç
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
                  Tümünü İndir
                </button>
              )}
            </div>
          )}

          {/* Grid */}
          {images.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: images.length === 1 ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 12,
              }}
            >
              {images.map((src, i) => (
                <div
                  key={i}
                  onClick={() => setLightbox(i)}
                  style={{
                    borderRadius: 12,
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.07)",
                    cursor: "zoom-in",
                    background: "#111",
                    aspectRatio: "1",
                    position: "relative",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`${text} kolye varyasyon ${i + 1}`}
                    style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                  />
                  <div
                    style={{
                      position: "absolute", bottom: 8, right: 8,
                      background: "rgba(0,0,0,0.55)", borderRadius: 6,
                      padding: "4px 8px", fontSize: 9, color: "rgba(255,255,255,0.5)",
                      letterSpacing: "0.1em",
                    }}
                  >
                    #{i + 1}
                  </div>
                </div>
              ))}
            </div>
          ) : loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 16 }}>
              <Spinner />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em" }}>
                {count > 1 ? `${count} varyasyon üretiliyor...` : "Üretiliyor..."}
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 12 }}>
              <div style={{ fontSize: 48, opacity: 0.08 }}>✦</div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.15)", textAlign: "center", lineHeight: 1.7, maxWidth: 280 }}>
                Sol panelden{" "}
                {mode === "letter" ? "bir harf seçin" : "isim yazın"}
                ,<br />
                stil ve metal belirleyin, ardından Üret&apos;e basın.
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
              onClick={() => setLightbox(l => (l ?? 0) - 1)}
              style={{
                position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, color: "rgba(255,255,255,0.55)", fontSize: 18,
                padding: "10px 14px", cursor: "pointer",
              }}
            >
              ‹
            </button>
          )}
          {lightbox < images.length - 1 && (
            <button
              onClick={() => setLightbox(l => (l ?? 0) + 1)}
              style={{
                position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, color: "rgba(255,255,255,0.55)", fontSize: 18,
                padding: "10px 14px", cursor: "pointer",
              }}
            >
              ›
            </button>
          )}

          {/* Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[lightbox]}
            alt={`${text} kolye ${lightbox + 1}`}
            style={{ maxWidth: "85vw", maxHeight: "80vh", objectFit: "contain", borderRadius: 12 }}
          />

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button
              onClick={() => handleDownload(images[lightbox!], lightbox!)}
              style={{
                padding: "9px 20px", borderRadius: 9,
                fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em",
                background: "rgba(183,110,121,0.15)", border: `1px solid ${ACCENT}`,
                color: ACCENT, cursor: "pointer",
              }}
            >
              İndir
            </button>
            <button
              onClick={() => setLightbox(null)}
              style={{
                padding: "9px 20px", borderRadius: 9,
                fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.4)", cursor: "pointer",
              }}
            >
              Kapat
            </button>
          </div>

          {/* Counter */}
          <span style={{ marginTop: 10, fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>
            {lightbox + 1} / {images.length}
          </span>
        </div>
      )}
    </div>
  );
}
