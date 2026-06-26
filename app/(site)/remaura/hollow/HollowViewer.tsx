"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

type Props = {
  file: File | null;
  wallThickness: number;
  showOuter: boolean;
  showInner: boolean;
  ghost: boolean;
  onLog?: (msg: string) => void;
};

/**
 * İç boşaltma sahnesi:
 *  - Dış model: kırmızı şeffaf "hayalet"
 *  - İç çekirdek: altın katı (vertex normal offset, client-side anlık hesap)
 * Kalınlık değişince iç çekirdek server'a gitmeden yeniden hesaplanır.
 */
export function HollowViewer({ file, wallThickness, showOuter, showInner, ghost, onLog }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // Yüklenen orijinal geometri (mm uzayında) — iç çekirdeği bundan türetiriz
  const baseGeomRef = useRef<THREE.BufferGeometry | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const outerMeshRef = useRef<THREE.Mesh | null>(null);
  const innerMeshRef = useRef<THREE.Mesh | null>(null);

  const logRef = useRef(onLog);
  logRef.current = onLog;

  // --- Sahne kurulumu (bir kez) -------------------------------------------
  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;

    let alive = true;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05060a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 5000);
    camera.position.set(2.2, 1.6, 2.6);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.4;
    controls.maxDistance = 40;
    controlsRef.current = controls;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.0));
    const key = new THREE.DirectionalLight(0xfff4e8, 1.6);
    key.position.set(5, 8, 6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xa8c8ff, 0.5);
    fill.position.set(-5, 2, -4);
    scene.add(fill);

    // Izgara + eksenler (sahnede konum referansı)
    const grid = new THREE.GridHelper(8, 16, 0x334155, 0x1e293b);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.35;
    scene.add(grid);
    scene.add(new THREE.AxesHelper(1.2));

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
      baseGeomRef.current?.dispose();
      scene.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.isMesh && m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
      renderer.dispose();
      host.innerHTML = "";
      sceneRef.current = null;
      controlsRef.current = null;
      groupRef.current = null;
      outerMeshRef.current = null;
      innerMeshRef.current = null;
      baseGeomRef.current = null;
    };
  }, []);

  // --- Dosya yüklenince: STL'i oku, dış + iç mesh oluştur -----------------
  useEffect(() => {
    const scene = sceneRef.current;
    const controls = controlsRef.current;
    if (!scene || !file) return;

    let cancelled = false;

    // Önceki grubu temizle
    if (groupRef.current) {
      scene.remove(groupRef.current);
      groupRef.current.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.isMesh && m.geometry) m.geometry.dispose();
      });
      groupRef.current = null;
    }
    baseGeomRef.current?.dispose();
    baseGeomRef.current = null;

    const reader = new FileReader();
    reader.onload = (e) => {
      if (cancelled) return;
      try {
        const buf = e.target?.result as ArrayBuffer;
        const geometry = new STLLoader().parse(buf);
        geometry.computeVertexNormals();
        baseGeomRef.current = geometry.clone();

        const group = new THREE.Group();

        // Dış: kırmızı şeffaf hayalet
        const outerMat = new THREE.MeshPhysicalMaterial({
          color: 0xff3b3b,
          transparent: true,
          opacity: 0.22,
          side: THREE.DoubleSide,
          depthWrite: false,
          roughness: 0.15,
          metalness: 0.1,
        });
        const outer = new THREE.Mesh(geometry, outerMat);
        outerMeshRef.current = outer;
        group.add(outer);

        // İç: altın katı (geometri buildInner ile dolar)
        const innerMat = new THREE.MeshStandardMaterial({
          color: 0xe4b56f,
          roughness: 0.3,
          metalness: 0.7,
          side: THREE.DoubleSide,
        });
        const inner = new THREE.Mesh(new THREE.BufferGeometry(), innerMat);
        innerMeshRef.current = inner;
        group.add(inner);

        scene.add(group);
        groupRef.current = group;

        // Ölçekle + ortala (model mm uzayında olabilir)
        group.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(outer);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
        const scl = 2.0 / maxDim;
        group.scale.setScalar(scl);
        const center = box.getCenter(new THREE.Vector3()).multiplyScalar(scl);
        group.position.set(-center.x, -center.y, -center.z);
        group.updateMatrixWorld(true);

        if (controls) {
          controls.target.set(0, 0, 0);
          controls.update();
        }

        buildInner(wallThickness);
        logRef.current?.(
          `Model yüklendi · ${geometry.attributes.position.count.toLocaleString()} vertex · ` +
          `${(size.x).toFixed(1)}×${(size.y).toFixed(1)}×${(size.z).toFixed(1)} mm`
        );
      } catch (err) {
        logRef.current?.(`HATA: STL okunamadı — ${(err as Error).message}`);
      }
    };
    reader.readAsArrayBuffer(file);

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // --- İç çekirdeği (vertex normal offset) hesapla -------------------------
  function buildInner(thickness: number) {
    const base = baseGeomRef.current;
    const inner = innerMeshRef.current;
    if (!base || !inner) return;

    const pos = base.attributes.position.array as Float32Array;
    const nrm = base.attributes.normal.array as Float32Array;
    const innerPos = new Float32Array(pos.length);
    for (let i = 0; i < pos.length; i += 3) {
      innerPos[i] = pos[i] - nrm[i] * thickness;
      innerPos[i + 1] = pos[i + 1] - nrm[i + 1] * thickness;
      innerPos[i + 2] = pos[i + 2] - nrm[i + 2] * thickness;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(innerPos, 3));
    if (base.index) g.setIndex(base.index.clone());
    g.computeVertexNormals();

    inner.geometry.dispose();
    inner.geometry = g;
  }

  // --- Kalınlık değişince iç çekirdeği güncelle ---------------------------
  useEffect(() => {
    buildInner(wallThickness);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallThickness]);

  // --- Görünürlük / hayalet modu -----------------------------------------
  useEffect(() => {
    const outer = outerMeshRef.current;
    const inner = innerMeshRef.current;
    if (outer) {
      outer.visible = showOuter;
      const mat = outer.material as THREE.MeshPhysicalMaterial;
      mat.opacity = ghost ? 0.22 : 0.9;
      mat.depthWrite = !ghost;
      mat.needsUpdate = true;
    }
    if (inner) inner.visible = showInner;
  }, [showOuter, showInner, ghost]);

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="absolute inset-0" />
      {!file && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-white/30">
          Model yüklenince sahnede görünecek
        </div>
      )}
    </div>
  );
}
