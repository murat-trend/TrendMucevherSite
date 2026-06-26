"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { nonManifoldEdgeLines } from "./lib/meshOps";

type Props = {
  geometry: THREE.BufferGeometry | null;
  wireframe: boolean;
  showBadEdges: boolean;
};

export type MeshViewerHandle = {
  /** Modelin kare anlık görüntüsünü (PNG dataURL) döndürür; model yoksa null. */
  capture: (size?: number) => string | null;
};

export const MeshCleanViewer = forwardRef<MeshViewerHandle, Props>(function MeshCleanViewer(
  { geometry, wireframe, showBadEdges }, ref,
) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const edgesRef = useRef<THREE.LineSegments | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  useImperativeHandle(ref, () => ({
    capture: (size = 1100) => {
      const renderer = rendererRef.current, scene = sceneRef.current, camera = cameraRef.current;
      const host = mountRef.current;
      if (!renderer || !scene || !camera || !host || !groupRef.current) return null;
      const prevW = host.clientWidth || 1, prevH = host.clientHeight || 1;
      const edges = edgesRef.current;
      const edgesWasVisible = edges?.visible ?? false;
      try {
        if (edges) edges.visible = false; // satış görseli: yeşil hataları gizle
        renderer.setSize(size, size, false);
        camera.aspect = 1; camera.updateProjectionMatrix();
        renderer.render(scene, camera);
        const url = renderer.domElement.toDataURL("image/png");
        // eski duruma dön
        if (edges) edges.visible = edgesWasVisible;
        renderer.setSize(prevW, prevH, false);
        camera.aspect = prevW / prevH; camera.updateProjectionMatrix();
        renderer.render(scene, camera);
        return url;
      } catch {
        if (edges) edges.visible = edgesWasVisible;
        return null;
      }
    },
  }));

  // Sahne kurulumu
  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;
    let alive = true;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07080a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 5000);
    camera.position.set(0, 0, 4.2);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    rendererRef.current = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const d1 = new THREE.DirectionalLight(0xffffff, 1.7); d1.position.set(4, 6, 5); scene.add(d1);
    const d2 = new THREE.DirectionalLight(0xb76e79, 0.8); d2.position.set(-4, -3, 3); scene.add(d2);

    const applySize = () => {
      const w = host.clientWidth || 1, h = host.clientHeight || 1;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    applySize();
    const ro = new ResizeObserver(applySize); ro.observe(host);

    let frame = 0;
    const animate = () => {
      if (!alive) return;
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      ro.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose()); else mat?.dispose();
      });
      renderer.dispose();
      host.innerHTML = "";
      sceneRef.current = null; controlsRef.current = null;
      groupRef.current = null; meshRef.current = null; edgesRef.current = null;
      rendererRef.current = null; cameraRef.current = null;
    };
  }, []);

  // Geometri değişince güncelle
  useEffect(() => {
    const scene = sceneRef.current;
    const controls = controlsRef.current;
    if (!scene) return;

    // eski grubu temizle
    if (groupRef.current) {
      scene.remove(groupRef.current);
      groupRef.current.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && m.geometry) m.geometry.dispose();
      });
      groupRef.current = null;
    }
    if (!geometry) return;

    const group = new THREE.Group();

    // Ortak transform: model bbox merkezi + ölçek. Hem mesh hem yeşil çizgiler
    // AYNI dönüşümü kullanmalı, yoksa yeşil hatalar model üstüne oturmaz.
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const center = box.getCenter(new THREE.Vector3());
    const sphereR = box.getSize(new THREE.Vector3()).length() / 2 || 1;
    const scale = 2.35 / sphereR;

    const disp = geometry.clone();
    disp.translate(-center.x, -center.y, -center.z);
    disp.scale(scale, scale, scale);
    disp.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0xc4838b, roughness: 0.55, metalness: 0.1, side: THREE.DoubleSide, wireframe,
    });
    const mesh = new THREE.Mesh(disp, mat);
    meshRef.current = mesh;
    group.add(mesh);

    // non-manifold kenarlar — mesh ile BİREBİR aynı transform
    const lines = nonManifoldEdgeLines(geometry);
    if (lines) {
      lines.translate(-center.x, -center.y, -center.z);
      lines.scale(scale, scale, scale);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x00ff66, depthTest: false });
      const seg = new THREE.LineSegments(lines, lineMat);
      seg.renderOrder = 10;
      seg.visible = showBadEdges;
      edgesRef.current = seg;
      group.add(seg);
    } else {
      edgesRef.current = null;
    }

    scene.add(group);
    groupRef.current = group;
    if (controls) { controls.target.set(0, 0, 0); controls.update(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometry]);

  // wireframe / bad-edge görünürlüğü
  useEffect(() => {
    if (meshRef.current) (meshRef.current.material as THREE.MeshStandardMaterial).wireframe = wireframe;
    if (edgesRef.current) edgesRef.current.visible = showBadEdges;
  }, [wireframe, showBadEdges]);

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="absolute inset-0" />
      {!geometry && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-white/30">
          STL yüklenince burada görünecek
        </div>
      )}
    </div>
  );
});
