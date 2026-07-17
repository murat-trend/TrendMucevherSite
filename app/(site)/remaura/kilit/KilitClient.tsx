"use client";

// KİLİT — parametrik kilit üretim aracı. SADECE süper-admin.
// Zincir ailesinin kardeşi: kurallar lib/remaura/kilit/KILIT.md (keyfi sayı
// yok). Zincir sayfası dersleri baştan uygulanır: MAT viewer varsayılan,
// tip izolasyonu (değişimde anında temizle + otomatik üret), parça-başına STL.
// Üretim hafif (küçük CSG) → parametre değişiminde OTOMATİK üretim (debounce).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KilitViewer, ViewMesh, ViewerMod } from "./KilitViewer";
import {
  MADENLER, MadenId, TIPLER, KilitTipId, TOGGLE, ISTAKOZ_TABLO, kilitOner, OLCU,
} from "@/lib/remaura/kilit/kurallar";
import { kutuKilitUret, toggleUret, kancaUret, KilitUretim } from "@/lib/remaura/kilit/tipler";
import { toBinarySTL } from "@/lib/remaura/kilit/stl";

const TIP_SIRA: KilitTipId[] = ["kutu", "toggle", "kanca", "istakoz", "miknatis"];

const ALTIN_AYAR: { id: MadenId; ad: string }[] = [
  { id: "au8", ad: "8K" }, { id: "au14", ad: "14K" },
  { id: "au18", ad: "18K" }, { id: "au22", ad: "22K" },
];

export function KilitClient() {
  const [tip, setTip] = useState<KilitTipId>("kutu");
  const [zincirGenislikMm, setZincirGenislikMm] = useState<number>(OLCU.zincirGenislikVarsayilanMm);
  const [zincirTelMm, setZincirTelMm] = useState<number>(OLCU.zincirTelVarsayilanMm);
  const [toggleIcCapMm, setToggleIcCapMm] = useState<number>(TOGGLE.icCapVarsayilanMm);
  const [toggleBarOran, setToggleBarOran] = useState<number>(TOGGLE.barOran);
  const [karsiHalkaTelMm, setKarsiHalkaTelMm] = useState<number>(1.5);
  const [metalTur, setMetalTur] = useState<"altin" | "gumus" | "platin">("gumus");
  const [ayar, setAyar] = useState<MadenId>("au14");
  const [viewerMod, setViewerMod] = useState<ViewerMod>("mat");
  const [busy, setBusy] = useState(false);
  const [sonuc, setSonuc] = useState<KilitUretim | null>(null);
  const [meshes, setMeshes] = useState<ViewMesh[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const uretimSayac = useRef(0);

  const maden: MadenId = metalTur === "gumus" ? "ag925" : metalTur === "platin" ? "pt950" : ayar;
  const kart = TIPLER[tip];
  const uc = kart.uretim; // dokum | hazir | v2

  const bildir = useCallback((m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2400);
  }, []);

  // ---- otomatik üretim (debounce; tip izolasyonu: bayat sonuç sayaçla elenir)
  useEffect(() => {
    if (uc !== "dokum") {
      setSonuc(null);
      setMeshes([]);
      return;
    }
    const benimSiram = ++uretimSayac.current;
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const u =
          tip === "kutu" ? await kutuKilitUret(zincirGenislikMm)
          : tip === "toggle" ? await toggleUret(toggleIcCapMm, zincirTelMm, toggleBarOran)
          : await kancaUret(zincirTelMm, karsiHalkaTelMm);
        if (benimSiram !== uretimSayac.current) return;
        setSonuc(u);
        setMeshes(u.parcalar.map((p) => ({ positions: p.mesh.positions, indices: p.mesh.indices })));
      } catch {
        if (benimSiram === uretimSayac.current) bildir("Üretilemedi — parametreleri kontrol et");
      } finally {
        if (benimSiram === uretimSayac.current) setBusy(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [tip, uc, zincirGenislikMm, zincirTelMm, toggleIcCapMm, toggleBarOran, karsiHalkaTelMm, bildir]);

  const tipSec = (id: KilitTipId) => {
    if (id === tip) return;
    setTip(id);
    // tip izolasyonu: eski model anında gider (üretim effect'i yenisini kurar)
    setSonuc(null);
    setMeshes([]);
  };

  const indir = (buf: ArrayBuffer, ad: string) => {
    const url = URL.createObjectURL(new Blob([buf], { type: "model/stl" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = ad;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toplamGram = useMemo(() => {
    if (!sonuc) return 0;
    return sonuc.parcalar.reduce((s, p) => s + p.hacimMm3, 0) * MADENLER[maden].yogunlukGmm3;
  }, [sonuc, maden]);

  const panel = "rounded-xl border border-[#2A2A35] bg-[#141418] p-4";

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#F5F5F7]">
      <div className="flex items-center gap-3 border-b border-[#2A2A35] px-5 py-3">
        <span className="rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3 py-1 text-[11px] font-medium tracking-wide text-[#D4AF37]">
          KİLİT
        </span>
        <h1 className="font-display text-xl font-medium tracking-[-0.02em]">Kilit Stüdyosu</h1>
        <span className="ml-auto font-mono text-[11px] text-white/35">kural motoru: KILIT.md · süper-admin</span>
      </div>

      <div className="flex">
        {/* sol: tip kataloğu */}
        <aside className="hidden w-64 shrink-0 flex-col gap-1.5 border-r border-[#2A2A35] bg-[#141418] p-4 lg:flex">
          <div className="mb-1">
            <h2 className="font-display text-base font-semibold text-[#D4AF37]">Kilit Tipleri</h2>
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
                <span className="flex items-center gap-2 text-sm font-medium">
                  {k.ad}
                  <span className="rounded border border-[#2A2A35] px-1 py-0.5 text-[8.5px] font-normal text-white/35">{k.rozet}</span>
                </span>
                <span className="truncate text-[10px] text-white/30">{k.aciklama}</span>
              </button>
            );
          })}
          <p className="mt-auto text-[10px] leading-relaxed text-white/25">
            Dil ve sarmal yaylar DÖKÜLMEZ (tavlama yayı öldürür — KILIT.md §0);
            araç dökülür/dökülmez haritasını rozetlerle gösterir.
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
              {/* viewer / bilgi alanı */}
              <div id="kilit-viewer" className="relative min-h-[440px] overflow-hidden rounded-2xl border border-[#2A2A35] bg-[#101014] lg:col-span-7">
                {uc === "dokum" ? (
                  <>
                    <KilitViewer meshes={meshes} maden={maden} fitKey={tip} mod={viewerMod} />
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
                  </>
                ) : uc === "hazir" ? (
                  <div className="flex h-full flex-col justify-center gap-3 p-8">
                    <h3 className="font-display text-lg font-semibold">İstakoz — hazır satın alınır (HZ1)</h3>
                    <p className="text-sm text-white/50">
                      İç çelik sarmal yay dökümle üretilemez; boy zincire göre seçilir:
                    </p>
                    <table className="w-full max-w-sm font-mono text-[12.5px]">
                      <tbody>
                        {ISTAKOZ_TABLO.map((r) => (
                          <tr key={r.boyMm} className="border-b border-[#2A2A35]">
                            <td className="py-1.5 text-[#D4AF37]">{r.boyMm} mm</td>
                            <td className="py-1.5 text-white/60">{r.zincir}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-[11px] text-white/30">
                      Yaylı halka istakozdan zayıftır — yalnız hafif kolye (HZ2).
                    </p>
                  </div>
                ) : (
                  <div className="flex h-full flex-col justify-center gap-3 p-8">
                    <h3 className="font-display text-lg font-semibold">Mıknatıslı kilit — v2</h3>
                    <p className="max-w-md text-sm leading-relaxed text-white/50">
                      Yuva dökülür, NdFeB mıknatıs SONRADAN yapıştırılır (Curie ~310°C,
                      döküm &gt;900°C — mıknatıs ölür; MB1). Tipik boylar 5×5–8×6 mm,
                      4.8mm ≈ 6.4N çekme (MB2). Ağır bileklikte tek başına ASLA (MB3).
                      Yuva üreteci v2&apos;de eklenecek.
                    </p>
                  </div>
                )}
              </div>

              {/* kontroller */}
              <div className="flex flex-col gap-4 lg:col-span-5">
                <div className={panel}>
                  <h3 className="font-display text-lg font-semibold">
                    <span className="mr-1.5 text-[#D4AF37]">1 ·</span>Ölçüler
                  </h3>
                  <p className="mb-3 text-xs text-[#9CA3AF]">
                    {tip === "kutu"
                      ? "Kutu, zincir genişliğinden türer (KK1) — Küba serisiyle uyumlu"
                      : tip === "toggle"
                      ? "Bar boyu halka iç çapından türer (TG1: ≥2×, güvenli 2.2-2.5×)"
                      : tip === "kanca"
                      ? "Tel ve ağız zincir telinden türer (KN2) — gerilimli kullanım"
                      : "Zincirine uygun boyu tablodan seç"}
                  </p>

                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-xs text-[#9CA3AF]">Zincir genişliği</span>
                    <span className="font-mono text-[13px]">{zincirGenislikMm.toFixed(1)} mm</span>
                  </div>
                  <input
                    type="range" min={OLCU.zincirGenislikMinMm} max={OLCU.zincirGenislikMaxMm} step={0.5}
                    value={zincirGenislikMm}
                    onChange={(e) => setZincirGenislikMm(parseFloat(e.target.value))}
                    className="range-slider w-full"
                  />
                  <p className="mt-1 text-[10px] text-white/30">Öneri (GE1): {kilitOner(zincirGenislikMm)}</p>

                  {(tip === "toggle" || tip === "kanca") && (
                    <>
                      <div className="mb-1.5 mt-3 flex items-baseline justify-between">
                        <span className="text-xs text-[#9CA3AF]">Zincir tel çapı</span>
                        <span className="font-mono text-[13px]">Ø {zincirTelMm.toFixed(2)} mm</span>
                      </div>
                      <input
                        type="range" min={0.8} max={4.5} step={0.05} value={zincirTelMm}
                        onChange={(e) => setZincirTelMm(parseFloat(e.target.value))}
                        className="range-slider w-full"
                      />
                    </>
                  )}

                  {tip === "toggle" && (
                    <>
                      <div className="mb-1.5 mt-3 flex items-baseline justify-between">
                        <span className="text-xs text-[#9CA3AF]">Halka iç çapı</span>
                        <span className="font-mono text-[13px]">{toggleIcCapMm.toFixed(1)} mm</span>
                      </div>
                      <input
                        type="range" min={TOGGLE.icCapMinMm} max={TOGGLE.icCapMaxMm} step={0.5} value={toggleIcCapMm}
                        onChange={(e) => setToggleIcCapMm(parseFloat(e.target.value))}
                        className="range-slider w-full"
                      />
                      <div className="mb-1.5 mt-3 flex items-baseline justify-between">
                        <span className="text-xs text-[#9CA3AF]">Bar oranı (TG1)</span>
                        <span className="font-mono text-[13px]">{toggleBarOran.toFixed(2)}×</span>
                      </div>
                      <input
                        type="range" min={TOGGLE.barOranMin} max={TOGGLE.barOranMax} step={0.05} value={toggleBarOran}
                        onChange={(e) => setToggleBarOran(parseFloat(e.target.value))}
                        className="range-slider w-full"
                      />
                    </>
                  )}

                  {tip === "kanca" && (
                    <>
                      <div className="mb-1.5 mt-3 flex items-baseline justify-between">
                        <span className="text-xs text-[#9CA3AF]">Karşı halka teli (ağız için)</span>
                        <span className="font-mono text-[13px]">Ø {karsiHalkaTelMm.toFixed(2)} mm</span>
                      </div>
                      <input
                        type="range" min={0.8} max={3} step={0.05} value={karsiHalkaTelMm}
                        onChange={(e) => setKarsiHalkaTelMm(parseFloat(e.target.value))}
                        className="range-slider w-full"
                      />
                    </>
                  )}
                </div>

                <div className={panel}>
                  <h3 className="mb-3 font-display text-lg font-semibold">
                    <span className="mr-1.5 text-[#D4AF37]">2 ·</span>Maden
                  </h3>
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
                    <div className="flex gap-2">
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
                </div>

                {/* parçalar + STL */}
                {sonuc && (
                  <div className={panel}>
                    <div className="mb-2 flex items-baseline justify-between">
                      <h3 className="font-display text-base font-semibold">Parçalar & STL</h3>
                      <span className="font-mono text-[12px] text-[#D4AF37]">Σ {toplamGram.toFixed(2)} g</span>
                    </div>
                    {sonuc.parcalar.map((p) => (
                      <div key={p.dosyaAd} className="mb-1.5 flex items-center justify-between rounded-lg border border-[#2A2A35] bg-[#0A0A0C] px-3 py-2">
                        <div>
                          <div className="text-[12.5px]">{p.ad}</div>
                          <div className="font-mono text-[10.5px] text-white/35">
                            {(p.hacimMm3 * MADENLER[maden].yogunlukGmm3).toFixed(2)} g ·{" "}
                            <span className={p.uretim === "dokum" ? "text-emerald-400/70" : "text-amber-400/80"}>
                              {p.uretim === "dokum" ? "döküm" : "SAC — referans model"}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            indir(toBinarySTL([p.mesh], `Remaura Kilit — ${p.ad}`), `kilit-${tip}-${p.dosyaAd}.stl`);
                            bildir(`${p.ad} STL indirildi`);
                          }}
                          className="rounded-md border border-[#D4AF37]/50 bg-[#D4AF37]/10 px-2.5 py-1.5 text-[11px] font-medium text-[#D4AF37] hover:bg-[#D4AF37]/20"
                        >
                          STL
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* rapor */}
            {sonuc && (
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className={panel}>
                  <h3 className="mb-3 font-display text-lg font-semibold text-[#D4AF37]">Kural Raporu</h3>
                  <dl className="space-y-1.5 font-mono text-[12.5px]">
                    {sonuc.bilgi.map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-3">
                        <dt className="text-white/45">{k}</dt>
                        <dd className="text-right text-white/90">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div className={panel}>
                  <h3 className="mb-3 font-display text-lg font-semibold">Üretim Notları</h3>
                  <ul className="space-y-2 text-[11.5px] leading-relaxed text-white/50">
                    {sonuc.uyarilar.map((u) => (
                      <li key={u} className="flex gap-2">
                        <span className="text-[#D4AF37]">△</span>
                        <span>{u}</span>
                      </li>
                    ))}
                  </ul>
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
