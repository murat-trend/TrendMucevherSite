"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { OrderModal } from "./OrderModal";

type Firm = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  theme_color: string;
  plan: string;
  extra_languages: string[];
};

type Lang = "tr" | "en";

const TRANSLATIONS = {
  tr: {
    tagline: "Hayalinizdeki mücevheri tasarlayalım",
    placeholder: "Hayalinizdeki mücevheri söyleyin… Max 1 dakikada tasarlayalım",
    listening: "Dinliyorum…",
    generating: "Tasarlanıyor…",
    generateBtn: "Tasarla",
    retryBtn: "Yeniden Dene",
    tryOnBtn: "Üzerimde Gör",
    orderBtn: "Sipariş Başlat",
    poweredBy: "Powered by Remaura",
    langLabel: "Dil",
  },
  en: {
    tagline: "Let's design your dream jewelry",
    placeholder: "Describe your dream jewelry… We'll design it in 1 minute",
    listening: "Listening…",
    generating: "Designing…",
    generateBtn: "Design",
    retryBtn: "Try Again",
    tryOnBtn: "See On Me",
    orderBtn: "Start Order",
    poweredBy: "Powered by Remaura",
    langLabel: "Language",
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BeforeInstallPromptEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };

export function NextauraTablet({ firm, isEmbed = false }: { firm: Firm; isEmbed?: boolean }) {
  const accent = firm.theme_color;
  const [lang, setLang] = useState<Lang>("tr");

  // PWA: service worker kaydı + manifest enjeksiyonu
  useEffect(() => {
    // Manifest — firma teması ile dynamic
    const existing = document.querySelector('link[rel="manifest"]');
    if (!existing) {
      const link = document.createElement("link");
      link.rel = "manifest";
      link.href = `/api/nextaura/manifest?slug=${firm.slug ?? ""}`;
      document.head.appendChild(link);
    }

    // Service worker kaydı
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/nextaura-sw.js", { scope: "/nextaura/" });
    }
  }, [firm.slug]);

  // PWA: "Ana Ekrana Ekle" prompt'u
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setInstallPrompt(null);
  };
  const t = TRANSLATIONS[lang];

  const [prompt, setPrompt] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [optimizedPrompt, setOptimizedPrompt] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [showOrder, setShowOrder] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const availableLangs: Lang[] = ["tr", "en", ...((firm.extra_languages ?? []) as Lang[])];

  const handleMic = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type AnySR = new () => {
      lang: string; continuous: boolean; interimResults: boolean;
      start(): void; stop(): void;
      onresult: ((e: { results: { 0: { transcript: string } }[] }) => void) | null;
      onend: (() => void) | null;
      onerror: (() => void) | null;
    };
    const w = window as typeof window & { SpeechRecognition?: AnySR; webkitSpeechRecognition?: AnySR };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;

    if (!SR) {
      setError("Bu tarayıcı sesli girişi desteklemiyor.");
      return;
    }

    const rec = new SR();
    rec.lang = lang === "tr" ? "tr-TR" : "en-US";
    rec.continuous = false;
    rec.interimResults = false;

    rec.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript ?? "";
      setPrompt((p) => (p ? `${p} ${text}` : text));
    };
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);

    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  }, [isListening, lang]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setError(null);
    setImages([]);
    setSelectedImage(null);

    try {
      const res = await fetch("/api/nextaura/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, firmId: firm.id, lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Tasarım oluşturulamadı.");
      setImages(data.images ?? []);
      setOptimizedPrompt(data.optimizedPrompt ?? prompt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bağlantı hatası.");
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, isGenerating, firm.id, lang]);

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#0a0a0a",
      color: "white",
      display: "flex",
      flexDirection: "column",
      fontFamily: "system-ui, sans-serif",
      userSelect: "none",
    }}>

      {/* Header */}
      <div style={{
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {firm.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={firm.logo_url} alt={firm.name} style={{ height: 36, objectFit: "contain" }} />
          ) : (
            <span style={{ fontSize: 18, fontWeight: 700, color: accent }}>{firm.name}</span>
          )}
        </div>

        {/* Embed modunda "Kapat" butonu — parent iframe'e mesaj gönder */}
        {isEmbed && (
          <button
            type="button"
            onClick={() => window.parent.postMessage({ type: "nextaura:close" }, "*")}
            style={{
              padding: "7px 14px",
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "transparent",
              color: "rgba(255,255,255,0.5)",
              cursor: "pointer",
            }}
          >
            ✕ Kapat
          </button>
        )}

        {/* PWA Kur butonu — sadece standalone modda */}
        {!isEmbed && installPrompt && !installed && (
          <button
            type="button"
            onClick={() => void handleInstall()}
            style={{
              padding: "7px 14px",
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              border: `1px solid ${accent}`,
              background: `${accent}22`,
              color: accent,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            ⬇ Uygulamayı Kur
          </button>
        )}

        {/* Dil seçici */}
        <div style={{ display: "flex", gap: 6 }}>
          {availableLangs.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                border: `1px solid ${lang === l ? accent : "rgba(255,255,255,0.15)"}`,
                background: lang === l ? `${accent}22` : "transparent",
                color: lang === l ? accent : "rgba(255,255,255,0.4)",
                cursor: "pointer",
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Ana alan */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 24px 24px", gap: 32 }}>

        {/* Başlık */}
        <div style={{ textAlign: "center" }}>
          <h1 style={{
            fontSize: "clamp(24px, 5vw, 42px)",
            fontWeight: 700,
            margin: 0,
            lineHeight: 1.2,
            background: `linear-gradient(135deg, #fff 60%, ${accent})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            {t.tagline}
          </h1>
        </div>

        {/* Giriş alanı */}
        <div style={{ width: "100%", maxWidth: 680, position: "relative" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${isListening ? accent : "rgba(255,255,255,0.12)"}`,
            borderRadius: 60,
            padding: "14px 16px 14px 24px",
            transition: "border-color 0.2s",
            boxShadow: isListening ? `0 0 20px ${accent}44` : "none",
          }}>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleGenerate(); }}
              placeholder={isListening ? t.listening : t.placeholder}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                outline: "none",
                fontSize: 15,
                color: "white",
              }}
            />
            {/* Mikrofon */}
            <button
              type="button"
              onClick={handleMic}
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                border: "none",
                background: isListening ? accent : `${accent}33`,
                color: isListening ? "white" : accent,
                fontSize: 20,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.2s",
                boxShadow: isListening ? `0 0 16px ${accent}88` : "none",
              }}
            >
              🎤
            </button>
          </div>
        </div>

        {/* Üret butonu */}
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={!prompt.trim() || isGenerating}
          style={{
            padding: "16px 48px",
            borderRadius: 60,
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            border: `1px solid ${accent}`,
            background: `${accent}22`,
            color: accent,
            cursor: (!prompt.trim() || isGenerating) ? "not-allowed" : "pointer",
            opacity: (!prompt.trim() || isGenerating) ? 0.5 : 1,
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {isGenerating && (
            <span style={{
              width: 18, height: 18, borderRadius: "50%",
              border: `2px solid ${accent}44`,
              borderTopColor: accent,
              animation: "spin 0.7s linear infinite",
              display: "inline-block",
            }} />
          )}
          {isGenerating ? t.generating : t.generateBtn}
        </button>

        {/* Hata */}
        {error && (
          <p style={{ fontSize: 13, color: "#f87171", textAlign: "center" }}>{error}</p>
        )}

        {/* Görseller */}
        {images.length > 0 && (
          <div style={{ width: "100%", maxWidth: 800 }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
              {images.map((src, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedImage(src)}
                  style={{
                    width: 200,
                    height: 200,
                    borderRadius: 16,
                    overflow: "hidden",
                    border: `2px solid ${selectedImage === src ? accent : "rgba(255,255,255,0.08)"}`,
                    cursor: "pointer",
                    transition: "border-color 0.2s",
                    boxShadow: selectedImage === src ? `0 0 20px ${accent}44` : "none",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Tasarım ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
            </div>

            {/* Seçili görsel aksiyonları */}
            {selectedImage && (
              <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => void handleGenerate()}
                  style={btnStyle("rgba(255,255,255,0.08)", "rgba(255,255,255,0.5)")}
                >
                  {t.retryBtn}
                </button>
                <button
                  type="button"
                  style={btnStyle(`${accent}22`, accent)}
                >
                  {t.tryOnBtn}
                </button>
                <button
                  type="button"
                  onClick={() => setShowOrder(true)}
                  style={btnStyle(`${accent}`, "white")}
                >
                  {t.orderBtn}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sipariş Modal */}
      {showOrder && selectedImage && (
        <OrderModal
          firm={firm}
          selectedImage={selectedImage}
          optimizedPrompt={optimizedPrompt}
          lang={lang}
          onClose={() => setShowOrder(false)}
          onSuccess={() => {
            setShowOrder(false);
            setImages([]);
            setSelectedImage(null);
            setPrompt("");
          }}
        />
      )}

      {/* Footer */}
      <div style={{ padding: "12px 24px", textAlign: "center" }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "0.2em" }}>
          {t.poweredBy}
        </span>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function btnStyle(bg: string, color: string): React.CSSProperties {
  return {
    padding: "12px 28px",
    borderRadius: 40,
    fontSize: 13,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    border: `1px solid ${color}44`,
    background: bg,
    color,
    cursor: "pointer",
  };
}
