"use client";

import React, { forwardRef, useEffect, useRef, useCallback, useImperativeHandle, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

export type MeshStats = { vertices: number; faces: number };
export type PivotMode = "bottom" | "center" | "top";

type MeshRealtimeViewerProps = {
  modelUrl?: string | null;
  fileName?: string | null;
  fileType?: "stl" | "glb" | "auto";
  autoRotate?: boolean;
  showGrid?: boolean;
  onMeshStats?: (stats: MeshStats) => void;
  preserveDrawingBuffer?: boolean;
  pivotMode?: PivotMode;
};

export type MeshRealtimeViewerHandle = {
  getCanvas: () => HTMLCanvasElement | null;
  resetCamera: () => void;
  exportModel: (format: "stl" | "obj") => void;
  setGridVisible: (visible: boolean) => void;
  setRotation: (rotation: { x: number; y: number; z: number }) => void; // Hatanın çözümü
};

const MeshRealtimeViewerInternal = forwardRef<MeshRealtimeViewerHandle, MeshRealtimeViewerProps>(
  ({ modelUrl, fileName, fileType = "auto", autoRotate = false, showGrid = true, onMeshStats, preserveDrawingBuffer = false, pivotMode = "bottom" }, ref) => {
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

    const tuneMaterialForDisplay = useCallback((mat: any) => {
      if (!mat) return;
      const materials = Array.isArray(mat) ? mat : [mat];
      materials.forEach((m) => {
        if (m instanceof THREE.MeshStandardMaterial) {
          m.roughness = 0.4;
          m.metalness = 0.3;
          m.side = THREE.DoubleSide;
        }
      });
    }, []);

    const fitCameraForAspect = useCallback((w: number, h: number) => {
      if (!cameraRef.current || !pivotRef.current) return;
      const camera = cameraRef.current;
      const box = new THREE.Box3().setFromObject(pivotRef.current);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;
      camera.position.set(cameraZ, cameraZ, cameraZ);
      const center = new THREE.Vector3(0, modelTargetYRef.current, 0);
      camera.lookAt(center);
      if (controlsRef.current) {
        controlsRef.current.target.copy(center);
        controlsRef.current.update();
      }
    }, []);

    useImperativeHandle(ref, () => ({
      getCanvas: () => rendererRef.current?.domElement || null,
      resetCamera: () => fitCameraForAspect(mountRef.current?.clientWidth || 800, mountRef.current?.clientHeight || 600),
      exportModel: (format) => {
        if (!modelRootRef.current) return;
        const exporter = format === "stl" ? new STLExporter() : new OBJExporter();
        const data = exporter.parse(modelRootRef.current);
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([data as any], { type: "text/plain" }));
        link.download = `export.${format}`;
        link.click();
      },
      setGridVisible: (visible) => { if (gridRef.current) gridRef.current.visible = visible; },
      setRotation: (rot) => { if (pivotRef.current) pivotRef.current.rotation.set(rot.x, rot.y, rot.z); } // Bu satır page.tsx hatasını çözer
    }), [fitCameraForAspect]);

    useEffect(() => {
      if (!mountRef.current) return;
      const scene = new THREE.Scene(); sceneRef.current = scene;
      const camera = new THREE.PerspectiveCamera(45, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 5000); cameraRef.current = camera;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer });
      renderer.setPixelRatio(window.devicePixelRatio); renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      mountRef.current.appendChild(renderer.domElement); rendererRef.current = renderer;
      const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controlsRef.current = controls;
      scene.add(new THREE.AmbientLight(0xffffff, 0.8));
      const dirLight = new THREE.DirectionalLight(0xffffff, 1.2); dirLight.position.set(100, 200, 100); scene.add(dirLight);
      const grid = new THREE.GridHelper(10, 20, 0x444444, 0x222222); scene.add(grid); gridRef.current = grid; grid.visible = showGrid;
      const animate = () => { requestAnimationFrame(animate); controls.update(); if (autoRotate && pivotRef.current) pivotRef.current.rotation.y += 0.005; renderer.render(scene, camera); };
      animate();
      return () => { renderer.dispose(); if (mountRef.current) mountRef.current.innerHTML = ""; };
    }, [preserveDrawingBuffer, autoRotate, showGrid]);

    useEffect(() => {
      if (!sceneRef.current || !modelUrl) return;
      if (pivotRef.current) sceneRef.current.remove(pivotRef.current);
      const placeModel = (loadedRoot: THREE.Object3D) => {
        setIsLoading(false);
        const box = new THREE.Box3().setFromObject(loadedRoot);
        const size = box.getSize(new THREE.Vector3());
        const pivotY = pivotMode === "top" ? box.max.y : pivotMode === "center" ? (box.min.y + box.max.y) / 2 : box.min.y;
        loadedRoot.position.set(-((box.min.x + box.max.x) / 2), -pivotY, -((box.min.z + box.max.z) / 2));
        loadedRoot.traverse((c) => { if ((c as THREE.Mesh).isMesh) tuneMaterialForDisplay((c as THREE.Mesh).material); });
        const pivot = new THREE.Group(); pivot.scale.setScalar(1.8 / Math.max(size.x, size.y, size.z, 0.01));
        const og = new THREE.Group(); og.add(loadedRoot); pivot.add(og); sceneRef.current!.add(pivot);
        pivotRef.current = pivot; modelRootRef.current = pivot; orientationGroupRef.current = og;
        pivot.updateMatrixWorld(true); const wb = new THREE.Box3().setFromObject(pivot); modelTargetYRef.current = (wb.max.y - wb.min.y) * 0.5;
        fitCameraForAspect(mountRef.current?.clientWidth || 800, mountRef.current?.clientHeight || 600);
        if (onMeshStats) {
          let v = 0, f = 0; pivot.traverse((c) => { const m = c as THREE.Mesh; if (m.isMesh && m.geometry) { const p = m.geometry.getAttribute("position"); if (p) v += p.count; f += m.geometry.index ? m.geometry.index.count / 3 : p ? p.count / 3 : 0; } });
          onMeshStats({ vertices: Math.round(v), faces: Math.round(f) });
        }
      };
      setIsLoading(true);
      const isStl = (fileName || modelUrl).toLowerCase().endsWith(".stl") || fileType === "stl";
      if (isStl) {
        new STLLoader().load(modelUrl, (geo) => { geo.computeVertexNormals(); geo.center(); const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xcccccc })); mesh.rotation.x = -Math.PI / 2; const g = new THREE.Group(); g.add(mesh); placeModel(g); });
      } else {
        const draco = new DRACOLoader(); draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
        const gltf = new GLTFLoader(); gltf.setDRACOLoader(draco);
        gltf.load(modelUrl, (res) => { draco.dispose(); placeModel(res.scene); });
      }
    }, [modelUrl, fileName, fileType, pivotMode, tuneMaterialForDisplay, fitCameraForAspect, onMeshStats]);

    return <div ref={mountRef} className="relative w-full h-full bg-transparent">{isLoading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10 backdrop-blur-sm"><div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" /></div>}</div>;
  }
);

MeshRealtimeViewerInternal.displayName = "MeshRealtimeViewer";
export const MeshRealtimeViewer = MeshRealtimeViewerInternal;