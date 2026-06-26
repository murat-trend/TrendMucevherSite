"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';

function SvgIcon({ name, className = "w-5 h-5", ...props }: { name: string; className?: string; [key: string]: unknown }) {
  const normName = name ? name.toLowerCase() : "";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {normName === 'smartphone' && (<><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></>)}
      {normName === 'sliders' && (<><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></>)}
      {normName === 'maximize2' && (<><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></>)}
      {normName === 'minimize2' && (<><polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="10" y1="14" x2="3" y2="21" /></>)}
      {normName === 'rotateccw' && (<><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><polyline points="3 3 3 8 8 8" /></>)}
      {normName === 'info' && (<><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></>)}
      {normName === 'music' && (<><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>)}
      {normName === 'mic' && (<><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></>)}
      {normName === 'activity' && (<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />)}
      {normName === 'scissors' && (<><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" /></>)}
      {normName === 'box' && (<><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></>)}
      {normName === 'type' && (<><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /></>)}
      {normName === 'palette' && (<><path d="M12 22C17.52 22 22 17.52 22 12S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10z" /><circle cx="7.5" cy="10.5" r="1.5" fill="currentColor" /><circle cx="11.5" cy="7.5" r="1.5" fill="currentColor" /><circle cx="16.5" cy="9.5" r="1.5" fill="currentColor" /><circle cx="15.5" cy="14.5" r="1.5" fill="currentColor" /></>)}
      {normName === 'layers' && (<><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></>)}
      {normName === 'helpcircle' && (<><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></>)}
      {normName === 'video' && (<><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></>)}
      {normName === 'externallink' && (<><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></>)}
      {normName === 'upload' && (<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>)}
      {normName === 'gem' && (<><polygon points="12 2 22 8.5 12 22 2 8.5 12 2" /><polyline points="2 8.5 12 12 22 8.5" /><line x1="12" y1="2" x2="12" y2="12" /></>)}
      {normName === 'checkcircle' && (<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>)}
      {normName === 'filecode' && (<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><polyline points="8 13 5 15 8 17" /><polyline points="16 13 19 15 16 17" /></>)}
      {normName === 'zoomin' && (<><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></>)}
      {normName === 'grid' && (<><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></>)}
      {!['smartphone','sliders','maximize2','minimize2','rotateccw','info','music','mic','activity','scissors','box','type','palette','layers','helpcircle','video','externallink','upload','gem','checkcircle','filecode','zoomin','grid'].includes(normName) && (
        <circle cx="12" cy="12" r="10" />
      )}
    </svg>
  );
}

function useThreeJS() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if ((window as any).THREE?.OrbitControls && (window as any).THREE?.GLTFLoader) {
      setLoaded(true);
      return;
    }

    const loadScript = (url: string) => new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.appendChild(script);
    });

    const loadScriptAsGlobal = (url: string) =>
      fetch(url)
        .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.text(); })
        .then(code => {
          const script = document.createElement('script');
          script.text = `(function(THREE,module,exports,define){${code}})(window.THREE,undefined,undefined,undefined);`;
          document.head.appendChild(script);
        });

    loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js')
      .then(() => loadScriptAsGlobal('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js'))
      .then(() => loadScriptAsGlobal('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js'))
      .then(() => {
        const W = window as any;
        if (W.THREE?.OrbitControls && W.THREE?.GLTFLoader) {
          setLoaded(true);
        } else {
          loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js')
            .then(() => loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js'))
            .then(() => setLoaded(true))
            .catch(err => console.error('Hologram yükleme fallback hatası:', err));
        }
      })
      .catch(() => {
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js')
          .then(() => loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js'))
          .then(() => loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js'))
          .then(() => setLoaded(true));
      });
  }, []);

  return loaded;
}

class SynthEngine {
  audioCtx: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  oscillator: OscillatorNode | null = null;
  gainNode: GainNode | null = null;
  micStream: MediaStream | null = null;
  beatCallback: ((v: number) => void) | null = null;
  isPlaying = false;
  animationId: number | null = null;

  initContext() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 64;
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.value = 0.3;
      this.gainNode.connect(this.audioCtx.destination);
    }
  }

  playSynth() {
    this.initContext();
    this.stop();
    this.isPlaying = true;
    this.oscillator = this.audioCtx!.createOscillator();
    this.oscillator.type = 'sawtooth';
    this.oscillator.frequency.setValueAtTime(55, this.audioCtx!.currentTime);
    let step = 0;
    const interval = setInterval(() => {
      if (!this.isPlaying) { clearInterval(interval); return; }
      const freqs = [55, 55, 82.4, 73.4, 55, 110, 65.4, 73.4];
      const nextFreq = freqs[step % freqs.length];
      if (this.oscillator && this.audioCtx) {
        this.oscillator.frequency.setValueAtTime(nextFreq, this.audioCtx.currentTime);
        this.gainNode!.gain.setValueAtTime(0.4, this.audioCtx.currentTime);
        this.gainNode!.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.4);
      }
      step++;
    }, 500);
    this.oscillator.connect(this.gainNode!);
    this.gainNode!.connect(this.analyser!);
    this.oscillator.start();
    this._startAnalyzeLoop();
  }

  async startMic() {
    this.initContext();
    this.stop();
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = this.audioCtx!.createMediaStreamSource(this.micStream);
      source.connect(this.analyser!);
      this.isPlaying = true;
      this._startAnalyzeLoop();
      return true;
    } catch { return false; }
  }

  setVolume(val: number) {
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setValueAtTime(val * 0.5, this.audioCtx.currentTime);
    }
  }

  setBeatCallback(cb: (v: number) => void) { this.beatCallback = cb; }

  _startAnalyzeLoop() {
    const dataArray = new Uint8Array(this.analyser!.frequencyBinCount);
    const analyze = () => {
      if (!this.isPlaying) return;
      this.analyser!.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const avg = sum / dataArray.length / 255;
      if (this.beatCallback) this.beatCallback(avg);
      this.animationId = requestAnimationFrame(analyze);
    };
    analyze();
  }

  stop() {
    this.isPlaying = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.oscillator) { try { this.oscillator.stop(); } catch(e){} this.oscillator.disconnect(); this.oscillator = null; }
    if (this.micStream) { this.micStream.getTracks().forEach(t => t.stop()); this.micStream = null; }
  }
}

const synthEngine = new SynthEngine();

type HologramConfig = {
  objectType: string;
  color: string;
  speed: number;
  scale: number;
  zoom: number;
  distance: number;
  opacity: number;
  renderStyle: string;
  showGuide: boolean;
  guideType: string;
  guideColor: string;
  text: string;
  audioValue: number;
  audioReactive: boolean;
  customModelUrl: string | null;
  customModelFormat: string | null;
  useOriginalMaterials: boolean;
  cloneCount: number;
};

function HologramCanvas({ config, isFullScreen }: { config: HologramConfig; isFullScreen: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const threeLoaded = useThreeJS();
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const clonesGroupRef = useRef<any>(null);
  const loaderRef = useRef<any>(null);
  const activeMeshRef = useRef<any>(null);

  useEffect(() => {
    if (!threeLoaded || !containerRef.current) return;
    const THREE = (window as any).THREE;
    const width = containerRef.current.clientWidth;
    const height = isFullScreen ? window.innerHeight : 450;
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x000000);
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 10);
    cameraRef.current = camera;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(5, 10, 7);
    scene.add(dirLight1);
    const dirLight2 = new THREE.DirectionalLight(0x00ffff, 0.8);
    dirLight2.position.set(-5, -5, 5);
    scene.add(dirLight2);

    const clonesGroup = new THREE.Group();
    scene.add(clonesGroup);
    clonesGroupRef.current = clonesGroup;

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = isFullScreen ? window.innerHeight : 450;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current?.domElement) {
        containerRef.current?.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, [threeLoaded, isFullScreen]);

  useEffect(() => {
    if (!threeLoaded || !sceneRef.current || !clonesGroupRef.current) return;
    const THREE = (window as any).THREE;
    const scene = sceneRef.current;
    const clonesGroup = clonesGroupRef.current;

    while (clonesGroup.children.length > 0) clonesGroup.remove(clonesGroup.children[0]);

    const getMaterial = () => {
      if (config.objectType === 'customModel' && config.useOriginalMaterials) return null;
      const colorVal = new THREE.Color(config.color);
      switch (config.renderStyle) {
        case 'wireframe': return new THREE.MeshBasicMaterial({ color: colorVal, wireframe: true, transparent: true, opacity: config.opacity });
        case 'points': return new THREE.PointsMaterial({ color: colorVal, size: 0.08, transparent: true, opacity: config.opacity });
        case 'solid': return new THREE.MeshStandardMaterial({ color: colorVal, roughness: 0.2, metalness: 0.9, transparent: true, opacity: config.opacity });
        default: return new THREE.MeshStandardMaterial({ color: colorVal, roughness: 0.1, metalness: 0.8, transparent: true, opacity: config.opacity });
      }
    };

    const createBaseGeometry = () => {
      switch (config.objectType) {
        case 'jewelryRing': {
          const g = new THREE.Group();
          const rMesh = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.15, 16, 100), new THREE.MeshStandardMaterial({ color: 0xD4AF37, metalness: 1.0, roughness: 0.1 }));
          g.add(rMesh);
          const sMesh = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.6, 8), new THREE.MeshStandardMaterial({ color: 0xE0F7FA, metalness: 0.9, roughness: 0.0 }));
          sMesh.position.y = 1.35; sMesh.rotation.x = Math.PI;
          g.add(sMesh);
          return g;
        }
        case 'jewelryDiamond': return new THREE.ConeGeometry(1.2, 1.5, 8);
        case 'torusKnot': return new THREE.TorusKnotGeometry(0.8, 0.25, 120, 16);
        case 'globe': return new THREE.SphereGeometry(1.0, 32, 32);
        case 'cube': return new THREE.BoxGeometry(1.5, 1.5, 1.5);
        case 'dna': {
          const dnaGroup = new THREE.Group();
          const sGeo = new THREE.SphereGeometry(0.12, 8, 8);
          const rGeo = new THREE.CylinderGeometry(0.04, 0.04, 2, 8);
          const bMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
          const pMat = new THREE.MeshBasicMaterial({ color: 0xff00ff });
          for (let i = 0; i < 20; i++) {
            const y = (i * 0.2) - 2, angle = i * 0.4;
            const x1 = Math.sin(angle) * 0.9, z1 = Math.cos(angle) * 0.9;
            const x2 = -Math.sin(angle) * 0.9, z2 = -Math.cos(angle) * 0.9;
            const n1 = new THREE.Mesh(sGeo, bMat); n1.position.set(x1, y, z1); dnaGroup.add(n1);
            const n2 = new THREE.Mesh(sGeo, pMat); n2.position.set(x2, y, z2); dnaGroup.add(n2);
            const rod = new THREE.Mesh(rGeo, new THREE.MeshBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.5 }));
            rod.position.set((x1+x2)/2, y, (z1+z2)/2); rod.scale.y = 0.9; rod.rotation.z = angle + Math.PI/2;
            dnaGroup.add(rod);
          }
          return dnaGroup;
        }
        case 'heart': {
          const s = new THREE.Shape();
          s.moveTo(0, 0.4); s.bezierCurveTo(0, 1.2, 1.0, 1.2, 1.0, 0.4);
          s.bezierCurveTo(1.0, -0.2, 0, -0.8, 0, -1.2); s.bezierCurveTo(0, -0.8, -1.0, -0.2, -1.0, 0.4);
          s.bezierCurveTo(-1.0, 1.2, 0, 1.2, 0, 0.4);
          return new THREE.ExtrudeGeometry(s, { depth: 0.4, bevelEnabled: true, bevelSegments: 3, steps: 2, bevelSize: 0.1, bevelThickness: 0.1 });
        }
        default: return new THREE.BoxGeometry(1, 1, 1);
      }
    };

    const buildHologramPlacements = (loadedObject: any) => {
      const cloneCount = config.cloneCount || 4;
      const distance = config.distance || 3.5;
      const scale = config.scale || 1.1;
      const placements: Array<{ pos: [number,number,number]; rotZ: number; rotY: number }> = [];
      if (cloneCount === 1) placements.push({ pos: [0, -distance, 0], rotZ: 0, rotY: 0 });
      else if (cloneCount === 2) { placements.push({ pos: [0, -distance, 0], rotZ: 0, rotY: 0 }); placements.push({ pos: [0, distance, 0], rotZ: Math.PI, rotY: Math.PI }); }
      else if (cloneCount === 3) { placements.push({ pos: [0, -distance, 0], rotZ: 0, rotY: 0 }); placements.push({ pos: [-distance, 0, 0], rotZ: -Math.PI/2, rotY: -Math.PI/2 }); placements.push({ pos: [distance, 0, 0], rotZ: Math.PI/2, rotY: Math.PI/2 }); }
      else { placements.push({ pos: [0, -distance, 0], rotZ: 0, rotY: 0 }); placements.push({ pos: [0, distance, 0], rotZ: Math.PI, rotY: Math.PI }); placements.push({ pos: [-distance, 0, 0], rotZ: -Math.PI/2, rotY: -Math.PI/2 }); placements.push({ pos: [distance, 0, 0], rotZ: Math.PI/2, rotY: Math.PI/2 }); }

      placements.forEach((place) => {
        const cloneGroup = new THREE.Group();
        cloneGroup.position.set(...place.pos);
        cloneGroup.rotation.z = place.rotZ;
        let modelInstance;
        if (loadedObject instanceof THREE.BufferGeometry) {
          const mat = getMaterial();
          modelInstance = config.renderStyle === 'points' ? new THREE.Points(loadedObject, mat) : new THREE.Mesh(loadedObject, mat);
        } else {
          modelInstance = loadedObject.clone();
          if (!config.useOriginalMaterials) {
            const overrideMat = getMaterial();
            modelInstance.traverse((child: any) => { if (child.isMesh) child.material = overrideMat; });
          }
        }
        modelInstance.scale.set(scale, scale, scale);
        modelInstance.rotation.y = place.rotY;
        cloneGroup.add(modelInstance);
        clonesGroup.add(cloneGroup);
      });
    };

    if (config.objectType === 'customModel' && config.customModelUrl) {
      if (!loaderRef.current && (window as any).THREE.GLTFLoader) loaderRef.current = new (window as any).THREE.GLTFLoader();
      if (loaderRef.current) {
        loaderRef.current.load(config.customModelUrl, (gltf: any) => {
          const modelScene = gltf.scene;
          const box = new THREE.Box3().setFromObject(modelScene);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const sf = 2.0 / Math.max(size.x, size.y, size.z);
          modelScene.scale.set(sf, sf, sf);
          modelScene.position.sub(center.multiplyScalar(sf));
          const wrapper = new THREE.Group(); wrapper.add(modelScene);
          activeMeshRef.current = wrapper;
          buildHologramPlacements(wrapper);
        }, undefined, (err: any) => console.error("GLB yüklenirken hata:", err));
      }
    } else {
      const geo = createBaseGeometry();
      activeMeshRef.current = geo;
      buildHologramPlacements(geo);
    }

    if (config.showGuide) {
      const guideColor = new THREE.Color(config.guideColor);
      if (config.guideType === 'dot') {
        scene.add(new THREE.Mesh(new THREE.CircleGeometry(0.1, 32), new THREE.MeshBasicMaterial({ color: guideColor })));
      } else if (config.guideType === 'crosshair') {
        const lm = new THREE.LineBasicMaterial({ color: guideColor });
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1.5,0,0), new THREE.Vector3(1.5,0,0)]), lm));
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-1.5,0), new THREE.Vector3(0,1.5,0)]), lm));
      } else if (config.guideType === 'target') {
        scene.add(new THREE.Mesh(new THREE.RingGeometry(1.5, 1.55, 32), new THREE.MeshBasicMaterial({ color: guideColor, side: THREE.DoubleSide })));
        const lm = new THREE.LineBasicMaterial({ color: guideColor });
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-2.5,0,0), new THREE.Vector3(2.5,0,0)]), lm));
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-2.5,0), new THREE.Vector3(0,2.5,0)]), lm));
      }
    }
  }, [threeLoaded, config.objectType, config.customModelUrl, config.renderStyle, config.color, config.cloneCount, config.distance, config.scale, config.opacity, config.useOriginalMaterials, config.showGuide, config.guideType, config.guideColor]);

  useEffect(() => {
    if (!threeLoaded || !rendererRef.current || !sceneRef.current || !cameraRef.current) return;
    let animId: number;
    let rotationAngle = 0;
    const tick = () => {
      rotationAngle += config.speed * 0.05;
      let currentScale = 1.0;
      if (config.audioReactive && config.audioValue) currentScale = 1.0 + config.audioValue * 0.4;
      if (clonesGroupRef.current) {
        clonesGroupRef.current.children.forEach((cloneGroup: any) => {
          if (cloneGroup.children[0]) {
            const mesh = cloneGroup.children[0];
            mesh.rotation.y = rotationAngle;
            const bs = config.scale || 1.1;
            mesh.scale.set(bs * currentScale * config.zoom, bs * currentScale * config.zoom, bs * currentScale * config.zoom);
          }
        });
      }
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      animId = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(animId);
  }, [threeLoaded, config.speed, config.audioReactive, config.audioValue, config.scale, config.zoom]);

  return (
    <div ref={containerRef} className="w-full bg-black flex items-center justify-center relative border border-slate-900 rounded-3xl overflow-hidden" style={{ height: isFullScreen ? '100vh' : '450px' }}>
      {!threeLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 text-slate-400">
          <SvgIcon name="gem" className="w-8 h-8 text-cyan-400 animate-spin" />
          <span className="text-sm font-semibold tracking-wider">Hologram Motoru Yükleniyor...</span>
        </div>
      )}
    </div>
  );
}

function VirtualSimulator({ config }: { config: HologramConfig }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const threeLoaded = useThreeJS();
  const simSceneRef = useRef<any>(null);
  const simRendererRef = useRef<any>(null);
  const simCameraRef = useRef<any>(null);
  const simModelRef = useRef<any>(null);

  useEffect(() => {
    if (!threeLoaded || !containerRef.current) return;
    const THREE = (window as any).THREE;
    const width = containerRef.current.clientWidth;
    const height = 400;
    const scene = new THREE.Scene();
    simSceneRef.current = scene;
    scene.background = new THREE.Color(0x0a0c14);
    scene.add(new THREE.GridHelper(20, 20, 0x1e293b, 0x0f172a)).position?.set(0, -1.5, 0);
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(4, 3, 6);
    simCameraRef.current = camera;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    simRendererRef.current = renderer;
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.05; controls.maxPolarAngle = Math.PI/2 - 0.05;

    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const pt = new THREE.PointLight(0x00ffcc, 1.5, 10); pt.position.set(0, 2, 0); scene.add(pt);

    const phone = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.1, 6.0), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 }));
    phone.position.y = -1.45; scene.add(phone);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 5.7), new THREE.MeshBasicMaterial({ color: 0x000511, side: THREE.DoubleSide }));
    screen.rotation.x = -Math.PI/2; screen.position.y = -1.39; scene.add(screen);

    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0.1, transmission: 0.9, ior: 1.5, side: THREE.DoubleSide, depthWrite: false });
    const pyramidGroup = new THREE.Group();
    const createFace = (rotY: number) => {
      const geom = new THREE.BufferGeometry();
      const verts = new Float32Array([-0.3,0.8,-0.3, 0.3,0.8,-0.3, 1.5,0.0,-1.5, -1.5,0.0,-1.5]);
      geom.setAttribute('position', new THREE.BufferAttribute(verts, 3));
      geom.setIndex([0,1,2, 0,2,3]);
      geom.computeVertexNormals();
      const parent = new THREE.Group(); parent.rotation.y = rotY;
      parent.add(new THREE.Mesh(geom, glassMat));
      return parent;
    };
    [0, Math.PI/2, Math.PI, -Math.PI/2].forEach(r => pyramidGroup.add(createFace(r)));
    pyramidGroup.position.y = -1.39; scene.add(pyramidGroup);

    const simGeo = config.objectType === 'jewelryRing' ? new THREE.TorusGeometry(0.35, 0.07, 16, 48)
      : config.objectType === 'jewelryDiamond' ? new THREE.ConeGeometry(0.35, 0.5, 8)
      : new THREE.TorusKnotGeometry(0.25, 0.08, 64, 8);
    const simMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(config.color), wireframe: config.renderStyle === 'wireframe' || config.renderStyle === 'hybrid', transparent: true, opacity: 0.85 });
    const simModel = new THREE.Mesh(simGeo, simMat);
    simModel.position.set(0, -1.39 + 0.4, 0);
    scene.add(simModel); simModelRef.current = simModel;

    let animId: number;
    const animate = () => {
      controls.update();
      if (simModelRef.current) { simModelRef.current.rotation.y += 0.01; simModelRef.current.rotation.x += 0.005; }
      if (containerRef.current) renderer.setSize(containerRef.current.clientWidth, height);
      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      if (simRendererRef.current?.domElement) { containerRef.current?.removeChild(simRendererRef.current.domElement); simRendererRef.current.dispose(); }
    };
  }, [threeLoaded, config.objectType, config.color, config.renderStyle]);

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="w-full h-[400px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-900 relative">
        {!threeLoaded && <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-slate-500 text-sm">Simülasyon Yükleniyor...</div>}
      </div>
      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-xs text-slate-400 leading-relaxed">
        <strong>Nasıl Kullanılır?</strong> Farenin sol tuşuna basılı tutarak sahneyi döndürebilir, sağ tuşla kaydırabilir ve tekerlekle yakınlaşabilirsiniz.
      </div>
    </div>
  );
}

function TemplateGenerator() {
  const [scale, setScale] = useState(100);
  const baseWidth = (scale * 0.12).toFixed(1);
  const topWidth = (scale * 0.02).toFixed(1);
  const height = (scale * 0.07).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-2xl bg-slate-950 border border-slate-900 space-y-4">
        <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <SvgIcon name="scissors" className="w-4 h-4 text-pink-500" />
          <span>Kişiselleştirilmiş Piramit Kesim Cetveli</span>
        </h4>
        <p className="text-xs text-slate-400 leading-relaxed">Piramidinizi hangi ekrana göre yapacağınızı seçin:</p>
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold text-slate-400">
            <span>Ekran Boyutu Ölçeği:</span>
            <span className="text-pink-500 font-mono">%{scale}</span>
          </div>
          <input type="range" min="50" max="250" step="10" value={scale} onChange={e => setScale(parseInt(e.target.value))} className="w-full h-1 bg-slate-850 rounded appearance-none cursor-pointer accent-pink-500" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[['Alt Taban', baseWidth], ['Üst Taban', topWidth], ['Yükseklik', height]].map(([label, val]) => (
            <div key={label} className="p-3 rounded-xl bg-slate-900 border border-slate-850 text-center">
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">{label}</div>
              <div className="text-lg font-mono font-bold text-slate-200">{val} cm</div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-center p-6 bg-white rounded-2xl border border-slate-800">
        <svg width="220" height="150" viewBox="0 0 220 150">
          <polygon points="80,30 140,30 190,120 30,120" fill="none" stroke="#1e293b" strokeWidth="2" strokeDasharray="5,3" />
          <line x1="80" y1="20" x2="140" y2="20" stroke="#f43f5e" strokeWidth="1.5" />
          <text x="110" y="15" fill="#f43f5e" fontSize="10" textAnchor="middle" fontWeight="bold">Üst: {topWidth} cm</text>
          <line x1="30" y1="135" x2="190" y2="135" stroke="#f43f5e" strokeWidth="1.5" />
          <text x="110" y="145" fill="#f43f5e" fontSize="10" textAnchor="middle" fontWeight="bold">Alt: {baseWidth} cm</text>
          <line x1="110" y1="30" x2="110" y2="120" stroke="#10b981" strokeWidth="1.5" />
          <text x="115" y="80" fill="#10b981" fontSize="10" fontWeight="bold">Yükseklik: {height} cm</text>
        </svg>
      </div>
    </div>
  );
}

function DiyGuide() {
  const steps = [
    { title: 'Malzemeleri Hazırlayın', desc: 'Şeffaf sert bir plastik (asetat kağıdı, şeffaf CD kapakları veya pet şişenin düz yerleri), cetvel, maket bıçağı ve şeffaf bant.' },
    { title: '4 Adet Parça Kesin', desc: '"Şablon Oluşturucu" sekmesindeki ölçülerde 4 adet birbirinin aynısı yamuk parça çizin ve kesin.' },
    { title: 'Kenarları Birleştirin', desc: '4 parçayı yan yana koyup kenarlarından ince şeffaf bant ile yapıştırarak piramit formunu oluşturun.' },
    { title: 'Ekranın Merkezine Koyun', desc: 'Piramidinizi dar ağzı aşağıda, geniş ağzı yukarıda olacak şekilde ekranın tam ortasına yerleştirin.' },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {steps.map((step, i) => (
          <div key={i} className="p-4 rounded-xl bg-slate-900 border border-slate-850">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 font-bold text-sm shrink-0">{i+1}</div>
              <div>
                <h5 className="font-bold text-slate-200 text-xs uppercase mb-1">{step.title}</h5>
                <p className="text-[11px] text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/30 text-xs">
        <h4 className="font-bold text-cyan-400 mb-1">💡 B2B Satış Tüyosu</h4>
        <p className="text-slate-400 leading-relaxed">Kendi logonuzun basılı olduğu demonte katlanabilir plastik şeffaf asetat piramitlerini çok ucuza imal ettirip B2B müşterilerinize hediye gönderebilirsiniz.</p>
      </div>
    </div>
  );
}

const NEON_COLORS = [
  { value: '#00ffcc', name: 'Cyber Cyan' },
  { value: '#ff007f', name: 'Laser Pink' },
  { value: '#39ff14', name: 'Acid Green' },
  { value: '#ff003c', name: 'Crimson Flare' },
  { value: '#ffea00', name: 'Altın Sarısı' },
  { value: '#ffffff', name: 'Saf Elmas' },
];

const OBJECT_SHAPES = [
  { id: 'jewelryRing', labelTr: 'Tektaş Altın Yüzük 💍', descTr: 'Lüks pırlantalı altın yüzük' },
  { id: 'jewelryDiamond', labelTr: 'Kesim Pırlanta 💎', descTr: 'Işıltılı faset kesim elmas' },
  { id: 'torusKnot', labelTr: 'Geometrik Düğüm', descTr: 'Siber geometrik düğüm döngüsü' },
  { id: 'globe', labelTr: 'Siber Küre', descTr: 'Gezegen halkalı ağ küresi' },
  { id: 'cube', labelTr: 'Kuantum Küp', descTr: 'İç içe dönen hiper-blok' },
  { id: 'dna', labelTr: 'DNA Helix', descTr: 'Dönen çift sarmal DNA zinciri' },
  { id: 'heart', labelTr: 'Kalp Projeksiyonu', descTr: 'Atan kuantum kalp modeli' },
];

export default function HologramPage() {
  const [activeTab, setActiveTab] = useState('projection');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [config, setConfig] = useState<HologramConfig>({
    objectType: 'jewelryRing',
    color: '#00ffcc',
    speed: 0.15,
    scale: 1.2,
    zoom: 1.0,
    distance: 3.2,
    opacity: 0.95,
    renderStyle: 'hybrid',
    showGuide: true,
    guideType: 'crosshair',
    guideColor: '#ff0055',
    text: 'HOLO',
    audioValue: 0,
    audioReactive: false,
    customModelUrl: null,
    customModelFormat: null,
    useOriginalMaterials: true,
    cloneCount: 4,
  });

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showExitHelper, setShowExitHelper] = useState(true);
  const [audioSource, setAudioSource] = useState('none');
  const [volume, setVolume] = useState(0.3);
  const [audioLevel, setAudioLevel] = useState(0);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'gltf' || ext === 'glb') {
      const url = URL.createObjectURL(file);
      setUploadedFileName(file.name);
      setConfig(prev => ({ ...prev, objectType: 'customModel', customModelUrl: url, customModelFormat: ext }));
    } else {
      alert('Lütfen sadece .gltf veya .glb uzantılı dosyalar yükleyin.');
    }
  }

  function enterFullScreen() {
    try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch {}
    setIsFullScreen(true);
    setShowExitHelper(true);
    setTimeout(() => setShowExitHelper(false), 4500);
  }

  function exitFullScreen() {
    try { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); } catch {}
    setIsFullScreen(false);
  }

  function resetToDefault() {
    setConfig({ objectType: 'jewelryRing', color: '#00ffcc', speed: 0.15, scale: 1.2, zoom: 1.0, distance: 3.2, opacity: 0.95, renderStyle: 'hybrid', showGuide: true, guideType: 'crosshair', guideColor: '#ff0055', text: 'HOLO', audioValue: 0, audioReactive: false, customModelUrl: null, customModelFormat: null, useOriginalMaterials: true, cloneCount: 4 });
    setAudioSource('none');
    setUploadedFileName(null);
  }

  useEffect(() => {
    if (audioSource === 'synth') {
      synthEngine.playSynth();
      synthEngine.setBeatCallback(v => { setAudioLevel(v); setConfig(prev => ({ ...prev, audioValue: v })); });
    } else if (audioSource === 'mic') {
      synthEngine.startMic().then(ok => {
        if (ok) synthEngine.setBeatCallback(v => { setAudioLevel(v); setConfig(prev => ({ ...prev, audioValue: v })); });
        else setAudioSource('none');
      });
    } else {
      synthEngine.stop(); setAudioLevel(0); setConfig(prev => ({ ...prev, audioValue: 0 }));
    }
    return () => synthEngine.stop();
  }, [audioSource]);

  useEffect(() => { synthEngine.setVolume(volume); }, [volume]);

  useEffect(() => {
    const onFSChange = () => setIsFullScreen(!!document.fullscreenElement);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && isFullScreen) setIsFullScreen(false); };
    document.addEventListener('fullscreenchange', onFSChange);
    window.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('fullscreenchange', onFSChange); window.removeEventListener('keydown', onKey); };
  }, [isFullScreen]);

  const tabs = [
    { id: 'projection', label: 'Yansıtma Ekranı', icon: 'smartphone' },
    { id: 'simulator', label: '3D Simülatör', icon: 'video' },
    { id: 'template', label: 'Şablon', icon: 'scissors' },
    { id: 'guide', label: 'DIY Rehberi', icon: 'helpcircle' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c1020_1px,transparent_1px),linear-gradient(to_bottom,#0c1020_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {isFullScreen && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center cursor-none" onDoubleClick={exitFullScreen}>
          <HologramCanvas config={config} isFullScreen={true} />
          {showExitHelper && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur px-5 py-3 rounded-full border border-slate-800 text-xs text-slate-300 flex items-center gap-2 animate-bounce">
              <SvgIcon name="smartphone" className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span>Tam ekrandan çıkmak için çift tıklayın veya ESC tuşuna basın.</span>
            </div>
          )}
          <button onClick={exitFullScreen} className="absolute bottom-6 right-6 opacity-30 hover:opacity-100 p-2.5 rounded-full bg-slate-900 border border-slate-800 transition">
            <SvgIcon name="minimize2" className="w-5 h-5" />
          </button>
        </div>
      )}

      {!isFullScreen && (
        <>
          <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-pink-500 p-[1.5px]">
                  <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                    <SvgIcon name="gem" className="w-5 h-5 text-cyan-400 animate-pulse" />
                  </div>
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400 bg-clip-text text-transparent">
                    Remaura Hologram
                  </h1>
                  <p className="text-[10px] text-slate-500 hidden sm:block">Pepper&apos;s Ghost B2B Mücevher Sandbox</p>
                </div>
              </div>
              <button onClick={resetToDefault} className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition" title="Sıfırla">
                <SvgIcon name="rotateccw" className="w-4 h-4" />
              </button>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

              {/* SOL PANEL */}
              <div className="lg:col-span-5 space-y-6">
                <div className="p-5 rounded-2xl bg-slate-900/60 backdrop-blur border border-slate-900 shadow-xl space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h2 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                      <SvgIcon name="sliders" className="w-4 h-4 text-cyan-400 animate-pulse" />
                      <span>Kontrol Paneli</span>
                    </h2>
                    <span className="text-[10px] text-slate-500 font-mono">B2B JEWELRY</span>
                  </div>

                  {/* GLB Yükleyici */}
                  <div className="p-4 rounded-xl bg-indigo-950/10 border border-indigo-900/30 space-y-3">
                    <div className="flex items-center gap-2">
                      <SvgIcon name="upload" className="w-4 h-4 text-indigo-400" />
                      <h3 className="text-xs font-bold uppercase text-indigo-300 tracking-wider">Kendi 3D Modelinizi Yükleyin</h3>
                    </div>
                    <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-800 hover:border-indigo-500 bg-slate-950/50 p-4 rounded-xl text-center cursor-pointer transition">
                      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".gltf,.glb" className="hidden" />
                      {uploadedFileName ? (
                        <div className="flex flex-col items-center gap-1.5">
                          <SvgIcon name="checkcircle" className="w-6 h-6 text-emerald-500 animate-pulse" />
                          <span className="text-xs font-bold text-slate-300 truncate max-w-[200px]">{uploadedFileName}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5">
                          <SvgIcon name="filecode" className="w-7 h-7 text-slate-600" />
                          <span className="text-[11px] text-slate-400 font-semibold">Dosya Seç (.glb, .gltf)</span>
                        </div>
                      )}
                    </div>
                    {config.customModelUrl && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-900/60">
                        <span className="text-[11px] font-bold text-slate-300">Orijinal Kaplamaları Kullan</span>
                        <input type="checkbox" checked={config.useOriginalMaterials} onChange={e => setConfig(prev => ({ ...prev, useOriginalMaterials: e.target.checked }))} className="accent-indigo-500 cursor-pointer w-4 h-4" />
                      </div>
                    )}
                  </div>

                  {/* Klon Sayısı */}
                  <div className="space-y-3">
                    <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                      <SvgIcon name="grid" className="w-3.5 h-3.5 text-pink-400" />
                      <span>Hologram Sayısı</span>
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[1,2,3,4].map(count => (
                        <button key={count} onClick={() => setConfig(prev => ({ ...prev, cloneCount: count }))} className={`py-2 rounded-lg font-bold text-xs border text-center transition ${config.cloneCount === count ? 'border-pink-500 bg-pink-950/20 text-pink-200' : 'border-slate-800 bg-slate-950/30 text-slate-500 hover:text-slate-300'}`}>{count}</button>
                      ))}
                    </div>
                  </div>

                  {/* Geometri */}
                  <div className="space-y-3">
                    <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                      <SvgIcon name="box" className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Hologram Geometrisi</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {config.customModelUrl && (
                        <button onClick={() => setConfig(prev => ({ ...prev, objectType: 'customModel' }))} className={`p-3 rounded-xl border text-left col-span-2 transition ${config.objectType === 'customModel' ? 'border-indigo-400 bg-indigo-950/40 text-indigo-200' : 'border-slate-800 bg-slate-950/40 text-slate-400'}`}>
                          <div className="font-bold text-xs flex items-center gap-1.5"><SvgIcon name="gem" className="w-3.5 h-3.5 text-indigo-400" /><span>Yüklenen Modeliniz</span></div>
                          <div className="text-[9px] text-slate-500 mt-1 line-clamp-1">{uploadedFileName}</div>
                        </button>
                      )}
                      {OBJECT_SHAPES.map(shape => (
                        <button key={shape.id} onClick={() => setConfig(prev => ({ ...prev, objectType: shape.id }))} className={`p-3 rounded-xl border text-left transition ${config.objectType === shape.id ? 'border-cyan-500 bg-cyan-950/20 text-cyan-200' : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200'}`}>
                          <div className="font-bold text-xs truncate">{shape.labelTr}</div>
                          <div className="text-[9px] text-slate-500 mt-1 line-clamp-1">{shape.descTr}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Render Stili */}
                  <div className="space-y-2.5">
                    <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                      <SvgIcon name="layers" className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Görselleştirme Tarzı</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[['hybrid','Siber Hibrit'],['wireframe','Kafes Çerçeve'],['points','Işık Noktaları'],['solid','Dolu Yüzey']].map(([style, label]) => (
                        <button key={style} onClick={() => setConfig(prev => ({ ...prev, renderStyle: style }))} className={`py-2 px-2.5 rounded-lg border text-[11px] font-medium text-center transition ${config.renderStyle === style ? 'border-indigo-500 bg-indigo-950/20 text-indigo-200' : 'border-slate-800 bg-slate-950/30 text-slate-500 hover:text-slate-300'}`}>{label}</button>
                      ))}
                    </div>
                  </div>

                  {/* Renk */}
                  <div className="space-y-3">
                    <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                      <SvgIcon name="palette" className="w-3.5 h-3.5 text-pink-400" />
                      <span>Hologram Rengi</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {NEON_COLORS.map(c => (
                        <button key={c.value} onClick={() => setConfig(prev => ({ ...prev, color: c.value }))} className={`w-7 h-7 rounded-full border-2 transition hover:scale-110 ${config.color.toLowerCase() === c.value ? 'border-white ring-2 ring-indigo-500' : 'border-slate-900'}`} style={{ backgroundColor: c.value }} title={c.name} />
                      ))}
                    </div>
                  </div>

                  {/* Sürgüler */}
                  <div className="space-y-4 pt-2 border-t border-slate-800">
                    {[
                      { key: 'zoom', label: 'Yakınlaştırma', min: 0.3, max: 3.0, step: 0.05, color: 'cyan', suffix: 'x', fixed: 2 },
                      { key: 'speed', label: 'Dönüş Hızı', min: 0, max: 1.5, step: 0.05, color: 'cyan', suffix: 'x', fixed: 2 },
                      { key: 'scale', label: 'Obje Boyutu', min: 0.4, max: 2.0, step: 0.1, color: 'indigo', suffix: 'x', fixed: 1 },
                      { key: 'distance', label: 'Merkezden Uzaklık', min: 1.5, max: 4.5, step: 0.1, color: 'pink', suffix: ' cm', fixed: 1 },
                    ].map(({ key, label, min, max, step, color, suffix, fixed }) => (
                      <div key={key}>
                        <div className="flex justify-between text-xs font-medium text-slate-400 mb-1.5">
                          <span>{label}</span>
                          <span className={`font-mono text-${color}-400`}>{(config[key as keyof HologramConfig] as number).toFixed(fixed)}{suffix}</span>
                        </div>
                        <input type="range" min={min} max={max} step={step} value={config[key as keyof HologramConfig] as number} onChange={e => setConfig(prev => ({ ...prev, [key]: parseFloat(e.target.value) }))} className={`w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-${color}-500`} />
                      </div>
                    ))}
                  </div>

                  {/* Kalibrasyon */}
                  <div className="pt-4 border-t border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Hizalama Kılavuzu</label>
                      <input type="checkbox" checked={config.showGuide} onChange={e => setConfig(prev => ({ ...prev, showGuide: e.target.checked }))} className="accent-pink-500 cursor-pointer w-4 h-4" />
                    </div>
                    {config.showGuide && (
                      <div className="grid grid-cols-3 gap-2">
                        {[['dot','Merkez'],['crosshair','Artı'],['target','Hedef']].map(([type, label]) => (
                          <button key={type} onClick={() => setConfig(prev => ({ ...prev, guideType: type }))} className={`py-1.5 rounded text-[10px] font-bold uppercase text-center transition ${config.guideType === type ? 'bg-pink-600 text-white' : 'bg-slate-950/60 text-slate-500 border border-slate-800'}`}>{label}</button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Ses */}
                  <div className="pt-4 border-t border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <SvgIcon name="activity" className="w-4 h-4 text-yellow-500 animate-pulse" />
                        <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Ses Duyarlı</span>
                      </div>
                      <input type="checkbox" checked={config.audioReactive} onChange={e => setConfig(prev => ({ ...prev, audioReactive: e.target.checked }))} className="accent-yellow-500 cursor-pointer w-4 h-4" />
                    </div>
                    {config.audioReactive && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-1.5">
                          {[['none','Pasif'],['synth','Ritim'],['mic','Mikrofon']].map(([src, label]) => (
                            <button key={src} onClick={() => setAudioSource(src)} className={`py-1.5 rounded text-[10px] font-bold uppercase transition ${audioSource === src ? 'bg-yellow-500 text-slate-950' : 'bg-slate-950/60 text-slate-500 border border-slate-800'}`}>{label}</button>
                          ))}
                        </div>
                        {audioSource === 'synth' && (
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] text-slate-400"><span>Ses Seviyesi</span><span>{(volume*100).toFixed(0)}%</span></div>
                            <input type="range" min="0" max="1" step="0.05" value={volume} onChange={e => setVolume(parseFloat(e.target.value))} className="w-full h-1 accent-yellow-500" />
                          </div>
                        )}
                        {audioSource !== 'none' && (
                          <div className="h-1.5 bg-slate-950 border border-slate-800 rounded overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-75" style={{ width: `${audioLevel * 100}%` }} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-900/50 text-xs flex gap-2.5">
                  <SvgIcon name="info" className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-slate-300 mb-0.5">Fiziksel Piramit İçin İpucu</h4>
                    <p className="text-slate-500 leading-relaxed text-[11px]">Hazırladığınız plastik piramidinizi ekranın tam ortasına koyun, odadaki ışıkları kapatın ve ekran parlaklığını %100 yapın!</p>
                  </div>
                </div>
              </div>

              {/* SAĞ PANEL */}
              <div className="lg:col-span-7 space-y-6">
                <div className="flex flex-wrap bg-slate-900/60 border border-slate-900 rounded-2xl p-1 gap-1">
                  {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-3 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${activeTab === tab.id ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>
                      <SvgIcon name={tab.icon} className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-900/60 shadow-2xl">
                  {activeTab === 'projection' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <h3 className="text-lg font-bold text-slate-100">Yansıtma Ekranı</h3>
                          <p className="text-xs text-slate-500 mt-1">Piramidi ekranın merkezine sabitleyip yandan göz hizasıyla izleyin.</p>
                        </div>
                        <button onClick={enterFullScreen} className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-semibold text-xs text-white shadow flex items-center gap-1.5 hover:scale-105 active:scale-95 transition">
                          <SvgIcon name="maximize2" className="w-4 h-4" />
                          <span>Projeksiyonu Başlat</span>
                        </button>
                      </div>
                      <div className="rounded-2xl overflow-hidden border border-slate-900 relative">
                        <HologramCanvas config={config} isFullScreen={false} />
                        <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur px-2.5 py-1 rounded text-[10px] text-slate-400 border border-slate-800">Hologram Canvas • WebGL</div>
                      </div>
                    </div>
                  )}
                  {activeTab === 'simulator' && (
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-lg font-bold text-slate-100">3D Fizik Simülatörü</h3>
                        <p className="text-xs text-slate-500 mt-1">Telefon ekranından çıkan ışıkların şeffaf cam plakalara çarparak nasıl birleştiğinin sanal canlandırması.</p>
                      </div>
                      <VirtualSimulator config={config} />
                    </div>
                  )}
                  {activeTab === 'template' && (
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-lg font-bold text-slate-100">Şablon Oluşturucu</h3>
                        <p className="text-xs text-slate-500 mt-1">Keseceğiniz asetat kağıdı ölçülerini özelleştirin.</p>
                      </div>
                      <TemplateGenerator />
                    </div>
                  )}
                  {activeTab === 'guide' && (
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-lg font-bold text-slate-100">Kendin Yap (DIY) Rehberi</h3>
                        <p className="text-xs text-slate-500 mt-1">10 dakikada kendi hologram sisteminizi inşa edin.</p>
                      </div>
                      <DiyGuide />
                    </div>
                  )}
                </div>
              </div>

            </div>
          </main>

          <footer className="mt-16 border-t border-slate-900 py-8 bg-slate-950">
            <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-600">
              Remaura Hologram • Pepper&apos;s Ghost B2B Mücevher Sistemi
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
