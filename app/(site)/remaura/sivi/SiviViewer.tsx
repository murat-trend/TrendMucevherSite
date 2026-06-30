"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { IndexedMesh } from "@/lib/remaura/sivi";

/** Sıvı dökümünün 3B önizlemesi — raw three + OrbitControls (mesh-temizle ile aynı yaklaşım). */
export function SiviViewer({ mesh, wireframe }: { mesh: IndexedMesh | null; wireframe: boolean }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const matRef = useRef<THREE.MeshStandardMaterial | null>(null);

  // sahne kurulumu (bir kez)
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#07080a");
    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 5000);
    camera.position.set(0, 0, 120);
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(1, 1.5, 2);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xb76e79, 0.8);
    fill.position.set(-2, -1, -1);
    scene.add(fill);
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    const mat = new THREE.MeshStandardMaterial({ color: 0xc9a88a, metalness: 0.35, roughness: 0.45, side: THREE.DoubleSide });
    matRef.current = mat;

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;

    let raf = 0;
    const loop = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();

    const resize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, []);

  // mesh değişince yeniden kur
  useEffect(() => {
    const scene = sceneRef.current, camera = cameraRef.current, controls = controlsRef.current;
    if (!scene || !camera || !controls) return;

    if (meshRef.current) {
      scene.remove(meshRef.current);
      meshRef.current.geometry.dispose();
      meshRef.current = null;
    }
    if (!mesh) return;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(mesh.positions, 3));
    geo.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    const box = geo.boundingBox!;
    const center = new THREE.Vector3();
    box.getCenter(center);
    geo.translate(-center.x, -center.y, -center.z);

    const m = new THREE.Mesh(geo, matRef.current!);
    scene.add(m);
    meshRef.current = m;

    // kamerayı sığdır
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const dist = maxDim * 2.4;
    camera.position.set(dist * 0.4, dist * 0.3, dist);
    camera.near = maxDim / 100;
    camera.far = maxDim * 100;
    camera.updateProjectionMatrix();
    controls.target.set(0, 0, 0);
    controls.update();
  }, [mesh]);

  useEffect(() => {
    if (matRef.current) matRef.current.wireframe = wireframe;
  }, [wireframe]);

  return <div ref={mountRef} className="h-full w-full" />;
}
