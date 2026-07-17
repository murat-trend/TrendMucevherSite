"use client";

// MONTÜR — reçete-önce + PROMPT DÜZENLEME (Murat, 2026-07-17: "modeli
// yapacağız, ben promtlarla düzenleyeceğim"). Doğruluk kaynağı reçetedir;
// komutlar ve kaydıraçlar AYNI reçeteyi düzenler, geometri kural motorundan
// üretilir (MONTUR.md). Servis adı UI'da geçmez (ticari sır).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MonturViewer, ViewMesh, ViewerMod } from "./MonturViewer";
import {
  MonturRecete, VARSAYILAN, clampRecete, turet, SINIR, MADENLER, MadenId, ctToCap,
} from "@/lib/remaura/montur/recete";
import { monturUret, MonturUretim } from "@/lib/remaura/montur/motor";
import { toBinarySTL } from "@/lib/remaura/montur/stl";
import { KAFA_KARTLARI, TAS_KARTLARI } from "./Kutuphane";

const ALTIN_AYAR: { id: MadenId; ad: string }[] = [
  { id: "au8", ad: "8K" }, { id: "au14", ad: "14K" }, { id: "au14r", ad: "14K Roz" },
  { id: "au18", ad: "18K" }, { id: "au22", ad: "22K" },
];

const ORNEK_KOMUTLAR = [
  "tulip basket kullan", "gizli rail ekle", "çift rail yap", "peg head'e çevir",
  "prenses taş", "oval taş yap", "taşı 1 karat yap", "bezel'e çevir", "ölçüyü 58 yap",
];

type KomutKaydi = { komut: string; aciklama: string; notlar: string[] };

export function MonturClient() {
  const [recete, setRecete] = useState<MonturRecete>(VARSAYILAN);
  const [gecmis, setGecmis] = useState<MonturRecete[]>([]); // geri al yığını
  const [komut, setKomut] = useState("");
  const [komutLog, setKomutLog] = useState<KomutKaydi[]>([]);
  const [komutBusy, setKomutBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [viewerMod, setViewerMod] = useState<ViewerMod>("mat");
  const [sonuc, setSonuc] = useState<MonturUretim | null>(null);
  const [meshes, setMeshes] = useState<ViewMesh[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const uretimSayac = useRef(0);

  const tr = useMemo(() => turet(recete), [recete]);

  const bildir = useCallback((m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  }, []);

  // ---- reçete değişince OTOMATİK üretim (debounce; bayat sonuç sayaçla elenir)
  useEffect(() => {
    const benimSiram = ++uretimSayac.current;
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const u = await monturUret(recete);
        if (benimSiram !== uretimSayac.current) return;
        setSonuc(u);
        setMeshes([
          ...u.parcalar.map((p) => ({ positions: p.mesh.positions, indices: p.mesh.indices, kind: "metal" as const })),
          { positions: u.tas.positions, indices: u.tas.indices, kind: "tas" },
        ]);
      } catch {
        if (benimSiram === uretimSayac.current) bildir("Üretilemedi — reçeteyi kontrol et");
      } finally {
        if (benimSiram === uretimSayac.current) setBusy(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [recete, bildir]);

  /** Reçeteyi değiştir (kaydıraç/kart/komut ortak yolu): snapshot + clamp.
   *  Kısılan alanlar SESSİZ geçmez — bildirilir (MONTUR.md §0). */
  const receteDegistir = useCallback((yeni: MonturRecete) => {
    setGecmis((g) => [...g.slice(-24), recete]);
    const { recete: temiz, notlar } = clampRecete(yeni);
    setRecete(temiz);
    if (notlar.length) bildir(`Kurala kısıldı: ${notlar.join("; ")}`);
  }, [recete, bildir]);

  const geriAl = () => {
    setGecmis((g) => {
      if (!g.length) return g;
      setRecete(g[g.length - 1]);
      return g.slice(0, -1);
    });
  };

  // ---- KOMUT: AI reçete editörü (MONTUR.md §7)
  const komutGonder = useCallback(async (metin?: string) => {
    const k = (metin ?? komut).trim();
    if (!k || komutBusy) return;
    setKomutBusy(true);
    try {
      const res = await fetch("/api/remaura/montur/duzenle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recete, komut: k }),
      });
      const data = await res.json();
      if (!res.ok) {
        bildir(data?.error ?? "Komut işlenemedi");
        return;
      }
      const degisti = JSON.stringify(data.recete) !== JSON.stringify(recete);
      if (degisti) receteDegistir(data.recete);
      setKomutLog((l) => [{ komut: k, aciklama: data.aciklama ?? "", notlar: data.notlar ?? [] }, ...l.slice(0, 7)]);
      setKomut("");
      bildir(degisti ? data.aciklama ?? "Reçete güncellendi" : "Reçete değişmedi");
    } catch {
      bildir("Komut servisine ulaşılamadı");
    } finally {
      setKomutBusy(false);
    }
  }, [komut, komutBusy, recete, receteDegistir, bildir]);

  const indir = (buf: ArrayBuffer, ad: string) => {
    const url = URL.createObjectURL(new Blob([buf], { type: "model/stl" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = ad;
    a.click();
    URL.revokeObjectURL(url);
  };

  const gram = sonuc ? sonuc.hacimMm3 * MADENLER[recete.maden].yogunlukGmm3 : 0;
  const panel = "rounded-xl border border-[#2A2A35] bg-[#141418] p-4";

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#F5F5F7]">
      <div className="flex items-center gap-3 border-b border-[#2A2A35] px-5 py-3">
        <span className="rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3 py-1 text-[11px] font-medium tracking-wide text-[#D4AF37]">
          MONTÜR
        </span>
        <h1 className="font-display text-xl font-medium tracking-[-0.02em]">Montür Stüdyosu</h1>
        <span className="ml-auto font-mono text-[11px] text-white/35">kural motoru: MONTUR.md · reçete + komut · süper-admin</span>
      </div>

      <div className="flex">
        {/* GÖRSEL KÜTÜPHANE (JEKB) — kart seç, sağda ince ayar yap */}
        <aside className="hidden w-60 shrink-0 flex-col gap-1.5 border-r border-[#2A2A35] bg-[#141418] p-4 lg:flex">
          <div className="mb-1">
            <h2 className="font-display text-base font-semibold text-[#D4AF37]">Kafa Kütüphanesi</h2>
            <div className="mt-1 h-0.5 w-10 bg-[#D4AF37]" />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {KAFA_KARTLARI.map((k) => {
              const aktif = k.aktifMi(recete);
              return (
                <button
                  key={k.id}
                  onClick={() => receteDegistir(k.uygula(recete))}
                  title={`JEKB: ${k.jekb}`}
                  className={`flex flex-col items-center gap-1 rounded-xl border p-2 transition-all ${
                    aktif
                      ? "border-[#D4AF37] bg-[#1C1C22] shadow-[0_0_14px_rgba(212,175,55,0.15)]"
                      : "border-[#2A2A35] hover:bg-[#1C1C22]"
                  }`}
                >
                  <span className="h-12 w-full">{k.cizim}</span>
                  <span className={`text-center text-[10px] leading-tight ${aktif ? "text-[#D4AF37]" : "text-white/60"}`}>{k.ad}</span>
                </button>
              );
            })}
          </div>
          <div className="mb-1 mt-4">
            <h2 className="font-display text-base font-semibold text-[#D4AF37]">Taş Galerisi</h2>
            <div className="mt-1 h-0.5 w-10 bg-[#D4AF37]" />
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {TAS_KARTLARI.map((t) => {
              const aktif = recete.tas.kesim === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => receteDegistir({ ...recete, tas: { ...recete.tas, kesim: t.id } })}
                  className={`flex flex-col items-center gap-1 rounded-xl border p-1.5 transition-all ${
                    aktif ? "border-[#D4AF37] bg-[#1C1C22]" : "border-[#2A2A35] hover:bg-[#1C1C22]"
                  }`}
                >
                  <span className="h-10 w-full">{t.cizim}</span>
                  <span className={`text-[9.5px] ${aktif ? "text-[#D4AF37]" : "text-white/60"}`}>{t.ad}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-auto text-[10px] leading-relaxed text-white/25">
            Terimler BILGI.md&apos;de (JEKB) tanımlı — komut alanı da aynı dili
            konuşur: &quot;tulip basket kullan&quot;, &quot;gizli rail ekle&quot;,
            &quot;prenses taş&quot;…
          </p>
        </aside>

        <main className="min-w-0 flex-1 p-5">
        {/* KOMUT ALANI — aracın kalbi */}
        <div className={`${panel} mb-5`}>
          <div className="flex gap-2">
            <input
              value={komut}
              onChange={(e) => setKomut(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void komutGonder(); }}
              placeholder='Komut yaz: "taşı 1 karat yap", "6 tırnağa çevir", "bezel yap", "şankı incelt"…'
              className="h-12 flex-1 rounded-lg border border-[#2A2A35] bg-[#0A0A0C] px-4 text-sm text-[#F5F5F7] placeholder:text-white/25 focus:border-[#D4AF37] focus:outline-none"
            />
            <button
              onClick={() => void komutGonder()}
              disabled={komutBusy || !komut.trim()}
              className="h-12 rounded-lg bg-[#D4AF37] px-5 text-sm font-semibold text-[#0A0A0C] transition-all hover:bg-[#F0D878] disabled:opacity-50"
            >
              {komutBusy ? "Uygulanıyor…" : "Uygula"}
            </button>
            <button
              onClick={geriAl}
              disabled={!gecmis.length}
              className="h-12 rounded-lg border border-[#2A2A35] bg-[#141418] px-4 text-sm text-[#9CA3AF] transition-colors hover:text-white disabled:opacity-40"
            >
              ↩ Geri Al
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ORNEK_KOMUTLAR.map((o) => (
              <button
                key={o}
                onClick={() => void komutGonder(o)}
                disabled={komutBusy}
                className="rounded-md border border-[#2A2A35] px-2 py-1 text-[11px] text-[#9CA3AF] transition-colors hover:border-[#D4AF37]/50 hover:text-[#D4AF37] disabled:opacity-40"
              >
                {o}
              </button>
            ))}
          </div>
          {komutLog.length > 0 && (
            <div className="mt-3 space-y-1 border-t border-[#2A2A35] pt-2">
              {komutLog.slice(0, 3).map((k, i) => (
                <div key={`${k.komut}-${i}`} className="text-[11px]">
                  <span className="text-[#D4AF37]">» {k.komut}</span>{" "}
                  <span className="text-white/45">{k.aciklama}</span>
                  {k.notlar.length > 0 && (
                    <span className="text-amber-400/70"> · kısıldı: {k.notlar.join("; ")}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* viewer */}
          <div id="montur-viewer" className="relative min-h-[460px] overflow-hidden rounded-2xl border border-[#2A2A35] bg-[#101014] lg:col-span-7">
            <MonturViewer meshes={meshes} maden={recete.maden} fitKey="montur" mod={viewerMod} />
            {busy && (
              <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-black/60 px-3 py-1.5 font-mono text-[11px] text-[#D4AF37]">
                üretiliyor…
              </div>
            )}
            <div className="absolute right-3 top-3 flex overflow-hidden rounded-lg border border-[#2A2A35] bg-black/50 font-mono text-[11px]">
              {([["mat", "Mat"], ["metal", "Parlak"]] as const).map(([id, ad]) => (
                <button
                  key={id}
                  onClick={() => setViewerMod(id)}
                  className={`px-3 py-1.5 transition-colors ${
                    viewerMod === id ? "bg-[#D4AF37] font-semibold text-[#0A0A0C]" : "text-[#9CA3AF] hover:text-white"
                  }`}
                >
                  {ad}
                </button>
              ))}
            </div>
            <div className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-3 py-1.5 font-mono text-[11px] text-white/60">
              {gram > 0 && `${gram.toFixed(2)} g · ${tr.ct.toFixed(2)} ct · EU ${recete.olcu.euSize}`}
            </div>
          </div>

          {/* reçete kartları */}
          <div className="flex flex-col gap-4 lg:col-span-5">
            <div className={panel}>
              <h3 className="mb-2 font-display text-base font-semibold">
                <span className="mr-1.5 text-[#D4AF37]">1 ·</span>Ölçü & Taş
              </h3>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-xs text-[#9CA3AF]">Yüzük ölçüsü (EU / iç çevre)</span>
                <span className="font-mono text-[13px]">{recete.olcu.euSize} · Ø {tr.icCapMm.toFixed(2)} mm</span>
              </div>
              <input
                type="range" min={SINIR.euSize.min} max={SINIR.euSize.max} step={1} value={recete.olcu.euSize}
                onChange={(e) => receteDegistir({ ...recete, olcu: { euSize: parseInt(e.target.value, 10) } })}
                className="range-slider w-full"
              />
              <div className="mb-1 mt-3 flex items-baseline justify-between">
                <span className="text-xs text-[#9CA3AF]">
                  Taş · <span className="text-[#D4AF37]">{recete.tas.kesim}</span> (galeriden seç)
                </span>
                <span className="font-mono text-[13px]">
                  {recete.tas.kesim === "prenses" ? "kenar" : "Ø"} {recete.tas.capMm.toFixed(2)} mm ≈ {tr.ct.toFixed(2)} ct
                </span>
              </div>
              <input
                type="range" min={SINIR.tasCap.min} max={SINIR.tasCap.max} step={0.05} value={recete.tas.capMm}
                onChange={(e) => receteDegistir({ ...recete, tas: { ...recete.tas, capMm: parseFloat(e.target.value) } })}
                className="range-slider w-full"
              />
              {recete.tas.kesim === "oval" && (
                <>
                  <div className="mb-1 mt-2 flex items-baseline justify-between">
                    <span className="text-xs text-[#9CA3AF]">Oval boy/en oranı (JEKB)</span>
                    <span className="font-mono text-[13px]">{recete.tas.ovalOran.toFixed(2)} · {recete.tas.capMm.toFixed(1)}×{(recete.tas.capMm * recete.tas.ovalOran).toFixed(1)} mm</span>
                  </div>
                  <input
                    type="range" min={SINIR.ovalOran.min} max={SINIR.ovalOran.max} step={0.05} value={recete.tas.ovalOran}
                    onChange={(e) => receteDegistir({ ...recete, tas: { ...recete.tas, ovalOran: parseFloat(e.target.value) } })}
                    className="range-slider w-full"
                  />
                </>
              )}
              {recete.tas.kesim === "yuvarlak" && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {[0.25, 0.5, 0.75, 1.0, 1.5].map((c) => (
                    <button
                      key={c}
                      onClick={() => receteDegistir({ ...recete, tas: { ...recete.tas, capMm: ctToCap(c) } })}
                      className="rounded-md border border-[#2A2A35] px-2 py-1 font-mono text-[11px] text-[#9CA3AF] hover:text-[#D4AF37]"
                    >
                      {c} ct
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className={panel}>
              <h3 className="mb-2 font-display text-base font-semibold">
                <span className="mr-1.5 text-[#D4AF37]">2 ·</span>Şank
              </h3>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-xs text-[#9CA3AF]">Genişlik / kalınlık</span>
                <span className="font-mono text-[13px]">{recete.sank.genislikMm.toFixed(1)} / {recete.sank.kalinlikMm.toFixed(1)} mm</span>
              </div>
              <input
                type="range" min={SINIR.sankGenislik.min} max={SINIR.sankGenislik.max} step={0.1} value={recete.sank.genislikMm}
                onChange={(e) => receteDegistir({ ...recete, sank: { ...recete.sank, genislikMm: parseFloat(e.target.value) } })}
                className="range-slider w-full"
              />
              <input
                type="range" min={SINIR.sankKalinlik.min} max={SINIR.sankKalinlik.max} step={0.05} value={recete.sank.kalinlikMm}
                onChange={(e) => receteDegistir({ ...recete, sank: { ...recete.sank, kalinlikMm: parseFloat(e.target.value) } })}
                className="range-slider mt-2 w-full"
              />
              <div className="mb-1 mt-3 flex items-baseline justify-between">
                <span className="text-xs text-[#9CA3AF]">Omuz genişlemesi (taper)</span>
                <span className="font-mono text-[13px]">{recete.sank.taperOran.toFixed(2)}×</span>
              </div>
              <input
                type="range" min={SINIR.taper.min} max={SINIR.taper.max} step={0.05} value={recete.sank.taperOran}
                onChange={(e) => receteDegistir({ ...recete, sank: { ...recete.sank, taperOran: parseFloat(e.target.value) } })}
                className="range-slider w-full"
              />
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {([["yarimYuvarlak", "Yarım yuvarlak"], ["dikdortgen", "Dikdörtgen"]] as const).map(([id, ad]) => (
                  <button
                    key={id}
                    onClick={() => receteDegistir({ ...recete, sank: { ...recete.sank, kesit: id } })}
                    className={`rounded-md border py-1.5 text-[11px] transition-colors ${
                      recete.sank.kesit === id ? "border-[#D4AF37] text-[#D4AF37]" : "border-[#2A2A35] text-[#9CA3AF] hover:text-white"
                    }`}
                  >
                    {ad}
                  </button>
                ))}
              </div>
            </div>

            <div className={panel}>
              <h3 className="mb-2 font-display text-base font-semibold">
                <span className="mr-1.5 text-[#D4AF37]">3 ·</span>Kafa İnce Ayar & Maden
              </h3>
              <p className="mb-2 text-[10.5px] text-white/30">
                Kafa tipini soldaki kütüphaneden seç; burada ilgili alanları düzenle (JEKB).
              </p>
              {recete.kafa.tip === "tirnak" ? (
                <>
                  <div className="mb-2 grid grid-cols-4 gap-1.5">
                    {([["yok", "Rail yok"], ["tek", "Tek rail"], ["gizli", "Gizli"], ["cift", "Çift"]] as const).map(([id, ad]) => (
                      <button
                        key={id}
                        onClick={() => receteDegistir({ ...recete, kafa: { ...recete.kafa, rail: id } })}
                        className={`rounded-md border py-1.5 text-[10.5px] transition-colors ${
                          recete.kafa.rail === id ? "border-[#D4AF37] text-[#D4AF37]" : "border-[#2A2A35] text-[#9CA3AF] hover:text-white"
                        }`}
                      >
                        {ad}
                      </button>
                    ))}
                  </div>
                  <div className="mb-2 grid grid-cols-4 gap-1.5">
                    {([["duz", "Düz"], ["tulip", "Tulip"]] as const).map(([id, ad]) => (
                      <button
                        key={id}
                        onClick={() => receteDegistir({ ...recete, kafa: { ...recete.kafa, basketStil: id } })}
                        className={`rounded-md border py-1.5 text-[10.5px] transition-colors ${
                          recete.kafa.basketStil === id ? "border-[#D4AF37] text-[#D4AF37]" : "border-[#2A2A35] text-[#9CA3AF] hover:text-white"
                        }`}
                      >
                        {ad}
                      </button>
                    ))}
                    {([["omuz", "Omuz"], ["peg", "Peg"]] as const).map(([id, ad]) => (
                      <button
                        key={id}
                        onClick={() => receteDegistir({ ...recete, kafa: { ...recete.kafa, baglanti: id } })}
                        className={`rounded-md border py-1.5 text-[10.5px] transition-colors ${
                          recete.kafa.baglanti === id ? "border-[#D4AF37] text-[#D4AF37]" : "border-[#2A2A35] text-[#9CA3AF] hover:text-white"
                        }`}
                      >
                        {ad}
                      </button>
                    ))}
                  </div>
                  <div className="mb-2 grid grid-cols-2 gap-1.5">
                    {([4, 6] as const).map((n) => (
                      <button
                        key={n}
                        onClick={() => receteDegistir({ ...recete, kafa: { ...recete.kafa, tirnakSayisi: n } })}
                        disabled={recete.tas.kesim === "prenses" && n === 6}
                        className={`rounded-md border py-1.5 text-[10.5px] transition-colors ${
                          recete.kafa.tirnakSayisi === n ? "border-[#D4AF37] text-[#D4AF37]"
                            : recete.tas.kesim === "prenses" && n === 6 ? "cursor-not-allowed border-[#2A2A35] text-white/20"
                            : "border-[#2A2A35] text-[#9CA3AF] hover:text-white"
                        }`}
                      >
                        {n} Tırnak{recete.tas.kesim === "prenses" && n === 6 ? " (prenses=4)" : ""}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="text-xs text-[#9CA3AF]">Bezel duvarı (MB1)</span>
                    <span className="font-mono text-[13px]">{recete.kafa.bezelDuvarMm.toFixed(2)} mm</span>
                  </div>
                  <input
                    type="range" min={SINIR.bezelDuvar.min} max={SINIR.bezelDuvar.max} step={0.05} value={recete.kafa.bezelDuvarMm}
                    onChange={(e) => receteDegistir({ ...recete, kafa: { ...recete.kafa, bezelDuvarMm: parseFloat(e.target.value) } })}
                    className="range-slider mb-2 w-full"
                  />
                </>
              )}
              <div className="grid grid-cols-4 gap-1.5">
                {([...ALTIN_AYAR.map((a) => [a.id, a.ad] as const), ["ag925", "Gümüş"] as const, ["pt950", "Platin"] as const]).map(([id, ad]) => (
                  <button
                    key={id}
                    onClick={() => receteDegistir({ ...recete, maden: id as MadenId })}
                    className={`rounded-md border py-1.5 text-[10.5px] transition-colors ${
                      recete.maden === id ? "border-[#D4AF37] text-[#D4AF37]" : "border-[#2A2A35] text-[#9CA3AF] hover:text-white"
                    }`}
                  >
                    {ad}
                  </button>
                ))}
              </div>
            </div>

            {/* STL — parça başına (peg head'de kafa + şank ayrı iner) */}
            <div className="flex flex-wrap gap-2">
              {(sonuc?.parcalar ?? []).map((p) => (
                <button
                  key={p.ad}
                  onClick={() => {
                    indir(toBinarySTL([p.mesh], `Remaura Montur — ${p.ad}`),
                      `montur-${p.ad.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-eu${recete.olcu.euSize}.stl`);
                    bildir(`${p.ad} STL indirildi (taşsız — taş mıhlanır)`);
                  }}
                  className="h-11 flex-1 rounded-lg border border-[#D4AF37]/50 bg-[#D4AF37]/10 px-3 text-[13px] font-medium text-[#D4AF37] transition-colors hover:bg-[#D4AF37]/20"
                >
                  STL — {p.ad}
                </button>
              ))}
              <button
                onClick={() => {
                  if (!sonuc) return;
                  indir(toBinarySTL([sonuc.tas], "Remaura Montur — taş referans"), `montur-tas-${recete.tas.capMm.toFixed(2)}mm.stl`);
                  bildir("Taş referans STL indirildi");
                }}
                disabled={!sonuc}
                className="h-11 rounded-lg border border-[#2A2A35] bg-[#141418] px-4 text-[13px] text-[#9CA3AF] transition-colors hover:text-white disabled:opacity-40"
              >
                Taş (ref)
              </button>
            </div>
          </div>
        </div>

        {/* rapor */}
        {sonuc && (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className={panel}>
              <h3 className="mb-3 font-display text-lg font-semibold text-[#D4AF37]">Üretim Raporu</h3>
              <dl className="space-y-1.5 font-mono text-[12.5px]">
                {sonuc.olculer.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-white/45">{k}</dt>
                    <dd className="text-right text-white/90">{v}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-3">
                  <dt className="text-white/45">Metal ağırlığı (model)</dt>
                  <dd className="text-[#D4AF37]">{gram.toFixed(2)} g · {MADENLER[recete.maden].ad}</dd>
                </div>
              </dl>
            </div>
            <div className={panel}>
              <h3 className="mb-3 font-display text-lg font-semibold">Kural Denetimi</h3>
              <dl className="space-y-1.5 font-mono text-[12.5px]">
                {sonuc.denetimler.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-white/45">{k}</dt>
                    <dd className="text-right text-white/90">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-[10.5px] leading-relaxed text-white/30">
                Komutlar reçeteyi düzenler; geometri her zaman MONTUR.md kural
                motorundan üretilir. Sınır dışına çıkan istekler kıstırılır ve
                burada/komut geçmişinde bildirilir. Döküm çekmesi + polisaj payı
                ayrı düşünülmeli (SUYOLU D1-D8 mirası).
              </p>
            </div>
          </div>
        )}
        </main>
      </div>

      {toast && (
        <div className="fixed left-1/2 top-16 z-50 -translate-x-1/2 rounded-lg border border-[#2A2A35] bg-[#1C1C22] px-6 py-3 text-sm font-medium text-emerald-400 shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}
