"use client";

// ZİNCİR 3D önizleme — komple zincir montajı. Suyolu viewer kalıbı
// (Kimi tasarım dili: koyu zemin #0A0A0C ailesi, altın vurgu).
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export type ViewMesh = {
  positions: Float64Array;
  indices: Uint32Array;
  /** S4 çift metal: bu mesh'in madenini genel seçimden ayrı boya */
  maden?: string;
};

const METAL_RENK: Record<string, number> = {
  au8: 0xe3c76f, au14: 0xe9c47e, au18: 0xedc063, au22: 0xf2c14e,
  au14r: 0xdda183, ag925: 0xe8e6e2, pt950: 0xdfe2e6,
};

export function ZincirViewer({ meshes, maden, fitKey }: { meshes: ViewMesh[]; maden: string; fitKey?: string }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const camRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const fittedRef = useRef(false);
  // RAF kısılırsa (arka plan sekmesi) bile mesh güncellemesi anında boyansın
  const renderNowRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;
    let alive = true;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101014);

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 2000);
    camera.position.set(20, 45, 90);
    camRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
    host.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controlsRef.current = controls;

    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(40, 60, 50);
    scene.add(key);
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));

    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;

    const onResize = () => {
      const w = host.clientWidth, h = host.clientHeight;
      renderer.setSize(w, h, false);
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    onResize();
    const ro = new ResizeObserver(onResize);
    ro.observe(host);

    if (process.env.NODE_ENV === "development") {
      (window as unknown as Record<string, unknown>).__zincirDebug = { scene, camera, renderer, group, controls };
    }

    renderNowRef.current = () => {
      controls.update();
      renderer.render(scene, camera);
    };

    let frameId = 0;
    const loop = () => {
      if (!alive) return;
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      alive = false;
      cancelAnimationFrame(frameId);
      ro.disconnect();
      controls.dispose();
      pmrem.dispose();
      renderer.dispose();
      host.removeChild(renderer.domElement);
      renderNowRef.current = null;
      groupRef.current = null;
      camRef.current = null;
      controlsRef.current = null;
      fittedRef.current = false;
    };
  }, []);

  // görünüm değişti (yerde/kolyede): yeni dizilim yeni kadraj ister
  useEffect(() => {
    fittedRef.current = false;
  }, [fitKey]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    while (group.children.length) {
      const child = group.children[0] as THREE.Mesh;
      group.remove(child);
      child.geometry?.dispose();
      (child.material as THREE.Material)?.dispose();
    }
    // flatShading: CSG/traş çıktısında düz yüzler net okunsun (Küba traş
    // yüzeyleri smooth-normal ile "buruşuk" görünüyordu — suyolu dersi)
    const metalMat = (m: string) => new THREE.MeshStandardMaterial({
      color: METAL_RENK[m] ?? 0xe9c47e, metalness: 0.95, roughness: 0.32,
      envMapIntensity: 0.9, flatShading: true,
    });
    for (const m of meshes) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.BufferAttribute(Float32Array.from(m.positions), 3));
      geom.setIndex(new THREE.BufferAttribute(m.indices, 1));
      geom.computeVertexNormals();
      group.add(new THREE.Mesh(geom, metalMat(m.maden ?? maden)));
    }
    if (!fittedRef.current && meshes.length && camRef.current && controlsRef.current) {
      fittedRef.current = true;
      const box = new THREE.Box3().setFromObject(group);
      const c = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3()).length();
      controlsRef.current.target.copy(c);
      camRef.current.position.set(c.x + size * 0.2, c.y + size * 0.55, c.z + size * 0.95);
    }
    renderNowRef.current?.();
  }, [meshes, maden]);

  return <div ref={mountRef} className="absolute inset-0" />;
}
