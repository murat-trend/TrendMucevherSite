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

// mat inceleme tonları: maden ayrımı korunur ama parlaklık yok (form önce).
// Değerler EKRAN ÖLÇÜMÜYLE kalibre edildi (hedef: aydınlık yüz ~160 sRGB —
// orta gri; 2026-07-17 piksel örneklemesi. Işık/tonemap değişirse yeniden ölç)
const MAT_RENK: Record<string, number> = {
  au8: 0x6e6242, au14: 0x706344, au18: 0x73633b, au22: 0x766536,
  au14r: 0x6e5a4e, ag925: 0x74716c, pt950: 0x6f7275,
};

export type ViewerMod = "mat" | "metal";

export function ZincirViewer({ meshes, maden, fitKey, mod = "mat" }: {
  meshes: ViewMesh[]; maden: string; fitKey?: string;
  /** mat = inceleme (form okunur, varsayılan — Murat 2026-07-17: "parladığı
   *  için görünmüyor"); metal = sunum önizlemesi (kısılmış parlaklık) */
  mod?: ViewerMod;
}) {
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

    // ışık kısık tutulur — parlama formu yutuyordu (Murat, 2026-07-17);
    // ana ışık + zıt dolgu: kavisler iki yönden okunur
    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(40, 60, 50);
    scene.add(key);
    const dolgu = new THREE.DirectionalLight(0xffffff, 0.3);
    dolgu.position.set(-30, -20, -40);
    scene.add(dolgu);
    scene.add(new THREE.AmbientLight(0xffffff, 0.22));

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
    // mat: form-okuma malzemesi (kil/inceleme); metal: kısılmış sunum
    const malzeme = (m: string) => mod === "mat"
      ? new THREE.MeshStandardMaterial({
          // envMapIntensity 0: oda IBL'i mat modda beyaza yıkıyordu — form
          // yalnız yönlü ışık gölgelemesiyle okunur (kil görünümü)
          color: MAT_RENK[m] ?? 0x94918c, metalness: 0.0, roughness: 0.9,
          envMapIntensity: 0, flatShading: true,
        })
      : new THREE.MeshStandardMaterial({
          color: METAL_RENK[m] ?? 0xe9c47e, metalness: 0.9, roughness: 0.45,
          envMapIntensity: 0.45, flatShading: true,
        });
    for (const m of meshes) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.BufferAttribute(Float32Array.from(m.positions), 3));
      geom.setIndex(new THREE.BufferAttribute(m.indices, 1));
      geom.computeVertexNormals();
      group.add(new THREE.Mesh(geom, malzeme(m.maden ?? maden)));
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
  }, [meshes, maden, mod]);

  return <div ref={mountRef} className="absolute inset-0" />;
}
