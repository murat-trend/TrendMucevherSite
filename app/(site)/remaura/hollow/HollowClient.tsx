"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HollowViewer } from "./HollowViewer";
import { writeBridge } from "@/lib/remaura/mesh-bridge";

type Stats = {
  wallThicknessMm: number;
  volumeBeforeCm3: number;
  volumeAfterCm3: number;
  weightSavedGr: number;
};

type Method = "fast" | "boolean";

export function HollowClient() {
  const [file, setFile] = useState<File | null>(null);
  const [wallThickness, setWallThickness] = useState(1.0);
  const [method, setMethod] = useState<Method>("fast");

  // Sahne kontrolü
  const [showOuter, setShowOuter] = useState(true);
  const [showInner, setShowInner] = useState(true);
  const [ghost, setGhost] = useState(true);

  // İşlem durumu
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);

  // Log
  const [logs, setLogs] = useState<string[]>([]);
  const logBoxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ajur köprüsü — sonuç blob'u bellekte tutulur, "ajur aç" ile IndexedDB'ye yazılır
  const outputBlobRef = useRef<Blob | null>(null);
  const [bridging, setBridging] = useState(false);
  const router = useRouter();

  const addLog = useCallback((msg: string) => {
    const t = new Date().toLocaleTimeString("tr-TR", { hour12: false });
    setLogs((prev) => [...prev, `[${t}] ${msg}`]);
    requestAnimationFrame(() => {
      logBoxRef.current?.scrollTo({ top: logBoxRef.current.scrollHeight });
    });
  }, []);

  function pickFile(f: File) {
    setFile(f);
    setStats(null);
    setOutputUrl(null);
    addLog(`Dosya seçildi: ${f.name} (${(f.size / 1024).toFixed(0)} KB)`);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) pickFile(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  }

  async function handleProcess() {
    if (!file) return;
    setProcessing(true);
    setStats(null);
    setOutputUrl(null);
    addLog(`İşlem başladı · yöntem: ${method === "fast" ? "Hızlı Kabuk" : "Boolean"} · duvar: ${wallThickness.toFixed(1)} mm`);

    const form = new FormData();
    form.append("file", file);
    form.append("wallThicknessMm", String(wallThickness));
    form.append("method", method);

    try {
      const res = await fetch("/api/remaura/hollow/process", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "İşlem başarısız." }));
        throw new Error(data?.error ?? "İşlem başarısız.");
      }
      const statsRaw = res.headers.get("X-Stats");
      const parsed: Stats | null = statsRaw ? JSON.parse(statsRaw) : null;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      outputBlobRef.current = blob;

      setStats(parsed);
      setOutputUrl(url);
      addLog(`✓ Tamamlandı · çıktı ${(blob.size / 1024).toFixed(0)} KB`);
      if (parsed) {
        addLog(`Hacim: ${parsed.volumeBeforeCm3} → ${parsed.volumeAfterCm3} cm³ · tasarruf ~${parsed.weightSavedGr} g`);
      }
    } catch (err) {
      addLog(`✗ HATA: ${(err as Error).message}`);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#07080a] px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        {/* Başlık */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#b76e79]/30 bg-[#b76e79]/10 px-3 py-1 text-xs font-medium text-[#b76e79]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#b76e79]" />
              Deney / Lab
            </div>
            <h1 className="font-display text-3xl font-medium tracking-tight">İç Boşaltma</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
          {/* SOL: Sahne */}
          <div className="flex flex-col gap-4">
            <div className="relative h-[460px] overflow-hidden rounded-2xl border border-white/[0.06] bg-[#05060a]">
              <HollowViewer
                file={file}
                wallThickness={wallThickness}
                showOuter={showOuter}
                showInner={showInner}
                ghost={ghost}
                onLog={addLog}
              />
              {/* Sahne göstergeleri (üst sol) */}
              <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1 text-[11px]">
                <span className="flex items-center gap-1.5 text-white/50">
                  <span className="h-2 w-2 rounded-full bg-[#ff3b3b]/60" /> Dış (hayalet)
                </span>
                <span className="flex items-center gap-1.5 text-white/50">
                  <span className="h-2 w-2 rounded-full bg-[#e4b56f]" /> İç çekirdek
                </span>
              </div>
            </div>

            {/* Sahne kontrolleri */}
            <div className="flex flex-wrap items-center gap-2">
              <Toggle active={ghost} onClick={() => setGhost((v) => !v)}>Hayalet modu</Toggle>
              <Toggle active={showOuter} onClick={() => setShowOuter((v) => !v)}>Dış model</Toggle>
              <Toggle active={showInner} onClick={() => setShowInner((v) => !v)}>İç çekirdek</Toggle>
            </div>

            {/* Log paneli */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#030712] p-3">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-xs font-medium text-white/50">İşlem Günlüğü</span>
                {logs.length > 0 && (
                  <button onClick={() => setLogs([])} className="text-[11px] text-white/30 hover:text-white/60">
                    temizle
                  </button>
                )}
              </div>
              <div ref={logBoxRef} className="h-32 overflow-y-auto px-1 font-mono text-[11px] leading-relaxed text-white/60">
                {logs.length === 0 ? (
                  <p className="text-white/25">Hazır. STL yükleyin…</p>
                ) : (
                  logs.map((l, i) => (
                    <div key={i} className={l.includes("HATA") ? "text-red-400" : l.includes("✓") ? "text-emerald-400" : ""}>
                      {l}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* SAĞ: Kontrol paneli */}
          <div className="flex flex-col gap-4">
            {/* Dosya yükleme */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className="flex min-h-[110px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 text-center transition-colors hover:border-[#b76e79]/40 hover:bg-[#b76e79]/5"
            >
              <input
                ref={inputRef}
                type="file"
                accept=".stl"
                className="hidden"
                onChange={handleFileInput}
              />
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/40">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="text-sm text-white/50">{file ? file.name : "STL sürükle veya tıkla"}</p>
            </div>

            {/* Duvar kalınlığı */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-white/70">Duvar kalınlığı</span>
                <span className="font-mono text-sm text-[#b76e79]">{wallThickness.toFixed(1)} mm</span>
              </div>
              <input
                type="range"
                min={0.3}
                max={2.0}
                step={0.1}
                value={wallThickness}
                onChange={(e) => setWallThickness(Number(e.target.value))}
                className="range-slider w-full"
              />
              <div className="mt-2 flex justify-between text-xs text-white/25">
                <span>0.3 mm</span>
                <span>2.0 mm</span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-white/35">
                Ajur açmayı planlıyorsanız 1.0 mm ve üzeri duvar önerilir.
              </p>
            </div>

            {/* Yöntem seçimi */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
              <span className="mb-3 block text-sm font-medium text-white/70">Çıkış yöntemi</span>
              <div className="grid grid-cols-2 gap-2">
                <MethodBtn active={method === "fast"} onClick={() => setMethod("fast")} title="Hızlı Kabuk" desc="Hızlı, sağlam" />
                <MethodBtn active={method === "boolean"} onClick={() => setMethod("boolean")} title="Boolean" desc="En temiz" />
              </div>
            </div>

            {/* İşle butonu */}
            <button
              onClick={handleProcess}
              disabled={!file || processing}
              className="w-full rounded-xl bg-[linear-gradient(135deg,#c4838b,#b76e79,#a65f69)] px-6 py-3.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  İşleniyor…
                </span>
              ) : (
                "İç Boşaltmayı Başlat"
              )}
            </button>

            {/* Sonuç */}
            {stats && (
              <div className="rounded-2xl border border-[#b76e79]/20 bg-[#b76e79]/5 p-4">
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <Stat label="Duvar" value={`${stats.wallThicknessMm} mm`} />
                  <Stat label="Tasarruf" value={`~${stats.weightSavedGr.toFixed(1)} g`} />
                  <Stat label="Önce" value={`${stats.volumeBeforeCm3.toFixed(2)} cm³`} />
                  <Stat label="Sonra" value={`${stats.volumeAfterCm3.toFixed(2)} cm³`} />
                </div>
                {outputUrl && (
                  <a
                    href={outputUrl}
                    download="hollow_output.stl"
                    className="flex items-center justify-center gap-2 rounded-xl border border-[#b76e79]/30 bg-[#b76e79]/10 px-4 py-2.5 text-sm font-medium text-[#b76e79] transition-opacity hover:opacity-80"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Hollow STL İndir
                  </a>
                )}
                {outputBlobRef.current && stats && (
                  <button
                    onClick={async () => {
                      if (!outputBlobRef.current || !stats) return;
                      setBridging(true);
                      try {
                        await writeBridge({
                          meshBlob: outputBlobRef.current,
                          source: "hollow",
                          wallThickness: stats.wallThicknessMm,
                          volumeCm3: stats.volumeAfterCm3,
                        });
                        router.push("/remaura/ajur");
                      } catch {
                        addLog("✗ HATA: Model ajur sayfasına aktarılamadı.");
                        setBridging(false);
                      }
                    }}
                    disabled={bridging}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#c4838b,#b76e79,#a65f69)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {bridging ? "Aktarılıyor…" : "Bu modele ajur aç →"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-[#b76e79]/40 bg-[#b76e79]/15 text-[#b76e79]"
          : "border-white/10 bg-white/[0.03] text-white/40 hover:text-white/70"
      }`}
    >
      {children}
    </button>
  );
}

function MethodBtn({ active, onClick, title, desc }: { active: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
        active
          ? "border-[#b76e79]/40 bg-[#b76e79]/15"
          : "border-white/10 bg-white/[0.03] hover:border-white/20"
      }`}
    >
      <span className={`block text-sm font-medium ${active ? "text-[#b76e79]" : "text-white/70"}`}>{title}</span>
      <span className="block text-[11px] text-white/35">{desc}</span>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
      <p className="text-[11px] text-white/40">{label}</p>
      <p className="font-mono text-sm text-white">{value}</p>
    </div>
  );
}
