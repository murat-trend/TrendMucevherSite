"use client";

import { useRef, useState } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const TAKI_TIPI = ["Yüzük", "Kolye", "Küpe", "Bileklik", "Broş"] as const;
type TakiTipi = (typeof TAKI_TIPI)[number];

const FORM_KARAKTERLERI = [
  "İnce & Zarif",
  "Geometrik",
  "Organik",
  "Filigran",
  "Kabartmalı",
] as const;
type FormKarakteri = (typeof FORM_KARAKTERLERI)[number];

const METAL_RENGI = [
  { label: "Sarı Altın", color: "#D4AF37" },
  { label: "Rose Gold", color: "#B76E79" },
  { label: "Beyaz Altın", color: "#D8D8D8" },
  { label: "Gümüş", color: "#C0C0C0" },
] as const;
type MetalRengi = (typeof METAL_RENGI)[number]["label"];

// ─── Types ────────────────────────────────────────────────────────────────────

type PopupState =
  | { type: "replace"; index: number; searchPrompt: string; replacePrompt: string }
  | { type: "recolor"; index: number; selectPrompt: string; newColor: string }
  | { type: "upscale"; index: number; mode: "conservative" | "creative" }
  | { type: "style"; index: number; stylePrompt: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result as string);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SmallBtn({
  children,
  onClick,
  loading,
  accent,
}: {
  children: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="px-2 py-1 rounded text-[9px] font-bold uppercase tracking-[0.1em] border transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
      style={
        accent
          ? {
              backgroundColor: "rgba(183,110,121,0.18)",
              borderColor: "#b76e79",
              color: "#c4838b",
            }
          : {
              backgroundColor: "rgba(255,255,255,0.04)",
              borderColor: "rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.5)",
            }
      }
    >
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <div
      className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
      style={{ borderColor: "#b76e79", borderTopColor: "transparent" }}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function KoleksiyonEditClient() {
  // Form state
  const [koleksiyonAdi, setKoleksiyonAdi] = useState("");
  const [takiTipi, setTakiTipi] = useState<TakiTipi>("Yüzük");
  const [tema, setTema] = useState("");
  const [formKarakterleri, setFormKarakterleri] = useState<FormKarakteri[]>([]);
  const [metalRengi, setMetalRengi] = useState<MetalRengi>("Sarı Altın");
  const [referansGorsel, setReferansGorsel] = useState<string | null>(null);
  const [referansName, setReferansName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Result state
  const [images, setImages] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [opLoading, setOpLoading] = useState<number | null>(null);
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Popup state
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [popupLoading, setPopupLoading] = useState(false);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function toggleForm(k: FormKarakteri) {
    setFormKarakterleri((p) =>
      p.includes(k) ? p.filter((x) => x !== k) : [...p, k]
    );
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    setReferansGorsel(b64);
    setReferansName(file.name);
  }

  async function handleUret() {
    if (!tema.trim()) {
      setError("Tema / açıklama boş bırakılamaz.");
      return;
    }
    setError(null);
    setGenerating(true);
    setImages([]);
    setSaved(new Set());
    try {
      const res = await fetch("/api/remaura/koleksiyon-edit/uret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          koleksiyonAdi,
          takiTipi,
          tema,
          formKarakterleri,
          metalRengi,
          referansGorsel,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Üretim başarısız.");
        return;
      }
      setImages(data.images ?? []);
    } catch {
      setError("Bağlantı hatası.");
    } finally {
      setGenerating(false);
    }
  }

  async function callStability(
    index: number,
    payload: Record<string, unknown>
  ): Promise<string | null> {
    setOpLoading(index);
    try {
      const res = await fetch("/api/remaura/koleksiyon-edit/stability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: images[index], ...payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "İşlem başarısız.");
        return null;
      }
      return data.image ?? null;
    } catch {
      setError("Bağlantı hatası.");
      return null;
    } finally {
      setOpLoading(null);
    }
  }

  function replaceImage(index: number, newSrc: string) {
    setImages((prev) => {
      const next = [...prev];
      next[index] = newSrc;
      return next;
    });
  }

  async function handleRemoveBg(index: number) {
    const result = await callStability(index, { operation: "remove-bg" });
    if (result) replaceImage(index, result);
  }

  async function handleSave(index: number) {
    setOpLoading(index);
    try {
      const res = await fetch("/api/remaura/koleksiyon-edit/kaydet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          koleksiyonAdi,
          gorselUrl: images[index],
          tip: takiTipi,
          tema,
          metal: metalRengi,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Kayıt başarısız.");
        return;
      }
      setSaved((p) => new Set([...p, index]));
    } catch {
      setError("Bağlantı hatası.");
    } finally {
      setOpLoading(null);
    }
  }

  async function handlePopupSubmit() {
    if (!popup) return;
    setPopupLoading(true);
    try {
      let result: string | null = null;

      if (popup.type === "replace") {
        result = await callStability(popup.index, {
          operation: "search-replace",
          searchPrompt: popup.searchPrompt,
          replacePrompt: popup.replacePrompt,
        });
      } else if (popup.type === "recolor") {
        result = await callStability(popup.index, {
          operation: "search-recolor",
          selectPrompt: popup.selectPrompt,
          newColor: popup.newColor,
        });
      } else if (popup.type === "upscale") {
        result = await callStability(popup.index, {
          operation: "upscale",
          upscaleMode: popup.mode,
        });
      } else if (popup.type === "style") {
        if (!referansGorsel) {
          setError("Stil transferi için önce referans görsel yükleyin.");
          return;
        }
        result = await callStability(popup.index, {
          operation: "style-transfer",
          referenceBase64: referansGorsel,
          stylePrompt: popup.stylePrompt,
        });
      }

      if (result) replaceImage(popup.index, result);
      setPopup(null);
    } finally {
      setPopupLoading(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  const accent = "#b76e79";
  const accentLight = "#c4838b";

  return (
    <div className="min-h-screen bg-[#080808] text-white font-display flex flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-white/[0.06] px-8 py-4 flex items-center gap-3">
        <span
          className="text-[10px] font-bold uppercase tracking-[0.4em]"
          style={{ color: accent }}
        >
          Remaura
        </span>
        <span className="text-white/20 text-xs">/</span>
        <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/40">
          Koleksiyon Edit
        </span>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* ─── Left panel ─────────────────────────────────────────────────────── */}
        <div className="w-[340px] shrink-0 border-r border-white/[0.06] overflow-y-auto">
          <div className="p-5 flex flex-col gap-5">

            {/* Referans görsel */}
            <div className="flex flex-col gap-2">
              <label className="field-label">Referans Görsel <span className="text-white/20 normal-case tracking-normal font-normal">(opsiyonel)</span></label>
              <div
                className="relative border border-dashed border-white/10 rounded-xl overflow-hidden cursor-pointer hover:border-[#b76e79]/40 transition-colors"
                style={{ minHeight: 88 }}
                onClick={() => fileRef.current?.click()}
              >
                {referansGorsel ? (
                  <div className="flex items-center gap-3 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={referansGorsel}
                      alt="ref"
                      className="w-14 h-14 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-white/60 truncate">{referansName}</p>
                      <button
                        className="text-[9px] text-white/30 hover:text-white/60 mt-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReferansGorsel(null);
                          setReferansName("");
                          if (fileRef.current) fileRef.current.value = "";
                        }}
                      >
                        Kaldır
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 gap-1">
                    <svg className="w-5 h-5 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[9px] text-white/25 uppercase tracking-[0.2em]">Görsel yükle</span>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Koleksiyon adı */}
            <div className="flex flex-col gap-1.5">
              <label className="field-label">Koleksiyon Adı</label>
              <input
                type="text"
                value={koleksiyonAdi}
                onChange={(e) => setKoleksiyonAdi(e.target.value)}
                placeholder="Opsiyonel"
                className="field-input"
              />
            </div>

            {/* Takı tipi */}
            <div className="flex flex-col gap-1.5">
              <label className="field-label">Takı Tipi</label>
              <div className="flex flex-wrap gap-1.5">
                {TAKI_TIPI.map((t) => (
                  <ChoiceBtn
                    key={t}
                    active={takiTipi === t}
                    onClick={() => setTakiTipi(t)}
                  >
                    {t}
                  </ChoiceBtn>
                ))}
              </div>
            </div>

            {/* Tema */}
            <div className="flex flex-col gap-1.5">
              <label className="field-label">Tema / Açıklama</label>
              <textarea
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                rows={4}
                placeholder={"Türkçe yaz.\n\nÖrn: lotus çiçeği, ince kol, boş yuva, kadın yüzüğü"}
                className="field-input resize-none leading-relaxed"
              />
            </div>

            {/* Form karakteri */}
            <div className="flex flex-col gap-1.5">
              <label className="field-label">
                Form Karakteri{" "}
                <span className="text-white/20 normal-case tracking-normal font-normal">(çoklu)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {FORM_KARAKTERLERI.map((k) => (
                  <ChoiceBtn
                    key={k}
                    active={formKarakterleri.includes(k)}
                    onClick={() => toggleForm(k)}
                  >
                    {k}
                  </ChoiceBtn>
                ))}
              </div>
            </div>

            {/* Metal rengi */}
            <div className="flex flex-col gap-1.5">
              <label className="field-label">Metal Rengi</label>
              <div className="flex flex-wrap gap-1.5">
                {METAL_RENGI.map(({ label, color }) => (
                  <button
                    key={label}
                    onClick={() => setMetalRengi(label)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-[0.1em] border transition-all"
                    style={
                      metalRengi === label
                        ? {
                            backgroundColor: "rgba(183,110,121,0.15)",
                            borderColor: accent,
                            color: accentLight,
                          }
                        : {
                            backgroundColor: "rgba(255,255,255,0.03)",
                            borderColor: "rgba(255,255,255,0.08)",
                            color: "rgba(255,255,255,0.45)",
                          }
                    }
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-[11px] text-red-400/80 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Üret */}
            <button
              onClick={handleUret}
              disabled={generating}
              className="w-full py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.3em] border transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                backgroundColor: generating
                  ? "rgba(183,110,121,0.07)"
                  : "rgba(183,110,121,0.14)",
                borderColor: accent,
                color: accentLight,
              }}
            >
              {generating && <Spinner />}
              {generating ? "Üretiliyor…" : "Üret"}
            </button>
          </div>
        </div>

        {/* ─── Right panel ────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5">
          {generating && images.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Spinner />
                <p className="text-[9px] uppercase tracking-[0.35em] text-white/25">
                  4 görsel üretiliyor
                </p>
              </div>
            </div>
          )}

          {!generating && images.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <p className="text-[9px] uppercase tracking-[0.3em] text-white/12">
                Görseller burada görünecek
              </p>
            </div>
          )}

          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-4 max-w-3xl">
              {images.map((src, i) => (
                <div key={i} className="flex flex-col gap-2">
                  {/* Image card */}
                  <div className="relative aspect-square rounded-xl overflow-hidden border border-white/[0.06] bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`Konsept ${i + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {/* Loading overlay */}
                    {opLoading === i && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                          <Spinner />
                          <span className="text-[8px] uppercase tracking-[0.2em] text-white/40">
                            İşleniyor…
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Saved badge */}
                    {saved.has(i) && (
                      <div
                        className="absolute top-2 right-2 text-[8px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded-md"
                        style={{ backgroundColor: "rgba(183,110,121,0.85)", color: "white" }}
                      >
                        Kaydedildi
                      </div>
                    )}

                    {/* Index badge */}
                    <div
                      className="absolute top-2 left-2 text-[8px] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: "rgba(0,0,0,0.55)",
                        color: "rgba(255,255,255,0.4)",
                      }}
                    >
                      {i + 1} / 4
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    <SmallBtn
                      onClick={() => handleRemoveBg(i)}
                      loading={opLoading === i}
                    >
                      BG Kaldır
                    </SmallBtn>

                    <SmallBtn
                      onClick={() =>
                        setPopup({ type: "upscale", index: i, mode: "conservative" })
                      }
                      loading={opLoading === i}
                    >
                      Upscale
                    </SmallBtn>

                    <SmallBtn
                      onClick={() =>
                        setPopup({ type: "recolor", index: i, selectPrompt: "", newColor: "" })
                      }
                      loading={opLoading === i}
                    >
                      Recolor
                    </SmallBtn>

                    <SmallBtn
                      onClick={() =>
                        setPopup({
                          type: "replace",
                          index: i,
                          searchPrompt: "",
                          replacePrompt: "",
                        })
                      }
                      loading={opLoading === i}
                    >
                      Değiştir
                    </SmallBtn>

                    {referansGorsel && (
                      <SmallBtn
                        onClick={() =>
                          setPopup({ type: "style", index: i, stylePrompt: "" })
                        }
                        loading={opLoading === i}
                      >
                        Stil Al
                      </SmallBtn>
                    )}

                    <SmallBtn
                      onClick={() => handleSave(i)}
                      loading={opLoading === i}
                      accent
                    >
                      {saved.has(i) ? "Tekrar Kaydet" : "Kaydet"}
                    </SmallBtn>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Popup ──────────────────────────────────────────────────────────── */}
      {popup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => !popupLoading && setPopup(null)}
        >
          <div
            className="w-[320px] rounded-2xl border border-white/10 bg-[#111] p-5 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Upscale ── */}
            {popup.type === "upscale" && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: accentLight }}>
                  Upscale Modu
                </p>
                <div className="flex gap-2">
                  {(["conservative", "creative"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setPopup({ ...popup, mode: m })}
                      className="flex-1 py-2 rounded-lg text-[9px] font-bold uppercase tracking-[0.15em] border transition-all"
                      style={
                        popup.mode === m
                          ? { backgroundColor: "rgba(183,110,121,0.18)", borderColor: accent, color: accentLight }
                          : { backgroundColor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }
                      }
                    >
                      {m === "conservative" ? "Conservative" : "Creative"}
                    </button>
                  ))}
                </div>
                {popup.mode === "creative" && (
                  <p className="text-[9px] text-white/30">
                    Creative upscale yaklaşık 2–3 dakika sürebilir.
                  </p>
                )}
              </>
            )}

            {/* ── Replace ── */}
            {popup.type === "replace" && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: accentLight }}>
                  Ara & Değiştir
                </p>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="field-label">Ne arıyorsun?</label>
                    <input
                      className="field-input mt-1"
                      placeholder="örn. the ring band"
                      value={popup.searchPrompt}
                      onChange={(e) => setPopup({ ...popup, searchPrompt: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="field-label">Ne olsun?</label>
                    <input
                      className="field-input mt-1"
                      placeholder="örn. twisted rope pattern band"
                      value={popup.replacePrompt}
                      onChange={(e) => setPopup({ ...popup, replacePrompt: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}

            {/* ── Recolor ── */}
            {popup.type === "recolor" && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: accentLight }}>
                  Renklendirme
                </p>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="field-label">Neyi renklendireyim?</label>
                    <input
                      className="field-input mt-1"
                      placeholder="örn. the ring"
                      value={popup.selectPrompt}
                      onChange={(e) => setPopup({ ...popup, selectPrompt: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="field-label">Hangi renk / metal?</label>
                    <input
                      className="field-input mt-1"
                      placeholder="örn. rose gold metal"
                      value={popup.newColor}
                      onChange={(e) => setPopup({ ...popup, newColor: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}

            {/* ── Style Transfer ── */}
            {popup.type === "style" && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: accentLight }}>
                  Referans Stil Uygula
                </p>
                <div>
                  <label className="field-label">Prompt (opsiyonel)</label>
                  <input
                    className="field-input mt-1"
                    placeholder="örn. jewelry product photo, gold"
                    value={popup.stylePrompt}
                    onChange={(e) => setPopup({ ...popup, stylePrompt: e.target.value })}
                  />
                </div>
              </>
            )}

            {/* Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setPopup(null)}
                disabled={popupLoading}
                className="flex-1 py-2 rounded-lg text-[9px] font-bold uppercase tracking-[0.15em] border border-white/10 text-white/40 disabled:opacity-40"
              >
                İptal
              </button>
              <button
                onClick={handlePopupSubmit}
                disabled={popupLoading}
                className="flex-1 py-2 rounded-lg text-[9px] font-bold uppercase tracking-[0.15em] border flex items-center justify-center gap-1.5 disabled:opacity-40"
                style={{ backgroundColor: "rgba(183,110,121,0.18)", borderColor: accent, color: accentLight }}
              >
                {popupLoading && <Spinner />}
                {popupLoading ? "İşleniyor…" : "Uygula"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global styles for reuse */}
      <style jsx global>{`
        .field-label {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.35em;
          color: rgba(255, 255, 255, 0.35);
        }
        .field-input {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: white;
          outline: none;
          width: 100%;
          transition: border-color 0.15s;
        }
        .field-input::placeholder {
          color: rgba(255, 255, 255, 0.18);
        }
        .field-input:focus {
          border-color: rgba(183, 110, 121, 0.5);
        }
      `}</style>
    </div>
  );
}

function ChoiceBtn({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-[0.1em] border transition-all"
      style={
        active
          ? {
              backgroundColor: "rgba(183,110,121,0.16)",
              borderColor: "#b76e79",
              color: "#c4838b",
            }
          : {
              backgroundColor: "rgba(255,255,255,0.03)",
              borderColor: "rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.4)",
            }
      }
    >
      {children}
    </button>
  );
}
