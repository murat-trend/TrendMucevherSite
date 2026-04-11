"use client";

import { useState, useRef } from "react";

export default function NesneKaldirPage() {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!image || !prompt.trim()) {
      setError("Görsel ve açıklama gerekli");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const fd = new FormData();
      fd.append("image", image);
      fd.append("prompt", prompt);

      const res = await fetch("/api/remaura/nesne-kaldir", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Hata oluştu");
      }

      const blob = await res.blob();
      setResult(URL.createObjectURL(blob));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result;
    a.download = "nesne-kaldirildi.png";
    a.click();
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-center text-3xl font-bold">Nesne Kaldır</h1>
        <p className="mb-10 text-center text-gray-400">
          Görselinizi yükleyin, kaldırmak istediğiniz nesneyi yazın — AI otomatik bulur ve temizler.
        </p>

        {/* Görsel Yükleme */}
        <div
          onClick={() => inputRef.current?.click()}
          className="mb-6 cursor-pointer rounded-xl border-2 border-dashed border-gray-700 p-8 text-center transition hover:border-gray-500"
        >
          {preview ? (
            <img src={preview} alt="Yüklenen görsel" className="mx-auto max-h-72 rounded-lg object-contain" />
          ) : (
            <p className="text-gray-500">Görsel yüklemek için tıklayın (JPG, PNG, WEBP)</p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleImageChange}
          />
        </div>

        {/* Prompt */}
        <div className="mb-6">
          <label className="mb-2 block text-sm text-gray-400">Kaldırmak istediğiniz nesneyi yazın</label>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Örnek: yüzükteki mavi taş, kolye zinciri, arka plandaki gölge..."
            className="w-full rounded-lg border border-gray-700 bg-[#1a1a1a] px-4 py-3 text-white placeholder-gray-600 focus:border-gray-500 focus:outline-none"
          />
        </div>

        {/* Hata */}
        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        {/* Buton */}
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={loading || !image || !prompt.trim()}
          className="w-full rounded-lg bg-gradient-to-r from-amber-600 to-yellow-500 py-3 font-semibold transition hover:opacity-90 disabled:opacity-40"
        >
          {loading ? "İşleniyor..." : "Nesneyi Kaldır"}
        </button>

        {/* Sonuç */}
        {result && (
          <div className="mt-10">
            <h2 className="mb-4 text-center text-lg font-semibold">Sonuç</h2>
            <img src={result} alt="Sonuç" className="mx-auto mb-4 max-h-96 rounded-xl object-contain" />
            <button
              type="button"
              onClick={handleDownload}
              className="w-full rounded-lg border border-gray-600 py-3 transition hover:border-gray-400"
            >
              PNG İndir
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
