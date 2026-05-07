components/remaura/RemauraRingRailResizeSection.tsx dosyasının tüm içeriğini sil ve yukarıdaki kodu yaz. Tek değişiklik şu: handleFileUpload fonksiyonunda meshObj oluşturulduktan sonra, ring_axis değerine göre otomatik döndürme ekle — eğer ring_axis X ise meshObj.rotation.z = Math.PI / 2, eğer Y ise değiştirme, eğer Z ise meshObj.rotation.x = Math.PI / 2. Ayrıca export default App yerine export default RemauraRingRailResizeSection olsun.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  Upload, 
  Settings, 
  Ruler, 
  Maximize2, 
  Download, 
  AlertTriangle, 
  Info,
  CheckCircle2,
  Trash2,
  ChevronRight,
  Gauge
} from 'lucide-react';

// --- Constants & Data ---

const RING_SIZES = [
  { inner_dia_mm: 14.05, eu: 4, us: 3.0, tr: 4 },
  { inner_dia_mm: 14.45, eu: 6, us: 3.5, tr: 6 },
  { inner_dia_mm: 14.86, eu: 7, us: 4.0, tr: 7 },
  { inner_dia_mm: 15.27, eu: 8, us: 4.5, tr: 8 },
  { inner_dia_mm: 15.70, eu: 9, us: 5.0, tr: 9 },
  { inner_dia_mm: 16.10, eu: 10, us: 5.5, tr: 10 },
  { inner_dia_mm: 16.51, eu: 11, us: 6.0, tr: 11 },
  { inner_dia_mm: 16.92, eu: 12, us: 6.5, tr: 12 },
  { inner_dia_mm: 17.35, eu: 13, us: 7.0, tr: 13 },
  { inner_dia_mm: 17.75, eu: 14, us: 7.5, tr: 14 },
  { inner_dia_mm: 18.19, eu: 15, us: 8.0, tr: 15 },
  { inner_dia_mm: 18.53, eu: 16, us: 8.5, tr: 16 },
  { inner_dia_mm: 18.89, eu: 17, us: 9.0, tr: 17 },
  { inner_dia_mm: 19.41, eu: 18, us: 9.5, tr: 18 },
  { inner_dia_mm: 19.84, eu: 19, us: 10.0, tr: 19 },
  { inner_dia_mm: 20.20, eu: 20, us: 10.5, tr: 20 },
  { inner_dia_mm: 20.68, eu: 21, us: 11.0, tr: 21 },
  { inner_dia_mm: 21.08, eu: 22, us: 11.5, tr: 22 },
  { inner_dia_mm: 21.49, eu: 23, us: 12.0, tr: 23 },
  { inner_dia_mm: 21.89, eu: 24, us: 12.5, tr: 24 },
  { inner_dia_mm: 22.33, eu: 25, us: 13.0, tr: 25 },
  { inner_dia_mm: 22.60, eu: 26, us: 13.5, tr: 26 },
  { inner_dia_mm: 23.06, eu: 27, us: 14.0, tr: 27 },
  { inner_dia_mm: 23.47, eu: 28, us: 14.5, tr: 28 },
  { inner_dia_mm: 23.87, eu: 29, us: 15.0, tr: 29 },
  { inner_dia_mm: 24.27, eu: 30, us: 15.5, tr: 30 },
  { inner_dia_mm: 24.68, eu: 31, us: 16.0, tr: 31 },
  { inner_dia_mm: 25.08, eu: 32, us: 16.5, tr: 32 },
  { inner_dia_mm: 25.50, eu: 33, us: 17.0, tr: 33 },
  { inner_dia_mm: 25.94, eu: 34, us: 17.5, tr: 34 },
  { inner_dia_mm: 26.30, eu: 35, us: 18.0, tr: 35 },
  { inner_dia_mm: 26.71, eu: 36, us: 18.5, tr: 36 },
  { inner_dia_mm: 27.11, eu: 37, us: 19.0, tr: 37 },
  { inner_dia_mm: 27.53, eu: 38, us: 19.5, tr: 38 },
  { inner_dia_mm: 27.93, eu: 39, us: 20.0, tr: 39 },
  { inner_dia_mm: 28.33, eu: 40, us: 20.5, tr: 40 },
];

const findClosestRingSize = (inner_mm) => {
  return RING_SIZES.reduce((prev, curr) => 
    Math.abs(curr.inner_dia_mm - inner_mm) < Math.abs(prev.inner_dia_mm - inner_mm) ? curr : prev
  );
};

// --- Core App Component ---

export default function App() {
  const [mesh, setMesh] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [targetSize, setTargetSize] = useState(null);
  const [scaleMode, setScaleMode] = useState('mm'); // 'mm' or 'size'
  
  const viewportRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const meshObjRef = useRef(null);
  const controlsRef = useRef(null);

  // Initialize Three.js
  useEffect(() => {
    if (!viewportRef.current) return;

    const width = viewportRef.current.clientWidth;
    const height = viewportRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf3f4f6);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(50, 50, 50);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    viewportRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(100, 100, 50);
    scene.add(dirLight);

    const grid = new THREE.GridHelper(100, 20, 0xccd1d9, 0xe5e7eb);
    scene.add(grid);

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!viewportRef.current) return;
      const w = viewportRef.current.clientWidth;
      const h = viewportRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // --- Measurement Logic ---

  const analyzeMesh = (geometry) => {
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    // Normalize units
    const maxDim = Math.max(size.x, size.y, size.z);
    let scale = 1.0;
    if (maxDim < 1.0) scale = 1000.0; 
    else if (maxDim < 10.0) scale = 10.0; 
    
    if (scale !== 1.0) {
      geometry.scale(scale, scale, scale);
      geometry.computeBoundingBox();
      geometry.boundingBox.getSize(size);
      geometry.boundingBox.getCenter(center);
    }

    const pos = geometry.attributes.position;
    const vCount = pos.count;
    
    const analyzeAxis = (axisName) => {
      const dists = new Float32Array(vCount);
      let avgDist = 0;
      
      for (let i = 0; i < vCount; i++) {
        const x = pos.getX(i) - center.x;
        const y = pos.getY(i) - center.y;
        const z = pos.getZ(i) - center.z;
        
        let d;
        if (axisName === 'X') d = Math.sqrt(y*y + z*z);
        else if (axisName === 'Y') d = Math.sqrt(x*x + z*z);
        else d = Math.sqrt(x*x + y*y);
        
        dists[i] = d;
        avgDist += d;
      }
      
      avgDist /= vCount;
      const sortedDists = Array.from(dists).sort((a, b) => a - b);
      const innerIdxStart = Math.floor(vCount * 0.05);
      const innerIdxEnd = Math.floor(vCount * 0.15);
      const innerRadius = sortedDists[Math.floor((innerIdxStart + innerIdxEnd) / 2)];
      const outerRadius = sortedDists[Math.floor(vCount * 0.95)];
      
      let stability = 0;
      const sampleSet = sortedDists.slice(innerIdxStart, innerIdxEnd);
      const sampleMean = sampleSet.reduce((a, b) => a + b, 0) / sampleSet.length;
      const sampleVar = sampleSet.reduce((a, b) => a + Math.pow(b - sampleMean, 2), 0) / sampleSet.length;
      stability = 1.0 / (1.0 + Math.sqrt(sampleVar));

      return {
        inner_dia: innerRadius * 2,
        outer_dia: outerRadius * 2,
        stability,
        axis: axisName
      };
    };

    const results = [analyzeAxis('X'), analyzeAxis('Y'), analyzeAxis('Z')];
    const best = results.reduce((prev, curr) => curr.stability > prev.stability ? curr : prev);

    return {
      inner_diameter_mm: best.inner_dia,
      outer_diameter_mm: best.outer_dia,
      ring_axis: best.axis,
      size_details: findClosestRingSize(best.inner_dia),
      watertight: true, 
      stability_pct: (1 - best.stability) * 100
    };
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setLoading(true);
    setError(null);
    setAnalysis(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const loader = new STLLoader();
        const geometry = loader.parse(event.target.result);
        
        const report = analyzeMesh(geometry);
        setAnalysis(report);
        setTargetSize(report.inner_diameter_mm.toFixed(2));

        if (meshObjRef.current) {
          sceneRef.current.remove(meshObjRef.current);
        }

        const material = new THREE.MeshPhongMaterial({ 
          color: 0x94a3b8, 
          specular: 0x111111, 
          shininess: 200,
          side: THREE.DoubleSide
        });
        
        const meshObj = new THREE.Mesh(geometry, material);
        meshObjRef.current = meshObj;
        sceneRef.current.add(meshObj);

        const box = geometry.boundingBox;
        const center = new THREE.Vector3();
        box.getCenter(center);
        const size = new THREE.Vector3();
        box.getSize(size);
        
        meshObj.position.sub(center); 
        
        const maxDim = Math.max(size.x, size.y, size.z);
        cameraRef.current.position.set(maxDim * 2, maxDim * 2, maxDim * 2);
        cameraRef.current.lookAt(0, 0, 0);
        controlsRef.current.target.set(0, 0, 0);

        setMesh(geometry);
      } catch (err) {
        setError("Failed to parse STL file. Ensure it is a valid binary or ASCII STL.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadScaledMesh = () => {
    if (!mesh || !analysis) return;

    const scaleFactor = parseFloat(targetSize) / analysis.inner_diameter_mm;
    const scaledGeo = mesh.clone();
    scaledGeo.scale(scaleFactor, scaleFactor, scaleFactor);
    
    const meshToExport = new THREE.Mesh(scaledGeo);
    const exporter = new STLExporter();
    const result = exporter.parse(meshToExport, { binary: true });
    
    const blob = new Blob([result], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `resized_ring_${targetSize}mm.stl`;
    link.click();
  };

  const clear = () => {
    setMesh(null);
    setAnalysis(null);
    if (meshObjRef.current) {
      sceneRef.current.remove(meshObjRef.current);
      meshObjRef.current = null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Gauge className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Ring Rail Measure</h1>
        </div>
        <div className="flex items-center gap-4">
          {mesh && (
            <button 
              onClick={clear}
              className="text-slate-500 hover:text-red-600 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Reset
            </button>
          )}
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        <aside className="w-96 bg-white border-r border-slate-200 overflow-y-auto p-6 flex flex-col gap-6 shrink-0">
          {!mesh ? (
            <div className="flex flex-col gap-4">
              <label className="group flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 transition-all">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <div className="bg-white p-4 rounded-full shadow-sm group-hover:scale-110 transition-transform mb-4">
                    <Upload className="w-8 h-8 text-indigo-600" />
                  </div>
                  <p className="mb-2 text-sm text-slate-700 font-semibold">Click or drag STL file</p>
                  <p className="text-xs text-slate-500">Binary or ASCII STL (max 50MB)</p>
                </div>
                <input type="file" className="hidden" accept=".stl" onChange={handleFileUpload} />
              </label>
              
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  This tool uses vertex analysis to detect the finger hole. Ensure the ring is centered for best results.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-left-4 duration-500">
              <section className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Ruler className="w-4 h-4" />
                    Auto-Measurement
                  </h2>
                  <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    Detected
                  </span>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-end border-b border-slate-200 pb-3">
                    <span className="text-sm text-slate-600 font-medium">Inner Diameter</span>
                    <span className="text-2xl font-black text-indigo-600">{analysis.inner_diameter_mm.toFixed(2)}<span className="text-xs ml-1 font-bold text-slate-400">mm</span></span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">TR / EU Size</p>
                      <p className="text-lg font-bold">{analysis.size_details.tr}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">US Size</p>
                      <p className="text-lg font-bold">{analysis.size_details.us}</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">Confidence Score</span>
                      <span className="font-bold text-slate-700">{Math.round(100 - analysis.stability_pct)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-500 h-full transition-all duration-1000" 
                        style={{ width: `${Math.min(100, Math.max(0, 100 - analysis.stability_pct))}%` }}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="flex flex-col gap-4">
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Maximize2 className="w-4 h-4" />
                  Resize Rail
                </h2>
                
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                      <button 
                        onClick={() => setScaleMode('mm')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${scaleMode === 'mm' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                      >
                        MM
                      </button>
                      <button 
                        onClick={() => setScaleMode('size')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${scaleMode === 'size' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                      >
                        Size
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {scaleMode === 'mm' ? (
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-2 uppercase">Target Inner Diameter</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            step="0.01"
                            value={targetSize}
                            onChange={(e) => setTargetSize(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">mm</span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-2 uppercase">Target TR / EU Size</label>
                        <select 
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none transition-all cursor-pointer"
                          value={RING_SIZES.find(s => s.inner_dia_mm.toFixed(2) === parseFloat(targetSize).toFixed(2))?.eu || ""}
                          onChange={(e) => {
                            const size = RING_SIZES.find(s => s.eu === parseInt(e.target.value));
                            if (size) setTargetSize(size.inner_dia_mm.toFixed(2));
                          }}
                        >
                          {RING_SIZES.map(s => (
                            <option key={s.eu} value={s.eu}>Size {s.eu} ({s.inner_dia_mm}mm)</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="bg-white/80 rounded-xl p-3 border border-indigo-100 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-600">Scale Factor</span>
                      <span className="text-sm font-black text-indigo-700">
                        x{(parseFloat(targetSize) / analysis.inner_diameter_mm).toFixed(4)}
                      </span>
                    </div>

                    <button 
                      onClick={downloadScaledMesh}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 mt-2 active:scale-95"
                    >
                      <Download className="w-5 h-5" />
                      Export Resized STL
                    </button>
                  </div>
                </div>
              </section>

              <div className="mt-auto pt-6 text-center">
                <p className="text-[10px] text-slate-400 font-medium">
                  Analysis Engine v1.2.1 • Fixed Module Resolving
                </p>
              </div>
            </div>
          )}
        </aside>

        <section className="flex-1 relative bg-slate-100">
          <div ref={viewportRef} className="w-full h-full cursor-move" />
          
          {loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                <Gauge className="absolute inset-0 m-auto w-6 h-6 text-indigo-600 animate-pulse" />
              </div>
              <p className="mt-4 text-slate-700 font-bold animate-pulse tracking-wide">Analyzing Rail Geometry...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-6 z-30">
              <div className="bg-white border border-red-100 rounded-2xl shadow-2xl p-8 max-w-md text-center">
                <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Analysis Error</h3>
                <p className="text-slate-600 text-sm mb-6">{error}</p>
                <button 
                  onClick={() => setError(null)}
                  className="bg-slate-900 text-white font-bold px-6 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {!mesh && !loading && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="text-center opacity-30 select-none">
                <Ruler className="w-24 h-24 mx-auto text-slate-400 mb-4" />
                <p className="text-2xl font-black text-slate-400 uppercase tracking-tighter">Preview Environment</p>
              </div>
            </div>
          )}

          {mesh && !loading && (
            <div className="absolute bottom-6 right-6 flex flex-col gap-2">
              <div className="bg-white/90 backdrop-blur border border-slate-200 rounded-lg px-4 py-2 shadow-sm pointer-events-none">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Model Stats</p>
                <p className="text-xs font-bold text-slate-700">
                  {mesh.attributes.position.count.toLocaleString()} Vertices • {analysis.ring_axis}-Axis Hole
                </p>
              </div>
            </div>
          )}
        </section>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
      `}} />
    </div>
  );
}