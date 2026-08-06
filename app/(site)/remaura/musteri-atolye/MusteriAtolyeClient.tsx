"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { shrinkForUpload } from "@/lib/remaura/upload";
import { TURLER } from "@/lib/remaura/musteri-atolye/turler";

/* ─── Palet (Remaura araç sayfası: gül/pembe + derin siyah) ─────────────────── */

const ACCENT = "#b76e79";
const ACCENT_LIGHT = "#c4838b";
const TERRA = "#c69575";
const KREM = "#c9a88a";
const BG = "#07080a";
const PANEL = "#0a0b0e";
const BORDER = "rgba(255,255,255,0.06)";

/* ─── Tipler ─────────────────────────────────────────────────────────────────── */

type Musteri = {
  id: string;
  created_at: string;
  ad: string;
  telefon: string | null;
  notlar: string | null;
  tasarimSayisi?: number;
};

type Tasarim = {
  id: string;
  created_at: string;
  gorsel_url: string;
  koleksiyon_adi: string | null;
};

type TasKapsami = "buyuk" | "hepsi" | "tarif";
type HedefBoy = 1024 | 2048 | 4096;

type Sonuc = { url: string; width: number; height: number };

/** Seri üretimi sonucu — hangi türden geldiği etiketiyle taşınır. */
type SeriParca = Sonuc & { etiket: string; kaydedildi?: boolean };

type TasarimModu = "yeni-poz" | "poz-varyanti" | "serbest";

const TASARIM_MODU_ETIKET: Record<TasarimModu, string> = {
  "yeni-poz": "Aynı stil, yeni poz",
  "poz-varyanti": "Aynı tür, poz varyantı",
  serbest: "Tamamen serbest",
};

const BOY_ETIKET: Record<HedefBoy, string> = {
  1024: "1K — hızlı deneme",
  2048: "2K — varsayılan",
  4096: "4K — en yüksek",
};

/* ─── Küçük UI parçaları ─────────────────────────────────────────────────────── */

function Etiket({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.35em",
        color: "rgba(255,255,255,0.3)",
      }}
    >
      {children}
    </span>
  );
}

function Chip({
  aktif,
  onClick,
  disabled,
  children,
}: {
  aktif: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "6px 12px",
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.06em",
        border: `1px solid ${aktif ? ACCENT : "rgba(255,255,255,0.08)"}`,
        background: aktif ? "rgba(183,110,121,0.16)" : "rgba(255,255,255,0.03)",
        color: aktif ? ACCENT_LIGHT : "rgba(255,255,255,0.4)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "all 0.12s",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function Buton({
  onClick,
  disabled,
  birincil,
  tehlike,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  birincil?: boolean;
  tehlike?: boolean;
  children: React.ReactNode;
}) {
  const bg = tehlike
    ? "rgba(239,68,68,0.1)"
    : birincil
      ? "linear-gradient(135deg, #c4838b, #a65f69)"
      : "rgba(255,255,255,0.04)";
  const bc = tehlike ? "rgba(239,68,68,0.35)" : birincil ? ACCENT : "rgba(255,255,255,0.1)";
  const renk = tehlike ? "rgba(248,113,113,0.9)" : birincil ? "#fff" : "rgba(255,255,255,0.5)";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: birincil ? "10px 18px" : "6px 12px",
        borderRadius: 6,
        fontSize: birincil ? 11 : 10,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        border: `1px solid ${bc}`,
        background: bg,
        color: renk,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "all 0.12s",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function Girdi({
  value,
  onChange,
  placeholder,
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onEnter?: () => void;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && onEnter) onEnter();
      }}
      placeholder={placeholder}
      style={{
        width: "100%",
        padding: "8px 10px",
        borderRadius: 6,
        border: `1px solid ${BORDER}`,
        background: "rgba(255,255,255,0.03)",
        color: "rgba(255,255,255,0.85)",
        fontSize: 12,
        outline: "none",
      }}
    />
  );
}

/** Şeffaflığın görünmesi için satranç zemin. */
const SATRANC: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(45deg, rgba(255,255,255,0.07) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,0.07) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.07) 75%), linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.07) 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
};

/* ─── Ana bileşen ────────────────────────────────────────────────────────────── */

export function MusteriAtolyeClient() {
  const [musteriler, setMusteriler] = useState<Musteri[]>([]);
  const [seciliId, setSeciliId] = useState<string | null>(null);
  const [arama, setArama] = useState("");
  const [yeniAd, setYeniAd] = useState("");
  const [yeniTelefon, setYeniTelefon] = useState("");

  const [tasarimlar, setTasarimlar] = useState<Tasarim[]>([]);
  const [orijinal, setOrijinal] = useState<string | null>(null);
  const [sonuc, setSonuc] = useState<Sonuc | null>(null);

  const [tasKapsami, setTasKapsami] = useState<TasKapsami>("buyuk");
  const [tasTarif, setTasTarif] = useState("");
  const [bailKaldir, setBailKaldir] = useState(true);
  const [hedefBoy, setHedefBoy] = useState<HedefBoy>(2048);
  const [baslik, setBaslik] = useState("");

  // ── Seri üretimi (tür değiştir / yeni tasarım) ──
  const [bazGorsel, setBazGorsel] = useState<string | null>(null);
  const [secilenTurler, setSecilenTurler] = useState<string[]>([]);
  const [serbestTur, setSerbestTur] = useState("");
  const [seriTarif, setSeriTarif] = useState("");
  const [seri, setSeri] = useState<SeriParca[]>([]);
  const [tasarimModu, setTasarimModu] = useState<TasarimModu>("yeni-poz");
  const [tasarimTur, setTasarimTur] = useState("");
  const [tasarimTarif, setTasarimTarif] = useState("");

  const [mesgul, setMesgul] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);

  const dosyaRef = useRef<HTMLInputElement>(null);

  const secili = useMemo(
    () => musteriler.find((m) => m.id === seciliId) ?? null,
    [musteriler, seciliId]
  );

  const suzulmus = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase("tr");
    if (!q) return musteriler;
    return musteriler.filter((m) => m.ad.toLocaleLowerCase("tr").includes(q));
  }, [musteriler, arama]);

  /* ── Veri ── */

  const musterileriYukle = useCallback(async () => {
    try {
      const r = await fetch("/api/remaura/musteri-atolye/musteriler", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) {
        setHata(j.error ?? "Müşteriler okunamadı.");
        return;
      }
      setMusteriler(j.musteriler ?? []);
    } catch {
      setHata("Bağlantı hatası.");
    }
  }, []);

  const tasarimlariYukle = useCallback(async (musteriId: string) => {
    try {
      const r = await fetch(
        `/api/remaura/musteri-atolye/tasarimlar?musteriId=${encodeURIComponent(musteriId)}`,
        { cache: "no-store" }
      );
      const j = await r.json();
      if (!r.ok) {
        setHata(j.error ?? "Tasarımlar okunamadı.");
        return;
      }
      setTasarimlar(j.tasarimlar ?? []);
    } catch {
      setHata("Bağlantı hatası.");
    }
  }, []);

  useEffect(() => {
    void musterileriYukle();
  }, [musterileriYukle]);

  useEffect(() => {
    if (seciliId) void tasarimlariYukle(seciliId);
    else setTasarimlar([]);
  }, [seciliId, tasarimlariYukle]);

  /* ── Müşteri işlemleri ── */

  async function musteriEkle() {
    const ad = yeniAd.trim();
    if (!ad) return;
    setMesgul("Müşteri kaydediliyor…");
    setHata(null);
    try {
      const r = await fetch("/api/remaura/musteri-atolye/musteriler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ad, telefon: yeniTelefon }),
      });
      const j = await r.json();
      if (!r.ok) {
        setHata(j.error ?? "Müşteri kaydedilemedi.");
        return;
      }
      setMusteriler((p) => [j.musteri, ...p]);
      setSeciliId(j.musteri.id);
      setYeniAd("");
      setYeniTelefon("");
      setBilgi(`"${j.musteri.ad}" eklendi.`);
    } catch {
      setHata("Bağlantı hatası.");
    } finally {
      setMesgul(null);
    }
  }

  async function musteriSil(m: Musteri) {
    if (!confirm(`"${m.ad}" silinsin mi? Tasarımlar silinmez, müşterisiz kalır.`)) return;
    setMesgul("Siliniyor…");
    try {
      const r = await fetch("/api/remaura/musteri-atolye/musteriler", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: m.id }),
      });
      if (!r.ok) {
        setHata((await r.json()).error ?? "Silinemedi.");
        return;
      }
      setMusteriler((p) => p.filter((x) => x.id !== m.id));
      if (seciliId === m.id) setSeciliId(null);
    } finally {
      setMesgul(null);
    }
  }

  /* ── Görsel işlemleri ── */

  async function dosyaSec(file: File | null) {
    if (!file) return;
    setHata(null);
    setSonuc(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result ?? "");
      // 413 dersi: gövde limitine sığdır (paylaşılan yardımcı).
      const kucuk = await shrinkForUpload(dataUrl);
      setOrijinal(kucuk);
    };
    reader.readAsDataURL(file);
  }

  async function hazirlaCalistir() {
    if (!orijinal) return;
    if (tasKapsami === "tarif" && !tasTarif.trim()) {
      setHata("Hangi taşın kaldırılacağını yazın.");
      return;
    }
    setMesgul("Taş kaldırılıyor, gövde tamamlanıyor…");
    setHata(null);
    setBilgi(null);
    setSonuc(null);
    try {
      const r = await fetch("/api/remaura/musteri-atolye/hazirla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          islem: "hazirla",
          image: orijinal,
          tasKapsami,
          tasTarif,
          bailKaldir,
          hedefBoy,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setHata(j.error ?? "Hazırlama başarısız.");
        return;
      }
      setSonuc(j as Sonuc);
    } catch {
      setHata("Bağlantı hatası.");
    } finally {
      setMesgul(null);
    }
  }

  async function dorteKCikar() {
    if (!sonuc) return;
    setMesgul("4K'ya çıkarılıyor…");
    setHata(null);
    try {
      const r = await fetch("/api/remaura/musteri-atolye/hazirla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ islem: "buyut", image: sonuc.url, hedefBoy: 4096 }),
      });
      const j = await r.json();
      if (!r.ok) {
        setHata(j.error ?? "Büyütme başarısız.");
        return;
      }
      setSonuc(j as Sonuc);
      setBilgi("4K sürüm hazır.");
    } catch {
      setHata("Bağlantı hatası.");
    } finally {
      setMesgul(null);
    }
  }

  async function galeriyeKaydet() {
    if (!sonuc || !seciliId) return;
    setMesgul("Galeriye kaydediliyor…");
    setHata(null);
    try {
      const r = await fetch("/api/remaura/musteri-atolye/tasarimlar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ musteriId: seciliId, gorselUrl: sonuc.url, baslik }),
      });
      const j = await r.json();
      if (!r.ok) {
        setHata(j.error ?? "Kaydedilemedi.");
        return;
      }
      setTasarimlar((p) => [j.tasarim, ...p]);
      setMusteriler((p) =>
        p.map((m) => (m.id === seciliId ? { ...m, tasarimSayisi: (m.tasarimSayisi ?? 0) + 1 } : m))
      );
      setBaslik("");
      setBilgi("Müşterinin galerisine eklendi.");
    } catch {
      setHata("Bağlantı hatası.");
    } finally {
      setMesgul(null);
    }
  }

  async function tasarimSil(t: Tasarim) {
    if (!confirm("Bu tasarım galeriden silinsin mi?")) return;
    const r = await fetch("/api/remaura/musteri-atolye/tasarimlar", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id }),
    });
    if (!r.ok) {
      setHata("Silinemedi.");
      return;
    }
    setTasarimlar((p) => p.filter((x) => x.id !== t.id));
    setMusteriler((p) =>
      p.map((m) =>
        m.id === seciliId ? { ...m, tasarimSayisi: Math.max(0, (m.tasarimSayisi ?? 1) - 1) } : m
      )
    );
  }

  /* ── Seri üretimi ── */

  function bazYap(url: string) {
    setBazGorsel(url);
    setBilgi("Baz model seçildi — artık bu duruştan tür türetebilirsin.");
  }

  function turSec(id: string) {
    setSecilenTurler((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  /** Tek bir üretim isteği — hem tür değiştirmede hem yeni tasarımda kullanılır. */
  async function tekUret(govde: Record<string, unknown>): Promise<SeriParca | null> {
    const r = await fetch("/api/remaura/musteri-atolye/uret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...govde, hedefBoy }),
    });
    const j = await r.json();
    if (!r.ok) {
      setHata(j.error ?? "Üretim başarısız.");
      return null;
    }
    return j as SeriParca;
  }

  async function turleriUret() {
    const hedefler = [
      ...secilenTurler,
      ...serbestTur
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ];
    if (!bazGorsel) {
      setHata("Önce bir baz model seç.");
      return;
    }
    if (hedefler.length === 0) {
      setHata("En az bir tür seç ya da yaz.");
      return;
    }

    setHata(null);
    setBilgi(null);

    // Sırayla — tek istekte hepsi 300 sn sınırını aşar ve ilk hatada hepsi gider.
    for (let i = 0; i < hedefler.length; i++) {
      const ad = TURLER.find((t) => t.id === hedefler[i])?.tr ?? hedefler[i];
      setMesgul(`${ad} üretiliyor… (${i + 1}/${hedefler.length})`);
      const parca = await tekUret({ mod: "tur", bazGorsel, tur: hedefler[i], tarif: seriTarif });
      if (!parca) break; // hata mesajı zaten yazıldı — kalanlara para harcama
      setSeri((p) => [parca, ...p]);
    }
    setMesgul(null);
  }

  async function tasarimUret() {
    if (tasarimModu === "serbest" && !tasarimTarif.trim()) {
      setHata("Ne istediğini yaz.");
      return;
    }
    if (tasarimModu !== "serbest" && !bazGorsel) {
      setHata("Önce bir baz model seç.");
      return;
    }
    setHata(null);
    setBilgi(null);
    setMesgul("Yeni tasarım üretiliyor…");
    const parca = await tekUret({
      mod: "tasarim",
      bazGorsel: tasarimModu === "serbest" ? undefined : bazGorsel,
      tasarimModu,
      tur: tasarimTur,
      tarif: tasarimTarif,
    });
    if (parca) setSeri((p) => [parca, ...p]);
    setMesgul(null);
  }

  async function seriKaydet(parca: SeriParca, index: number) {
    if (!seciliId) return;
    const r = await fetch("/api/remaura/musteri-atolye/tasarimlar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ musteriId: seciliId, gorselUrl: parca.url, baslik: parca.etiket }),
    });
    const j = await r.json();
    if (!r.ok) {
      setHata(j.error ?? "Kaydedilemedi.");
      return;
    }
    setTasarimlar((p) => [j.tasarim, ...p]);
    setSeri((p) => p.map((x, i) => (i === index ? { ...x, kaydedildi: true } : x)));
    setMusteriler((p) =>
      p.map((m) => (m.id === seciliId ? { ...m, tasarimSayisi: (m.tasarimSayisi ?? 0) + 1 } : m))
    );
  }

  /* ── Görünüm ── */

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "rgba(255,255,255,0.85)" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 24px 64px" }}>
        {/* Başlık */}
        <div style={{ marginBottom: 28 }}>
          <Etiket>Remaura</Etiket>
          <h1
            style={{
              margin: "8px 0 6px",
              fontSize: 30,
              fontWeight: 500,
              letterSpacing: "-0.03em",
              color: "#fff",
            }}
          >
            Müşteri Atölyesi
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: KREM, maxWidth: 620, lineHeight: 1.6 }}>
            Müşterinin gönderdiği ürün fotoğrafından taşı kaldır, altında kalan gövdeyi tamamla,
            şeffaf zeminli temiz ürün görseli üret ve o müşterinin galerisinde sakla.
          </p>
        </div>

        {/* Uyarılar */}
        {(hata || bilgi) && (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 14px",
              borderRadius: 8,
              fontSize: 12,
              border: `1px solid ${hata ? "rgba(239,68,68,0.35)" : "rgba(183,110,121,0.35)"}`,
              background: hata ? "rgba(239,68,68,0.08)" : "rgba(183,110,121,0.08)",
              color: hata ? "rgba(248,113,113,0.95)" : ACCENT_LIGHT,
            }}
          >
            {hata ?? bilgi}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, alignItems: "start" }}>
          {/* ── Sol: müşteriler ── */}
          <div
            style={{
              background: PANEL,
              border: `1px solid ${BORDER}`,
              borderRadius: 14,
              padding: 16,
              position: "sticky",
              top: 20,
            }}
          >
            <Etiket>Müşteriler</Etiket>

            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              <Girdi value={arama} onChange={setArama} placeholder="Müşteri ara…" />
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 6, maxHeight: 320, overflowY: "auto" }}>
              {suzulmus.length === 0 && (
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", padding: "8px 0" }}>
                  {musteriler.length === 0 ? "Henüz müşteri yok." : "Eşleşen müşteri yok."}
                </div>
              )}
              {suzulmus.map((m) => {
                const aktif = m.id === seciliId;
                return (
                  <div
                    key={m.id}
                    onClick={() => setSeciliId(m.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      padding: "9px 11px",
                      borderRadius: 8,
                      cursor: "pointer",
                      border: `1px solid ${aktif ? ACCENT : "transparent"}`,
                      background: aktif ? "rgba(183,110,121,0.14)" : "rgba(255,255,255,0.02)",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12.5,
                          color: aktif ? "#fff" : "rgba(255,255,255,0.75)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {m.ad}
                      </div>
                      {m.telefon && (
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{m.telefon}</div>
                      )}
                    </div>
                    <span style={{ fontSize: 10, color: TERRA, whiteSpace: "nowrap" }}>
                      {m.tasarimSayisi ?? 0}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${BORDER}` }}>
              <Etiket>Yeni Müşteri</Etiket>
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <Girdi value={yeniAd} onChange={setYeniAd} placeholder="Ad soyad" onEnter={musteriEkle} />
                <Girdi
                  value={yeniTelefon}
                  onChange={setYeniTelefon}
                  placeholder="Telefon (opsiyonel)"
                  onEnter={musteriEkle}
                />
                <Buton onClick={musteriEkle} disabled={!yeniAd.trim() || !!mesgul}>
                  Ekle
                </Buton>
              </div>
            </div>
          </div>

          {/* ── Sağ: çalışma alanı ── */}
          <div style={{ display: "grid", gap: 20 }}>
            {!secili ? (
              <div
                style={{
                  background: PANEL,
                  border: `1px dashed ${BORDER}`,
                  borderRadius: 14,
                  padding: 60,
                  textAlign: "center",
                  fontSize: 13,
                  color: "rgba(255,255,255,0.35)",
                }}
              >
                Soldan bir müşteri seç ya da yeni müşteri ekle.
              </div>
            ) : (
              <>
                {/* Müşteri başlığı */}
                <div
                  style={{
                    background: PANEL,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 14,
                    padding: "14px 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div>
                    <Etiket>Aktif Müşteri</Etiket>
                    <div style={{ fontSize: 17, color: "#fff", marginTop: 4 }}>{secili.ad}</div>
                  </div>
                  <Buton onClick={() => musteriSil(secili)} tehlike>
                    Müşteriyi Sil
                  </Buton>
                </div>

                {/* Hazırlama */}
                <div
                  style={{
                    background: PANEL,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 14,
                    padding: 18,
                  }}
                >
                  <Etiket>1 — Müşteri Görseli</Etiket>

                  <div
                    onClick={() => dosyaRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      void dosyaSec(e.dataTransfer.files?.[0] ?? null);
                    }}
                    style={{
                      marginTop: 12,
                      border: `1px dashed ${orijinal ? ACCENT : "rgba(255,255,255,0.12)"}`,
                      borderRadius: 10,
                      padding: orijinal ? 12 : 36,
                      textAlign: "center",
                      cursor: "pointer",
                      background: "rgba(255,255,255,0.02)",
                    }}
                  >
                    {orijinal ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={orijinal}
                        alt="Müşteri görseli"
                        style={{ maxHeight: 220, maxWidth: "100%", borderRadius: 6 }}
                      />
                    ) : (
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                        Fotoğrafı buraya sürükle ya da tıkla
                      </span>
                    )}
                  </div>
                  <input
                    ref={dosyaRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => void dosyaSec(e.target.files?.[0] ?? null)}
                  />

                  {/* Ayarlar */}
                  <div style={{ marginTop: 20 }}>
                    <Etiket>2 — Hangi Taşlar Kalksın</Etiket>
                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Chip aktif={tasKapsami === "buyuk"} onClick={() => setTasKapsami("buyuk")}>
                        Büyük / merkez taşlar
                      </Chip>
                      <Chip aktif={tasKapsami === "hepsi"} onClick={() => setTasKapsami("hepsi")}>
                        Tüm taşlar
                      </Chip>
                      <Chip aktif={tasKapsami === "tarif"} onClick={() => setTasKapsami("tarif")}>
                        Ben tarif edeyim
                      </Chip>
                    </div>
                    {tasKapsami === "buyuk" && (
                      <p style={{ margin: "8px 0 0", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                        Motifin parçası olan küçük taşlar (göz, burun, ince pavé) yerinde kalır.
                      </p>
                    )}
                    {tasKapsami === "tarif" && (
                      <div style={{ marginTop: 10 }}>
                        <Girdi
                          value={tasTarif}
                          onChange={setTasTarif}
                          placeholder="ör. sadece ortadaki büyük yuvarlak taş"
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 20 }}>
                    <Etiket>3 — Çıktı</Etiket>
                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {([1024, 2048, 4096] as HedefBoy[]).map((b) => (
                        <Chip key={b} aktif={hedefBoy === b} onClick={() => setHedefBoy(b)}>
                          {BOY_ETIKET[b]}
                        </Chip>
                      ))}
                    </div>
                    <label
                      style={{
                        marginTop: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 12,
                        color: "rgba(255,255,255,0.6)",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={bailKaldir}
                        onChange={(e) => setBailKaldir(e.target.checked)}
                        style={{ accentColor: ACCENT }}
                      />
                      Asma halkasını / zinciri de kaldır (ürün tek gövde kalsın)
                    </label>
                  </div>

                  <div style={{ marginTop: 20 }}>
                    <Buton onClick={hazirlaCalistir} disabled={!orijinal || !!mesgul} birincil>
                      {mesgul ? mesgul : "Taşı Kaldır & Hazırla"}
                    </Buton>
                  </div>
                </div>

                {/* Sonuç */}
                {sonuc && (
                  <div
                    style={{
                      background: PANEL,
                      border: `1px solid ${ACCENT}`,
                      borderRadius: 14,
                      padding: 18,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Etiket>Sonuç</Etiket>
                      <span style={{ fontSize: 11, color: TERRA, fontFamily: "monospace" }}>
                        {sonuc.width} × {sonuc.height} · şeffaf PNG
                      </span>
                    </div>

                    <div
                      style={{
                        ...SATRANC,
                        marginTop: 12,
                        borderRadius: 10,
                        padding: 16,
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={sonuc.url}
                        alt="Hazırlanmış ürün"
                        style={{ maxHeight: 360, maxWidth: "100%" }}
                      />
                    </div>

                    <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                      <Girdi value={baslik} onChange={setBaslik} placeholder="Tasarım adı (opsiyonel)" />
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Buton onClick={galeriyeKaydet} disabled={!!mesgul} birincil>
                          Galeriye Kaydet
                        </Buton>
                        <Buton onClick={() => bazYap(sonuc.url)} disabled={!!mesgul}>
                          {bazGorsel === sonuc.url ? "✓ Baz Model" : "Baz Model Yap"}
                        </Buton>
                        {sonuc.width < 4096 && sonuc.height < 4096 && (
                          <Buton onClick={dorteKCikar} disabled={!!mesgul}>
                            4K&apos;ya Çıkar
                          </Buton>
                        )}
                        <a href={sonuc.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                          <Buton onClick={() => {}}>Yeni Sekmede Aç</Buton>
                        </a>
                        <Buton
                          onClick={() => {
                            void navigator.clipboard.writeText(sonuc.url);
                            setBilgi("Görsel adresi kopyalandı — 3D aracına yapıştırabilirsin.");
                          }}
                        >
                          Adresi Kopyala
                        </Buton>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tür değiştir — seri üretimi */}
                <div
                  style={{
                    background: PANEL,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 14,
                    padding: 18,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <Etiket>Tür Değiştir — Seri</Etiket>
                    {bazGorsel ? (
                      <div style={{ ...SATRANC, borderRadius: 8, padding: 4 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={bazGorsel} alt="Baz model" style={{ height: 54 }} />
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>baz model seçilmedi</span>
                    )}
                  </div>

                  <p style={{ margin: "10px 0 0", fontSize: 11.5, color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>
                    Baz modelin duruşu, çerçevesi, mine + altın kontur işçiliği ve taşlı göz dili birebir
                    korunur; yalnızca hayvan değişir. Pati/bacağı olmayan türlerde (yunus, deniz atı, japon
                    balığı) aynı kompozisyon korunup anatomi türe uyarlanır.
                  </p>

                  {!bazGorsel && (
                    <p style={{ margin: "10px 0 0", fontSize: 11.5, color: TERRA }}>
                      Baz model seç: üstteki sonuçta <b>Baz Model Yap</b>, ya da galeride bir tasarımda{" "}
                      <b>Baz Yap</b>.
                    </p>
                  )}

                  <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {TURLER.map((t) => (
                      <Chip
                        key={t.id}
                        aktif={secilenTurler.includes(t.id)}
                        onClick={() => turSec(t.id)}
                        disabled={!!mesgul}
                      >
                        {t.tr}
                      </Chip>
                    ))}
                  </div>

                  <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                    <Girdi
                      value={serbestTur}
                      onChange={setSerbestTur}
                      placeholder="Listede olmayan tür — virgülle ayır (ör. tilki, kaplumbağa)"
                    />
                    <Girdi
                      value={seriTarif}
                      onChange={setSeriTarif}
                      placeholder="Tüm seriye uygulanacak ek not (opsiyonel)"
                    />
                  </div>

                  <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <Buton onClick={turleriUret} disabled={!bazGorsel || !!mesgul} birincil>
                      {mesgul ?? "Seçilenleri Üret"}
                    </Buton>
                    {secilenTurler.length > 0 && (
                      <>
                        <span style={{ fontSize: 11, color: TERRA }}>{secilenTurler.length} tür seçili</span>
                        <Buton onClick={() => setSecilenTurler([])} disabled={!!mesgul}>
                          Temizle
                        </Buton>
                      </>
                    )}
                    <Buton onClick={() => setSecilenTurler(TURLER.map((t) => t.id))} disabled={!!mesgul}>
                      Hepsini Seç
                    </Buton>
                  </div>
                </div>

                {/* Yeni tasarım */}
                <div
                  style={{
                    background: PANEL,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 14,
                    padding: 18,
                  }}
                >
                  <Etiket>Yeni Tasarım</Etiket>

                  <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {(Object.keys(TASARIM_MODU_ETIKET) as TasarimModu[]).map((m) => (
                      <Chip
                        key={m}
                        aktif={tasarimModu === m}
                        onClick={() => setTasarimModu(m)}
                        disabled={!!mesgul}
                      >
                        {TASARIM_MODU_ETIKET[m]}
                      </Chip>
                    ))}
                  </div>

                  <p style={{ margin: "10px 0 0", fontSize: 11.5, color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>
                    {tasarimModu === "yeni-poz" &&
                      "Baz modelin işçilik dili korunur (mine, altın kontur, taşlı göz), poz ve kompozisyon yeniden kurulur."}
                    {tasarimModu === "poz-varyanti" &&
                      "Baz modeldeki hayvanın aynısı, farklı duruşlarda — tek türden koleksiyon çıkarmak için."}
                    {tasarimModu === "serbest" &&
                      "Baz model kullanılmaz; ne yazarsan o üretilir. Seri bütünlüğünü garanti etmez."}
                  </p>

                  <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                    {tasarimModu === "yeni-poz" && (
                      <Girdi
                        value={tasarimTur}
                        onChange={setTasarimTur}
                        placeholder="Tür (boş bırakırsan baz modeldeki hayvan)"
                      />
                    )}
                    <Girdi
                      value={tasarimTarif}
                      onChange={setTasarimTarif}
                      placeholder={
                        tasarimModu === "serbest"
                          ? "Ne istediğini yaz (zorunlu)"
                          : "Serbest talimat (ör. oturmuş, kuyruk yukarı kıvrık)"
                      }
                    />
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <Buton
                      onClick={tasarimUret}
                      disabled={!!mesgul || (tasarimModu !== "serbest" && !bazGorsel)}
                      birincil
                    >
                      {mesgul ?? "Tasarımı Üret"}
                    </Buton>
                  </div>
                </div>

                {/* Seri sonuçları */}
                {seri.length > 0 && (
                  <div
                    style={{
                      background: PANEL,
                      border: `1px solid ${ACCENT}`,
                      borderRadius: 14,
                      padding: 18,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Etiket>Üretilenler</Etiket>
                      <Buton onClick={() => setSeri([])} disabled={!!mesgul}>
                        Listeyi Temizle
                      </Buton>
                    </div>

                    <div
                      style={{
                        marginTop: 14,
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                        gap: 12,
                      }}
                    >
                      {seri.map((p, i) => (
                        <div
                          key={`${p.url}-${i}`}
                          style={{
                            border: `1px solid ${BORDER}`,
                            borderRadius: 10,
                            overflow: "hidden",
                            background: "rgba(255,255,255,0.02)",
                          }}
                        >
                          <div style={{ ...SATRANC, padding: 8, display: "flex", justifyContent: "center" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={p.url}
                              alt={p.etiket}
                              style={{ height: 150, objectFit: "contain", maxWidth: "100%" }}
                            />
                          </div>
                          <div style={{ padding: "8px 10px", display: "grid", gap: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                              <span style={{ fontSize: 11.5, color: "#fff" }}>{p.etiket}</span>
                              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>
                                {p.width}×{p.height}
                              </span>
                            </div>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              <Buton onClick={() => seriKaydet(p, i)} disabled={!!mesgul || p.kaydedildi}>
                                {p.kaydedildi ? "✓ Kayıtlı" : "Kaydet"}
                              </Buton>
                              <Buton onClick={() => bazYap(p.url)}>
                                {bazGorsel === p.url ? "✓ Baz" : "Baz Yap"}
                              </Buton>
                              <a href={p.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                                <Buton onClick={() => {}}>Aç</Buton>
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Müşteri galerisi */}
                <div
                  style={{
                    background: PANEL,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 14,
                    padding: 18,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Etiket>{secili.ad} — Galeri</Etiket>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                      {tasarimlar.length} tasarım
                    </span>
                  </div>

                  {tasarimlar.length === 0 ? (
                    <div
                      style={{
                        marginTop: 14,
                        padding: 30,
                        textAlign: "center",
                        fontSize: 12,
                        color: "rgba(255,255,255,0.28)",
                      }}
                    >
                      Bu müşteri için henüz kayıtlı tasarım yok.
                    </div>
                  ) : (
                    <div
                      style={{
                        marginTop: 14,
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
                        gap: 12,
                      }}
                    >
                      {tasarimlar.map((t) => (
                        <div
                          key={t.id}
                          style={{
                            border: `1px solid ${BORDER}`,
                            borderRadius: 10,
                            overflow: "hidden",
                            background: "rgba(255,255,255,0.02)",
                          }}
                        >
                          <div style={{ ...SATRANC, padding: 8, display: "flex", justifyContent: "center" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={t.gorsel_url}
                              alt={t.koleksiyon_adi ?? "Tasarım"}
                              style={{ height: 130, objectFit: "contain", maxWidth: "100%" }}
                            />
                          </div>
                          <div style={{ padding: "8px 10px", display: "grid", gap: 8 }}>
                            <div
                              style={{
                                fontSize: 11,
                                color: "rgba(255,255,255,0.6)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {t.koleksiyon_adi ?? "İsimsiz"}
                            </div>
                            <div style={{ display: "flex", gap: 6 }}>
                              <a
                                href={t.gorsel_url}
                                target="_blank"
                                rel="noreferrer"
                                style={{ textDecoration: "none" }}
                              >
                                <Buton onClick={() => {}}>Aç</Buton>
                              </a>
                              <Buton onClick={() => bazYap(t.gorsel_url)}>
                                {bazGorsel === t.gorsel_url ? "✓ Baz" : "Baz Yap"}
                              </Buton>
                              <Buton onClick={() => tasarimSil(t)} tehlike>
                                Sil
                              </Buton>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
