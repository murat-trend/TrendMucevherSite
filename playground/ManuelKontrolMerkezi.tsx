"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Settings2,
  RefreshCw,
  Contrast,
  Sun,
  Eraser,
  Gem,
  Activity,
  Camera,
  Download,
  ZoomIn,
  Diamond,
} from "lucide-react";

const defaultLab = {
  contrast: 150,
  brightness: 110,
  sharpness: 2,
  maskStones: false,
  invert: false,
  isScanning: false,
  scanComplete: false,
};

export default function ManuelKontrolMerkezi() {
  const [lab, setLab] = useState(defaultLab);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [showLightbox, setShowLightbox] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getLabStyles = () => {
    let filter = `contrast(${lab.contrast}%) brightness(${lab.brightness}%) blur(${lab.sharpness / 3}px)`;
    if (lab.invert) filter += " invert(100%)";
    return { filter, transition: "filter 0.2s ease-out" as const };
  };

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const setContrast = (v: number) => setLab((p) => ({ ...p, contrast: clamp(v, 50, 300) }));
  const setBrightness = (v: number) => setLab((p) => ({ ...p, brightness: clamp(v, 50, 250) }));
  const setSharpness = (v: number) => setLab((p) => ({ ...p, sharpness: clamp(v, 0, 20) }));

  const startLabScan = () => {
    setLab((prev) => ({ ...prev, isScanning: true, scanComplete: false }));
    setTimeout(() => {
      setLab((prev) => ({ ...prev, isScanning: false, scanComplete: true }));
    }, 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImageSrc(reader.result as string);
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const loadDemoImage = () => {
    setImageSrc("/rem-icon-128.png");
  };

  useEffect(() => {
    loadDemoImage();
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-stone-200 font-sans selection:bg-amber-500/30 overflow-x-hidden">
      <style>{`
        @keyframes scanLine { 0% { top: 0; opacity: 0; } 50% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
        .animate-scan { position: absolute; animation: scanLine 2.5s linear infinite; width: 100%; height: 2px; background: #f59e0b; box-shadow: 0 0 20px #f59e0b; z-index: 40; }
        .stone-mask { position: absolute; background: black; border-radius: 50%; filter: blur(12px); opacity: 0.85; z-index: 30; pointer-events: none; }
        input[type="range"] { -webkit-appearance: none; appearance: none; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; background: #f59e0b; border-radius: 50%; cursor: pointer; box-shadow: 0 0 10px rgba(245,158,11,0.5); }
        input[type="range"]::-moz-range-thumb { width: 18px; height: 18px; background: #f59e0b; border-radius: 50%; cursor: pointer; border: none; box-shadow: 0 0 10px rgba(245,158,11,0.5); }
      `}</style>

      <nav className="border-b border-white/5 bg-black/60 backdrop-blur-xl sticky top-0 z-50 px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-amber-500 p-2 rounded-2xl rotate-6 shadow-[0_0_25px_rgba(245,158,11,0.3)]">
            <Diamond className="text-black w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter italic text-white leading-none">Manuel Kontrol</h1>
            <p className="text-[9px] text-amber-500 uppercase tracking-[0.4em] font-black mt-1">Playground</p>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-zinc-900/40 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-md shadow-2xl space-y-8"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-3">
                  <Settings2 className="text-amber-500" size={20} /> Manuel Kontrol
                </h2>
                <button
                  onClick={() => setLab(defaultLab)}
                  className="text-zinc-600 hover:text-white transition"
                >
                  <RefreshCw size={16} />
                </button>
              </div>

              <div className="space-y-7">
                <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                  <span className="text-[9px] font-black text-amber-500/80 uppercase tracking-[0.2em]">Environment Etkisi</span>
                  <span className="text-[8px] text-zinc-600">kaydırma çubukları ile</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Contrast size={14} /> Kontrast</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={50}
                        max={300}
                        value={lab.contrast}
                        onChange={(e) => setContrast(Number(e.target.value) || 50)}
                        className="w-14 py-1 px-2 text-right text-[11px] font-mono font-bold bg-black/40 border border-white/10 rounded text-amber-500 focus:border-amber-500/50 focus:outline-none"
                      />
                      <span className="text-[9px] text-zinc-500">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={300}
                    value={lab.contrast}
                    onChange={(e) => setLab((p) => ({ ...p, contrast: Number(e.target.value) }))}
                    className="w-full h-1 bg-zinc-800 rounded-full appearance-none accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-[9px] font-black text-amber-500/70 uppercase tracking-widest mb-1">Işık Gama Bölümü</div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Sun size={14} /> Parlaklık</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={50}
                        max={250}
                        value={lab.brightness}
                        onChange={(e) => setBrightness(Number(e.target.value) || 50)}
                        className="w-14 py-1 px-2 text-right text-[11px] font-mono font-bold bg-black/40 border border-white/10 rounded text-amber-500 focus:border-amber-500/50 focus:outline-none"
                      />
                      <span className="text-[9px] text-zinc-500">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={250}
                    value={lab.brightness}
                    onChange={(e) => setLab((p) => ({ ...p, brightness: Number(e.target.value) }))}
                    className="w-full h-1 bg-zinc-800 rounded-full appearance-none accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Eraser size={14} /> Yumuşatma</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={lab.sharpness}
                        onChange={(e) => setSharpness(Number(e.target.value) || 0)}
                        className="w-14 py-1 px-2 text-right text-[11px] font-mono font-bold bg-black/40 border border-white/10 rounded text-amber-500 focus:border-amber-500/50 focus:outline-none"
                      />
                      <span className="text-[9px] text-zinc-500">px</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={20}
                    value={lab.sharpness}
                    onChange={(e) => setLab((p) => ({ ...p, sharpness: Number(e.target.value) }))}
                    className="w-full h-1 bg-zinc-800 rounded-full appearance-none accent-amber-500 cursor-pointer"
                  />
                </div>

                <hr className="border-white/5" />

                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Segmentasyon</span>
                    {!lab.scanComplete && !lab.isScanning && (
                      <button
                        onClick={startLabScan}
                        className="text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-full font-bold"
                      >
                        ALANI TARA
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => setLab({ ...lab, maskStones: !lab.maskStones })}
                    className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all ${
                      lab.maskStones ? "bg-amber-500/10 border-amber-500/40 text-amber-500" : "bg-black/20 border-white/5 text-zinc-600 hover:border-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Gem size={18} />
                      <span className="text-[10px] font-bold uppercase tracking-tight">Taş Bölgelerini Koru</span>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${lab.maskStones ? "bg-amber-500 shadow-[0_0_10px_#f59e0b]" : "bg-zinc-800"}`} />
                  </button>

                  <button
                    onClick={() => setLab({ ...lab, invert: !lab.invert })}
                    className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all ${
                      lab.invert ? "bg-white text-black border-white shadow-xl" : "bg-black/20 border-white/5 text-zinc-600 hover:border-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Activity size={18} />
                      <span className="text-[10px] font-bold uppercase tracking-tight">Negatif Görünüm (Invert)</span>
                    </div>
                  </button>
                </div>

                <button
                  onClick={loadDemoImage}
                  className="w-full py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
                >
                  Demo görseli yükle
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 bg-zinc-800/40 border border-white/5 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all"
                >
                  <Camera size={18} className="text-amber-500" /> Eskiz Yükle
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleFileUpload}
                />
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-8">
            <div className="bg-zinc-900/20 rounded-[3rem] p-10 border border-white/5 min-h-[650px] flex flex-col items-center justify-center relative shadow-2xl overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.1)_0%,transparent_70%)] opacity-20 pointer-events-none" />
              {lab.isScanning && <div className="animate-scan" />}

              <div className="w-full h-full max-h-[600px] flex items-center justify-center z-10">
                <div className="relative bg-[#080808] rounded-[3rem] overflow-hidden flex items-center justify-center border border-white/5 shadow-2xl transition-all duration-1000 max-w-full max-h-full aspect-square">
                  {imageSrc ? (
                    <div className="relative w-full h-full overflow-hidden">
                      <img
                        src={imageSrc}
                        alt="Önizleme"
                        className="w-full h-full object-contain cursor-zoom-in transition-transform duration-500 hover:scale-105"
                        style={getLabStyles()}
                        onClick={() => setShowLightbox(true)}
                      />
                      {lab.maskStones && lab.scanComplete && (
                        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
                          <div className="stone-mask top-[42%] left-[45%] w-20 h-20" />
                          <div className="stone-mask top-[46%] left-[48%] w-16 h-16" />
                          <div className="absolute top-[38%] left-[44%] text-[7px] font-black uppercase bg-amber-500 text-black px-2 py-0.5 rounded shadow-lg animate-pulse">
                            Diamond Protected Area
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center opacity-5 select-none pointer-events-none">
                      <Diamond size={180} strokeWidth={0.5} />
                      <p className="mt-4 text-xs font-black uppercase tracking-[1em]">Demo veya görsel yükle</p>
                    </div>
                  )}
                </div>
              </div>

              {imageSrc && (
                <div className="absolute bottom-10 right-10 flex flex-col gap-3 z-40">
                  <button
                    onClick={() => setShowLightbox(true)}
                    className="p-4 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl text-white hover:bg-black transition-all shadow-2xl"
                  >
                    <ZoomIn size={24} />
                  </button>
                  <button
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = imageSrc;
                      link.download = "manuel-kontrol-export.png";
                      link.click();
                    }}
                    className="p-4 bg-zinc-100 border border-white rounded-2xl text-black hover:scale-105 transition-all shadow-2xl flex items-center justify-center"
                  >
                    <Download size={24} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {showLightbox && imageSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setShowLightbox(false)}
        >
          <img
            src={imageSrc}
            alt="Büyütülmüş"
            className="max-h-[90vh] max-w-[90vw] object-contain"
            style={getLabStyles()}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setShowLightbox(false)}
            className="absolute top-4 right-4 p-2 bg-white/20 rounded-full text-white hover:bg-white/30"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
