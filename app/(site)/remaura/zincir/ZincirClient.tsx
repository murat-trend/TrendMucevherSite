"use client";

// ZİNCİR — parametrik zincir üretim aracı. SADECE süper-admin.
// Görsel dil: suyolu kalıbı (koyu #0A0A0C + altın #D4AF37, sol tip menüsü,
// 3D viewer, sağ kontroller, üretim raporu). Motor: lib/remaura/zincir
// (ZINCIR.md kural kütüphanesi — her sayı kural kimliği taşır, keyfi sayı yok).
// Ajur delme, ajur sayfasının desen kütüphanesini yeniden kullanır.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ZincirViewer, ViewMesh } from "./ZincirViewer";
import {
  MADENLER, MadenId, TIPLER, ZincirTipId, TRAS, AJUR, OLCU,
} from "@/lib/remaura/zincir/kurallar";
import { geoTuret, dizilim, montajDuz, montajDaire, rapor, ZincirRapor } from "@/lib/remaura/zincir/zincir";
import { baklaUret, autoAjur, dizilimDenetim, KesisimSonuc, BaklaUretim } from "@/lib/remaura/zincir/islem";
import { toBinarySTL } from "@/lib/remaura/zincir/stl";
import { PATTERNS } from "@/app/(site)/remaura/ajur/lib/patterns";

const TIP_SIRA: ZincirTipId[] = ["kuba", "gurmet", "figaro", "forse", "doc"];

// K2: makine örgüsü tipler — CAD/döküm anlamsız, menüde kilitli gösterilir
const KILITLI = [
  { ad: "Halat (rope)" }, { ad: "Venedik (box)" }, { ad: "Balıksırtı" },
  { ad: "Yılan" }, { ad: "Spiga" },
];

const AJUR_DESENLERI = PATTERNS.filter((p) => p.tile);

const ALTIN_AYAR: { id: MadenId; ad: string }[] = [
  { id: "au8", ad: "8K" }, { id: "au14", ad: "14K" },
  { id: "au18", ad: "18K" }, { id: "au22", ad: "22K" },
];

const UZUNLUK_PRESET = [
  { ad: "Bileklik K 18", mm: 180 }, { ad: "Bileklik E 21", mm: 210 },
  { ad: "Kolye 45", mm: 450 }, { ad: "Kolye 50", mm: 500 },
  { ad: "Kolye 55", mm: 550 }, { ad: "Kolye 60", mm: 600 },
];

type UretimSonuc = {
  kisa: BaklaUretim;
  uzun: BaklaUretim | null;
  raporData: ZincirRapor;
};

export function ZincirClient() {
  const [tip, setTip] = useState<ZincirTipId>("kuba");
  const [genislikMm, setGenislikMm] = useState<number>(OLCU.genislikVarsayilanMm);
  const [uzunlukMm, setUzunlukMm] = useState<number>(210);
  const [metalTur, setMetalTur] = useState<"altin" | "gumus" | "platin">("gumus");
  const [ayar, setAyar] = useState<MadenId>("au14");
  const [trasOrani, setTrasOrani] = useState<number>(TIPLER.kuba.trasVarsayilan);
  const [ajurAcik, setAjurAcik] = useState(false);
  const [ajurDesen, setAjurDesen] = useState<string>("petek");
  const [ajurDoz, setAjurDoz] = useState(0.7);
  const [busy, setBusy] = useState(false);
  const [gorunum, setGorunum] = useState<"yerde" | "kolyede">("yerde");
  const [sonuc, setSonuc] = useState<UretimSonuc | null>(null);
  const [denetim, setDenetim] = useState<KesisimSonuc | "calisiyor" | null>(null);
  const [meshes, setMeshes] = useState<ViewMesh[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const uretimSayac = useRef(0);

  const maden: MadenId = metalTur === "gumus" ? "ag925" : metalTur === "platin" ? "pt950" : ayar;
  const kart = TIPLER[tip];
  const telCapMm = useMemo(() => genislikMm / kart.telOran, [genislikMm, kart]);

  const bildir = useCallback((m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2400);
  }, []);

  const kurMeshler = useCallback((s: UretimSonuc, g: "yerde" | "kolyede") => {
    const diz = dizilim(s.raporData.tip, genislikMm, uzunlukMm);
    const set = {
      kisa: s.kisa.mesh,
      kisaAyna: s.kisa.mesh, // curb ailesi özdeş baklalar — ayna kullanılmıyor
      uzun: s.uzun?.mesh,
      uzunAyna: s.uzun?.mesh,
    };
    const m = g === "kolyede"
      ? montajDaire(set, diz.yerler, diz.gercekUzunlukMm)
      : montajDuz(set, diz.yerler);
    setMeshes([m]);
  }, [genislikMm, uzunlukMm]);

  const olustur = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    const benimSiram = ++uretimSayac.current;
    try {
      const { kisa, uzun } = geoTuret(tip, genislikMm);
      const k = TIPLER[tip];
      const ajur = ajurAcik && k.ajurUygun ? autoAjur(kisa, ajurDesen, ajurDoz) : null;
      const bKisa = await baklaUret({ ...kisa, yatisDeg: 0, trasOrani: k.bukumDeg ? trasOrani : 0, ajur });
      const bUzun = uzun
        ? await baklaUret({
            ...uzun, yatisDeg: 0, trasOrani: k.bukumDeg ? trasOrani : 0,
            ajur: ajurAcik && k.ajurUygun ? autoAjur(uzun, ajurDesen, ajurDoz) : null,
          })
        : null;
      if (benimSiram !== uretimSayac.current) return; // eski üretim, at
      const r = rapor({
        tip, genislikMm, uzunlukMm, maden,
        hacimKisaMm3: bKisa.hacimMm3, hacimDoluKisaMm3: bKisa.hacimDoluMm3,
        hacimUzunMm3: bUzun?.hacimMm3, hacimDoluUzunMm3: bUzun?.hacimDoluMm3,
        kalinlikMm: bKisa.kalinlikMm,
        delikSayisi: bKisa.delikSayisi,
        delikAlanOrani: bKisa.delikAlanOrani,
      });
      const s: UretimSonuc = { kisa: bKisa, uzun: bUzun, raporData: r };
      setSonuc(s);
      kurMeshler(s, gorunum);
      bildir("Model oluşturuldu");

      // D4 + C2 denetimi arka planda (7 CSG kurulumu — birkaç sn sürebilir)
      setDenetim("calisiyor");
      dizilimDenetim({
        geo: kisa, yatisDeg: 0, trasOrani: k.bukumDeg ? trasOrani : 0,
        adimMm: r.adimOrtMm, komsuRotXDeg: k.bukumDeg ? 0 : 90,
      }).then((d) => {
        if (benimSiram === uretimSayac.current) setDenetim(d);
      }).catch(() => {
        if (benimSiram === uretimSayac.current) setDenetim(null);
      });
    } catch {
      bildir("Model üretilemedi — parametreleri kontrol et");
    } finally {
      setBusy(false);
    }
  }, [busy, tip, genislikMm, uzunlukMm, maden, trasOrani, ajurAcik, ajurDesen, ajurDoz, gorunum, kurMeshler, bildir]);

  const gorunumDegistir = (g: "yerde" | "kolyede") => {
    setGorunum(g);
    if (sonuc) kurMeshler(sonuc, g);
  };

  const tipSec = (id: ZincirTipId) => {
    setTip(id);
    setTrasOrani(TIPLER[id].trasVarsayilan);
    if (!TIPLER[id].ajurUygun) setAjurAcik(false);
  };

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
    if (!sonuc) return;
    indir(toBinarySTL([sonuc.kisa.mesh], "Remaura Zincir — tek bakla"),
      `zincir-${tip}-bakla-${genislikMm}mm.stl`);
    bildir("Tek bakla STL indirildi (üretim birimi)");
  };
  // KOMPLE: iç içe geçmiş zincir — print-in-place + tek döküm adayı (C1);
  // C2/C3 uyarıları rapor panelinde
  const stlKomple = () => {
    if (!sonuc) return;
    const diz = dizilim(tip, genislikMm, uzunlukMm);
    const set = {
      kisa: sonuc.kisa.mesh, kisaAyna: sonuc.kisa.mesh,
      uzun: sonuc.uzun?.mesh, uzunAyna: sonuc.uzun?.mesh,
    };
    indir(toBinarySTL([montajDuz(set, diz.yerler)], "Remaura Zincir — komple"),
      `zincir-${tip}-${(sonuc.raporData.gercekUzunlukMm / 10).toFixed(0)}cm-${genislikMm}mm.stl`);
    bildir(`Komple STL indirildi: ${sonuc.raporData.n} bakla iç içe (C2 boşluk denetimine bak)`);
  };

  const ekranGoruntusu = () => {
    const canvas = document.querySelector<HTMLCanvasElement>("#zincir-viewer canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `zincir-${tip}-${genislikMm}mm-${Date.now()}.png`;
    a.click();
    bildir("Ekran görüntüsü indirildi");
  };

  const panel = "rounded-xl border border-[#2A2A35] bg-[#141418] p-4";
  const r = sonuc?.raporData ?? null;

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#F5F5F7]">
      {/* header */}
      <div className="flex items-center gap-3 border-b border-[#2A2A35] px-5 py-3">
        <span className="rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3 py-1 text-[11px] font-medium tracking-wide text-[#D4AF37]">
          ZİNCİR
        </span>
        <h1 className="font-display text-xl font-medium tracking-[-0.02em]">Zincir Stüdyosu</h1>
        <span className="ml-auto font-mono text-[11px] text-white/35">kural motoru: ZINCIR.md · süper-admin</span>
      </div>

      <div className="flex">
        {/* sol: tip menüsü */}
        <aside className="hidden w-64 shrink-0 flex-col gap-2 border-r border-[#2A2A35] bg-[#141418] p-4 lg:flex">
          <div className="mb-1">
            <h2 className="font-display text-base font-semibold text-[#D4AF37]">Zincir Tipleri</h2>
            <div className="mt-1 h-0.5 w-10 bg-[#D4AF37]" />
          </div>
          {TIP_SIRA.map((id) => {
            const k = TIPLER[id];
            const aktif = tip === id;
            return (
              <button
                key={id}
                onClick={() => tipSec(id)}
                className={`flex h-14 flex-col justify-center rounded-xl border px-4 text-left transition-all ${
                  aktif
                    ? "border-[#D4AF37] bg-[#1C1C22] text-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.15)]"
                    : "border-transparent text-[#F5F5F7] hover:bg-[#1C1C22]"
                }`}
              >
                <span className="text-sm font-medium">{k.ad}</span>
                <span className="text-[10px] text-white/30">{k.aciklama}</span>
              </button>
            );
          })}
          <div className="mt-2 border-t border-[#2A2A35] pt-2">
            {KILITLI.map((k) => (
              <div key={k.ad} className="flex h-9 items-center justify-between px-4 text-[12px] text-white/20">
                <span>{k.ad}</span>
                <span className="text-[9px]">makine örgüsü</span>
              </div>
            ))}
          </div>
          <p className="mt-auto text-[10px] leading-relaxed text-white/25">
            Örgü tipleri (halat, yılan…) tekil bakla CAD&apos;iyle üretilemez —
            zincir makinesi işidir (ZINCIR.md K2).
          </p>
        </aside>

        {/* ana içerik */}
        <main className="min-w-0 flex-1 p-5">
          <div className="mx-auto max-w-6xl">
            <div className="mb-4">
              <h2 className="font-display text-2xl font-semibold text-[#D4AF37]">{kart.ad}</h2>
              <div className="mt-1 h-0.5 w-20 bg-[#D4AF37]" />
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              {/* viewer */}
              <div id="zincir-viewer" className="relative min-h-[440px] overflow-hidden rounded-2xl border border-[#2A2A35] bg-[#101014] lg:col-span-7">
                <ZincirViewer meshes={meshes} maden={maden} fitKey={`${gorunum}-${tip}`} />
                {busy && (
                  <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-black/60 px-3 py-1.5 font-mono text-[11px] text-[#D4AF37]">
                    üretiliyor…
                  </div>
                )}
                <div className="absolute right-3 top-3 flex overflow-hidden rounded-lg border border-[#2A2A35] bg-black/50 font-mono text-[11px]">
                  {([["yerde", "Yerde"], ["kolyede", "Kolyede"]] as const).map(([id, ad]) => (
                    <button
                      key={id}
                      onClick={() => gorunumDegistir(id)}
                      className={`px-3 py-1.5 transition-colors ${
                        gorunum === id ? "bg-[#D4AF37] font-semibold text-[#0A0A0C]" : "text-[#9CA3AF] hover:text-white"
                      }`}
                    >
                      {ad}
                    </button>
                  ))}
                </div>
              </div>

              {/* kontroller */}
              <div className="flex flex-col gap-4 lg:col-span-5">
                {/* ölçüler */}
                <div className={panel}>
                  <h3 className="font-display text-lg font-semibold">Ölçüler</h3>
                  <p className="mb-3 text-xs text-[#9CA3AF]">Genişlikten tel çapı ve bakla kurallardan türer (B1-B4)</p>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-xs text-[#9CA3AF]">Zincir genişliği</span>
                    <span className="font-mono text-[13px]">
                      {genislikMm.toFixed(1)} mm
                      <span className="ml-2 text-[11px] text-[#D4AF37]">tel Ø {telCapMm.toFixed(2)} mm</span>
                    </span>
                  </div>
                  <input
                    type="range" min={OLCU.genislikMinMm} max={OLCU.genislikMaxMm} step={0.5} value={genislikMm}
                    onChange={(e) => setGenislikMm(parseFloat(e.target.value))}
                    className="range-slider w-full"
                  />
                  <div className="mb-1.5 mt-4 flex items-baseline justify-between">
                    <span className="text-xs text-[#9CA3AF]">Uzunluk (kilit hariç)</span>
                    <span className="font-mono text-[13px]">{(uzunlukMm / 10).toFixed(1)} cm</span>
                  </div>
                  <input
                    type="range" min={OLCU.uzunlukMinMm} max={OLCU.uzunlukMaxMm} step={5} value={uzunlukMm}
                    onChange={(e) => setUzunlukMm(parseInt(e.target.value, 10))}
                    className="range-slider w-full"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {UZUNLUK_PRESET.map((p) => (
                      <button
                        key={p.mm}
                        onClick={() => setUzunlukMm(p.mm)}
                        className={`rounded-md border px-2 py-1 font-mono text-[11px] transition-colors ${
                          uzunlukMm === p.mm
                            ? "border-[#D4AF37] text-[#D4AF37]"
                            : "border-[#2A2A35] text-[#9CA3AF] hover:text-white"
                        }`}
                      >
                        {p.ad}
                      </button>
                    ))}
                  </div>
                </div>

                {/* maden + traş + ajur */}
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

                  {kart.bukumDeg !== 0 && (
                    <>
                      <div className="mb-1.5 flex items-baseline justify-between">
                        <span className="text-xs text-[#9CA3AF]">Traş (diamond-cut, T1-T4)</span>
                        <span className="font-mono text-[13px]">%{(trasOrani * 100).toFixed(0)}</span>
                      </div>
                      <input
                        type="range" min={0} max={TRAS.maxOran} step={0.01} value={trasOrani}
                        onChange={(e) => setTrasOrani(parseFloat(e.target.value))}
                        className="range-slider w-full"
                      />
                    </>
                  )}

                  {kart.ajurUygun && (
                    <div className="mt-3 rounded-lg border border-[#2A2A35] bg-[#0A0A0C] p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[#F5F5F7]">Ajur hafifletme (A1-A4)</span>
                        <button
                          onClick={() => setAjurAcik((v) => !v)}
                          className={`h-6 w-11 rounded-full border transition-colors ${
                            ajurAcik ? "border-[#D4AF37] bg-[#D4AF37]/30" : "border-[#2A2A35] bg-[#141418]"
                          }`}
                        >
                          <span className={`block h-4 w-4 rounded-full bg-[#D4AF37] transition-transform ${ajurAcik ? "translate-x-6" : "translate-x-1"}`} />
                        </button>
                      </div>
                      {ajurAcik && (
                        <>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {AJUR_DESENLERI.map((d) => (
                              <button
                                key={d.id}
                                onClick={() => setAjurDesen(d.id)}
                                className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${
                                  ajurDesen === d.id
                                    ? "border-[#D4AF37] text-[#D4AF37]"
                                    : "border-[#2A2A35] text-[#9CA3AF] hover:text-white"
                                }`}
                              >
                                {d.labelTr}
                              </button>
                            ))}
                          </div>
                          <div className="mb-1 mt-2 flex items-baseline justify-between">
                            <span className="text-[11px] text-[#9CA3AF]">Doz</span>
                            <span className="font-mono text-[12px]">%{(ajurDoz * 100).toFixed(0)}</span>
                          </div>
                          <input
                            type="range" min={0.3} max={1} step={0.05} value={ajurDoz}
                            onChange={(e) => setAjurDoz(parseFloat(e.target.value))}
                            className="range-slider w-full"
                          />
                          <p className="mt-1 text-[10px] leading-relaxed text-white/30">
                            Delikler yalnız düz yan bantlara açılır; uç kıvrımlar
                            (yük bölgesi) korunur (A1-A2). Duvar ≥ {AJUR.duvarMm} mm.
                          </p>
                        </>
                      )}
                    </div>
                  )}
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
                    disabled={!sonuc}
                    className="h-11 flex-1 rounded-lg border border-[#D4AF37]/50 bg-[#D4AF37]/10 text-[13px] font-medium text-[#D4AF37] transition-colors hover:bg-[#D4AF37]/20 disabled:opacity-40"
                  >
                    STL — Tek Bakla
                  </button>
                  <button
                    onClick={stlKomple}
                    disabled={!sonuc}
                    className="h-11 flex-1 rounded-lg border border-[#2A2A35] bg-[#141418] text-[13px] text-[#9CA3AF] transition-colors hover:text-white disabled:opacity-40"
                  >
                    STL — Komple (iç içe)
                  </button>
                </div>
              </div>
            </div>

            {/* üretim raporu */}
            {r && (
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className={panel}>
                  <h3 className="mb-3 font-display text-lg font-semibold text-[#D4AF37]">Üretim Raporu</h3>
                  <dl className="space-y-1.5 font-mono text-[12.5px]">
                    <Row k="Bakla sayısı" v={`${r.n} adet`} />
                    <Row k="Tel çapı" v={`Ø ${r.telCapMm.toFixed(2)} mm`} />
                    <Row k="Bakla (dış boy × en)" v={`${r.baklaDisBoyMm.toFixed(2)} × ${r.baklaDisEnMm.toFixed(2)} mm`} />
                    <Row k="Kalınlık (traş sonrası)" v={`${r.kalinlikMm.toFixed(2)} mm`} />
                    <Row k="Adım (ort.)" v={`${r.adimOrtMm.toFixed(2)} mm`} />
                    <Row k="Gerçekleşen uzunluk" v={`${(r.gercekUzunlukMm / 10).toFixed(1)} cm (kilit hariç)`} />
                    <Row k="Maden" v={MADENLER[r.maden].ad} />
                    <Row k="Metal ağırlığı (model)" v={`${r.gram.toFixed(1)} g · ${r.gCm.toFixed(2)} g/cm`} vurgu />
                    {r.hafifletmeYuzde > 0.05 && (
                      <Row k="Ajur kazancı" v={`−%${r.hafifletmeYuzde.toFixed(1)} (${r.delikSayisi} delik/bakla)`} vurgu />
                    )}
                  </dl>
                </div>
                <div className={panel}>
                  <h3 className="mb-3 font-display text-lg font-semibold">Kural Denetimi</h3>
                  <dl className="space-y-1.5 font-mono text-[12.5px]">
                    {denetim === "calisiyor" && <Row k="Kesişim denetimi (D4)" v="çalışıyor…" />}
                    {denetim && denetim !== "calisiyor" && (
                      <>
                        <Row k="Komşu çakışma (D4)" v={denetim.komsuCakismaMm3 < 1e-6 ? "0 ✓" : `${denetim.komsuCakismaMm3.toFixed(3)} mm³ ✗ İHLAL`} />
                        <Row k="2. komşu çakışma (D4)" v={denetim.ikinciCakismaMm3 < 1e-6 ? "0 ✓" : `${denetim.ikinciCakismaMm3.toFixed(3)} mm³ ✗ İHLAL`} />
                        <Row k="Boşluk ≥0.2 (C2 mutlak)" v={denetim.bosluk02 ? "✓" : "✗ baklalar kaynayabilir"} />
                        <Row k="Boşluk ≥0.3 (C2 önerilen)" v={denetim.bosluk03 ? "✓" : "— temaslı dizilim (uyarı)"} />
                      </>
                    )}
                    {r.delikAlanOrani > 0 && (
                      <Row
                        k="Delik alan oranı (A3)"
                        v={`%${(r.delikAlanOrani * 100).toFixed(0)} ${r.delikAlanOrani > 0.3 ? "✗ tavan aşıldı" : r.delikAlanOrani > 0.2 ? "△ E kaybı>%26" : "✓"}`}
                      />
                    )}
                    <Row k="Bükülme yarıçapı (D3)" v={Number.isFinite(r.bukulmeYaricapiMm) ? `≈ ${r.bukulmeYaricapiMm.toFixed(0)} mm` : "—"} />
                  </dl>
                  <p className="mt-3 text-[10.5px] leading-relaxed text-white/30">
                    Gram, CAD modelinin gerçek hacminden hesaplanır; döküm çekmesi
                    ~%{r.cekmePayiYuzde.toFixed(1)} ve polisaj kaybı ayrı düşünülmeli (C4-C5,
                    katsayı test dökümüyle kalibre — ZINCIR.md §9). Komple STL iç içe
                    üründür: üçüncü-parti döküm servisleri reddedebilir (C3) —
                    kendi dökümhane akışı veya tek bakla + montaj önerilir.
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
