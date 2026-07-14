"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export type ViewMesh = {
  positions: Float64Array;
  indices: Uint32Array;
  // fine/frame: malzeme tonu · warn/danger: kırılganlık analizi vurgusu
  kind: "fine" | "frame" | "warn" | "danger";
};

type Props = { meshes: ViewMesh[]; material: "ag925" | "au14" };

const COLORS = {
  ag925: { fine: 0xe8e6e2, frame: 0xdcd9d4 },
  au14: { fine: 0xe9c47e, frame: 0xd9b368 },
};

/**
 * Geometri çekirdeği sahnesi — stüdyo görünüm: RoomEnvironment + ACES,
 * exposure 0.95. Geometri motoru float64 mm üretir; GPU'ya inerken float32'ye
 * düşer — bu yalnızca GÖRÜNTÜ katmanıdır, ölçüm raporu float64 kaynaktan gelir.
 */
export function GeometriViewer({ meshes, material }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const fittedRef = useRef(false);
  const camRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;

    let alive = true;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07080a);

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 2000);
    camera.position.set(24, 10, 42);
    camRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
    host.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controlsRef.current = controls;

    const key = new THREE.DirectionalLight(0xfff2e0, 1.1);
    key.position.set(30, 50, 40);
    scene.add(key);

    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;

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
        const m = obj as THREE.Mesh;
        if (m.isMesh && m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
      pmrem.dispose();
      renderer.dispose();
      host.innerHTML = "";
      groupRef.current = null;
      camRef.current = null;
      controlsRef.current = null;
      fittedRef.current = false;
    };
  }, []);

  // içerik değişince sahneyi yeniden kur
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    while (group.children.length) {
      const child = group.children[0] as THREE.Mesh;
      group.remove(child);
      child.geometry?.dispose();
      (child.material as THREE.Material)?.dispose();
    }
    const pal = COLORS[material];
    const mats: Record<ViewMesh["kind"], THREE.MeshStandardMaterial> = {
      fine: new THREE.MeshStandardMaterial({
        color: pal.fine, metalness: 0.95, roughness: 0.28, envMapIntensity: 0.85,
      }),
      frame: new THREE.MeshStandardMaterial({
        color: pal.frame, metalness: 0.95, roughness: 0.38, envMapIntensity: 0.85,
      }),
      warn: new THREE.MeshStandardMaterial({
        color: 0xd08a1f, metalness: 0.5, roughness: 0.45,
        emissive: 0x7a4a00, emissiveIntensity: 0.35, envMapIntensity: 0.5,
      }),
      danger: new THREE.MeshStandardMaterial({
        color: 0xd23c3c, metalness: 0.5, roughness: 0.45,
        emissive: 0x8a1010, emissiveIntensity: 0.45, envMapIntensity: 0.5,
      }),
    };
    for (const m of meshes) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.BufferAttribute(Float32Array.from(m.positions), 3));
      geom.setIndex(new THREE.BufferAttribute(m.indices, 1));
      geom.computeVertexNormals();
      group.add(new THREE.Mesh(geom, mats[m.kind]));
    }
    if (!fittedRef.current && meshes.length && camRef.current && controlsRef.current) {
      fittedRef.current = true;
      const box = new THREE.Box3().setFromObject(group);
      const c = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3()).length();
      controlsRef.current.target.copy(c);
      camRef.current.position.set(c.x + size * 0.15, c.y + size * 0.2, c.z + size * 1.1);
    }
  }, [meshes, material]);

  return <div ref={mountRef} className="relative h-full w-full" />;
}
