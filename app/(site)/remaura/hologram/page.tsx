"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload, Play, Square, Mic, MicOff, Eye, EyeOff, Layers, RotateCcw,
  Maximize2, Minimize2, Music, BookOpen, Scissors, Monitor, Box
} from 'lucide-react';
import { HologramCanvas, HologramConfig } from './_components/HologramCanvas';
import { VirtualSimulator } from './_components/VirtualSimulator';
import { SynthEngine } from './_components/SynthEngine';
import { TemplateGenerator } from './_components/TemplateGenerator';
import { DiyGuide } from './_components/DiyGuide';

const defaultConfig: HologramConfig = {
  objectType: 'jewelryRing',
  color: '#00e5ff',
  speed: 1.0,
  scale: 1.0,
  zoom: 1.0,
  distance: 2.8,
  opacity: 0.92,
  renderStyle: 'solid',
  showGuide: true,
  guideType: 'crosshair',
  guideColor: '#ff3333',
  text: 'REMAURA',
  audioValue: 0,
  audioReactive: false,
  customModelUrl: null,
  customModelFormat: null,
  useOriginalMaterials: true,
  cloneCount: 4,
  specialEffect: 'none',
  showroomMode: false,
  slot1Url: null, slot1Format: null,
  slot2Url: null, slot2Format: null,
  slot3Url: null, slot3Format: null,
  slot4Url: null, slot4Format: null,
  slot5Url: null, slot5Format: null,
};

type TabId = 'projector' | 'simulator' | 'template' | 'diy';

const synthEngine = new SynthEngine();

export default function HologramPage() {
  const [config, setConfig] = useState<HologramConfig>(defaultConfig);
  const [activeTab, setActiveTab] = useState<TabId>('projector');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [uploadedModelName, setUploadedModelName] = useState<string | null>(null);
  const [slotNames, setSlotNames] = useState<(string|null)[]>([null,null,null,null,null]);

  const update = useCallback(<K extends keyof HologramConfig>(key: K, value: HologramConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleAudioToggle = () => {
    if (isAudioPlaying) {
      synthEngine.stop(); setIsAudioPlaying(false);
    } else {
      synthEngine.setBeatCallback(v => update('audioValue', v));
      synthEngine.setVolume(volume);
      synthEngine.playSynth();
      setIsAudioPlaying(true);
      update('audioReactive', true);
    }
  };

  const handleMicToggle = async () => {
    if (isMicActive) {
      synthEngine.stop(); setIsMicActive(false); update('audioReactive', false);
    } else {
      if (isAudioPlaying) { synthEngine.stop(); setIsAudioPlaying(false); }
      synthEngine.setBeatCallback(v => update('audioValue', v));
      const ok = await synthEngine.startMic();
      if (ok) { setIsMicActive(true); update('audioReactive', true); }
      else alert('Mikrofon izni gerekli.');
    }
  };

  useEffect(() => { synthEngine.setVolume(volume); }, [volume]);
  useEffect(() => () => { synthEngine.stop(); }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, slot?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const format = (ext === 'glb' || ext === 'gltf') ? 'gltf' : ext === 'obj' ? 'obj' : ext === 'stl' ? 'stl' : null;
    if (!format) { alert('Desteklenen formatlar: GLB, GLTF, OBJ, STL'); return; }
    const url = URL.createObjectURL(file);
    if (slot !== undefined) {
      const slotKey = `slot${slot}Url` as keyof HologramConfig;
      const fmtKey = `slot${slot}Format` as keyof HologramConfig;
      setConfig(prev => ({ ...prev, [slotKey]: url, [fmtKey]: format }));
      setSlotNames(prev => { const n = [...prev]; n[slot-1] = file.name; return n; });
    } else {
      update('objectType', 'customModel');
      update('customModelUrl', url);
      update('customModelFormat', format as any);
      setUploadedModelName(file.name);
    }
  }, [update]);

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'projector', label: 'Hologram Projektörü', icon: <Monitor className="w-4 h-4" /> },
    { id: 'simulator', label: 'Sanal Simülatör', icon: <Box className="w-4 h-4" /> },
    { id: 'template', label: 'Şablon Oluşturucu', icon: <Scissors className="w-4 h-4" /> },
    { id: 'diy', label: 'Yapım Rehberi', icon: <BookOpen className="w-4 h-4" /> },
  ];

  const ROSE = '#b76e79';
  const ROSE_DIM = 'rgba(183,110,121,0.2)';

  return (
    <div className="min-h-screen text-white" style={{ background: '#07080a' }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#0a0b0e' }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight" style={{ color: ROSE }}>
              Remaura Hologram
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Pepper's Ghost projeksiyon sistemi
            </p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium border" style={{ color: ROSE, borderColor: ROSE, background: ROSE_DIM }}>
            SÜPER-ADMİN
          </span>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 pb-0 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-t-lg transition-all border-b-2 whitespace-nowrap"
              style={{
                background: activeTab === tab.id ? ROSE_DIM : 'transparent',
                color: activeTab === tab.id ? ROSE : 'rgba(255,255,255,0.45)',
                borderBottomColor: activeTab === tab.id ? ROSE : 'transparent',
              }}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* PROJECTOR TAB */}
        {activeTab === 'projector' && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
            {/* Canvas */}
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#000' }}>
                <HologramCanvas config={config} className="w-full" isFullScreen={isFullScreen} />
                <div className="absolute top-3 right-3 flex gap-2">
                  <button onClick={() => setIsFullScreen(p => !p)}
                    className="p-2 rounded-lg backdrop-blur-sm border text-white/70 hover:text-white transition"
                    style={{ background: 'rgba(0,0,0,0.5)', borderColor: 'rgba(255,255,255,0.1)' }}>
                    {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                  <button onClick={() => update('showGuide', !config.showGuide)}
                    className="p-2 rounded-lg backdrop-blur-sm border transition"
                    style={{ background: 'rgba(0,0,0,0.5)', borderColor: 'rgba(255,255,255,0.1)', color: config.showGuide ? ROSE : 'rgba(255,255,255,0.5)' }}>
                    {config.showGuide ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Audio Controls */}
              <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ background: '#0a0b0e', borderColor: 'rgba(255,255,255,0.06)' }}>
                <button onClick={handleAudioToggle}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition"
                  style={{ background: isAudioPlaying ? ROSE_DIM : 'rgba(255,255,255,0.08)', color: isAudioPlaying ? ROSE : 'rgba(255,255,255,0.7)', border: `1px solid ${isAudioPlaying ? ROSE : 'rgba(255,255,255,0.1)'}` }}>
                  {isAudioPlaying ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {isAudioPlaying ? 'Durdur' : 'Synthwave'}
                </button>
                <button onClick={handleMicToggle}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition"
                  style={{ background: isMicActive ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.08)', color: isMicActive ? '#ef4444' : 'rgba(255,255,255,0.7)', border: `1px solid ${isMicActive ? '#ef4444' : 'rgba(255,255,255,0.1)'}` }}>
                  {isMicActive ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  {isMicActive ? 'Kapat' : 'Mikrofon'}
                </button>
                <div className="flex items-center gap-2 ml-auto">
                  <Music className="w-3.5 h-3.5 opacity-40" />
                  <input type="range" min={0} max={1} step={0.05} value={volume}
                    onChange={e => setVolume(parseFloat(e.target.value))}
                    className="w-24 h-1 rounded appearance-none cursor-pointer accent-[#b76e79]"
                    style={{ background: 'rgba(183,110,121,0.3)' }} />
                </div>
              </div>
            </div>

            {/* Controls Panel */}
            <div className="space-y-4">
              {/* Object Type */}
              <div className="p-4 rounded-2xl border space-y-3" style={{ background: '#0a0b0e', borderColor: 'rgba(255,255,255,0.06)' }}>
                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: ROSE }}>Nesne Tipi</h3>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { val: 'jewelryRing', label: 'Yüzük', icon: '💍' },
                    { val: 'jewelryDiamond', label: 'Elmas', icon: '💎' },
                    { val: 'text', label: 'Metin', icon: '✦' },
                    { val: 'customModel', label: '3D Model', icon: '📦' },
                  ] as const).map(opt => (
                    <button key={opt.val} onClick={() => update('objectType', opt.val)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border"
                      style={{ background: config.objectType === opt.val ? ROSE_DIM : 'rgba(255,255,255,0.04)', color: config.objectType === opt.val ? ROSE : 'rgba(255,255,255,0.65)', borderColor: config.objectType === opt.val ? ROSE : 'rgba(255,255,255,0.08)' }}>
                      <span>{opt.icon}</span>{opt.label}
                    </button>
                  ))}
                </div>

                {config.objectType === 'text' && (
                  <input type="text" value={config.text} onChange={e => update('text', e.target.value)}
                    placeholder="Metin..." maxLength={20}
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)' }} />
                )}

                {config.objectType === 'customModel' && (
                  <div>
                    <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed cursor-pointer transition hover:border-[#b76e79]" style={{ borderColor: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.03)' }}>
                      <Upload className="w-4 h-4" style={{ color: ROSE }} />
                      <span className="text-xs text-white/60">{uploadedModelName ?? 'GLB / OBJ / STL yükle'}</span>
                      <input type="file" accept=".glb,.gltf,.obj,.stl" className="hidden" onChange={e => handleFileUpload(e)} />
                    </label>
                    {config.customModelUrl && (
                      <label className="flex items-center gap-2 mt-2 cursor-pointer">
                        <input type="checkbox" checked={config.useOriginalMaterials} onChange={e => update('useOriginalMaterials', e.target.checked)} className="accent-[#b76e79]" />
                        <span className="text-xs text-white/50">Orijinal materyalleri koru</span>
                      </label>
                    )}
                  </div>
                )}
              </div>

              {/* Showroom Mode */}
              <div className="p-4 rounded-2xl border space-y-3" style={{ background: '#0a0b0e', borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: ROSE }}>
                    <Layers className="w-3.5 h-3.5" />Showroom Modu
                  </h3>
                  <button onClick={() => update('showroomMode', !config.showroomMode)}
                    className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                    style={{ background: config.showroomMode ? ROSE : 'rgba(255,255,255,0.15)' }}>
                    <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform" style={{ transform: config.showroomMode ? 'translateX(18px)' : 'translateX(2px)' }} />
                  </button>
                </div>
                {config.showroomMode && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-white/40">5 slot — ortadaki ana ürün, 4 köşe yardımcı</p>
                    {([1,2,3,4,5] as const).map(slot => (
                      <label key={slot} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed cursor-pointer transition hover:border-[#b76e79]" style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.03)' }}>
                        <Upload className="w-3.5 h-3.5 shrink-0" style={{ color: ROSE }} />
                        <span className="text-xs text-white/55 truncate">{slotNames[slot-1] ?? `Slot ${slot}${slot===5?' (Ana)':''}`}</span>
                        <input type="file" accept=".glb,.gltf,.obj,.stl" className="hidden" onChange={e => handleFileUpload(e, slot)} />
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Visual Settings */}
              <div className="p-4 rounded-2xl border space-y-3" style={{ background: '#0a0b0e', borderColor: 'rgba(255,255,255,0.06)' }}>
                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: ROSE }}>Görsel Ayarlar</h3>

                <div className="flex items-center gap-3">
                  <label className="text-xs text-white/50 w-20">Renk</label>
                  <input type="color" value={config.color} onChange={e => update('color', e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent" />
                  <span className="text-xs font-mono text-white/40">{config.color}</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-xs text-white/50 w-20">Stil</label>
                  {(['solid','wireframe','points','hybrid'] as const).map(s => (
                    <button key={s} onClick={() => update('renderStyle', s)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition border"
                      style={{ background: config.renderStyle === s ? ROSE_DIM : 'rgba(255,255,255,0.05)', color: config.renderStyle === s ? ROSE : 'rgba(255,255,255,0.5)', borderColor: config.renderStyle === s ? ROSE : 'rgba(255,255,255,0.08)' }}>
                      {s}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-xs text-white/50 w-20 shrink-0">Efekt</label>
                  {(['none','sparkles','scanlines','flicker'] as const).map(fx => (
                    <button key={fx} onClick={() => update('specialEffect', fx)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition border"
                      style={{ background: config.specialEffect === fx ? ROSE_DIM : 'rgba(255,255,255,0.05)', color: config.specialEffect === fx ? ROSE : 'rgba(255,255,255,0.5)', borderColor: config.specialEffect === fx ? ROSE : 'rgba(255,255,255,0.08)' }}>
                      {fx}
                    </button>
                  ))}
                </div>

                {([
                  { key: 'speed' as const, label: 'Hız', min: 0, max: 3, step: 0.05 },
                  { key: 'scale' as const, label: 'Boyut', min: 0.1, max: 3, step: 0.05 },
                  { key: 'opacity' as const, label: 'Opaklık', min: 0.05, max: 1, step: 0.02 },
                  { key: 'distance' as const, label: 'Mesafe', min: 0.5, max: 6, step: 0.1 },
                ]).map(({ key, label, min, max, step }) => (
                  <div key={key} className="flex items-center gap-3">
                    <label className="text-xs text-white/50 w-20">{label}</label>
                    <input type="range" min={min} max={max} step={step} value={config[key] as number}
                      onChange={e => update(key, parseFloat(e.target.value))}
                      className="flex-1 h-1 rounded appearance-none cursor-pointer accent-[#b76e79]"
                      style={{ background: 'rgba(183,110,121,0.3)' }} />
                    <span className="text-xs font-mono text-white/35 w-8 text-right">{(config[key] as number).toFixed(1)}</span>
                  </div>
                ))}

                <div className="flex items-center gap-3">
                  <label className="text-xs text-white/50 w-20">Klon</label>
                  <div className="flex gap-1">
                    {[1,2,3,4].map(n => (
                      <button key={n} onClick={() => update('cloneCount', n)}
                        className="w-8 h-7 rounded text-xs font-medium transition border"
                        style={{ background: config.cloneCount === n ? ROSE_DIM : 'rgba(255,255,255,0.05)', color: config.cloneCount === n ? ROSE : 'rgba(255,255,255,0.5)', borderColor: config.cloneCount === n ? ROSE : 'rgba(255,255,255,0.08)' }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Guide Settings */}
              <div className="p-4 rounded-2xl border space-y-3" style={{ background: '#0a0b0e', borderColor: 'rgba(255,255,255,0.06)' }}>
                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: ROSE }}>Hizalama Kılavuzu</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {(['none','dot','crosshair','target'] as const).map(g => (
                    <button key={g} onClick={() => { update('guideType', g); update('showGuide', g !== 'none'); }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition border"
                      style={{
                        background: (g !== 'none' && config.guideType === g && config.showGuide) || (g === 'none' && !config.showGuide) ? ROSE_DIM : 'rgba(255,255,255,0.05)',
                        color: (g !== 'none' && config.guideType === g && config.showGuide) || (g === 'none' && !config.showGuide) ? ROSE : 'rgba(255,255,255,0.5)',
                        borderColor: (g !== 'none' && config.guideType === g && config.showGuide) || (g === 'none' && !config.showGuide) ? ROSE : 'rgba(255,255,255,0.08)',
                      }}>
                      {g}
                    </button>
                  ))}
                  <input type="color" value={config.guideColor} onChange={e => update('guideColor', e.target.value)} className="w-7 h-7 rounded cursor-pointer bg-transparent border-0" />
                </div>
              </div>

              <button onClick={() => setConfig(defaultConfig)}
                className="w-full py-2.5 rounded-xl text-xs font-medium transition border"
                style={{ color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)' }}>
                <RotateCcw className="w-3.5 h-3.5 inline mr-1.5" />Varsayılanlara Dön
              </button>
            </div>
          </div>
        )}

        {activeTab === 'simulator' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border text-xs" style={{ background: '#0a0b0e', borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
              Pepper's Ghost prensibini canlandıran 3D simülatör. Telefonu düz yüzeye koyun, piramidi ekran ortasına hizalayın. Döndürmek için sürükleyin.
            </div>
            <VirtualSimulator className="h-[520px]" color={config.color} />
          </div>
        )}

        {activeTab === 'template' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border text-xs" style={{ background: '#0a0b0e', borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
              Cihaz boyutunuzu seçin ve ekrana asetat kağıdı koyarak şablonu çizin. Kalibrasyon çizgisini cetvelle ölçerek px/cm değerini ayarlayın.
            </div>
            <TemplateGenerator />
          </div>
        )}

        {activeTab === 'diy' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border text-xs" style={{ background: '#0a0b0e', borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
              Adım adım yapım rehberi — malzeme listesi, kesim talimatları ve hologram kalitesini artıracak pro ipuçları.
            </div>
            <DiyGuide />
          </div>
        )}
      </div>
    </div>
  );
}
