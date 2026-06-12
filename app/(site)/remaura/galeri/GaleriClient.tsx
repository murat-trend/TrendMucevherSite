"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import type { Koleksiyon, StilKarti } from "./page";
import { applyWatermark } from "@/lib/remaura/apply-rem-watermark";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT      = "#b76e79";
const ACCENT_LIGHT = "#c4838b";
const BG          = "#080808";

// ─── Reusable UI ─────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const,
      letterSpacing: "0.35em", color: "rgba(255,255,255,0.3)",
    }}>
      {children}
    </span>
  );
}

function ChipFilter({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "4px 10px", borderRadius: 5, fontSize: 9, fontWeight: 700,
        textTransform: "uppercase" as const, letterSpacing: "0.1em",
        border: "1px solid",
        cursor: "pointer", transition: "all 0.12s",
        background: active ? "rgba(183,110,121,0.16)" : "rgba(255,255,255,0.03)",
        borderColor: active ? ACCENT : "rgba(255,255,255,0.08)",
        color: active ? ACCENT_LIGHT : "rgba(255,255,255,0.35)",
      }}
    >
      {children}
    </button>
  );
}

function SmallBtn({
  onClick, accent, danger, disabled, children,
}: {
  onClick: () => void; accent?: boolean; danger?: boolean;
  disabled?: boolean; children: React.ReactNode;
}) {
  const bg    = danger  ? "rgba(239,68,68,0.1)"       : accent ? "rgba(183,110,121,0.14)" : "rgba(255,255,255,0.04)";
  const bc    = danger  ? "rgba(239,68,68,0.35)"       : accent ? ACCENT                    : "rgba(255,255,255,0.1)";
  const color = danger  ? "rgba(248,113,113,0.9)"      : accent ? ACCENT_LIGHT               : "rgba(255,255,255,0.45)";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "4px 10px", borderRadius: 5, fontSize: 9, fontWeight: 700,
        textTransform: "uppercase" as const, letterSpacing: "0.1em",
        border: `1px solid ${bc}`, background: bg, color,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1, transition: "all 0.12s", whiteSpace: "nowrap" as const,
      }}
    >
      {children}
    </button>
  );
}

function Spinner({ size = 14 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      border: `2px solid ${ACCENT}`, borderTopColor: "transparent",
      animation: "spin 0.7s linear infinite", flexShrink: 0,
    }} />
  );
}

function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "32px 16px", opacity: 0.55 }}>
      <span style={{ fontSize: 28 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", textAlign: "center" }}>{title}</span>
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "center", lineHeight: 1.6 }}>{sub}</span>
    </div>
  );
}

// ─── Blob download ────────────────────────────────────────────────────────────

async function handleIndir(gorselUrl: string, adi: string | null) {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = gorselUrl; });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    applyWatermark(canvas);
    const blob = await new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => b ? res(b) : rej(new Error("toBlob")), "image/png"),
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${adi ?? "koleksiyon"}.png`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    window.open(gorselUrl, "_blank");
  }
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ gorsel, onClose }: { gorsel: Koleksiyon; onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 80,
        background: "rgba(0,0,0,0.92)", display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <button
        onClick={onClose}
        style={{
          position: "absolute", top: 16, right: 16,
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8, color: "rgba(255,255,255,0.55)", fontSize: 14,
          padding: "6px 12px", cursor: "pointer",
        }}
      >✕</button>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={gorsel.gorsel_url}
        alt={gorsel.koleksiyon_adi ?? "Koleksiyon görseli"}
        style={{
          maxWidth: "88vw", maxHeight: "78vh", borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.08)", objectFit: "contain",
        }}
      />

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        {gorsel.koleksiyon_adi && (
          <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{gorsel.koleksiyon_adi}</span>
        )}
        <div style={{ display: "flex", gap: 10, fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
          {gorsel.tip   && <span>{gorsel.tip}</span>}
          {gorsel.metal && <span>· {gorsel.metal}</span>}
          {gorsel.tema  && <span>· {gorsel.tema}</span>}
          <span>· {new Date(gorsel.created_at).toLocaleDateString("tr-TR")}</span>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={() => void handleIndir(gorsel.gorsel_url, gorsel.koleksiyon_adi)}
          style={{
            padding: "6px 16px", borderRadius: 7, fontSize: 9, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.15em",
            border: `1px solid ${ACCENT}`, background: "rgba(183,110,121,0.14)",
            color: ACCENT_LIGHT, cursor: "pointer",
          }}
        >
          İndir
        </button>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem("koleksiyon_edit_gorsel", gorsel.gorsel_url);
            window.location.href = "/remaura/koleksiyon-edit";
          }}
          style={{
            padding: "6px 16px", borderRadius: 7, fontSize: 9, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.15em",
            border: "1px solid rgba(183,110,121,0.3)", background: "rgba(183,110,121,0.08)",
            color: "rgba(183,110,121,0.7)", cursor: "pointer",
          }}
        >
          Düzenle →
        </button>
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initialKoleksiyonlar: Koleksiyon[];
  initialStilKartlari: StilKarti[];
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function GaleriClient({ initialKoleksiyonlar, initialStilKartlari }: Props) {
  const router = useRouter();

  const [koleksiyonlar, setKoleksiyonlar] = useState<Koleksiyon[]>(initialKoleksiyonlar);
  const [stilKartlari, setStilKartlari]   = useState<StilKarti[]>(initialStilKartlari);

  // Filters
  const [filterMetal, setFilterMetal] = useState<string | null>(null);
  const [filterTip,   setFilterTip]   = useState<string | null>(null);
  const [sortDesc,    setSortDesc]     = useState(true);

  // Lightbox
  const [lightbox, setLightbox] = useState<Koleksiyon | null>(null);

  // Loading
  const [silKol,  setSilKol]  = useState<string | null>(null); // koleksiyon id
  const [silStil, setSilStil] = useState<string | null>(null); // stil kartı id

  // ── Türetilmiş filtre seçenekleri ─────────────────────────────────────────
  const metals = useMemo(() => {
    const s = new Set(koleksiyonlar.map(k => k.metal).filter(Boolean) as string[]);
    return [...s].sort();
  }, [koleksiyonlar]);

  const tipler = useMemo(() => {
    const s = new Set(koleksiyonlar.map(k => k.tip).filter(Boolean) as string[]);
    return [...s].sort();
  }, [koleksiyonlar]);

  // ── Filtre uygulanmış + sıralanmış liste ──────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...koleksiyonlar];
    if (filterMetal) list = list.filter(k => k.metal === filterMetal);
    if (filterTip)   list = list.filter(k => k.tip   === filterTip);
    list.sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDesc ? -diff : diff;
    });
    return list;
  }, [koleksiyonlar, filterMetal, filterTip, sortDesc]);

  // ── Sil: koleksiyon ───────────────────────────────────────────────────────
  async function handleKolSil(id: string) {
    if (!confirm("Bu koleksiyon görseli silinsin mi?")) return;
    setSilKol(id);
    try {
      const res = await fetch("/api/remaura/koleksiyon-edit/kaydet", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setKoleksiyonlar(prev => prev.filter(k => k.id !== id));
        if (lightbox?.id === id) setLightbox(null);
      } else {
        const d = await res.json().catch(() => ({}));
        alert((d as { error?: string }).error ?? "Silme başarısız.");
      }
    } catch {
      alert("Bağlantı hatası.");
    } finally {
      setSilKol(null);
    }
  }

  // ── Sil: stil kartı ───────────────────────────────────────────────────────
  async function handleStilSil(id: string) {
    if (!confirm("Bu stil kartı silinsin mi?")) return;
    setSilStil(id);
    try {
      const res = await fetch("/api/remaura/koleksiyon-edit/stil-karti", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setStilKartlari(prev => prev.filter(k => k.id !== id));
      } else {
        const d = await res.json().catch(() => ({}));
        alert((d as { error?: string }).error ?? "Silme başarısız.");
      }
    } catch {
      alert("Bağlantı hatası.");
    } finally {
      setSilStil(null);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "calc(100vh - 5rem)", background: BG, color: "white",
      display: "flex", flexDirection: "column",
      fontFamily: "var(--font-display, sans-serif)",
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .kol-card:hover .kol-overlay { opacity: 1 !important; }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "14px 28px", display: "flex", alignItems: "center",
        gap: 10, flexShrink: 0, justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4em", color: ACCENT }}>Remaura</span>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
          <span style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.3em", color: "rgba(255,255,255,0.35)" }}>Galeri</span>
        </div>
        <button
          type="button"
          onClick={() => router.push("/remaura/koleksiyon-edit")}
          style={{
            fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em",
            padding: "6px 14px", borderRadius: 6,
            border: `1px solid ${ACCENT}`, background: "rgba(183,110,121,0.1)",
            color: ACCENT_LIGHT, cursor: "pointer",
          }}
        >
          + Koleksiyon Edit
        </button>
      </div>

      {/* ── 2 Sütunlu Gövde ────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "visible" }}>

        {/* ── SOL: Stil Kartları (260px) ───────────────────────────────── */}
        <div style={{
          width: 260, flexShrink: 0,
          borderRight: "1px solid rgba(255,255,255,0.06)",
          overflowY: "auto", padding: 16,
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ width: 3, height: 14, background: "rgba(100,160,255,0.7)", borderRadius: 2 }} />
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.35em",
              textTransform: "uppercase", color: "rgba(100,160,255,0.8)",
            }}>Stil Kartları</span>
            <span style={{
              fontSize: 9, color: "rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.06)", borderRadius: 4,
              padding: "1px 6px",
            }}>{stilKartlari.length}</span>
          </div>

          {stilKartlari.length === 0 ? (
            <EmptyState
              icon="🎨"
              title="Stil kartı yok"
              sub={'Koleksiyon ürettikten sonra "Stili Kaydet" butonu ile stil kartı oluşturabilirsin.'}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {stilKartlari.map(kart => (
                <div
                  key={kart.id}
                  style={{
                    display: "flex", gap: 10, padding: "10px 10px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 10, animation: "fadeIn 0.2s ease",
                  }}
                >
                  {/* Thumbnail */}
                  <div style={{
                    width: 52, height: 52, borderRadius: 8, flexShrink: 0,
                    overflow: "hidden", background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}>
                    {(kart.ornek_uretim_url || kart.referans_gorsel_url) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={(kart.ornek_uretim_url ?? kart.referans_gorsel_url)!}
                        alt={kart.isim}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{
                        width: "100%", height: "100%", display: "flex",
                        alignItems: "center", justifyContent: "center",
                        fontSize: 20,
                      }}>🎨</div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.85)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{kart.isim}</span>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>
                      {[kart.metal, new Date(kart.created_at).toLocaleDateString("tr-TR")].filter(Boolean).join(" · ")}
                    </span>
                    <div style={{ display: "flex", gap: 5, marginTop: 2 }}>
                      <SmallBtn
                        accent
                        disabled={silStil === kart.id}
                        onClick={() => router.push(`/remaura/koleksiyon-edit?stilKartiId=${kart.id}`)}
                      >
                        Kullan
                      </SmallBtn>
                      <SmallBtn
                        danger
                        disabled={silStil === kart.id}
                        onClick={() => handleStilSil(kart.id)}
                      >
                        {silStil === kart.id ? <Spinner size={10} /> : "Sil"}
                      </SmallBtn>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── SAĞ: Koleksiyonlar (flex:1) ─────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

          {/* Filter bar */}
          <div style={{
            padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Label>Metal</Label>
              <ChipFilter active={filterMetal === null} onClick={() => setFilterMetal(null)}>Tümü</ChipFilter>
              {metals.map(m => (
                <ChipFilter key={m} active={filterMetal === m} onClick={() => setFilterMetal(m === filterMetal ? null : m)}>{m}</ChipFilter>
              ))}
            </div>

            {tipler.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ color: "rgba(255,255,255,0.1)", fontSize: 10 }}>|</span>
                <Label>Tip</Label>
                <ChipFilter active={filterTip === null} onClick={() => setFilterTip(null)}>Tümü</ChipFilter>
                {tipler.map(t => (
                  <ChipFilter key={t} active={filterTip === t} onClick={() => setFilterTip(t === filterTip ? null : t)}>{t}</ChipFilter>
                ))}
              </div>
            )}

            <div style={{ marginLeft: "auto" }}>
              <ChipFilter active={false} onClick={() => setSortDesc(p => !p)}>
                {sortDesc ? "↓ Yeni → Eski" : "↑ Eski → Yeni"}
              </ChipFilter>
            </div>

            <span style={{
              fontSize: 9, color: "rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.05)", borderRadius: 4, padding: "2px 8px",
            }}>
              {filtered.length} görsel
            </span>
          </div>

          {/* Grid */}
          <div style={{ padding: 20, flex: 1 }}>
            {koleksiyonlar.length === 0 ? (
              <EmptyState
                icon="🖼️"
                title="Koleksiyon boş"
                sub={'Koleksiyon Edit sayfasında görseller ürettikten sonra "Kaydet" butonuyla buraya ekleyebilirsin.'}
              />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon="🔍"
                title="Filtre sonucu yok"
                sub="Seçilen filtrelere uygun görsel bulunamadı."
              />
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 16,
              }}>
                {filtered.map(kol => (
                  <div
                    key={kol.id}
                    className="kol-card"
                    style={{
                      borderRadius: 12, overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.07)",
                      background: "rgba(255,255,255,0.02)",
                      display: "flex", flexDirection: "column",
                      animation: "fadeIn 0.2s ease",
                    }}
                  >
                    {/* Görsel */}
                    <div
                      style={{ position: "relative", aspectRatio: "1", cursor: "pointer" }}
                      onClick={() => setLightbox(kol)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={kol.gorsel_url}
                        alt={kol.koleksiyon_adi ?? "Koleksiyon"}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                      {/* Hover overlay */}
                      <div
                        className="kol-overlay"
                        style={{
                          position: "absolute", inset: 0,
                          background: "rgba(0,0,0,0.35)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          opacity: 0, transition: "opacity 0.15s",
                        }}
                      >
                        <span style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: "0.2em",
                          textTransform: "uppercase", color: "rgba(255,255,255,0.8)",
                          background: "rgba(0,0,0,0.5)", padding: "4px 10px", borderRadius: 5,
                        }}>Büyüt</span>
                      </div>
                    </div>

                    {/* Alt bilgi */}
                    <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 5 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.8)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {kol.koleksiyon_adi ?? "—"}
                      </span>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {kol.tip   && <span style={{ fontSize: 9, color: ACCENT_LIGHT, background: "rgba(183,110,121,0.1)", borderRadius: 4, padding: "1px 6px" }}>{kol.tip}</span>}
                        {kol.metal && <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.05)", borderRadius: 4, padding: "1px 6px" }}>{kol.metal}</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>
                          {new Date(kol.created_at).toLocaleDateString("tr-TR")}
                        </span>
                        <div style={{ display: "flex", gap: 5 }}>
                          <SmallBtn
                            onClick={() => void handleIndir(kol.gorsel_url, kol.koleksiyon_adi)}
                          >
                            İndir
                          </SmallBtn>
                          <SmallBtn
                            accent
                            onClick={() => {
                              localStorage.setItem("koleksiyon_edit_gorsel", kol.gorsel_url);
                              window.location.href = "/remaura/koleksiyon-edit";
                            }}
                          >
                            Düzenle
                          </SmallBtn>
                          <SmallBtn
                            danger
                            disabled={silKol === kol.id}
                            onClick={() => handleKolSil(kol.id)}
                          >
                            {silKol === kol.id ? <Spinner size={10} /> : "Sil"}
                          </SmallBtn>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Lightbox ───────────────────────────────────────────────────── */}
      {lightbox && <Lightbox gorsel={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
