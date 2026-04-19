"use client";

import React, { forwardRef, useEffect, useRef, useCallback, useImperativeHandle, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

// --- TİPLER ---
export type MeshStats = {
  vertices: number;
  faces: number;
};

export type PivotMode = "bottom" | "center" | "top";

type MeshRealtimeViewerProps = {
  modelUrl?: string | null;
  fileName?: string | null;
  zScaleMm?: number;
  fileType?: "stl" | "glb" | "auto";
  autoRotate?: boolean;
  showGrid?: boolean;
  renderWidth?: number;
  renderHeight?: number;
  onMeshStats?: (stats: MeshStats) => void;
  initialRotation?: { x: number; y: number; z: number };
  onRotationChange?: (rotation: { x: number; y: number; z: number }) => void;
  showRotationControls?: boolean;
  preserveDrawingBuffer?: boolean;
  pixelRatio?: number;
  pivotMode?: PivotMode;
};

export type MeshRealtimeViewerHandle = {
  downloadSTL: () => boolean;
  downloadOBJ: () => boolean;
  setGridVisible: (visible: boolean) => void;
  setRotation: (rotation: { x: number; y: number; z: number }) => void;
  getRotation: () => { x: number; y: number; z: number };
  renderFrame: () => void;
  setCanvasBackground: (color: string, alpha?: number) => void;
  setAutoRotate: (enabled: boolean) => void;
  pauseAnimation: (paused: boolean) => void;
  overrideAnimationLoop: (fn: (() => void) | null) => void;
};

const MeshRealtimeViewerInternal = forwardRef<MeshRealtimeViewerHandle, MeshRealtimeViewerProps>(
  function MeshRealtimeViewer(
    {
      modelUrl,
      fileName,
      zScaleMm = 1.0,
      fileType = "auto",
      autoRotate = false,
      showGrid = true,
      renderWidth,
      renderHeight,
      onMeshStats,
      initialRotation,
      onRotationChange,
      showRotationControls = true,
      preserveDrawingBuffer = true,
      pixelRatio,
      pivotMode = "bottom",
    },
    ref
  ) {
    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const gridRef = useRef<THREE.GridHelper | null>(null);
    const gizmoSceneRef = useRef<THREE.Scene | null>(null);
    const gizmoCameraRef = useRef<THREE.OrthographicCamera | null>(null);

    // ─── Hiyerarşi ───────────────────────────────────────────────────────
    //  scene
    //   └── pivot          ← SADECE rotation.y (transform yok)
    //         └── modelRoot  ← SADECE scale
    //               └── orientationGroup  ← X/Y/Z butonları
    //                     └── loadedRoot  ← position.sub(pivotPoint)
    // ─────────────────────────────────────────────────────────────────────
    const pivotRef = useRef<THREE.Group | null>(null);           // rotation hedefi
    const modelRootRef = useRef<THREE.Group | null>(null);       // scale + export
    const orientationGroupRef = useRef<THREE.Group | null>(null);

    const modelTargetYRef = useRef<number>(0.9);
    const autoRotateRef = useRef(autoRotate);
    const userInteractingRef = useRef(false);
    const pauseAnimationRef = useRef(false);

    const [isLoading, setIsLoading] = useState(false);
    const [localAutoRotate, setLocalAutoRotate] = useState(autoRotate);
    const [rotationState, setRotationState] = useState({ x: 0, y: 0, z: 0 });

    const tuneMaterialForDisplay = useCallback((material?: THREE.Material | THREE.Material[] | null) => {
      if (!material) return;
      const materials = Array.isArray(material) ? material : [material];
      for (const entry of materials) {
        const s = entry as THREE.MeshStandardMaterial;
        if ("envMapIntensity" in s) s.envMapIntensity = 1.5;
        if ("metalness" in s) s.metalness = Math.max(s.metalness ?? 0.5, 0.8);
        if ("roughness" in s) s.roughness = Math.min(s.roughness ?? 0.5, 0.2);
        entry.needsUpdate = true;
      }
    }, []);

    const applyRendererSize = useCallback(() => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const host = mountRef.current;
      const container = host.parentElement ?? host;
      const width = renderWidth ?? Math.max(container.clientWidth, 1);
      const height = renderHeight ?? Math.max(container.clientHeight, 1);
      rendererRef.current.setSize(width, height, false);
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
    }, [renderWidth, renderHeight]);

    const fitCameraForAspect = useCallback((w: number, h: number) => {
      if (!cameraRef.current) return;
      const aspect = w / h;
      const dist = 4.0 / Math.min(aspect, 1);
      cameraRef.current.position.set(0, modelTargetYRef.current, dist);
      if (controlsRef.current) {
        controlsRef.current.target.set(0, modelTargetYRef.current, 0);
        controlsRef.current.update();
      }
    }, []);

    const rotateOrientation = useCallback((axis: "x" | "y" | "z") => {
      if (!orientationGroupRef.current || !pivotRef.current) return;
      orientationGroupRef.current.rotation[axis] += Math.PI / 2;

      setTimeout(() => {
        const pivot = pivotRef.current;
        if (!pivot) return;
        pivot.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(pivot);
        modelTargetYRef.current = (box.max.y - box.min.y) * 0.5;
        fitCameraForAspect(
          mountRef.current?.clientWidth  || 800,
          mountRef.current?.clientHeight || 600
        );
      }, 50);
    }, [fitCameraForAspect]);

    useImperativeHandle(ref, () => ({
      downloadSTL: () => {
        if (!modelRootRef.current) return false;
        const exporter = new STLExporter();
        const result = exporter.parse(modelRootRef.current, { binary: true });
        const blob = new Blob([result], { type: "model/stl" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "Model_Export.stl";
        link.click();
        return true;
      },
      downloadOBJ: () => {
        if (!modelRootRef.current) return false;
        const exporter = new OBJExporter();
        const result = exporter.parse(modelRootRef.current);
        const blob = new Blob([result], { type: "text/plain" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "Model_Export.obj";
        link.click();
        return true;
      },
      setGridVisible: (visible) => {
        if (gridRef.current) gridRef.current.visible = visible;
      },
      setRotation: (rot) => {
        if (pivotRef.current) pivotRef.current.rotation.set(rot.x, rot.y, rot.z);
        setRotationState(rot);
      },
      getRotation: () => rotationState,
      renderFrame: () => {
        if (rendererRef.current && sceneRef.current && cameraRef.current)
          rendererRef.current.render(sceneRef.current, cameraRef.current);
      },
      setCanvasBackground: (color, alpha = 0) => {
        rendererRef.current?.setClearColor(color, alpha);
      },
      setAutoRotate: (enabled) => {
        autoRotateRef.current = enabled;
        setLocalAutoRotate(enabled);
      },
      pauseAnimation: (paused) => {
        pauseAnimationRef.current = paused;
      },
      overrideAnimationLoop: (fn) => {
        rendererRef.current?.setAnimationLoop(fn);
      },
    }), [rotationState]);

    // ── Sahne + Renderer ─────────────────────────────────────────────────
    useEffect(() => {
      if (!mountRef.current) return;
      const host = mountRef.current;

      const scene = new THREE.Scene();
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer });
      renderer.setPixelRatio(pixelRatio ?? window.devicePixelRatio);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      host.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controlsRef.current = controls;

      scene.add(new THREE.AmbientLight(0xffffff, 0.8));
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
      keyLight.position.set(5, 10, 7);
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0xffffff, 1.0);
      fillLight.position.set(-5, 5, -5);
      scene.add(fillLight);

      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new THREE.Scene()).texture;

      const grid = new THREE.GridHelper(10, 20, 0x444444, 0x222222);
      scene.add(grid);
      gridRef.current = grid;
      grid.visible = showGrid;

      // ── Yönelim gizmo'su ────────────────────────────────────────────────
      const gizmoScene = new THREE.Scene();
      gizmoScene.add(new THREE.AxesHelper(1));
      const makeLabel = (text: string, color: string, pos: [number, number, number]) => {
        const cv = document.createElement("canvas");
        cv.width = 64; cv.height = 64;
        const cx = cv.getContext("2d")!;
        cx.fillStyle = color;
        cx.font = "bold 52px monospace";
        cx.textAlign = "center";
        cx.textBaseline = "middle";
        cx.fillText(text, 32, 34);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false }));
        sprite.scale.set(0.4, 0.4, 0.4);
        sprite.position.set(...pos);
        gizmoScene.add(sprite);
      };
      makeLabel("X", "#ff4040", [1.4, 0, 0]);
      makeLabel("Y", "#40ff80", [0, 1.4, 0]);
      makeLabel("Z", "#4090ff", [0, 0, 1.4]);
      gizmoSceneRef.current = gizmoScene;
      gizmoCameraRef.current = new THREE.OrthographicCamera(-1.8, 1.8, 1.8, -1.8, 0.1, 10);

      applyRendererSize();

      const animate = () => {
        if (pauseAnimationRef.current) return;
        if (autoRotateRef.current && !userInteractingRef.current && pivotRef.current) {
          pivotRef.current.rotation.y += 0.007;
        }
        controlsRef.current?.update();
        const r = rendererRef.current;
        const s = sceneRef.current;
        const c = cameraRef.current;
        if (!r || !s || !c) return;

        r.render(s, c);

        // Gizmo inset — sol alt, render boyutuna oranli
        const gScene = gizmoSceneRef.current;
        const gCam   = gizmoCameraRef.current;
        if (gScene && gCam) {
          const rv = new THREE.Vector2();
          r.getSize(rv);
          const rw = rv.x;
          const rh = rv.y;
          const size = Math.round(Math.min(rw, rh) * 0.13);
          const margin = Math.round(Math.min(rw, rh) * 0.02);
          r.autoClear = false;
          r.clearDepth();
          r.setScissorTest(true);
          r.setScissor(margin, margin, size, size);
          r.setViewport(margin, margin, size, size);
          gCam.quaternion.copy(c.quaternion);
          gCam.position.set(0, 0, 5).applyQuaternion(c.quaternion);
          r.render(gScene, gCam);
          r.setScissorTest(false);
          r.setViewport(0, 0, rw, rh);
          r.autoClear = true;
        }
      };
      renderer.setAnimationLoop(animate);

      const onStart = () => (userInteractingRef.current = true);
      const onEnd   = () => (userInteractingRef.current = false);
      controls.addEventListener("start", onStart);
      controls.addEventListener("end",   onEnd);

      return () => {
        renderer.setAnimationLoop(null);
        controls.dispose();
        renderer.dispose();
        host.innerHTML = "";
      };
    }, [pixelRatio, preserveDrawingBuffer, showGrid, applyRendererSize]);

    // ── Model yükleme ────────────────────────────────────────────────────
    useEffect(() => {
      if (!sceneRef.current || !modelUrl) return;
      const scene = sceneRef.current;

      // Önceki modeli kaldır
      if (pivotRef.current) scene.remove(pivotRef.current);
      pivotRef.current       = null;
      modelRootRef.current   = null;
      orientationGroupRef.current = null;

      const placeModel = (loadedRoot: THREE.Object3D) => {
        setIsLoading(false);

        // 1. Bbox'ı loadedRoot'un kendi local space'inde hesapla (henüz sahneye eklenmedi)
        const box  = new THREE.Box3().setFromObject(loadedRoot);
        const size = box.getSize(new THREE.Vector3());
        const min  = box.min;
        const max  = box.max;

        // 2. Pivot Y seç: bottom / center / top
        const pivotY =
          pivotMode === "top"    ? max.y :
          pivotMode === "center" ? (min.y + max.y) / 2 :
          min.y; // "bottom" (default)

        // 3. loadedRoot'u kaydır — pivot noktası (0,0,0)'a gelsin
        //    Tüm hesap aynı local space'de, coordinate karışıklığı yok
        loadedRoot.position.set(
          -((min.x + max.x) / 2),
          -pivotY,
          -((min.z + max.z) / 2)
        );

        // 4. Materyal
        loadedRoot.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) tuneMaterialForDisplay((c as THREE.Mesh).material);
        });

        // 5. Pivot: rotation + scale buraya, başka hiçbir şey yok
        const pivot = new THREE.Group();
        const scale = 1.8 / Math.max(size.x, size.y, size.z, 0.01);
        pivot.scale.setScalar(scale);

        // 6. orientationGroup: X/Y/Z butonları için ara katman
        const orientationGroup = new THREE.Group();
        orientationGroup.add(loadedRoot);
        pivot.add(orientationGroup);
        scene.add(pivot);

        pivotRef.current        = pivot;
        modelRootRef.current    = pivot; // export için
        orientationGroupRef.current = orientationGroup;

        // 7. Kamera
        pivot.updateMatrixWorld(true);
        const worldBox = new THREE.Box3().setFromObject(pivot);
        modelTargetYRef.current = (worldBox.max.y - worldBox.min.y) * 0.5;
        fitCameraForAspect(
          mountRef.current?.clientWidth  || 800,
          mountRef.current?.clientHeight || 600
        );

        // 8. İstatistikler
        if (onMeshStats) {
          let v = 0, f = 0;
          pivot.traverse((c) => {
            const m = c as THREE.Mesh;
            if (m.isMesh && m.geometry) {
              const p = m.geometry.getAttribute("position");
              if (p) v += p.count;
              f += m.geometry.index
                ? m.geometry.index.count / 3
                : p ? p.count / 3 : 0;
            }
          });
          onMeshStats({ vertices: Math.round(v), faces: Math.round(f) });
        }
      };

      setIsLoading(true);

      const nameToCheck = fileName || modelUrl;
      const isStl = nameToCheck.toLowerCase().endsWith(".stl") || fileType === "stl";

      if (isStl) {
        new STLLoader().load(
          modelUrl,
          (geo) => {
            const mesh  = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xcccccc }));
            const group = new THREE.Group();
            group.add(mesh);
            placeModel(group);
          },
          undefined,
          (err) => { console.error("STL Yükleme Hatası:", err); setIsLoading(false); }
        );
      } else {
        const draco = new DRACOLoader();
        draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
        const gltf = new GLTFLoader();
        gltf.setDRACOLoader(draco);
        gltf.load(
          modelUrl,
          (res) => { draco.dispose(); placeModel(res.scene); },
          undefined,
          (err) => { console.error("GLB Yükleme Hatası:", err); draco.dispose(); setIsLoading(false); }
        );
      }
    }, [modelUrl, fileName, fileType, pivotMode, tuneMaterialForDisplay, fitCameraForAspect, onMeshStats]);

    return (
      <div className="relative h-full w-full overflow-hidden bg-transparent">
        <div ref={mountRef} className="absolute inset-0" />


        {isLoading && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
            <p className="text-[10px] tracking-widest text-white/50 uppercase">Model Yükleniyor</p>
          </div>
        )}

        {showRotationControls && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-2xl p-2 rounded-full border border-white/10 flex items-center gap-2 shadow-2xl pointer-events-auto z-10">
            <div className="px-4 text-[9px] font-black tracking-widest text-white/30 uppercase">Eksen</div>
            {(["x", "y", "z"] as const).map((axis) => (
              <button
                key={axis}
                onClick={() => rotateOrientation(axis)}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/20 text-white font-bold border border-white/10 transition-all"
              >
                {axis.toUpperCase()}
              </button>
            ))}
            <div className="w-[1px] h-6 bg-white/10 mx-1" />
            <button
              onClick={() => orientationGroupRef.current?.rotation.set(0, 0, 0)}
              className="text-[9px] text-white/40 font-bold px-3 hover:text-white"
            >
              SIFIRLA
            </button>
            <div className="w-[1px] h-6 bg-white/10 mx-1" />
            <button
              onClick={() => {
                const ns = !localAutoRotate;
                autoRotateRef.current = ns;
                setLocalAutoRotate(ns);
              }}
              className={`px-4 h-10 rounded-full text-[9px] font-bold border transition-all ${
                localAutoRotate
                  ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                  : "bg-white/5 text-white/30 border-white/10"
              }`}
            >
              {localAutoRotate ? "DÖNÜŞ AÇIK" : "DÖNÜŞ KAPALI"}
            </button>
          </div>
        )}
      </div>
    );
  }
);

// --- ANA UYGULAMA BİLEŞENİ ---
export default function App() {
  const [modelData, setModelData] = useState<{ url: string; name: string } | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setModelData({ url: URL.createObjectURL(file), name: file.name });
  };

  return (
    <div className="w-full h-screen bg-[#050505] flex flex-col">
      <div className="flex-1 relative">
        {modelData ? (
          <MeshRealtimeViewerInternal
            modelUrl={modelData.url}
            fileName={modelData.name}
            pivotMode="bottom"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white/30">
            <div className="w-20 h-20 mb-6 opacity-20 border-2 border-dashed border-white rounded-xl flex items-center justify-center text-3xl font-bold">
              3D
            </div>
            <p className="text-sm font-medium mb-8">Model seçilmedi</p>
            <label className="bg-white text-black px-10 py-4 rounded-full font-bold cursor-pointer hover:bg-gray-200 transition-all shadow-xl active:scale-95 text-sm">
              Dosya Seç (.glb, .stl)
              <input type="file" onChange={handleFile} accept=".glb,.stl" className="hidden" />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
