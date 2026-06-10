"use client";

import { useState } from "react";

type Props = {
  firm: { id: string; name: string; theme_color: string };
  selectedImage: string;
  optimizedPrompt?: string;
  lang: "tr" | "en";
  onClose: () => void;
  onSuccess: (sessionId: string) => void;
};

const T = {
  tr: {
    title: "Sipariş Başlat",
    name: "Adınız",
    namePh: "Ad Soyad",
    phone: "Telefon",
    phonePh: "05XX XXX XX XX",
    notes: "Kuyumcuya Not",
    notesPh: "Özel istek, ölçü, renk tercihi…",
    deposit: "Kapora Tutarı (₺)",
    depositPh: "Ör: 500",
    confirm: "Siparişi Onayla",
    cancel: "İptal",
    sending: "Gönderiliyor…",
    success: "Siparişiniz alındı! Kuyumcu sizinle iletişime geçecek.",
    errorName: "Ad zorunlu",
  },
  en: {
    title: "Start Order",
    name: "Your Name",
    namePh: "Full Name",
    phone: "Phone",
    phonePh: "+90 5XX XXX XX XX",
    notes: "Note to Jeweler",
    notesPh: "Special request, size, color preference…",
    deposit: "Deposit Amount (₺)",
    depositPh: "e.g. 500",
    confirm: "Confirm Order",
    cancel: "Cancel",
    sending: "Sending…",
    success: "Order received! The jeweler will contact you.",
    errorName: "Name is required",
  },
};

export function OrderModal({ firm, selectedImage, optimizedPrompt, lang, onClose, onSuccess }: Props) {
  const t = T[lang];
  const accent = firm.theme_color;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [deposit, setDeposit] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) { setError(t.errorName); return; }
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/nextaura/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firmId: firm.id,
          customerName: name.trim(),
          customerPhone: phone.trim() || null,
          notes: notes.trim() || null,
          depositAmount: deposit ? Number(deposit) : null,
          designImage: selectedImage,
          optimizedPrompt,
        }),
      });
      const data = await res.json() as { ok?: boolean; sessionId?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Hata");
      setDone(true);
      setTimeout(() => onSuccess(data.sessionId ?? ""), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bağlantı hatası");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: "100%", maxWidth: 520,
        background: "#111", borderRadius: "20px 20px 0 0",
        padding: "28px 24px 40px",
        display: "flex", flexDirection: "column", gap: 18,
        animation: "slideUp 0.25s ease",
      }}>
        {/* Başlık */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "white" }}>{t.title}</h2>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        {/* Tasarım önizleme */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={selectedImage} alt="Seçilen tasarım" style={{ width: 80, height: 80, borderRadius: 12, objectFit: "cover", border: `2px solid ${accent}` }} />

        {done ? (
          <p style={{ color: "#4ade80", fontSize: 14, textAlign: "center", padding: "16px 0" }}>{t.success}</p>
        ) : (
          <>
            {/* Form */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                placeholder={`${t.name} *`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
              />
              <input
                placeholder={t.phone}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                style={inputStyle}
              />
              <textarea
                placeholder={t.notes}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
              />
              <input
                placeholder={t.deposit}
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
                type="number"
                min={0}
                style={inputStyle}
              />
            </div>

            {error && <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>{error}</p>}

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={busy}
                style={{
                  flex: 1, padding: "14px",
                  borderRadius: 40, border: `1px solid ${accent}`,
                  background: accent, color: "white",
                  fontSize: 14, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer",
                  opacity: busy ? 0.7 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                {busy && <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />}
                {busy ? t.sending : t.confirm}
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "14px 20px", borderRadius: 40,
                  border: "1px solid rgba(255,255,255,0.15)", background: "transparent",
                  color: "rgba(255,255,255,0.5)", fontSize: 14, cursor: "pointer",
                }}
              >
                {t.cancel}
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  padding: "12px 16px",
  fontSize: 14,
  color: "white",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
