"use client";

import { forwardRef, useEffect, useRef, useCallback, useImperativeHandle, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

export type MeshStats = {
  vertices: number;
  faces: number;
};

type MeshRealtimeViewerProps = {
  modelUrl?: string | null;
  /** Kalınlık (Z ekseni) mm cinsinden. min=0.01, max=1.0, step=0.001 */
  zScaleMm?: number;
  /** Dosya formatını zorla belirt (blob URL'ler için gerekli) */
  fileType?: "stl" | "glb" | "auto";
  autoRotate?: boolean;
  showGrid?: boolean;
  renderWidth?: number;
  renderHeight?: number;
  /** Model yüklendiğinde vertex/face istatistiklerini bildir */
  onMeshStats?: (stats: MeshStats) => void;
  initialRotation?: { x: number; y: number; z: number };
  onRotationChange?: (rotation: { x: number; y: number; z: number }) => void;
  showRotationControls?: boolean;
  /** AI analiz butonu callback'i */
  onAiAnalysis?: () => void;
  /** AI analiz yüklenme durumu */
  isAiAnalyzing?: boolean;
  /** Video kaydı gibi harici canvas okuma için WebGL buffer'ını koru. */
  preserveDrawingBuffer?: boolean;
  /** Render pixel yoğunluğu — 2 = 2x supersample (video için önerilen). */
  pixelRatio?: number;
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

export const MeshRealtimeViewer = forwardRef<MeshRealtimeViewerHandle, MeshRealtimeViewerProps>(function MeshRealtimeViewer(
  {
    modelUrl,
    zScaleMm = 1.0,
    fileType = "auto",
    autoRotate = false,
    showGrid = true,
    renderWidth,
    renderHeight,
    onMeshStats,
    initialRotation,
    onRotationChange,
    showRotationControls,
    onAiAnalysis,
    isAiAnalyzing = false,
    preserveDrawingBuffer = false,
    pixelRatio,
  },
  ref
) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRootRef = useRef<THREE.Object3D | null>(null);
  const orientationGroupRef = useRef<THREE.Group | null>(null);
  const gridMajorRef = useRef<THREE.GridHelper | null>(null);
  const gridMinorRef = useRef<THREE.GridHelper | null>(null);
  const renderWidthRef = useRef<number | undefined>(renderWidth);
  const renderHeightRef = useRef<number | undefined>(renderHeight);
  const uniformScaleRef = useRef<number>(1);
  const modelTargetYRef = useRef<number>(0.9);
  const stlExporterRef = useRef(new STLExporter());
  const objExporterRef = useRef(new OBJExporter());
  const autoRotateRef = useRef(false);
  const userInteractingRef = useRef(false);
  const pauseAnimationRef = useRef(false);
  const animationLoopRef = useRef<(() => void) | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [localAutoRotate, setLocalAutoRotate] = useState(autoRotate);
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });

  const tuneMaterialForDisplay = useCallback((material?: THREE.Material | THREE.Material[] | null) => {
    if (!material) return;
    const materials = Array.isArray(material) ? material : [material];
    const renderer = rendererRef.current;
    const anisotropy = renderer?.capabilities.getMaxAnisotropy?.() ?? 1;

    const tuneTexture = (texture?: THREE.Texture | null) => {
      if (!texture) return;
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = Math.max(texture.anisotropy ?? 1, Math.min(anisotropy, 4));
      texture.needsUpdate = true;
    };

    for (const entry of materials) {
      const standard = entry as THREE.MeshStandardMaterial;
      if ("envMapIntensity" in standard) {
        standard.envMapIntensity = Math.min(standard.envMapIntensity ?? 1.0, 1.2);
      }
      if ("metalness" in standard) {
        standard.metalness = Math.min(standard.metalness ?? 0.8, 1.0);
      }
      if ("roughness" in standard) {
        standard.roughness = Math.max(standard.roughness ?? 0.3, 0.05);
      }
      if ("map" in standard && standard.map) tuneTexture(standard.map);
      if ("normalMap" in standard && standard.normalMap) tuneTexture(standard.normalMap);
      if ("roughnessMap" in standard && standard.roughnessMap) tuneTexture(standard.roughnessMap);
      if ("metalnessMap" in standard && standard.metalnessMap) tuneTexture(standard.metalnessMap);
      if ("aoMap" in standard && standard.aoMap) tuneTexture(standard.aoMap);
      if ("emissiveMap" in standard && standard.emissiveMap) tuneTexture(standard.emissiveMap);
      entry.needsUpdate = true;
    }
  }, []);

  const applyRendererSize = useCallback(() => {
    const host = mountRef.current;
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    if (!host || !renderer || !camera) return;
    const container = host.parentElement ?? host;
    const width = renderWidthRef.current ?? Math.max(container.clientWidth, 1);
    const height = renderHeightRef.current ?? Math.max(container.clientHeight, 1);
    renderer.setSize(width, height, false);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }, []);

  const fitCameraForAspect = useCallback((w: number, h: number) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !modelRootRef.current) return;
    const aspect = w / h;
    const halfFovV = Math.tan(((45 * Math.PI) / 180) / 2);
    const halfFovH = aspect * halfFovV;
    const fitSize = 1.8;
    const distV = fitSize / (2 * halfFovV);
    const distH = fitSize / (2 * halfFovH);
    const dist = Math.max(distV, distH) * 1.4;
    const ty = modelTargetYRef.current;
    camera.position.set(0, ty, dist);
    if (controls) {
      controls.target.set(0, ty, 0);
      controls.update();
    }
    camera.updateProjectionMatrix();
  }, []);

  const applyMicronDepth = useCallback(() => {
    const modelRoot = modelRootRef.current;
    if (!modelRoot) return;
    const uniformScale = Math.max(uniformScaleRef.current, 1e-6);
    const zMult = THREE.MathUtils.clamp(zScaleMm, 0.01, 1.0);
    modelRoot.scale.set(uniformScale, uniformScale, uniformScale * zMult);
    modelRoot.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(modelRoot);
    modelRoot.position.y = -bbox.min.y;
    modelRoot.updateMatrixWorld(true);
  }, [zScaleMm]);

  // Orientation group'u 90° adımlarla döndür — kullanıcı yanlış gelen modeli düzeltir
  const rotateOrientation = useCallback((axis: "x" | "y" | "z") => {
    if (!orientationGroupRef.current) return;
    orientationGroupRef.current.rotation[axis] += Math.PI / 2;
  }, []);

  const cloneMeshForExport = useCallback(() => {
    const target = modelRootRef.current;
    if (!target) return null;
    const clone = target.clone(true);
    clone.updateMatrixWorld(true);
    const grounded = new THREE.Box3().setFromObject(clone);
    clone.position.y -= grounded.min.y;
    clone.updateMatrixWorld(true);
    return clone;
  }, []);

  const exportToSTL = useCallback((mesh: THREE.Object3D) => {
    const output: unknown = stlExporterRef.current.parse(mesh, { binary: true });
    if (output instanceof DataView) {
      const bytes = output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength) as ArrayBuffer;
      return new Blob([bytes], { type: "model/stl" });
    }
    if (output instanceof ArrayBuffer) return new Blob([output], { type: "model/stl" });
    return new Blob([String(output)], { type: "text/plain;charset=utf-8" });
  }, []);

  const exportToOBJ = useCallback((mesh: THREE.Object3D) => {
    const output = objExporterRef.current.parse(mesh);
    return new Blob([output], { type: "text/plain;charset=utf-8" });
  }, []);

  const triggerDownload = useCallback((blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      downloadSTL: () => {
        const mesh = cloneMeshForExport();
        if (!mesh) return false;
        triggerDownload(exportToSTL(mesh), "Remaura_Model.stl");
        return true;
      },
      downloadOBJ: () => {
        const mesh = cloneMeshForExport();
        if (!mesh) return false;
        triggerDownload(exportToOBJ(mesh), "Remaura_Model.obj");
        return true;
      },
      setGridVisible: (visible: boolean) => {
        if (gridMajorRef.current) gridMajorRef.current.visible = visible;
        if (gridMinorRef.current) gridMinorRef.current.visible = visible;
      },
      setRotation: (rot) => {
        if (modelRootRef.current) {
          modelRootRef.current.rotation.set(rot.x, rot.y, rot.z);
          modelRootRef.current.updateMatrixWorld(true);
        }
        setRotation({ x: rot.x, y: rot.y, z: rot.z });
      },
      getRotation: () => {
        if (modelRootRef.current) {
          const r = modelRootRef.current.rotation;
          return { x: r.x, y: r.y, z: r.z };
        }
        return { ...rotation };
      },
      renderFrame: () => {
        controlsRef.current?.update();
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.clear();
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
      },
      setCanvasBackground: (color: string, alpha = 0) => {
        rendererRef.current?.setClearColor(color, alpha);
      },
      setAutoRotate: (enabled: boolean) => {
        autoRotateRef.current = enabled;
      },
      pauseAnimation: (paused: boolean) => {
        pauseAnimationRef.current = paused;
      },
      overrideAnimationLoop: (fn) => {
        rendererRef.current?.setAnimationLoop(fn ?? animationLoopRef.current);
      },
    }),
    [cloneMeshForExport, exportToSTL, exportToOBJ, triggerDownload, rotation]
  );

  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 0.9, 3.5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer });
    renderer.setPixelRatio(pixelRatio ?? 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = false;
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    host.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 1.6;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.screenSpacePanning = true;
    controls.zoomSpeed = 1.1;
    controls.panSpeed = 1.1;
    controls.minDistance = 0.5;
    controls.maxDistance = 20;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    controlsRef.current = controls;

    const onInteractStart = () => { userInteractingRef.current = true; };
    const onInteractEnd = () => { userInteractingRef.current = false; };
    controls.addEventListener("start", onInteractStart);
    controls.addEventListener("end", onInteractEnd);

    const ambient = new THREE.HemisphereLight(0xffffff, 0x1b2130, 1.0);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xfff7ef, 1.6);
    key.position.set(5, 7, 6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xb8d2ff, 0.8);
    fill.position.set(-5, 2.5, -3);
    scene.add(fill);

    const gridMajor = new THREE.GridHelper(10, 20, 0x566174, 0x2f3848);
    gridMajor.position.y = -0.02;
    scene.add(gridMajor);
    gridMajorRef.current = gridMajor;
    const gridMinor = new THREE.GridHelper(10, 80, 0x253041, 0x253041);
    gridMinor.position.y = -0.019;
    scene.add(gridMinor);
    gridMinorRef.current = gridMinor;

    applyRendererSize();

    const resizeObserver = new ResizeObserver(() => { applyRendererSize(); });
    resizeObserver.observe(host.parentElement ?? host);

    const animate = () => {
      if (pauseAnimationRef.current) return;
      if (autoRotateRef.current && !userInteractingRef.current && modelRootRef.current) {
        modelRootRef.current.rotation.y += 0.007;
      }
      controlsRef.current?.update();
      renderer.render(scene, camera);
    };
    animationLoopRef.current = animate;
    renderer.setAnimationLoop(animate);

    return () => {
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      controls.removeEventListener("start", onInteractStart);
      controls.removeEventListener("end", onInteractEnd);
      controlsRef.current?.dispose();
      controlsRef.current = null;
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!("geometry" in mesh) || !mesh.geometry) return;
        mesh.geometry.dispose();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material?.dispose();
      });
      rendererRef.current?.dispose();
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      modelRootRef.current = null;
      orientationGroupRef.current = null;
      gridMajorRef.current = null;
      gridMinorRef.current = null;
      host.innerHTML = "";
    };
  }, [applyRendererSize, pixelRatio, preserveDrawingBuffer]);

  useEffect(() => {
    if (modelUrl) return;
    setIsLoading(false);
    const frame = window.requestAnimationFrame(() => setLoadError(null));
    return () => window.cancelAnimationFrame(frame);
  }, [modelUrl]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (modelRootRef.current) {
      scene.remove(modelRootRef.current);
      modelRootRef.current = null;
      orientationGroupRef.current = null;
    }

    if (!modelUrl) return;

    // Hiyerarşi: wrapper (pivot) → loadedRoot
    // Kullanıcı wrapper'ın rotation.x'ini butonlarla seçer (0, 90, 180, -90)
    // Auto-rotate wrapper.rotation.y'yi döndürür
    const placeModel = (loadedRoot: THREE.Object3D) => {
      setLoadError(null);
      setIsLoading(false);

      // 1. Reset
      loadedRoot.position.set(0, 0, 0);
      loadedRoot.rotation.set(0, 0, 0);
      loadedRoot.scale.set(1, 1, 1);

      // 2. Material tuning
      loadedRoot.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh) tuneMaterialForDisplay(mesh.material);
      });

      // 3. Modeli pivot noktasına (merkez) hizala + ölçekle
      loadedRoot.updateMatrixWorld(true);
      const rawBox = new THREE.Box3().setFromObject(loadedRoot);
      const center = rawBox.getCenter(new THREE.Vector3());
      const size = rawBox.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
      const scale = 1.8 / maxDim;
      loadedRoot.position.sub(center);
      loadedRoot.scale.setScalar(scale);

      // 4. Wrapper = pivot grubu
      const wrapper = new THREE.Group();
      wrapper.add(loadedRoot);
      orientationGroupRef.current = wrapper;
      modelRootRef.current = wrapper;
      scene.add(wrapper);

      // 5. Wrapper'ı zemine oturt
      wrapper.updateMatrixWorld(true);
      const groundBox = new THREE.Box3().setFromObject(wrapper);
      wrapper.position.y = -groundBox.min.y + 0.01;
      uniformScaleRef.current = scale;
      wrapper.updateMatrixWorld(true);

      // 6. Kamera hedefi
      if (controlsRef.current) {
        const finalBox = new THREE.Box3().setFromObject(wrapper);
        const modelHeight = finalBox.max.y - finalBox.min.y;
        modelTargetYRef.current = modelHeight * 0.5;
        controlsRef.current.target.set(0, modelHeight * 0.5, 0);
        controlsRef.current.update();
      }

      // 7. Format aspect'e göre kamerayı çerçevele
      {
        const host = mountRef.current;
        const container = host?.parentElement ?? host;
        const w = renderWidthRef.current ?? (container ? Math.max(container.clientWidth, 1) : 1);
        const h = renderHeightRef.current ?? (container ? Math.max(container.clientHeight, 1) : 1);
        fitCameraForAspect(w, h);
      }

      // 8. Mesh istatistikleri
      if (onMeshStats) {
        let totalVerts = 0;
        let totalFaces = 0;
        wrapper.traverse((child) => {
          const m = child as THREE.Mesh;
          if (m.isMesh && m.geometry) {
            const pos = m.geometry.getAttribute("position");
            if (pos) totalVerts += pos.count;
            const idx = m.geometry.index;
            totalFaces += idx ? idx.count / 3 : (pos ? pos.count / 3 : 0);
          }
        });
        onMeshStats({ vertices: Math.round(totalVerts), faces: Math.round(totalFaces) });
      }
    };

    const remoteLoaderUrl =
      modelUrl.startsWith("blob:") || modelUrl.startsWith("/")
        ? modelUrl
        : /^https?:\/\//i.test(modelUrl)
          ? `/api/fetch-media?url=${encodeURIComponent(modelUrl)}`
          : modelUrl;

    const isStl =
      fileType === "stl" ||
      (fileType === "auto" && modelUrl.toLowerCase().endsWith(".stl"));

    const tryLoadStl = (url: string) => {
      setIsLoading(true);
      const stlLoader = new STLLoader();
      stlLoader.load(
        url,
        (geometry) => {
          geometry.computeVertexNormals();
          const material = new THREE.MeshStandardMaterial({
            color: 0xd6d0c5,
            metalness: 0.72,
            roughness: 0.32,
            flatShading: false,
          });
          const mesh = new THREE.Mesh(geometry, material);
          const group = new THREE.Group();
          group.add(mesh);
          placeModel(group);
        },
        undefined,
        (error) => {
          console.error("[MeshViewer] STL yüklenemedi:", error);
          setIsLoading(false);
          setLoadError("3D model yüklenemedi. Format desteklenmiyor olabilir.");
        }
      );
    };

    const tryLoadGltf = (url: string) => {
      setIsLoading(true);
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
      const gltfLoader = new GLTFLoader();
      gltfLoader.setDRACOLoader(dracoLoader);
      gltfLoader.load(
        url,
        (gltf) => {
          dracoLoader.dispose();
          placeModel(gltf.scene);
        },
        undefined,
        (error) => {
          console.error("[MeshViewer] GLB yüklenemedi:", error);
          dracoLoader.dispose();
          setIsLoading(false);
          setLoadError("3D model yüklenemedi. Format desteklenmiyor olabilir.");
          tryLoadStl(url);
        }
      );
    };

    if (isStl) {
      tryLoadStl(remoteLoaderUrl);
    } else {
      tryLoadGltf(remoteLoaderUrl);
    }
  }, [modelUrl, fileType, applyMicronDepth, onMeshStats, initialRotation, fitCameraForAspect, tuneMaterialForDisplay]);

  useEffect(() => {
    if (!modelRootRef.current) return;
    modelRootRef.current.rotation.set(rotation.x, rotation.y, rotation.z);
    onRotationChange?.(rotation);
  }, [rotation, onRotationChange]);

  useEffect(() => {
    applyMicronDepth();
  }, [zScaleMm, applyMicronDepth]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
    setLocalAutoRotate(autoRotate);
  }, [autoRotate]);

  useEffect(() => {
    autoRotateRef.current = localAutoRotate;
  }, [localAutoRotate]);

  useEffect(() => {
    if (gridMajorRef.current) gridMajorRef.current.visible = showGrid;
    if (gridMinorRef.current) gridMinorRef.current.visible = showGrid;
  }, [showGrid]);

  useEffect(() => {
    renderWidthRef.current = renderWidth;
    renderHeightRef.current = renderHeight;
    applyRendererSize();
    if (renderWidth != null && renderHeight != null) {
      fitCameraForAspect(renderWidth, renderHeight);
    }
  }, [renderWidth, renderHeight, applyRendererSize, fitCameraForAspect]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={mountRef} className="absolute inset-0" />

      {loadError && (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/45 px-3 text-center text-xs leading-snug text-red-300"
          role="alert"
        >
          {loadError}
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 bg-black/95 backdrop-blur-xl z-50 flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-2 border-white/10 border-t-white rounded-full animate-spin mb-4" />
          <p className="text-[10px] tracking-[0.5em] text-white/40 uppercase">Pivot Hizalanıyor</p>
        </div>
      )}

      {showRotationControls && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/5 backdrop-blur-2xl p-2 rounded-[2.5rem] border border-white/10 flex items-center gap-2 shadow-2xl pointer-events-auto z-10">
          <div className="px-4 text-[9px] font-black tracking-[0.3em] text-white/30 uppercase">Eksen Düzelt</div>
          {(["x", "y", "z"] as const).map((axis) => (
            <button
              key={axis}
              type="button"
              onClick={() => rotateOrientation(axis)}
              className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/20 text-white font-bold border border-white/10 transition-all"
            >
              {axis.toUpperCase()}
            </button>
          ))}
          <div className="w-[1px] h-8 bg-white/10 mx-2" />
          <button
            type="button"
            onClick={() => {
              if (orientationGroupRef.current)
                orientationGroupRef.current.rotation.set(-Math.PI / 2, 0, 0);
            }}
            className="text-[10px] text-white/50 font-black tracking-widest hover:text-white transition-colors px-2"
          >
            SIFIRLA
          </button>
          <div className="w-[1px] h-8 bg-white/10 mx-2" />
          <button
            type="button"
            onClick={() => setLocalAutoRotate((v) => !v)}
            className={`px-4 h-12 rounded-full text-[10px] font-bold border transition-all ${
              localAutoRotate
                ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                : "bg-white/5 text-white/40 border-white/10"
            }`}
          >
            OTOMATİK DÖNÜŞ
          </button>
          {onAiAnalysis && (
            <button
              type="button"
              onClick={onAiAnalysis}
              disabled={isAiAnalyzing}
              className="bg-blue-600 px-6 h-12 rounded-full font-bold shadow-xl hover:brightness-110 disabled:opacity-50 text-white text-[11px] transition-all"
            >
              {isAiAnalyzing ? "ANALİZ EDİLİYOR..." : "✨ AI ANALİZİ"}
            </button>
          )}
        </div>
      )}
    </div>
  );
});
