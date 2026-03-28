"use client";

import { forwardRef, useEffect, useRef, useCallback, useImperativeHandle } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter.js";
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
  /** Model yüklendiğinde vertex/face istatistiklerini bildir */
  onMeshStats?: (stats: MeshStats) => void;
};

export type MeshRealtimeViewerHandle = {
  downloadSTL: () => boolean;
  downloadOBJ: () => boolean;
};

export const MeshRealtimeViewer = forwardRef<MeshRealtimeViewerHandle, MeshRealtimeViewerProps>(function MeshRealtimeViewer(
  { modelUrl, zScaleMm = 1.0, fileType = "auto", onMeshStats },
  ref
) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRootRef = useRef<THREE.Object3D | null>(null);
  const uniformScaleRef = useRef<number>(1);
  const stlExporterRef = useRef(new STLExporter());
  const objExporterRef = useRef(new OBJExporter());

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
    }),
    [cloneMeshForExport, exportToSTL, exportToOBJ, triggerDownload]
  );

  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 1.2, 3.2);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
    gridMajor.position.y = 0;
    scene.add(gridMajor);
    const gridMinor = new THREE.GridHelper(10, 80, 0x253041, 0x253041);
    gridMinor.position.y = 0.001;
    scene.add(gridMinor);

    let frameId = 0;

    const setSize = () => {
      const container = host.parentElement ?? host;
      const width  = Math.max(container.clientWidth, 1);
      const height = Math.max(container.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    setSize();

    const resizeObserver = new ResizeObserver(setSize);
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
      host.innerHTML = "";
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (modelRootRef.current) {
      scene.remove(modelRootRef.current);
      modelRootRef.current = null;
    }

    if (!modelUrl) return;

    const placeModel = (loadedRoot: THREE.Object3D) => {
      modelRootRef.current = loadedRoot;
      loadedRoot.position.set(0, 0, 0);
      loadedRoot.rotation.set(0, 0, 0);
      loadedRoot.scale.set(1, 1, 1);
      scene.add(loadedRoot);
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
      loadedRoot.position.y = -scaledBox.min.y;
      loadedRoot.updateMatrixWorld(true);

      applyMicronDepth();

      if (controlsRef.current) {
        const finalBox = new THREE.Box3().setFromObject(loadedRoot);
        const modelHeight = finalBox.max.y - finalBox.min.y;
        controlsRef.current.target.set(0, modelHeight * 0.5, 0);
        controlsRef.current.update();
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
            color: 0xc0c0c0,
            metalness: 0.4,
            roughness: 0.5,
            flatShading: false,
          });
          const mesh = new THREE.Mesh(geometry, material);
          const group = new THREE.Group();
          group.add(mesh);
          placeModel(group);
        },
        undefined,
        () => {}
      );
    };

    const tryLoadGltf = (url: string) => {
      const gltfLoader = new GLTFLoader();
      gltfLoader.load(
        url,
        (gltf) => placeModel(gltf.scene),
        undefined,
        () => {}
      );
    };

    if (isStl) {
      tryLoadStl(modelUrl);
    } else if (modelUrl.startsWith("blob:")) {
      // blob URL'lerde uzantı olmayabilir, önce GLTF dene, başarısız olursa STL dene
      const gltfLoader = new GLTFLoader();
      gltfLoader.load(
        modelUrl,
        (gltf) => placeModel(gltf.scene),
        undefined,
        () => tryLoadStl(modelUrl)
      );
    } else {
      tryLoadGltf(modelUrl);
    }
  }, [modelUrl, fileType, applyMicronDepth, onMeshStats]);

  // zScaleMm her değiştiğinde mikron derinliğini yeniden uygula
  useEffect(() => {
    applyMicronDepth();
  }, [zScaleMm, applyMicronDepth]);

  return <div ref={mountRef} className="relative h-full w-full overflow-hidden" />;
});
