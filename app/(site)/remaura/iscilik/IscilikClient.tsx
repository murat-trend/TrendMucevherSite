"use client";

// İŞÇİLİK — kişisel araç. TEK KURAL: 1. görselin TASARIMI korunur,
// 2. görselin (işçilik referansı) usta-kalite işçiliğine çevrilir.
// Kayıtlı varsayılan referans sayfa açılışında otomatik aktiftir.

import { useEffect, useState } from "react";
import { shrinkForUpload, readJsonSafe, uploadErrorMessage } from "@/lib/remaura/upload";

const DEFAULT_REF_URL = "/remaura-iscilik-ref.jpg";

type RefMode = "default" | "custom" | "none";

export function IscilikClient() {
  const [image, setImage] = useState<string | null>(null);
  const [refMode, setRefMode] = useState<RefMode>("none");
  const [customRef, setCustomRef] = useState<string | null>(null);
  const [defaultRefAvailable, setDefaultRefAvailable] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [upscaleFirst, setUpscaleFirst] = useState(false);
  const [strength, setStrength] = useState(70);
  const [craftNote, setCraftNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(DEFAULT_REF_URL, { method: "HEAD" })
      .then((r) => {
        if (r.ok) {
          setDefaultRefAvailable(true);
          setRefMode("default");
        }
      })
      .catch(() => {});
  }, []);

  function readFileTo(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f || !f.type.startsWith("image/")) return;
      const r = new FileReader();
      r.onload = () => setter(r.result as string);
      r.readAsDataURL(f);
    };
  }

  async function run() {
    if (!image || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/remaura/iscilik", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: await shrinkForUpload(image, 1_600_000),
          refImage:
            refMode === "default"
              ? "default"
              : refMode === "custom" && customRef
                ? await shrinkForUpload(customRef, 1_600_000)
                : undefined,
          upscaleFirst,
          strength,
          craftNote: craftNote.trim() || undefined,
        }),
      });
      const data = await readJsonSafe<{ image?: string }>(res);
      if (!res.ok || !data.image) {
        setError(uploadErrorMessage(res, data, "İşçilik dönüştürülemedi"));
        return;
      }
      setResult(data.image);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ağ hatası");
    } finally {
      setLoading(false);
    }
  }

  function download() {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result;
    a.download = `iscilik-${Date.now()}.jpg`;
    a.click();
  }

  return (
    <div className="min-h-screen px-4 py-10" style={{ background: "#07080a", color: "#f5f3f0" }}>
      <div className="mx-auto w-full max-w-4xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#b76e79" }}>
            İşçilik
          </h1>
          <p className="mt-1 text-xs" style={{ color: "#c9a88a" }}>
            Tek kural: tasarım korunur, referansın usta-kalite işçiliğine çevrilir — derin rölyef,
            gerçek metal/mine dokusu, mikro detay.
          </p>
        </div>

        {/* 1. pencere: kaynak tasarım */}
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/30 px-6 py-10 transition-colors hover:border-[#b76e79]/40">
          <input type="file" accept="image/*" className="sr-only" onChange={readFileTo(setImage)} />
          <span className="text-sm font-medium">
            {image ? "Başka tasarım seç" : "1) Tasarım görselini yükle"}
          </span>
          <span className="mt-1 text-[10px]" style={{ color: "#c9a88a" }}>
            Deseniniz / illüstrasyonunuz / taslağınız — kompozisyon ve renkler korunur
          </span>
        </label>

        {image && (
          <>
            {/* 2. pencere: işçilik referansı */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#c9a88a" }}>
                2) İşçilik Referansı
              </p>
              {refMode !== "none" ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={refMode === "default" ? DEFAULT_REF_URL : (customRef ?? "")}
                    alt="İşçilik referansı"
                    className="h-16 w-16 rounded-lg border object-cover"
                    style={{ borderColor: refMode === "default" ? "#b76e79" : "rgba(255,255,255,0.1)" }}
                  />
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold" style={{ color: "#b76e79" }}>
                      {refMode === "default" ? "Kayıtlı işçilik referansı aktif" : "Özel referans aktif"}
                    </span>
                    <div className="flex gap-2">
                      <label
                        className="cursor-pointer rounded-lg border border-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: "#9C9894" }}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={readFileTo((v) => {
                            setCustomRef(v);
                            setRefMode("custom");
                          })}
                        />
                        Değiştir
                      </label>
                      {refMode === "custom" && defaultRefAvailable && (
                        <button
                          onClick={() => setRefMode("default")}
                          className="rounded-lg border border-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
                          style={{ color: "#9C9894" }}
                        >
                          Kayıtlıya Dön
                        </button>
                      )}
                      <button
                        onClick={() => setRefMode("none")}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: "#9C9894" }}
                      >
                        Kaldır
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <label
                    className="flex flex-1 cursor-pointer items-center justify-center rounded-lg border border-dashed border-white/15 bg-black/30 px-3 py-4 text-[10px] transition-colors hover:border-[#b76e79]/40"
                    style={{ color: "#9C9894" }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={readFileTo((v) => {
                        setCustomRef(v);
                        setRefMode("custom");
                      })}
                    />
                    İşçilik referansı yükle
                  </label>
                  {defaultRefAvailable && (
                    <button
                      onClick={() => setRefMode("default")}
                      className="rounded-lg border px-3 py-4 text-[10px] font-bold uppercase tracking-wider"
                      style={{ borderColor: "#b76e79", color: "#b76e79", background: "rgba(183,110,121,0.1)" }}
                    >
                      Kayıtlı Referansı Kullan
                    </button>
                  )}
                </div>
              )}
              <p className="mt-2 text-[10px]" style={{ color: "#6B6560" }}>
                Referanstan yalnız İŞÇİLİK seviyesi alınır (rölyef derinliği, doku, detay yoğunluğu) —
                konusu ve renkleri alınmaz.
              </p>
            </div>

            {/* Ayarlar */}
            <div className="grid gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:grid-cols-2">
              {/* İşçilik şiddeti */}
              <div className="sm:col-span-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#c9a88a" }}>
                    İşçilik Şiddeti
                  </span>
                  <span className="text-[10px] font-mono" style={{ color: "#b76e79" }}>
                    %{strength} — {strength <= 33 ? "Hafif rötuş" : strength <= 66 ? "Belirgin el işçiliği" : "Maksimum usta seviyesi"}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={strength}
                  onChange={(e) => setStrength(Number(e.target.value))}
                  className="w-full"
                  style={{ accentColor: "#b76e79" }}
                />
                <div className="mt-0.5 flex justify-between text-[9px]" style={{ color: "#6B6560" }}>
                  <span>Tasarıma sadık</span>
                  <span>Tam dönüşüm</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#c9a88a" }}>
                  Netleştir
                </span>
                <button
                  onClick={() => setUpscaleFirst((v) => !v)}
                  className="rounded-lg border px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all"
                  style={{
                    borderColor: upscaleFirst ? "#b76e79" : "rgba(255,255,255,0.1)",
                    color: upscaleFirst ? "#b76e79" : "#9C9894",
                    background: upscaleFirst ? "rgba(183,110,121,0.1)" : "transparent",
                  }}
                >
                  {upscaleFirst ? "Açık" : "Kapalı"}
                </button>
              </div>
              <input
                value={craftNote}
                onChange={(e) => setCraftNote(e.target.value)}
                placeholder="İşçilik notu (ör: madalyon olsun, mine renkleri aynı kalsın)"
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs outline-none placeholder:text-[#6B6560] focus:border-[#b76e79]/50"
              />
            </div>

            {/* Çalıştır */}
            <button
              onClick={() => void run()}
              disabled={loading}
              className="w-full rounded-xl px-4 py-3.5 text-sm font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #c4838b, #a65f69)" }}
            >
              {loading ? "İşçilik dönüştürülüyor… (1-2 dk sürebilir)" : "İşçiliği Dönüştür"}
            </button>
            {error && (
              <p className="text-center text-xs" style={{ color: "#f87171" }}>
                {error}
              </p>
            )}

            {/* Önce / Sonra */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#c9a88a" }}>
                  Tasarım
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="Tasarım" className="w-full rounded-xl object-contain" />
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#b76e79" }}>
                  Usta İşçiliği
                </p>
                {result ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={result} alt="Usta işçiliğine dönüştürülmüş" className="w-full rounded-xl object-contain" />
                    <button
                      onClick={download}
                      className="mt-3 w-full rounded-lg border border-[#b76e79]/40 bg-[#b76e79]/10 px-3 py-2 text-xs font-bold uppercase tracking-wider"
                      style={{ color: "#b76e79" }}
                    >
                      İndir (JPG)
                    </button>
                  </>
                ) : (
                  <div className="flex h-40 items-center justify-center text-xs" style={{ color: "#6B6560" }}>
                    {loading ? "İşleniyor…" : "Henüz sonuç yok"}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
