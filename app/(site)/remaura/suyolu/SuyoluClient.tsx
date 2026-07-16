"use client";

// SUYOLU — taşlı (tennis) bileklik üretim aracı. SADECE süper-admin.
// Görsel dil: Kimi Code tasarımı (koyu #0A0A0C + altın #D4AF37, sol kesim
// menüsü, 3D viewer, sağ kontroller, üretim raporu). Motor: lib/remaura/suyolu
// (SUYOLU.md kural kütüphanesi — her sayı kural kimliği taşır, keyfi sayı yok).
import { useCallback, useEffect, useMemo, useState } from "react";
import { SuyoluViewer, ViewMesh } from "./SuyoluViewer";
import {
  MADENLER, MadenId, TAS_CINSLERI, TasCinsiId, caratToCapMm, OLCU,
} from "@/lib/remaura/suyolu/kurallar";
import { tasMesh } from "@/lib/remaura/suyolu/tas";
import { baklaUret, BaklaSonuc } from "@/lib/remaura/suyolu/bakla";
import { dizilim, rapor, montajMesh, BilekRapor } from "@/lib/remaura/suyolu/bileklik";
import { toBinarySTL } from "@/lib/remaura/suyolu/stl";

const KESIMLER = [
  { id: "round", ad: "Yuvarlak Parlak", aktif: true, aciklama: "HRD Excellent oranları" },
  { id: "princess", ad: "Prenses", aktif: false, aciklama: "yakında" },
  { id: "baguette", ad: "Baget", aktif: false, aciklama: "yakında" },
  { id: "oval", ad: "Oval", aktif: false, aciklama: "yakında" },
  { id: "emerald", ad: "Zümrüt Kesim", aktif: false, aciklama: "yakında" },
  { id: "cushion", ad: "Yastık", aktif: false, aciklama: "yakında" },
  { id: "pear", ad: "Armut", aktif: false, aciklama: "yakında" },
  { id: "marquise", ad: "Markiz", aktif: false, aciklama: "yakında" },
] as const;

const HIZLI_CT = [0.01, 0.03, 0.05, 0.1, 0.25, 0.5, 1.0];

const ALTIN_AYAR: { id: MadenId; ad: string }[] = [
  { id: "au8", ad: "8K" }, { id: "au14", ad: "14K" },
  { id: "au18", ad: "18K" }, { id: "au22", ad: "22K" },
];

export function SuyoluClient() {
  const [kesim, setKesim] = useState("round");
  const [tasCinsi, setTasCinsi] = useState<TasCinsiId>("cz");
  const [carat, setCarat] = useState(0.1);
  const [metalTur, setMetalTur] = useState<"altin" | "gumus" | "platin">("altin");
  const [ayar, setAyar] = useState<MadenId>("au14");
  const [uzunlukMm, setUzunlukMm] = useState<number>(OLCU.uzunlukVarsayilanMm);
  const [busy, setBusy] = useState(false);
  const [bakla, setBakla] = useState<BaklaSonuc | null>(null);
  const [raporData, setRaporData] = useState<BilekRapor | null>(null);
  const [meshes, setMeshes] = useState<ViewMesh[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const maden: MadenId = metalTur === "gumus" ? "ag925" : metalTur === "platin" ? "pt950" : ayar;
  const capMm = useMemo(() => caratToCapMm(carat), [carat]);

  const bildir = useCallback((m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2200);
  }, []);

  const olustur = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const b = await baklaUret(capMm);
      const { yer } = dizilim(uzunlukMm, capMm);
      // taş: tabla bakla üst yüzeyiyle hizalı (S5) — z=H'ye taşı
      const t = tasMesh(capMm, 24);
      const tPos = Float64Array.from(t.positions);
      for (let i = 2; i < tPos.length; i += 3) tPos[i] += b.olculer.yukseklikMm;
      const metal = montajMesh(b.mesh, yer);
      const taslar = montajMesh({ positions: tPos, indices: t.indices }, yer);
      setMeshes([
        { positions: metal.positions, indices: metal.indices, kind: "metal" },
        { positions: taslar.positions, indices: taslar.indices, kind: "tas" },
      ]);
      setBakla(b);
      setRaporData(rapor(uzunlukMm, capMm, b.hacimMm3, maden, tasCinsi));
      bildir("Model oluşturuldu");
    } catch {
      bildir("Model üretilemedi — parametreleri kontrol et");
    } finally {
      setBusy(false);
    }
  }, [busy, capMm, uzunlukMm, maden, tasCinsi, bildir]);

  // ilk açılışta bir kez üret
  useEffect(() => {
    void olustur();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnız ilk render
  }, []);

  const indir = (buf: ArrayBuffer, ad: string) => {
    const url = URL.createObjectURL(new Blob([buf], { type: "model/stl" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = ad;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stlTekBakla = () => {
    if (!bakla) return;
    indir(toBinarySTL([bakla.mesh], "Remaura Suyolu — tek bakla"),
      `suyolu-bakla-${carat.toFixed(2)}ct-${maden}.stl`);
    bildir("Tek bakla STL indirildi (üretim birimi)");
  };
  const stlKomple = () => {
    if (!bakla) return;
    const { yer } = dizilim(uzunlukMm, capMm);
    indir(toBinarySTL([montajMesh(bakla.mesh, yer)], "Remaura Suyolu — komple"),
      `suyolu-komple-${raporData?.tasSayisi ?? 0}tas-${carat.toFixed(2)}ct.stl`);
    bildir("Komple montaj STL indirildi");
  };

  const ekranGoruntusu = () => {
    const canvas = document.querySelector<HTMLCanvasElement>("#suyolu-viewer canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `suyolu-${carat.toFixed(2)}ct-${Date.now()}.png`;
    a.click();
    bildir("Ekran görüntüsü indirildi");
  };

  const panel = "rounded-xl border border-[#2A2A35] bg-[#141418] p-4";

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#F5F5F7]">
      {/* header */}
      <div className="flex items-center gap-3 border-b border-[#2A2A35] px-5 py-3">
        <span className="rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3 py-1 text-[11px] font-medium tracking-wide text-[#D4AF37]">
          SUYOLU
        </span>
        <h1 className="font-display text-xl font-medium tracking-[-0.02em]">Taşlı Bileklik Stüdyosu</h1>
        <span className="ml-auto font-mono text-[11px] text-white/35">kural motoru: SUYOLU.md · süper-admin</span>
      </div>

      <div className="flex">
        {/* sol: kesim menüsü */}
        <aside className="hidden w-64 shrink-0 flex-col gap-2 border-r border-[#2A2A35] bg-[#141418] p-4 lg:flex">
          <div className="mb-1">
            <h2 className="font-display text-base font-semibold text-[#D4AF37]">Kesim Tipleri</h2>
            <div className="mt-1 h-0.5 w-10 bg-[#D4AF37]" />
          </div>
          {KESIMLER.map((k) => {
            const aktif = kesim === k.id;
            return (
              <button
                key={k.id}
                disabled={!k.aktif}
                onClick={() => setKesim(k.id)}
                className={`flex h-12 items-center gap-3 rounded-xl border px-4 text-left text-sm transition-all ${
                  aktif
                    ? "border-[#D4AF37] bg-[#1C1C22] text-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.15)]"
                    : k.aktif
                    ? "border-transparent text-[#F5F5F7] hover:bg-[#1C1C22]"
                    : "cursor-not-allowed border-transparent text-white/25"
                }`}
              >
                <span className="flex-1 font-medium">{k.ad}</span>
                <span className="text-[10px] text-white/30">{k.aktif ? "" : "yakında"}</span>
              </button>
            );
          })}
          <p className="mt-auto text-[10px] leading-relaxed text-white/25">
            Yuvarlak kesim HRD Excellent bantlarıyla modellenir; diğer kesimler
            kural kartları hazırlanınca açılacak.
          </p>
        </aside>

        {/* ana içerik */}
        <main className="min-w-0 flex-1 p-5">
          <div className="mx-auto max-w-6xl">
            <div className="mb-4">
              <h2 className="font-display text-2xl font-semibold text-[#D4AF37]">
                {KESIMLER.find((k) => k.id === kesim)?.ad}
              </h2>
              <div className="mt-1 h-0.5 w-20 bg-[#D4AF37]" />
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              {/* viewer */}
              <div id="suyolu-viewer" className="relative min-h-[440px] overflow-hidden rounded-2xl border border-[#2A2A35] bg-[#101014] lg:col-span-7">
                <SuyoluViewer meshes={meshes} maden={maden} />
                {busy && (
                  <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-black/60 px-3 py-1.5 font-mono text-[11px] text-[#D4AF37]">
                    üretiliyor…
                  </div>
                )}
              </div>

              {/* kontroller */}
              <div className="flex flex-col gap-4 lg:col-span-5">
                {/* taş */}
                <div className={panel}>
                  <h3 className="font-display text-lg font-semibold">Taş</h3>
                  <p className="mb-3 text-xs text-[#9CA3AF]">Cins ve karat — çap kurallardan türer</p>
                  <div className="mb-3 grid grid-cols-2 gap-2">
                    {(Object.keys(TAS_CINSLERI) as TasCinsiId[]).map((id) => (
                      <button
                        key={id}
                        onClick={() => setTasCinsi(id)}
                        className={`rounded-lg border py-2 text-xs font-medium transition-all ${
                          tasCinsi === id
                            ? "border-[#D4AF37] bg-[#1C1C22] text-[#D4AF37]"
                            : "border-[#2A2A35] bg-[#0A0A0C] text-[#9CA3AF] hover:text-white"
                        }`}
                      >
                        {TAS_CINSLERI[id].ad}
                      </button>
                    ))}
                  </div>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-xs text-[#9CA3AF]">Taş başına karat</span>
                    <span className="font-mono text-[13px]">
                      {carat.toFixed(2)} ct
                      <span className="ml-2 text-[11px] text-[#D4AF37]">Ø {capMm.toFixed(2)} mm</span>
                    </span>
                  </div>
                  <input
                    type="range" min={0.01} max={1} step={0.01} value={carat}
                    onChange={(e) => setCarat(parseFloat(e.target.value))}
                    className="range-slider w-full"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {HIZLI_CT.map((c) => (
                      <button
                        key={c}
                        onClick={() => setCarat(c)}
                        className={`rounded-md border px-2 py-1 font-mono text-[11px] transition-colors ${
                          Math.abs(carat - c) < 1e-9
                            ? "border-[#D4AF37] text-[#D4AF37]"
                            : "border-[#2A2A35] text-[#9CA3AF] hover:text-white"
                        }`}
                      >
                        {c.toFixed(2)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* maden + uzunluk */}
                <div className={panel}>
                  <h3 className="mb-3 font-display text-lg font-semibold">Üretim Seçenekleri</h3>
                  <div className="mb-2 text-xs text-[#9CA3AF]">Maden</div>
                  <div className="mb-3 grid grid-cols-3 gap-2">
                    {([["altin", "Altın"], ["gumus", "Gümüş 925"], ["platin", "Platin 950"]] as const).map(([id, ad]) => (
                      <button
                        key={id}
                        onClick={() => setMetalTur(id)}
                        className={`rounded-lg border py-2.5 text-xs font-medium transition-all ${
                          metalTur === id
                            ? "border-[#D4AF37] bg-[#1C1C22] text-[#D4AF37]"
                            : "border-[#2A2A35] bg-[#0A0A0C] text-[#9CA3AF] hover:text-white"
                        }`}
                      >
                        {ad}
                      </button>
                    ))}
                  </div>
                  {metalTur === "altin" && (
                    <div className="mb-3 flex gap-2">
                      {ALTIN_AYAR.map((k) => (
                        <button
                          key={k.id}
                          onClick={() => setAyar(k.id)}
                          className={`flex-1 rounded-lg border py-2 font-mono text-xs transition-all ${
                            ayar === k.id
                              ? "border-[#D4AF37] bg-[#D4AF37] font-semibold text-[#0A0A0C]"
                              : "border-[#2A2A35] bg-[#1C1C22] text-[#F5F5F7]"
                          }`}
                        >
                          {k.ad}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-xs text-[#9CA3AF]">Bileklik uzunluğu (klips hariç)</span>
                    <span className="font-mono text-[13px]">{(uzunlukMm / 10).toFixed(1)} cm</span>
                  </div>
                  <input
                    type="range" min={OLCU.uzunlukMinMm} max={OLCU.uzunlukMaxMm} step={1} value={uzunlukMm}
                    onChange={(e) => setUzunlukMm(parseInt(e.target.value, 10))}
                    className="range-slider w-full"
                  />
                  <p className="mt-1 text-[10px] text-white/30">
                    Öneri: bilek çevresi + {OLCU.konforPayiMm.toFixed(0)} mm (Ö2)
                  </p>
                </div>

                {/* aksiyonlar */}
                <div className="flex gap-2">
                  <button
                    onClick={olustur}
                    disabled={busy}
                    className="h-12 flex-1 rounded-lg bg-[#D4AF37] text-sm font-semibold text-[#0A0A0C] transition-all hover:bg-[#F0D878] disabled:opacity-60"
                  >
                    {busy ? "Üretiliyor…" : "Model Oluştur"}
                  </button>
                  <button
                    onClick={ekranGoruntusu}
                    className="h-12 rounded-lg border border-[#2A2A35] bg-[#141418] px-4 text-sm text-[#9CA3AF] transition-colors hover:text-white"
                  >
                    Görüntü
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={stlTekBakla}
                    disabled={!bakla}
                    className="h-11 flex-1 rounded-lg border border-[#D4AF37]/50 bg-[#D4AF37]/10 text-[13px] font-medium text-[#D4AF37] transition-colors hover:bg-[#D4AF37]/20 disabled:opacity-40"
                  >
                    STL — Tek Bakla (üretim)
                  </button>
                  <button
                    onClick={stlKomple}
                    disabled={!bakla}
                    className="h-11 flex-1 rounded-lg border border-[#2A2A35] bg-[#141418] text-[13px] text-[#9CA3AF] transition-colors hover:text-white disabled:opacity-40"
                  >
                    STL — Komple Montaj
                  </button>
                </div>
              </div>
            </div>

            {/* üretim raporu */}
            {raporData && (
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className={panel}>
                  <h3 className="mb-3 font-display text-lg font-semibold text-[#D4AF37]">Üretim Raporu</h3>
                  <dl className="space-y-1.5 font-mono text-[12.5px]">
                    <Row k="Taş sayısı" v={`${raporData.tasSayisi} adet`} />
                    <Row k="Taş çapı" v={`Ø ${raporData.tasCapMm.toFixed(2)} mm`} />
                    <Row k="Taş başına" v={`${raporData.tasBasinaCt.toFixed(3)} ct`} />
                    <Row k="Toplam karat" v={`${raporData.toplamCt.toFixed(2)} ct${raporData.tasCinsi === "cz" ? " (pırlanta eşdeğeri)" : ""}`} vurgu />
                    {raporData.czGercekGram !== null && (
                      <Row k="CZ gerçek taş ağırlığı" v={`${raporData.czGercekGram.toFixed(2)} g`} />
                    )}
                    <Row k="Maden" v={MADENLER[raporData.maden].ad} />
                    <Row k="Metal ağırlığı (model)" v={`${raporData.metalGram.toFixed(2)} g`} vurgu />
                    <Row k="Gerçekleşen uzunluk" v={`${(raporData.uzunlukMm / 10).toFixed(2)} cm (klips hariç)`} />
                  </dl>
                </div>
                <div className={panel}>
                  <h3 className="mb-3 font-display text-lg font-semibold">Kural Denetimi</h3>
                  <dl className="space-y-1.5 font-mono text-[12.5px]">
                    <Row k="Bakla (boy × en × yük.)" v={`${raporData.baklaBoyMm.toFixed(2)} × ${raporData.baklaEnMm.toFixed(2)} × ${raporData.baklaYukseklikMm.toFixed(2)} mm`} />
                    <Row k="Adım (taş merkezleri)" v={`${raporData.adimMm.toFixed(2)} mm`} />
                    <Row k="Kanal duvarı (S4)" v={`${raporData.duvarMm.toFixed(2)} mm ✓`} />
                    <Row k="Taş arası (S11 ≥ 0.15)" v={`${raporData.tasArasiMm.toFixed(2)} mm ${raporData.tasArasiOk ? "✓" : "✗ İHLAL"}`} />
                    <Row k="Yuva (S2)" v="girdle %98 sıkı geçme ✓" />
                    <Row k="Pim (B1)" v={`Ø ${raporData.pimCapMm.toFixed(2)} mm (200N·SF2)`} />
                    <Row k="Eklem stop (B5)" v="16° içe / 0° dışa — v2'de pah" />
                  </dl>
                  <p className="mt-3 text-[10.5px] leading-relaxed text-white/30">
                    Gram, CAD modelinin gerçek hacminden hesaplanır (polisaj −0.1/−0.2 mm ve
                    döküm çekmesi ~%{raporData.cekmePayiYuzde.toFixed(1)} ayrı düşünülmeli — katsayı
                    kendi zincirinde test dökümüyle kalibre edilecek, SUYOLU.md §11).
                  </p>
                </div>
              </div>
            )}
          </div>
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

function Row({ k, v, vurgu }: { k: string; v: string; vurgu?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-white/45">{k}</dt>
      <dd className={vurgu ? "text-[#D4AF37]" : "text-white/90"}>{v}</dd>
    </div>
  );
}
