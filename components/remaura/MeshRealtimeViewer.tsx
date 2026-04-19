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
  pivotMode?: PivotMode;
  onPivotChange?: (mode: PivotMode) => void;
  pickPivotMode?: boolean;
  onPickPivotModeChange?: (active: boolean) => void;
  backgroundColor?: string;
};

export type MeshRealtimeViewerHandle = {
  getCanvas: () => HTMLCanvasElement | null;
  resetCamera: () => void;
  exportModel: (format: "stl" | "obj") => void;
};

const MeshRealtimeViewerInternal = forwardRef<MeshRealtimeViewerHandle, MeshRealtimeViewerProps>(
  (
    {
      modelUrl,
      fileName,
      zScaleMm,
      fileType = "auto",
      autoRotate = false,
      showGrid = true,
      renderWidth,
      renderHeight,
      onMeshStats,
      initialRotation,
      onRotationChange,
      showRotationControls = false,
      preserveDrawingBuffer = false,
      pivotMode = "bottom",
      onPivotChange,
      pickPivotMode = false,
      onPickPivotModeChange,
      backgroundColor = "#000000",
    },
    ref
  ) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const gridRef = useRef<THREE.GridHelper | null>(null);

    const pivotRef = useRef<THREE.Group | null>(null);
    const modelRootRef = useRef<THREE.Object3D | null>(null);
    const orientationGroupRef = useRef<THREE.Group | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const modelTargetYRef = useRef(0);

    // --- HELPER: Materyal Ayarı ---
    const tuneMaterialForDisplay = useCallback((mat: any) => {
      if (!mat) return;
      const materials = Array.isArray(mat) ? mat : [mat];
      materials.forEach((m) => {
        if (m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshPhongMaterial) {
          m.side = THREE.DoubleSide;
          if (m instanceof THREE.MeshStandardMaterial) {
            m.roughness = 0.4;
            m.metalness = 0.3;
          }
        }
      });
    }, []);

    // --- HELPER: Kamera Odaklama ---
    const fitCameraForAspect = useCallback((w: number, h: number) => {
      if (!cameraRef.current || !pivotRef.current) return;
      const camera = cameraRef.current;
      const pivot = pivotRef.current;

      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      const box = new THREE.Box3().setFromObject(pivot);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
      cameraZ *= 1.5;

      camera.position.set(cameraZ, cameraZ, cameraZ);
      const center = new THREE.Vector3(0, modelTargetYRef.current, 0);
      camera.lookAt(center);
      if (controlsRef.current) {
        controlsRef.current.target.copy(center);
        controlsRef.current.update();
      }
    }, []);

    // --- EXPOSE API ---
    useImperativeHandle(ref, () => ({
      getCanvas: () => rendererRef.current?.domElement || null,
      resetCamera: () => {
        const w = mountRef.current?.clientWidth || 800;
        const h = mountRef.current?.clientHeight || 600;
        fitCameraForAspect(w, h);
      },
      exportModel: (format) => {
        if (!modelRootRef.current) return;
        let data: any;
        let ext = "";
        if (format === "stl") {
          data = new STLExporter().parse(modelRootRef.current);
          ext = "stl";
        } else {
          data = new OBJExporter().parse(modelRootRef.current);
          ext = "obj";
        }
        const blob = new Blob([data], { type: "text/plain" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `export.${ext}`;
        link.click();
      },
    }));

    // --- INIT SCENE ---
    useEffect(() => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;

      const scene = new THREE.Scene();
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 5000);
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer,
      });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(w, h);
      renderer.shadowMap.enabled = true;
      mountRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controlsRef.current = controls;

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
      scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
      dirLight.position.set(100, 200, 100);
      dirLight.castShadow = true;
      scene.add(dirLight);

      const grid = new THREE.GridHelper(10, 20, 0x444444, 0x222222);
      scene.add(grid);
      gridRef.current = grid;

      const animate = () => {
        requestAnimationFrame(animate);
        if (controlsRef.current) controlsRef.current.update();
        if (autoRotate && pivotRef.current) {
          pivotRef.current.rotation.y += 0.005;
        }
        renderer.render(scene, camera);
      };
      animate();

      const handleResize = () => {
        if (!mountRef.current) return;
        const nw = mountRef.current.clientWidth;
        const nh = mountRef.current.clientHeight;
        renderer.setSize(nw, nh);
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
      };
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        renderer.dispose();
      };
    }, [preserveDrawingBuffer, autoRotate]);

    // --- BACKGROUND COLOR ---
    useEffect(() => {
      if (sceneRef.current) {
        sceneRef.current.background = backgroundColor === "transparent" ? null : new THREE.Color(backgroundColor);
      }
    }, [backgroundColor]);

    // --- GRID TOGGLE ---
    useEffect(() => {
      if (gridRef.current) gridRef.current.visible = showGrid;
    }, [showGrid]);

    // --- MODEL LOADING & PLACING ---
    useEffect(() => {
      if (!sceneRef.current || !modelUrl) return;
      const scene = sceneRef.current;

      if (pivotRef.current) scene.remove(pivotRef.current);
      pivotRef.current = null;
      modelRootRef.current = null;
      orientationGroupRef.current = null;

      const placeModel = (loadedRoot: THREE.Object3D, isStl: boolean) => {
        setIsLoading(false);

        // 1. Bbox hesapla (Model artik onceden merkezlendigi icin daha stabil)
        const box = new THREE.Box3().setFromObject(loadedRoot);
        const size = box.getSize(new THREE.Vector3());
        const min = box.min;
        const max = box.max;

        // 2. Pivot Y
        const pivotY =
          pivotMode === "top" ? max.y : pivotMode === "center" ? (min.y + max.y) / 2 : min.y;

        // 3. Modeli sahne merkezine (0,0,0) oturt
        loadedRoot.position.set(-((min.x + max.x) / 2), -pivotY, -((min.z + max.z) / 2));

        // 4. Materyal
        loadedRoot.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) tuneMaterialForDisplay((c as THREE.Mesh).material);
        });

        // 5. Ana Pivot (Olcaklendirme)
        const pivot = new THREE.Group();
        const scale = 1.8 / Math.max(size.x, size.y, size.z, 0.01);
        pivot.scale.setScalar(scale);

        const orientationGroup = new THREE.Group();
        orientationGroup.add(loadedRoot);
        pivot.add(orientationGroup);
        scene.add(pivot);

        pivotRef.current = pivot;
        modelRootRef.current = pivot;
        orientationGroupRef.current = orientationGroup;

        // 6. Focus
        pivot.updateMatrixWorld(true);
        const worldBox = new THREE.Box3().setFromObject(pivot);
        modelTargetYRef.current = (worldBox.max.y - worldBox.min.y) * 0.5;

        fitCameraForAspect(mountRef.current?.clientWidth || 800, mountRef.current?.clientHeight || 600);

        // 7. Stats
        if (onMeshStats) {
          let v = 0, f = 0;
          pivot.traverse((c) => {
            const m = c as THREE.Mesh;
            if (m.isMesh && m.geometry) {
              const p = m.geometry.getAttribute("position");
              if (p) v += p.count;
              f += m.geometry.index ? m.geometry.index.count / 3 : p ? p.count / 3 : 0;
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
            geo.computeVertexNormals();
            geo.center(); // STL geometrisini merkezi (0,0,0) olacak sekilde fiziksel olarak sifirlar

            const material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
            const mesh = new THREE.Mesh(geo, material);

            // STL genelde Z-up gelir. Grubu degil mesh'i dondurmek bbox hesaplamasini korur.
            mesh.rotation.x = -Math.PI / 2;

            const group = new THREE.Group();
            group.add(mesh);
            placeModel(group, true);
          },
          undefined,
          (err) => {
            console.error("STL Load Error:", err);
            setIsLoading(false);
          }
        );
      } else {
        const draco = new DRACOLoader();
        draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
        const gltf = new GLTFLoader();
        gltf.setDRACOLoader(draco);
        gltf.load(
          modelUrl,
          (res) => {
            draco.dispose();
            placeModel(res.scene, false);
          },
          undefined,
          (err) => {
            console.error("GLB Load Error:", err);
            draco.dispose();
            setIsLoading(false);
          }
        );
      }
    }, [modelUrl, fileName, fileType, pivotMode, tuneMaterialForDisplay, fitCameraForAspect, onMeshStats]);

    // --- ROTATION HANDLER ---
    useEffect(() => {
      if (initialRotation && orientationGroupRef.current) {
        orientationGroupRef.current.rotation.set(initialRotation.x, initialRotation.y, initialRotation.z);
      }
    }, [initialRotation]);

    const handleRotationChange = (axis: "x" | "y" | "z", val: number) => {
      if (!orientationGroupRef.current) return;
      orientationGroupRef.current.rotation[axis] = val;
      if (onRotationChange) {
        onRotationChange({
          x: orientationGroupRef.current.rotation.x,
          y: orientationGroupRef.current.rotation.y,
          z: orientationGroupRef.current.rotation.z,
        });
      }
    };

    // --- CLICK TO PICK PIVOT ---
    const onCanvasClick = (e: React.MouseEvent) => {
      if (!pickPivotMode || !modelRootRef.current || !cameraRef.current || !mountRef.current) return;

      const rect = mountRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera({ x, y }, cameraRef.current);

      const intersects = raycaster.intersectObject(modelRootRef.current, true);
      if (intersects.length > 0) {
        const hitPoint = intersects[0].point;
        // Modeli tiklanan noktaya gore kaydir
        const loadedRoot = modelRootRef.current.children[0] as THREE.Group;
        const hitWorld = hitPoint.clone();
        loadedRoot.worldToLocal(hitWorld);
        loadedRoot.position.sub(hitWorld);

        if (onPickPivotModeChange) onPickPivotModeChange(false);
      }
    };

    return (
      <div ref={mountRef} className="relative w-full h-full group" onClick={onCanvasClick}>
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              <p className="text-white text-xs font-medium">Model Yükleniyor...</p>
            </div>
          </div>
        )}

        {/* --- ROTATION & PIVOT CONTROLS --- */}
        {(showRotationControls || pickPivotMode) && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4 w-full max-w-md px-4">
            {pickPivotMode && (
              <div className="bg-blue-600 text-white px-4 py-2 rounded-full text-xs font-bold animate-pulse shadow-xl">
                Model üzerinde yeni merkez noktasını seçin
              </div>
            )}

            <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 w-full flex flex-col gap-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Hizalama</span>
                <div className="flex bg-white/5 p-1 rounded-lg">
                  {(["bottom", "center", "top"] as PivotMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => onPivotChange?.(m)}
                      className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                        pivotMode === m ? "bg-white text-black shadow-lg" : "text-white/50 hover:text-white"
                      }`}
                    >
                      {m === "bottom" ? "ALT" : m === "center" ? "ORTA" : "ÜST"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-[1px] bg-white/5" />

              <div className="grid grid-cols-3 gap-4">
                {(["x", "y", "z"] as const).map((axis) => (
                  <div key={axis} className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-white/30 font-bold uppercase ml-1">{axis} Ekseni</label>
                    <input
                      type="range"
                      min={-Math.PI}
                      max={Math.PI}
                      step={0.01}
                      className="w-full accent-white"
                      onChange={(e) => handleRotationChange(axis, parseFloat(e.target.value))}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- PIVOT MODE TOGGLE --- */}
        {onPickPivotModeChange && (
          <div className="absolute top-6 right-6 z-20">
            <button
              onClick={() => onPickPivotModeChange(!pickPivotMode)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                pickPivotMode
                  ? "bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                  : "bg-black/60 border-white/10 text-white/70 hover:bg-black/80 hover:text-white"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${pickPivotMode ? "bg-white animate-ping" : "bg-white/30"}`} />
              {pickPivotMode ? "SEÇİM AKTİF" : "PİVOT SEÇ"}
            </button>
          </div>
        )}
      </div>
    );
  }
);

MeshRealtimeViewerInternal.displayName = "MeshRealtimeViewerInternal";

export const MeshRealtimeViewer = MeshRealtimeViewerInternal;

// --- ANA UYGULAMA BİLEŞENİ (Örnek Kullanım) ---
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
          <MeshRealtimeViewer
            modelUrl={modelData.url}
            fileName={modelData.name}
            pivotMode="bottom"
            showGrid={true}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white/30">
            <div className="w-20 h-20 mb-6 opacity-20 border-2 border-dashed border-white rounded-xl flex items-center justify-center text-3xl font-bold">
              3D
            </div>
            <p className="text-sm font-medium mb-8">Model seçilmedi</p>
            <label className="bg-white text-black px-10 py-4 rounded-full font-bold cursor-pointer hover:bg-gray-200 transition-all shadow-xl active:scale-95">
              DOSYA YÜKLE
              <input type="file" accept=".stl,.glb" className="hidden" onChange={handleFile} />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}