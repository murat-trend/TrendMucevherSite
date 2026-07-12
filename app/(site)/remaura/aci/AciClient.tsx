"use client";

// AÇI — kişisel tek-iş aracı. TEK KURAL: yüklenen parça imza "kahraman"
// açısına çevrilir; taşlar/mine/cila/yazıt dahil her şey aynen korunur.
// Motor: /api/remaura/aci (repoz'un 3D-hazırlık kurallarından arınmış varyant).

import { useState } from "react";
import { shrinkForUpload, readJsonSafe, uploadErrorMessage } from "@/lib/remaura/upload";

export function AciClient() {
  const [image, setImage] = useState<string | null>(null);
  const [poseImage, setPoseImage] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [look, setLook] = useState<"prep3d" | "natural">("prep3d");
  const [upscaleFirst, setUpscaleFirst] = useState(true);
  const [shapeNote, setShapeNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      setResult(null);
      setError(null);
    };
    reader.readAsDataURL(f);
  }

  async function run() {
    if (!image || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/remaura/aci", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: await shrinkForUpload(image, 1_600_000),
          poseImage: poseImage ? await shrinkForUpload(poseImage, 1_600_000) : undefined,
          look,
          upscaleFirst,
          shapeNote: shapeNote.trim() || undefined,
        }),
      });
      const data = await readJsonSafe<{ image?: string }>(res);
      if (!res.ok || !data.image) {
        setError(uploadErrorMessage(res, data, "Açı düzeltilemedi"));
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
    a.download = `aci-${Date.now()}.jpg`;
    a.click();
  }

  const BTN =
    "rounded-lg border px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all";

  return (
    <div className="min-h-screen px-4 py-10" style={{ background: "#07080a", color: "#f5f3f0" }}>
      <div className="mx-auto w-full max-w-4xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#b76e79" }}>
            Açı
          </h1>
          <p className="mt-1 text-xs" style={{ color: "#c9a88a" }}>
            Tek kural: 3D-güvenli alçak açı (~10-15°) — tabla düz, perspektif minimum.
            3D Hazırlık: taşsız + mat (Tripo girdisi) · Doğal: taş ve cila korunur.
          </p>
        </div>

        {/* Yükleme */}
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/30 px-6 py-10 transition-colors hover:border-[#b76e79]/40">
          <input type="file" accept="image/*" className="sr-only" onChange={onPick} />
          <span className="text-sm font-medium">{image ? "Başka görsel seç" : "Görsel yükle"}</span>
          <span className="mt-1 text-[10px]" style={{ color: "#c9a88a" }}>
            PNG / JPG / WEBP
          </span>
        </label>

        {image && (
          <>
            {/* Ayarlar */}
            <div className="grid gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <span className="w-16 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#c9a88a" }}>
                  Görünüm
                </span>
                {(
                  [
                    { key: "prep3d", label: "3D Hazırlık" },
                    { key: "natural", label: "Doğal" },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setLook(m.key)}
                    className={BTN}
                    style={{
                      borderColor: look === m.key ? "#b76e79" : "rgba(255,255,255,0.1)",
                      color: look === m.key ? "#b76e79" : "#9C9894",
                      background: look === m.key ? "rgba(183,110,121,0.1)" : "transparent",
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#c9a88a" }}>
                  Netleştir
                </span>
                <button
                  onClick={() => setUpscaleFirst((v) => !v)}
                  className={BTN}
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
                value={shapeNote}
                onChange={(e) => setShapeNote(e.target.value)}
                placeholder="Geometri notu (ör: tabla tam yuvarlak)"
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs outline-none placeholder:text-[#6B6560] focus:border-[#b76e79]/50"
              />
              {/* Poz referansı — kamera açısı bu görselden birebir kopyalanır */}
              <div className="sm:col-span-2">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#c9a88a" }}>
                  Poz Referansı (isteğe bağlı — en isabetli yöntem)
                </p>
                <p className="mb-2 text-[10px]" style={{ color: "#6B6560" }}>
                  Tripo&apos;da tablası DÜZ çıkmış bir girdi görseli yükle; kamera açısı ondan birebir kopyalanır
                  (tasarımı değil, yalnız açısı alınır).
                </p>
                {poseImage ? (
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={poseImage} alt="Poz referansı" className="h-16 w-16 rounded-lg border border-white/10 object-cover" />
                    <button
                      onClick={() => setPoseImage(null)}
                      className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: "#9C9894" }}
                    >
                      Kaldır
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-white/15 bg-black/30 px-3 py-4 text-[10px] transition-colors hover:border-[#b76e79]/40" style={{ color: "#9C9894" }}>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f || !f.type.startsWith("image/")) return;
                        const r = new FileReader();
                        r.onload = () => setPoseImage(r.result as string);
                        r.readAsDataURL(f);
                      }}
                    />
                    Poz referansı yükle
                  </label>
                )}
              </div>
            </div>

            {/* Çalıştır */}
            <button
              onClick={() => void run()}
              disabled={loading}
              className="w-full rounded-xl px-4 py-3.5 text-sm font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #c4838b, #a65f69)" }}
            >
              {loading ? "Açı düzeltiliyor… (1-2 dk sürebilir)" : "Açıyı Düzelt"}
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
                  Orijinal
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="Orijinal" className="w-full rounded-xl object-contain" />
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#b76e79" }}>
                  Düzeltilmiş
                </p>
                {result ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={result} alt="Açısı düzeltilmiş" className="w-full rounded-xl object-contain" />
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
