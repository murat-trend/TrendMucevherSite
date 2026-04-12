"use client";

import { useCallback, useRef, useState } from "react";
import {
  RemauraBillingModalProvider,
  useRemauraBillingModal,
} from "@/components/remaura/RemauraBillingModalProvider";
import { useRemauraCreditsCheck } from "@/hooks/useRemauraCreditsCheck";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export default function WebmToMp4Page() {
  return (
    <RemauraBillingModalProvider>
      <WebmToMp4PageInner />
    </RemauraBillingModalProvider>
  );
}

function WebmToMp4PageInner() {
  const billingUi = useRemauraBillingModal();
  const { checkCredits } = useRemauraCreditsCheck();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState("");

  const openPicker = useCallback(async () => {
    const ok = await checkCredits(1, billingUi.openUnauthorized, billingUi.openInsufficientCredits);
    if (!ok) return;
    fileInputRef.current?.click();
  }, [billingUi, checkCredits]);

  const onFileChosen = (f: File | undefined) => {
    if (!f) return;
    const name = f.name.toLowerCase();
    const typeOk = f.type === "video/webm" || name.endsWith(".webm");
    if (!typeOk) {
      setError("Lütfen bir WebM dosyası seçin.");
      return;
    }
    setError(null);
    setFile(f);
  };

  const handleConvert = useCallback(async () => {
    if (!file) return;
    const ok = await checkCredits(1, billingUi.openUnauthorized, billingUi.openInsufficientCredits);
    if (!ok) return;

    setLoading(true);
    setError(null);
    setProgress("FFmpeg yükleniyor…");

    try {
      if (!ffmpegRef.current) {
        const ffmpeg = new FFmpeg();
        const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
        });
        ffmpegRef.current = ffmpeg;
      }
      const ffmpeg = ffmpegRef.current;
      if (!ffmpeg) return;

      setProgress("Dönüştürülüyor…");
      await ffmpeg.writeFile("input.webm", await fetchFile(file));
      await ffmpeg.exec([
        "-i",
        "input.webm",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "20",
        "-movflags",
        "+faststart",
        "-pix_fmt",
        "yuv420p",
        "output.mp4",
      ]);
      const data = await ffmpeg.readFile("output.mp4");
      const blob = new Blob([data as BlobPart], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `remaura-${Date.now()}.mp4`;
      a.click();
      URL.revokeObjectURL(url);

      await ffmpeg.deleteFile("input.webm").catch(() => {});
      await ffmpeg.deleteFile("output.mp4").catch(() => {});

      setProgress("Tamamlandı — indirme başlatıldı.");
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Dönüşüm başarısız.");
      setProgress("");
    } finally {
      setLoading(false);
    }
  }, [billingUi, checkCredits, file]);

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-10 text-[#e8e0d0] sm:px-6">
      <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-[#101114] p-6">
        <h1 className="font-display text-2xl font-semibold">WebM → MP4</h1>
        <p className="mt-1 text-sm text-zinc-400">WebM video yükleyin; tarayıcıda MP4&apos;e dönüştürün.</p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void (async () => {
              const creditOk = await checkCredits(1, billingUi.openUnauthorized, billingUi.openInsufficientCredits);
              if (!creditOk) return;
              onFileChosen(e.dataTransfer.files[0]);
            })();
          }}
          onClick={() => void openPicker()}
          className={`mt-6 flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors ${
            dragging ? "border-[#c9a84c]/60 bg-[#c9a84c]/10" : "border-white/15 hover:border-white/25"
          }`}
        >
          <p className="text-sm text-zinc-300">{file ? file.name : "Tıklayın veya WebM sürükleyin"}</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/webm,.webm"
            className="hidden"
            onChange={(e) => {
              onFileChosen(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>

        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
        {progress ? <p className="mt-2 text-xs text-[#c9a84c]/90">{progress}</p> : null}

        <button
          type="button"
          onClick={() => void handleConvert()}
          disabled={!file || loading}
          className="mt-6 w-full rounded-xl border border-[#c9a84c]/60 bg-[#c9a84c]/10 py-3 text-sm font-medium text-[#f0dcc8] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Dönüştürülüyor…" : "MP4&apos;e dönüştür ve indir"}
        </button>
      </div>
    </main>
  );
}
