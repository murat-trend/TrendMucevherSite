"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

function loaderUrlForFetch(modelUrl: string): string {
  if (modelUrl.startsWith("blob:") || modelUrl.startsWith("/")) return modelUrl;
  if (/^https?:\/\//i.test(modelUrl)) {
    return `/api/fetch-media?url=${encodeURIComponent(modelUrl)}`;
  }
  return modelUrl;
}

export function ModellerStlPreview({ stlUrl }: { stlUrl: string }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRootRef = useRef<THREE.Object3D | null>(null);

  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;

    let alive = true;
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 5000);
    camera.position.set(0, 1.1, 2.8);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x111111, 1);
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
    host.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.4;
    controls.minDistance = 0.2;
    controls.maxDistance = 40;
    controlsRef.current = controls;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.0));
    const key = new THREE.DirectionalLight(0xfff4e8, 1.5);
    key.position.set(4, 8, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xa8c8ff, 0.55);
    fill.position.set(-4, 3, -4);
    scene.add(fill);

    const applySize = () => {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    applySize();

    const ro = new ResizeObserver(applySize);
    ro.observe(host);

    let frameId = 0;
    const animate = () => {
      if (!alive) return;
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      alive = false;
      cancelAnimationFrame(frameId);
      ro.disconnect();
      controls.dispose();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh && mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      });
      renderer.dispose();
      host.innerHTML = "";
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
      modelRootRef.current = null;
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    const controls = controlsRef.current;
    if (!scene || !stlUrl) return;

    if (modelRootRef.current) {
      scene.remove(modelRootRef.current);
      modelRootRef.current.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh && mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      });
      modelRootRef.current = null;
    }

    const url = loaderUrlForFetch(stlUrl);
    const loader = new STLLoader();
    loader.load(
      url,
      (geometry) => {
        geometry.computeVertexNormals();
        const material = new THREE.MeshStandardMaterial({
          color: 0xc9a84c,
          metalness: 0.35,
          roughness: 0.45,
          flatShading: false,
        });
        const mesh = new THREE.Mesh(geometry, material);
        const group = new THREE.Group();
        group.add(mesh);

        group.position.set(0, 0, 0);
        group.scale.set(1, 1, 1);
        scene.add(group);
        group.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(group);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
        const scl = 1.7 / maxDim;
        group.scale.setScalar(scl);
        group.updateMatrixWorld(true);

        const b2 = new THREE.Box3().setFromObject(group);
        const c = b2.getCenter(new THREE.Vector3());
        group.position.x = -c.x;
        group.position.z = -c.z;
        group.position.y = -b2.min.y;
        group.updateMatrixWorld(true);

        modelRootRef.current = group;

        if (controls) {
          const fh = b2.max.y - b2.min.y;
          controls.target.set(0, fh * 0.5, 0);
          controls.update();
        }
      },
      undefined,
      () => {
        // Sessiz: üst sayfa metni zaten GLB/STL akışını anlatıyor
      },
    );
  }, [stlUrl]);

  return <div ref={mountRef} className="h-full w-full min-h-[200px]" />;
}
