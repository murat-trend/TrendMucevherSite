"use client";

import { useState } from 'react';
import { Ruler, Scissors, Layers, Info } from 'lucide-react';

interface Preset {
  name: string;
  nameTr: string;
  w1: number;
  w2: number;
  h: number;
  desc: string;
}

const PRESETS: Preset[] = [
  { name: 'Smartphone (Pocket-size)', nameTr: 'Akıllı Telefon (Cep Boyu)', w1: 1.0, w2: 6.0, h: 3.5, desc: 'Standart cep telefonları ve küçük ekranlar için ideal ölçüler.' },
  { name: 'Medium Tablet (iPad Mini, etc.)', nameTr: 'Orta Boy Tablet (iPad Mini vb.)', w1: 1.5, w2: 9.0, h: 5.2, desc: '7-9 inç arası tabletler için mükemmel parlaklık ve boyut dengesi.' },
  { name: 'Large Tablet (iPad Pro, etc.)', nameTr: 'Büyük Tablet (iPad Pro vb.)', w1: 2.0, w2: 12.0, h: 7.0, desc: 'Büyük tabletler ve dizüstü bilgisayarlar için ideal, devasa hologram.' },
  { name: 'Monitor / Laptop Screen', nameTr: 'Masaüstü Ekran / Laptop', w1: 3.5, w2: 20.0, h: 11.5, desc: 'Büyük monitörler veya TV ekranları için devasa projeksiyon piramidi.' }
];

export function TemplateGenerator() {
  const [selectedPreset, setSelectedPreset] = useState<number>(0);
  const [customW1, setCustomW1] = useState<number>(1.0);
  const [customW2, setCustomW2] = useState<number>(6.0);
  const [customH, setCustomH] = useState<number>(3.5);
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [layoutMode, setLayoutMode] = useState<'single' | 'joined'>('joined');
  const [pxPerCm, setPxPerCm] = useState<number>(37.8);

  const w1 = isCustom ? customW1 : PRESETS[selectedPreset].w1;
  const w2 = isCustom ? customW2 : PRESETS[selectedPreset].w2;
  const h = isCustom ? customH : PRESETS[selectedPreset].h;

  const selectPreset = (idx: number) => { setIsCustom(false); setSelectedPreset(idx); };
  const updateCustomValue = (type: 'w1' | 'w2' | 'h', val: number) => {
    setIsCustom(true);
    if (type === 'w1') setCustomW1(val);
    if (type === 'w2') setCustomW2(val);
    if (type === 'h') setCustomH(val);
  };

  const renderSVGTemplate = () => {
    const scale = pxPerCm;
    const sw1 = w1 * scale; const sw2 = w2 * scale; const sh = h * scale;
    const padding = 40;

    if (layoutMode === 'single') {
      const width = sw2 + padding * 2;
      const height = sh + padding * 2;
      const p1x = width/2-sw1/2; const p1y = padding;
      const p2x = width/2+sw1/2; const p2y = padding;
      const p3x = width/2+sw2/2; const p3y = padding+sh;
      const p4x = width/2-sw2/2; const p4y = padding+sh;
      const points = `${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y} ${p4x},${p4y}`;
      return (
        <svg width={width} height={height} className="mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
          <polygon points={points} fill="rgba(99,102,241,0.08)" stroke="#6366f1" strokeWidth="2" />
          <text x={width/2} y={p1y-10} textAnchor="middle" fontSize="12" fill="#64748b">{w1} cm (Üst Taban)</text>
          <text x={width/2} y={p4y+22} textAnchor="middle" fontSize="12" fill="#64748b">{w2} cm (Alt Taban)</text>
          <text x={p3x+14} y={padding+sh/2} textAnchor="start" fontSize="12" fill="#64748b">{h} cm</text>
        </svg>
      );
    }

    const center = sw2 + padding;
    const size = center * 2;
    const cx1 = center-sw1/2; const cy1 = center-sw1/2;
    const cx2 = center+sw1/2; const cy2 = center+sw1/2;
    const bPts = `${cx1},${cy2} ${cx2},${cy2} ${center+sw2/2},${cy2+sh} ${center-sw2/2},${cy2+sh}`;
    const tPts = `${cx2},${cy1} ${cx1},${cy1} ${center-sw2/2},${cy1-sh} ${center+sw2/2},${cy1-sh}`;
    const lPts = `${cx1},${cy2} ${cx1},${cy1} ${cx1-sh},${center-sw2/2} ${cx1-sh},${center+sw2/2}`;
    const rPts = `${cx2},${cy1} ${cx2},${cy2} ${cx2+sh},${center+sw2/2} ${cx2+sh},${center-sw2/2}`;
    return (
      <svg width={size} height={size} className="mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
        <rect x={cx1} y={cy1} width={sw1} height={sw1} fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="5,5" />
        {[bPts, tPts, lPts, rPts].map((pts, i) => (
          <polygon key={i} points={pts} fill="rgba(99,102,241,0.07)" stroke="#6366f1" strokeWidth="2" />
        ))}
        <text x={center} y={center} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#94a3b8">KESİM</text>
        <text x={center} y={cy2+sh+22} textAnchor="middle" fontSize="11" fill="#64748b">{w2} cm</text>
        <text x={center} y={cy1-sh-12} textAnchor="middle" fontSize="11" fill="#64748b">{w2} cm</text>
        <text x={cx2+sh+8} y={center} textAnchor="start" dominantBaseline="middle" fontSize="11" fill="#6366f1">Y: {h} cm</text>
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PRESETS.map((preset, idx) => (
          <button
            key={idx}
            onClick={() => selectPreset(idx)}
            className={`p-4 rounded-2xl border text-left transition-all ${
              !isCustom && selectedPreset === idx
                ? 'border-[#b76e79] bg-[#b76e79]/10'
                : 'border-white/10 hover:border-white/20 bg-white/5'
            }`}
          >
            <div className="flex justify-between items-start mb-1.5">
              <span className="font-semibold text-sm text-white/90">{preset.nameTr}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/50">{preset.w1}×{preset.w2}×{preset.h} cm</span>
            </div>
            <p className="text-[11px] text-white/50 leading-relaxed">{preset.desc}</p>
          </button>
        ))}
      </div>

      <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
        <h4 className="font-semibold text-white/90 text-sm flex items-center gap-1.5">
          <Ruler className="w-4 h-4 text-[#b76e79]" />
          Boyutları Özelleştir
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['w1','w2','h'] as const).map((type) => (
            <div key={type}>
              <label className="block text-xs font-medium text-white/50 mb-1.5">
                {type === 'w1' ? 'Üst Taban (w1)' : type === 'w2' ? 'Alt Taban (w2)' : 'Yan Yükseklik (h)'}:{' '}
                <span className="font-semibold text-white/90">{(type === 'w1' ? w1 : type === 'w2' ? w2 : h).toFixed(1)} cm</span>
              </label>
              <input
                type="range"
                min={type === 'w1' ? 0.5 : type === 'w2' ? 4.0 : 2.0}
                max={type === 'w1' ? 4.0 : type === 'w2' ? 25.0 : 15.0}
                step={type === 'h' ? 0.1 : type === 'w1' ? 0.1 : 0.5}
                value={type === 'w1' ? w1 : type === 'w2' ? w2 : h}
                onChange={(e) => updateCustomValue(type, parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#b76e79]"
                style={{ background: 'rgba(183,110,121,0.3)' }}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50">Görünüm:</span>
            <div className="inline-flex rounded-lg bg-white/10 p-0.5">
              {(['joined','single'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setLayoutMode(mode)}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition ${layoutMode === mode ? 'bg-[#b76e79] text-white' : 'text-white/50 hover:text-white/80'}`}
                >
                  {mode === 'joined' ? 'Yıldız (4 Birleşik)' : 'Tekli Panel'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-[#b76e79]" />
            <span className="text-xs text-white/50">Kalibrasyon:</span>
            <input
              type="number"
              value={pxPerCm.toFixed(1)}
              onChange={(e) => setPxPerCm(parseFloat(e.target.value) || 37.8)}
              className="w-16 px-2 py-1 text-xs text-center rounded bg-white/10 border border-white/20 text-white/90"
            />
            <span className="text-xs text-white/40">px/cm</span>
          </div>
        </div>
      </div>

      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex gap-2 text-sm text-yellow-400">
          <Layers className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h5 className="font-semibold text-xs mb-0.5">Kalibrasyon Çizgisi</h5>
            <p className="text-[11px] opacity-80 leading-relaxed">Yandaki çizgiyi cetvelinizle ölçün. Tam 5 cm değilse px/cm değerini ayarlayın.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative h-6 bg-white/10 border-l-2 border-r-2 border-white/40 flex items-center" style={{ width: `${5*pxPerCm}px` }}>
            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white/50 font-bold">5 CM</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center p-6 bg-white/5 rounded-2xl border border-white/10">
        <div className="mb-4 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#b76e79]/20 text-[#b76e79] text-xs font-semibold">
            <Scissors className="w-3.5 h-3.5" />
            Şeffaf Plastiği Bu Şablona Göre Kesin
          </span>
          <p className="text-[11px] text-white/40 mt-2">Ekrana asetat kağıdı koyup çizebilir, ya da A4'e yazdırıp şablon olarak kullanabilirsiniz.</p>
        </div>
        <div className="overflow-auto max-w-full p-4 bg-white/5 rounded-2xl">
          {renderSVGTemplate()}
        </div>
      </div>
    </div>
  );
}
