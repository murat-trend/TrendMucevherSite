"use client";

import { useCallback, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { getOrPickDir } from "@/lib/remaura/dir-handle";
import { seoFileName, slugify } from "@/lib/remaura/seo-slug";

type Mode = "contain" | "cover";

type ResultItem = {
  id: string;
  sourceName: string;
  previewUrl: string; // çıktı önizleme (object URL)
  blob: Blob;
  bytes: number;
  quality: number;
  fileName: string; // SEO dosya adı (.jpg)
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";
const MIN_KB = 750;
const MAX_KB = 800;

function kb(bytes: number): string {
  return `${Math.round(bytes / 1024)} KB`;
}

export default function EtsyBoyutClient() {
  const [files, setFiles] = useState<File[]>([]);
  const [baseName, setBaseName] = useState("");
  const [mode, setMode] = useState<Mode>("contain");
  const [bg, setBg] = useState("#ffffff");
  const minKB = MIN_KB;
  const maxKB = MAX_KB;

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<ResultItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((list: FileList | null) => {
    if (!list) return;
    const picked = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (picked.length === 0) return;
    setFiles((prev) => [...prev, ...picked]);
    setError(null);
  }, []);

  const removeFile = (i: number) =>
    setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const reset = () => {
    results.forEach((r) => URL.revokeObjectURL(r.previewUrl));
    setResults([]);
    setFiles([]);
    setError(null);
    setProgress({ done: 0, total: 0 });
  };

  const process = useCallback(async () => {
    if (files.length === 0) {
      setError("Önce görsel ekleyin.");
      return;
    }
    setBusy(true);
    setError(null);
    results.forEach((r) => URL.revokeObjectURL(r.previewUrl));
    setResults([]);
    setProgress({ done: 0, total: files.length });

    const {
      data: { user },
    } = await createClient().auth.getUser();
    const userId = user?.id ?? "";

    const base = baseName.trim() || "urun";
    const out: ResultItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const fd = new FormData();
        fd.append("image", file);
        fd.append("userId", userId);
        fd.append("mode", mode);
        fd.append("bg", bg);
        fd.append("minKB", String(minKB));
        fd.append("maxKB", String(maxKB));

        const res = await fetch("/api/remaura/etsy-boyut", {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(data.error || `İşlem hatası (${res.status})`);
        }
        const blob = await res.blob();
        const bytes = Number(res.headers.get("X-Final-Bytes")) || blob.size;
        const quality = Number(res.headers.get("X-Final-Quality")) || 0;
        out.push({
          id: `${Date.now()}-${i}`,
          sourceName: file.name,
          previewUrl: URL.createObjectURL(blob),
          blob,
          bytes,
          quality,
          fileName: seoFileName(base, i, "jpg"),
        });
      } catch (e) {
        setError(
          `${file.name}: ${e instanceof Error ? e.message : "bilinmeyen hata"}`
        );
      } finally {
        setProgress({ done: i + 1, total: files.length });
        setResults([...out]);
      }
    }
    setBusy(false);
  }, [files, baseName, mode, bg, minKB, maxKB, results]);

  const renameAt = (id: string, raw: string) => {
    setResults((prev) =>
      prev.map((r) => (r.id === id ? { ...r, fileName: raw } : r))
    );
  };

  const ensureJpg = (name: string) => {
    const slug = slugify(name.replace(/\.(jpg|jpeg|png|webp)$/i, "")) || "urun";
    return `${slug}.jpg`;
  };

  const downloadOne = async (r: ResultItem) => {
    const fileName = ensureJpg(r.fileName);
    try {
      const dir = await getOrPickDir("remaura-etsy-dir");
      if (dir) {
        const handle = await dir.getFileHandle(fileName, { create: true });
        const writable = await handle.createWritable();
        await writable.write(r.blob);
        await writable.close();
        return;
      }
    } catch {
      /* picker iptal / desteklenmiyor → klasik indirme */
    }
    const url = URL.createObjectURL(r.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAll = async () => {
    if (results.length === 0) return;
    // Klasör destekleniyorsa hepsini tek seçilen klasöre yaz
    let dir = null as FileSystemDirectoryHandle | null;
    try {
      dir = await getOrPickDir("remaura-etsy-dir");
    } catch {
      dir = null;
    }
    if (dir) {
      for (const r of results) {
        const handle = await dir.getFileHandle(ensureJpg(r.fileName), {
          create: true,
        });
        const writable = await handle.createWritable();
        await writable.write(r.blob);
        await writable.close();
      }
      return;
    }
    // Fallback: tek tek indir
    for (const r of results) {
      const url = URL.createObjectURL(r.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = ensureJpg(r.fileName);
      a.click();
      URL.revokeObjectURL(url);
      await new Promise((res) => setTimeout(res, 150));
    }
  };

  return (
    <main className="min-h-screen bg-[#07080a] px-4 py-12 text-white">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 text-center">
          <h1 className="font-display text-3xl font-medium tracking-[-0.03em]">
            Etsy Boyutlandırıcı
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Görselleri tek adımda <strong>2000×2000 px</strong> kareye getirir ve{" "}
            <strong>{minKB}–{maxKB} KB</strong> bandına sıkıştırır. Netlik korunur,
            arka plan iş akışınız hızlanır.
          </p>
        </header>

        {/* Ayarlar */}
        <section className="mb-6 grid gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-white/70">
              SEO temel adı (Etsy/Google görsel araması için)
            </label>
            <input
              value={baseName}
              onChange={(e) => setBaseName(e.target.value)}
              placeholder="örn. altin-kalp-kolye-kadin"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-[#b76e79]"
            />
            {baseName.trim() && (
              <p className="mt-1.5 text-[11px] text-white/40">
                Çıktı:{" "}
                <span className="text-[#c9a88a]">
                  {seoFileName(baseName, 0)}, {seoFileName(baseName, 1)} …
                </span>
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/70">
              Kareleme
            </label>
            <div className="flex gap-2">
              {(
                [
                  ["contain", "Sığdır (dolgu)"],
                  ["cover", "Kırp (kare)"],
                ] as [Mode, string][]
              ).map(([val, lbl]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setMode(val)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs transition ${
                    mode === val
                      ? "border-[#b76e79] bg-[#b76e79]/15 text-[#e7b9c0]"
                      : "border-white/10 text-white/60 hover:border-white/25"
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-white/40">
              {mode === "contain"
                ? "Ürün hiç kırpılmaz; boşluklar dolgu rengiyle doldurulur."
                : "Kareye kırpar; kenarlardan kesilebilir."}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/70">
              Dolgu rengi
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={bg}
                onChange={(e) => setBg(e.target.value)}
                disabled={mode === "cover"}
                className="h-9 w-12 cursor-pointer rounded border border-white/10 bg-transparent disabled:opacity-40"
              />
              <input
                value={bg}
                onChange={(e) => setBg(e.target.value)}
                disabled={mode === "cover"}
                className="w-28 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-[#b76e79] disabled:opacity-40"
              />
            </div>
          </div>
        </section>

        {/* Yükleme alanı */}
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            addFiles(e.dataTransfer.files);
          }}
          className="mb-4 cursor-pointer rounded-2xl border-2 border-dashed border-white/15 p-8 text-center transition hover:border-[#b76e79]/50"
        >
          <p className="text-sm text-white/60">
            Görselleri buraya bırakın ya da tıklayıp seçin (toplu seçim
            desteklenir)
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {/* Seçilen dosyalar */}
        {files.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {files.map((f, i) => (
              <span
                key={`${f.name}-${i}`}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/70"
              >
                {f.name}
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-white/40 hover:text-white"
                  aria-label="kaldır"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <div className="mb-10 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void process()}
            disabled={busy || files.length === 0}
            className="rounded-lg bg-[linear-gradient(135deg,#c4838b,#b76e79,#a65f69)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
          >
            {busy
              ? `İşleniyor… ${progress.done}/${progress.total}`
              : `Boyutlandır (${files.length || 0})`}
          </button>
          {(files.length > 0 || results.length > 0) && (
            <button
              type="button"
              onClick={reset}
              disabled={busy}
              className="rounded-lg border border-white/15 px-5 py-3 text-sm text-white/70 transition hover:border-white/30 disabled:opacity-40"
            >
              Temizle
            </button>
          )}
        </div>

        {/* Sonuçlar */}
        {results.length > 0 && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-medium">
                Hazır görseller ({results.length})
              </h2>
              <button
                type="button"
                onClick={() => void downloadAll()}
                className="rounded-lg border border-[#b76e79]/50 bg-[#b76e79]/10 px-4 py-2 text-sm font-medium text-[#e7b9c0] transition hover:bg-[#b76e79]/20"
              >
                Klasör seç & hepsini indir
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {results.map((r) => {
                const over = r.bytes > maxKB * 1024;
                const under = r.bytes < minKB * 1024;
                return (
                  <div
                    key={r.id}
                    className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]"
                  >
                    {/* nötr zemin: beyaz dolgu kenarları görünür kalsın */}
                    <div className="flex items-center justify-center bg-[#101114] p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={r.previewUrl}
                        alt={r.fileName}
                        className="max-h-56 w-auto rounded"
                      />
                    </div>
                    <div className="space-y-2 p-3">
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="rounded bg-white/10 px-2 py-0.5">
                          2000×2000
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 ${
                            over
                              ? "bg-red-500/20 text-red-300"
                              : under
                                ? "bg-amber-500/15 text-amber-200"
                                : "bg-emerald-500/15 text-emerald-300"
                          }`}
                          title={
                            under
                              ? "Hedefin altında — içerik sade olduğu için daha küçük, kalite tam."
                              : over
                                ? "Hedefin üstünde"
                                : "Hedef bandında"
                          }
                        >
                          {kb(r.bytes)}
                        </span>
                        <span className="text-white/30">JPG · K{r.quality}</span>
                      </div>
                      <input
                        value={r.fileName}
                        onChange={(e) => renameAt(r.id, e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none focus:border-[#b76e79]"
                      />
                      <button
                        type="button"
                        onClick={() => void downloadOne(r)}
                        className="w-full rounded-lg border border-white/15 py-2 text-xs text-white/80 transition hover:border-[#b76e79]/50"
                      >
                        Klasör seç & indir
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
