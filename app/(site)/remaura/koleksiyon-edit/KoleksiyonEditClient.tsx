"use client";

import { useCallback, useRef, useState } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const TAKI_TIPI = ["Yüzük", "Kolye", "Küpe", "Bileklik", "Broş"] as const;
type TakiTipi = (typeof TAKI_TIPI)[number];

const FORM_KARAKTERLERI = [
  "İnce & Zarif",
  "Geometrik",
  "Organik",
  "Filigran",
  "Kabartmalı",
  "Asimetrik",
] as const;
type FormKarakteri = (typeof FORM_KARAKTERLERI)[number];

const METAL_RENGI = [
  { label: "Sarı Altın", hex: "#D4AF37" },
  { label: "Rose Gold", hex: "#B76E79" },
  { label: "Beyaz Altın", hex: "#E0E0E0" },
  { label: "Gümüş", hex: "#C0C0C0" },
  { label: "Oksitlenmiş Gümüş", hex: "#707070" },
] as const;
type MetalRengi = (typeof METAL_RENGI)[number]["label"];

const ACCENT = "#b76e79";
const ACCENT_LIGHT = "#c4838b";

// ─── Types ────────────────────────────────────────────────────────────────────

type LoadState =
  | { kind: "idle" }
  | { kind: "generating" }
  | { kind: "op"; index: number; label: string }
  | { kind: "saving"; index: number };

type Modal =
  | { type: "replace"; index: number; searchPrompt: string; replacePrompt: string }
  | { type: "recolor"; index: number; selectPrompt: string; colorPrompt: string };

// ─── Reusable UI pieces ───────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.35em",
        color: "rgba(255,255,255,0.35)",
      }}
    >
      {children}
    </span>
  );
}

function FieldInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 13,
        color: "white",
        outline: "none",
        width: "100%",
        ...(props.style ?? {}),
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "rgba(183,110,121,0.5)";
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
        props.onBlur?.(e);
      }}
    />
  );
}

function FieldTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 13,
        color: "white",
        outline: "none",
        width: "100%",
        resize: "none",
        lineHeight: 1.6,
        ...(props.style ?? {}),
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "rgba(183,110,121,0.5)";
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
        props.onBlur?.(e);
      }}
    />
  );
}

function ChipBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 10px",
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        border: "1px solid",
        cursor: "pointer",
        transition: "all 0.15s",
        background: active ? "rgba(183,110,121,0.16)" : "rgba(255,255,255,0.03)",
        borderColor: active ? ACCENT : "rgba(255,255,255,0.08)",
        color: active ? ACCENT_LIGHT : "rgba(255,255,255,0.4)",
      }}
    >
      {children}
    </button>
  );
}

function ActionBtn({
  onClick,
  disabled,
  accent,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "4px 8px",
        borderRadius: 5,
        fontSize: 9,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        border: "1px solid",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "all 0.15s",
        whiteSpace: "nowrap",
        background: accent ? "rgba(183,110,121,0.18)" : "rgba(255,255,255,0.04)",
        borderColor: accent ? ACCENT : "rgba(255,255,255,0.1)",
        color: accent ? ACCENT_LIGHT : "rgba(255,255,255,0.5)",
      }}
    >
      {children}
    </button>
  );
}

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid ${ACCENT}`,
        borderTopColor: "transparent",
        animation: "spin 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

function GridSkeleton() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 768 }}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              aspectRatio: "1",
              borderRadius: 12,
              background: "rgba(255,255,255,0.05)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
          <div
            style={{
              height: 24,
              borderRadius: 6,
              background: "rgba(255,255,255,0.03)",
              animation: "pulse 1.5s ease-in-out infinite",
              animationDelay: `${i * 0.1}s`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function KoleksiyonEditClient() {
  // Form
  const [koleksiyonAdi, setKoleksiyonAdi] = useState("");
  const [takiTipi, setTakiTipi] = useState<TakiTipi>("Yüzük");
  const [tema, setTema] = useState("");
  const [formKarakterleri, setFormKarakterleri] = useState<FormKarakteri[]>([]);
  const [metalRengi, setMetalRengi] = useState<MetalRengi>("Sarı Altın");
  const [refBase64, setRefBase64] = useState<string | null>(null);
  const [refName, setRefName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Results
  const [images, setImages] = useState<string[]>([]);
  const [load, setLoad] = useState<LoadState>({ kind: "idle" });
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Modal
  const [modal, setModal] = useState<Modal | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const isOpBusy = (index: number) =>
    (load.kind === "op" && load.index === index) ||
    (load.kind === "saving" && load.index === index);

  const toggleForm = (k: FormKarakteri) =>
    setFormKarakterleri((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  const handleFileChange = useCallback(async (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setRefBase64(reader.result as string);
      setRefName(file.name);
    };
    reader.readAsDataURL(file);
  }, []);

  // ─── Generate ───────────────────────────────────────────────────────────────

  async function handleUret() {
    if (!tema.trim()) { setError("Tema / açıklama boş bırakılamaz."); return; }
    setError(null);
    setLoad({ kind: "generating" });
    setImages([]);
    setSaved(new Set());
    try {
      const res = await fetch("/api/remaura/koleksiyon-edit/uret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ takiTipi, tema, formKarakterleri, metalRengi, referansGorsel: refBase64 }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Üretim başarısız."); return; }
      setImages(data.images ?? []);
    } catch { setError("Bağlantı hatası."); }
    finally { setLoad({ kind: "idle" }); }
  }

  // ─── Stability helper ────────────────────────────────────────────────────────

  async function callStability(
    index: number,
    payload: Record<string, unknown>,
    label: string
  ): Promise<string | null> {
    setLoad({ kind: "op", index, label });
    try {
      const res = await fetch("/api/remaura/koleksiyon-edit/stability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: images[index], ...payload }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "İşlem başarısız."); return null; }
      return data.image ?? null;
    } catch { setError("Bağlantı hatası."); return null; }
    finally { setLoad({ kind: "idle" }); }
  }

  function replaceImg(index: number, src: string) {
    setImages((prev) => { const n = [...prev]; n[index] = src; return n; });
  }

  // ─── Per-image actions ───────────────────────────────────────────────────────

  async function handleRemoveBg(index: number) {
    const result = await callStability(index, { action: "remove-background" }, "BG kaldırılıyor");
    if (result) replaceImg(index, result);
  }

  async function handleUpscale(index: number) {
    const result = await callStability(index, { action: "upscale" }, "Upscale");
    if (result) replaceImg(index, result);
  }

  async function handleModalSubmit() {
    if (!modal) return;
    setModalLoading(true);
    try {
      let result: string | null = null;
      if (modal.type === "replace") {
        result = await callStability(
          modal.index,
          { action: "search-replace", searchPrompt: modal.searchPrompt, replacePrompt: modal.replacePrompt },
          "Değiştiriliyor"
        );
      } else {
        result = await callStability(
          modal.index,
          { action: "recolor", selectPrompt: modal.selectPrompt, colorPrompt: modal.colorPrompt },
          "Renklendiriliyor"
        );
      }
      if (result) replaceImg(modal.index, result);
      setModal(null);
    } finally { setModalLoading(false); }
  }

  async function handleSave(index: number) {
    setLoad({ kind: "saving", index });
    try {
      const res = await fetch("/api/remaura/koleksiyon-edit/kaydet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gorselUrl: images[index], koleksiyonAdi, tip: takiTipi, tema, metal: metalRengi }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Kayıt başarısız."); return; }
      setSaved((p) => new Set([...p, index]));
    } catch { setError("Bağlantı hatası."); }
    finally { setLoad({ kind: "idle" }); }
  }

  // ─── Drag-drop ───────────────────────────────────────────────────────────────

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith("image/")) handleFileChange(file);
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "white", display: "flex", flexDirection: "column", fontFamily: "var(--font-display, sans-serif)" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        ::placeholder { color: rgba(255,255,255,0.18); }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "14px 28px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4em", color: ACCENT }}>Remaura</span>
        <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
        <span style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.3em", color: "rgba(255,255,255,0.35)" }}>Koleksiyon Edit</span>
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* ── Left panel ─────────────────────────────────────────────────── */}
        <div style={{ width: 340, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.06)", overflowY: "auto" }}>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Referans görsel */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>Referans Görsel <span style={{ textTransform: "none", letterSpacing: "normal", fontWeight: 400, color: "rgba(255,255,255,0.2)" }}>(opsiyonel)</span></Label>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: "1px dashed rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  cursor: "pointer",
                  overflow: "hidden",
                  minHeight: 80,
                  display: "flex",
                  alignItems: "center",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(183,110,121,0.4)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
              >
                {refBase64 ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, width: "100%" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={refBase64} alt="ref" style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{refName}</p>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setRefBase64(null); setRefName(""); if (fileRef.current) fileRef.current.value = ""; }}
                        style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer", marginTop: 4, padding: 0 }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
                      >
                        Kaldır
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0", gap: 6 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.2em" }}>Sürükle veya tıkla</span>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChange(f); }} />
            </div>

            {/* Koleksiyon adı */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>Koleksiyon Adı</Label>
              <FieldInput
                value={koleksiyonAdi}
                onChange={(e) => setKoleksiyonAdi(e.target.value)}
                placeholder="Opsiyonel"
              />
            </div>

            {/* Takı tipi */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>Takı Tipi</Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {TAKI_TIPI.map((t) => (
                  <ChipBtn key={t} active={takiTipi === t} onClick={() => setTakiTipi(t)}>{t}</ChipBtn>
                ))}
              </div>
            </div>

            {/* Tema */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>Tema / Açıklama</Label>
              <FieldTextarea
                rows={4}
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                placeholder={"Türkçe yaz.\n\nÖrn: lotus çiçeği, ince kol, boş yuva, kadın yüzüğü"}
              />
            </div>

            {/* Form karakteri */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>Form Karakteri <span style={{ textTransform: "none", letterSpacing: "normal", fontWeight: 400, color: "rgba(255,255,255,0.2)" }}>(çoklu)</span></Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {FORM_KARAKTERLERI.map((k) => (
                  <ChipBtn key={k} active={formKarakterleri.includes(k)} onClick={() => toggleForm(k)}>{k}</ChipBtn>
                ))}
              </div>
            </div>

            {/* Metal rengi */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>Metal Rengi</Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {METAL_RENGI.map(({ label, hex }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setMetalRengi(label)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "5px 10px", borderRadius: 6,
                      fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em",
                      border: "1px solid", cursor: "pointer", transition: "all 0.15s",
                      background: metalRengi === label ? "rgba(183,110,121,0.16)" : "rgba(255,255,255,0.03)",
                      borderColor: metalRengi === label ? ACCENT : "rgba(255,255,255,0.08)",
                      color: metalRengi === label ? ACCENT_LIGHT : "rgba(255,255,255,0.4)",
                    }}
                  >
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: hex, border: "1px solid rgba(255,255,255,0.2)", flexShrink: 0 }} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ fontSize: 11, color: "rgba(248,113,113,0.85)", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "8px 12px" }}>
                {error}
              </div>
            )}

            {/* Üret */}
            <button
              type="button"
              onClick={handleUret}
              disabled={load.kind === "generating"}
              style={{
                width: "100%", padding: "12px 0", borderRadius: 12,
                fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3em",
                border: `1px solid ${ACCENT}`, cursor: load.kind === "generating" ? "not-allowed" : "pointer",
                opacity: load.kind === "generating" ? 0.6 : 1,
                transition: "all 0.15s",
                background: "rgba(183,110,121,0.14)", color: ACCENT_LIGHT,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {load.kind === "generating" && <Spinner />}
              {load.kind === "generating" ? "Üretiliyor…" : "Görsel Üret"}
            </button>

          </div>
        </div>

        {/* ── Right panel ────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>

          {load.kind === "generating" && <GridSkeleton />}

          {load.kind !== "generating" && images.length === 0 && (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.35em", color: "rgba(255,255,255,0.1)" }}>
                Görseller burada görünecek
              </p>
            </div>
          )}

          {images.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 768 }}>
              {images.map((src, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>

                  {/* Image */}
                  <div style={{ position: "relative", aspectRatio: "1", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)", background: "#000" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Konsept ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />

                    {/* Op loading overlay */}
                    {isOpBusy(i) && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                        <Spinner size={24} />
                        <span style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: "0.25em", color: "rgba(255,255,255,0.4)" }}>
                          {load.kind === "op" ? load.label : "Kaydediliyor"}
                        </span>
                      </div>
                    )}

                    {/* Badges */}
                    <div style={{ position: "absolute", top: 8, left: 8, fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(0,0,0,0.55)", color: "rgba(255,255,255,0.4)" }}>
                      {i + 1} / 4
                    </div>
                    {saved.has(i) && (
                      <div style={{ position: "absolute", top: 8, right: 8, fontSize: 8, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(183,110,121,0.85)", color: "white", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        Kaydedildi
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    <ActionBtn onClick={() => handleRemoveBg(i)} disabled={isOpBusy(i)}>Remove BG</ActionBtn>
                    <ActionBtn onClick={() => handleUpscale(i)} disabled={isOpBusy(i)}>Upscale</ActionBtn>
                    <ActionBtn
                      onClick={() => setModal({ type: "recolor", index: i, selectPrompt: "", colorPrompt: "" })}
                      disabled={isOpBusy(i)}
                    >
                      Recolor
                    </ActionBtn>
                    <ActionBtn
                      onClick={() => setModal({ type: "replace", index: i, searchPrompt: "", replacePrompt: "" })}
                      disabled={isOpBusy(i)}
                    >
                      Değiştir
                    </ActionBtn>
                    <ActionBtn onClick={() => handleSave(i)} disabled={isOpBusy(i)} accent>
                      {saved.has(i) ? "Tekrar Kaydet" : "Kaydet"}
                    </ActionBtn>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal ────────────────────────────────────────────────────────── */}
      {modal && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => !modalLoading && setModal(null)}
        >
          <div
            style={{ width: 320, borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)", background: "#111", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Title */}
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3em", color: ACCENT_LIGHT }}>
              {modal.type === "replace" ? "Ara & Değiştir" : "Renklendirme"}
            </p>

            {/* Replace inputs */}
            {modal.type === "replace" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <Label>Ne arıyorsun?</Label>
                  <FieldInput
                    value={modal.searchPrompt}
                    onChange={(e) => setModal({ ...modal, searchPrompt: e.target.value })}
                    placeholder="örn. the ring band"
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <Label>Ne olsun?</Label>
                  <FieldInput
                    value={modal.replacePrompt}
                    onChange={(e) => setModal({ ...modal, replacePrompt: e.target.value })}
                    placeholder="örn. twisted rope pattern"
                  />
                </div>
              </div>
            )}

            {/* Recolor inputs */}
            {modal.type === "recolor" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <Label>Neyi?</Label>
                  <FieldInput
                    value={modal.selectPrompt}
                    onChange={(e) => setModal({ ...modal, selectPrompt: e.target.value })}
                    placeholder="örn. the ring"
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <Label>Hangi renk / metal?</Label>
                  <FieldInput
                    value={modal.colorPrompt}
                    onChange={(e) => setModal({ ...modal, colorPrompt: e.target.value })}
                    placeholder="örn. rose gold metal"
                  />
                </div>
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
              <button
                type="button"
                onClick={() => setModal(null)}
                disabled={modalLoading}
                style={{ flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", background: "none", cursor: "pointer", opacity: modalLoading ? 0.4 : 1 }}
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleModalSubmit}
                disabled={modalLoading}
                style={{ flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", border: `1px solid ${ACCENT}`, background: "rgba(183,110,121,0.18)", color: ACCENT_LIGHT, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: modalLoading ? 0.7 : 1 }}
              >
                {modalLoading && <Spinner size={12} />}
                {modalLoading ? "İşleniyor…" : "Uygula"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
