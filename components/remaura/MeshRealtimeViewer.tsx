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
  const gridMajorRef = useRef<THREE.GridHelper | null>(null);
  const gridMinorRef = useRef<THREE.GridHelper | null>(null);
  const renderWidthRef = useRef<number | undefined>(renderWidth);
  const renderHeightRef = useRef<number | undefined>(renderHeight);
  const uniformScaleRef = useRef<number>(1);
  const modelTargetYRef = useRef<number>(0.9);
  const stlExporterRef = useRef(new STLExporter());
  const objExporterRef = useRef(new OBJExporter());
  const [loadError, setLoadError] = useState<string | null>(null);
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
        standard.envMapIntensity = Math.min(standard.envMapIntensity ?? 0.85, 0.9);
      }
      if ("metalness" in standard) {
        standard.metalness = Math.min(standard.metalness ?? 0.5, 0.55);
      }
      if ("roughness" in standard) {
        standard.roughness = Math.max(standard.roughness ?? 0.5, 0.42);
      }
      if ("map" in standard && standard.map) {
        tuneTexture(standard.map);
      }
      if ("normalMap" in standard && standard.normalMap) {
        tuneTexture(standard.normalMap);
      }
      if ("roughnessMap" in standard && standard.roughnessMap) {
        tuneTexture(standard.roughnessMap);
      }
      if ("metalnessMap" in standard && standard.metalnessMap) {
        tuneTexture(standard.metalnessMap);
      }
      if ("aoMap" in standard && standard.aoMap) {
        tuneTexture(standard.aoMap);
      }
      if ("emissiveMap" in standard && standard.emissiveMap) {
        tuneTexture(standard.emissiveMap);
      }
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

  /**
   * Format/boyut değişince kamerayı modeli tam çerçeveleyecek şekilde yeniden konumlandırır.
   * Model her zaman 1.8 birime scale edildiğinden sabit fitSize kullanılır.
   */
  const fitCameraForAspect = useCallback((w: number, h: number) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !modelRootRef.current) return;
    const aspect = w / h;
    const halfFovV = Math.tan(((45 * Math.PI) / 180) / 2); // tan(22.5°)
    const halfFovH = aspect * halfFovV;
    const fitSize = 1.8;
    const distV = fitSize / (2 * halfFovV);
    const distH = fitSize / (2 * halfFovH);
    const dist = Math.max(distV, distH) * 1.4;
    const ty = modelTargetYRef.current;
    camera.position.set(0, ty + dist * 0.12, dist);
    if (controls) {
      controls.target.set(0, ty, 0);
      controls.update();
    }
    camera.updateProjectionMatrix();
  }, []);

  /**
   * Z eksenini göreli katsayıyla ölçekler.
   * zScaleMm = 1.0 → doğal oranlar (bozulma yok)
   * zScaleMm = 0.5 → doğal Z'nin yarısı
   * zScaleMm = 0.01 → çok ince (1%)
   * Model tabanı HER ZAMAN y=0 üzerinde kalır.
   */
  const applyMicronDepth = useCallback(() => {
    const modelRoot = modelRootRef.current;
    if (!modelRoot) return;

    const uniformScale = Math.max(uniformScaleRef.current, 1e-6);
    const zMult = THREE.MathUtils.clamp(zScaleMm, 0.01, 1.0);

    modelRoot.scale.set(uniformScale, uniformScale, uniformScale * zMult);
    modelRoot.updateMatrixWorld(true);

    // Taban y=0'a sabitle
    const bbox = new THREE.Box3().setFromObject(modelRoot);
    modelRoot.position.y = -bbox.min.y;
    modelRoot.updateMatrixWorld(true);
  }, [zScaleMm]);

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
      const bytes = output.buffer.slice(
        output.byteOffset,
        output.byteOffset + output.byteLength
      ) as ArrayBuffer;
      return new Blob([bytes], { type: "model/stl" });
    }
    if (output instanceof ArrayBuffer) {
      return new Blob([output], { type: "model/stl" });
    }
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
        const blob = exportToSTL(mesh);
        triggerDownload(blob, "Remaura_Model.stl");
        return true;
      },
      downloadOBJ: () => {
        const mesh = cloneMeshForExport();
        if (!mesh) return false;
        const blob = exportToOBJ(mesh);
        triggerDownload(blob, "Remaura_Model.obj");
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
      getRotation: () => ({ ...rotation }),
      renderFrame: () => {
        controlsRef.current?.update();
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
      },
      setCanvasBackground: (color: string, alpha = 0) => {
        rendererRef.current?.setClearColor(color, alpha);
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
    camera.position.set(0, 1.2, 3.2);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer });
    renderer.setPixelRatio(pixelRatio ?? 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.96;
    renderer.setClearColor(0x000000, 0);
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
    gridMajor.visible = true;
    scene.add(gridMajor);
    gridMajorRef.current = gridMajor;
    const gridMinor = new THREE.GridHelper(10, 80, 0x253041, 0x253041);
    gridMinor.position.y = -0.019;
    gridMinor.visible = true;
    scene.add(gridMinor);
    gridMinorRef.current = gridMinor;

    let frameId = 0;

    applyRendererSize();

    const resizeObserver = new ResizeObserver(() => {
      applyRendererSize();
    });
    resizeObserver.observe(host.parentElement ?? host);

    const animate = () => {
      controlsRef.current?.update();
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      frameId = window.requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      controlsRef.current?.dispose();
      controlsRef.current = null;

      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!("geometry" in mesh) || !mesh.geometry) return;
        mesh.geometry.dispose();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) {
          material.forEach((m) => m.dispose());
        } else {
          material?.dispose();
        }
      });

      rendererRef.current?.dispose();
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      modelRootRef.current = null;
      gridMajorRef.current = null;
      gridMinorRef.current = null;
      host.innerHTML = "";
    };
  }, [applyRendererSize, pixelRatio, preserveDrawingBuffer]);

  useEffect(() => {
    if (modelUrl) return;
    const frame = window.requestAnimationFrame(() => setLoadError(null));
    return () => window.cancelAnimationFrame(frame);
  }, [modelUrl]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (modelRootRef.current) {
      scene.remove(modelRootRef.current);
      modelRootRef.current = null;
    }

    if (!modelUrl) {
      return;
    }

    const placeModel = (loadedRoot: THREE.Object3D) => {
      setLoadError(null);
      modelRootRef.current = loadedRoot;
      loadedRoot.position.set(0, 0, 0);
      loadedRoot.scale.set(1, 1, 1);
      // Tüm mesh geometry'lerini X ekseninde -90° döndür
      loadedRoot.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh && mesh.geometry) {
          mesh.geometry.applyMatrix4(
            new THREE.Matrix4().makeRotationX(-Math.PI / 2),
          );
          tuneMaterialForDisplay(mesh.material);
        }
      });
      scene.add(loadedRoot);
      if (initialRotation) {
        loadedRoot.rotation.set(
          initialRotation.x,
          initialRotation.y,
          initialRotation.z,
        );
        setRotation(initialRotation);
      }
      loadedRoot.updateMatrixWorld(true);

      const rawBox = new THREE.Box3().setFromObject(loadedRoot);
      const rawSize = rawBox.getSize(new THREE.Vector3());
      const maxDim = Math.max(rawSize.x, rawSize.y, rawSize.z, 1e-6);
      const uniformScale = 1.8 / maxDim;
      uniformScaleRef.current = uniformScale;

      loadedRoot.scale.setScalar(uniformScale);
      loadedRoot.updateMatrixWorld(true);

      const scaledBox = new THREE.Box3().setFromObject(loadedRoot);
      const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
      loadedRoot.position.x = -scaledCenter.x;
      loadedRoot.position.z = -scaledCenter.z;
      loadedRoot.position.y = -scaledBox.min.y + 0.01;
      loadedRoot.updateMatrixWorld(true);

      applyMicronDepth();

      if (controlsRef.current) {
        const finalBox = new THREE.Box3().setFromObject(loadedRoot);
        const modelHeight = finalBox.max.y - finalBox.min.y;
        modelTargetYRef.current = modelHeight * 0.5;
        controlsRef.current.target.set(0, modelHeight * 0.5, 0);
        controlsRef.current.update();
      }

      // Model yüklendi — mevcut format için kamerayı çerçeve içine al
      {
        const host = mountRef.current;
        const container = host?.parentElement ?? host;
        const w = renderWidthRef.current ?? (container ? Math.max(container.clientWidth, 1) : 1);
        const h = renderHeightRef.current ?? (container ? Math.max(container.clientHeight, 1) : 1);
        fitCameraForAspect(w, h);
      }

      if (onMeshStats) {
        let totalVerts = 0;
        let totalFaces = 0;
        loadedRoot.traverse((child) => {
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

    /** Uzak HTTPS dosyalarını tarayıcı CORS'undan kaçınmak için same-origin proxy. */
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
          tuneMaterialForDisplay(material);
          const group = new THREE.Group();
          group.add(mesh);
          placeModel(group);
        },
        undefined,
        (error) => {
          console.error("[MeshViewer] STL yüklenemedi:", error);
          setLoadError("3D model yüklenemedi. Format desteklenmiyor olabilir.");
        }
      );
    };

    const tryLoadGltf = (url: string) => {
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
      const gltfLoader = new GLTFLoader();
      gltfLoader.setDRACOLoader(dracoLoader);
      gltfLoader.load(
        url,
        (gltf) => {
          dracoLoader.dispose();
          gltf.scene.rotation.x = -Math.PI / 2;
          placeModel(gltf.scene);
        },
        undefined,
        (error) => {
          console.error("[MeshViewer] GLB yüklenemedi:", error);
          dracoLoader.dispose();
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

  // zScaleMm her değiştiğinde mikron derinliğini yeniden uygula
  useEffect(() => {
    applyMicronDepth();
  }, [zScaleMm, applyMicronDepth]);

  useEffect(() => {
    if (!controlsRef.current) return;
    controlsRef.current.autoRotate = autoRotate;
    controlsRef.current.autoRotateSpeed = 1.6;
  }, [autoRotate]);

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
      {loadError ? (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/45 px-3 text-center text-xs leading-snug text-red-300"
          role="alert"
        >
          {loadError}
        </div>
      ) : null}
      {showRotationControls && (
        <div style={{ position: "absolute", bottom: 8, left: 8, zIndex: 10, display: "flex", flexDirection: "column", gap: 4 }}>
          {(["x", "y", "z"] as const).map((axis) => (
            <div key={axis} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: "#c9a84c", fontSize: 10, width: 10 }}>{axis.toUpperCase()}</span>
              <button
                type="button"
                onClick={() => {
                  const newRot = { ...rotation, [axis]: rotation[axis] - Math.PI / 12 };
                  setRotation(newRot);
                  onRotationChange?.(newRot);
                }}
                style={{
                  background: "rgba(0,0,0,0.5)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#fff",
                  borderRadius: 4,
                  padding: "2px 6px",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                −15°
              </button>
              <button
                type="button"
                onClick={() => {
                  const newRot = { ...rotation, [axis]: rotation[axis] + Math.PI / 12 };
                  setRotation(newRot);
                  onRotationChange?.(newRot);
                }}
                style={{
                  background: "rgba(0,0,0,0.5)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#fff",
                  borderRadius: 4,
                  padding: "2px 6px",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                +15°
              </button>
              <button
                type="button"
                onClick={() => {
                  const newRot = { ...rotation, [axis]: 0 };
                  setRotation(newRot);
                  onRotationChange?.(newRot);
                }}
                style={{
                  background: "rgba(0,0,0,0.5)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#aaa",
                  borderRadius: 4,
                  padding: "2px 6px",
                  fontSize: 10,
                  cursor: "pointer",
                }}
              >
                0
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
