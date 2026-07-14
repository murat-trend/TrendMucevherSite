"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export type ViewMesh = {
  positions: Float64Array;
  indices: Uint32Array;
  // fine/frame: malzeme tonu · warn/danger: kırılganlık analizi vurgusu
  kind: "fine" | "frame" | "warn" | "danger";
  /** parça kimliği (düzenleme): aynı kaynak tele ait mesh'ler aynı anahtarı taşır */
  partKey?: string;
};

type Props = {
  meshes: ViewMesh[];
  material: "ag925" | "au14";
  /** düzenleme modu: parça seçimi + taşıma gizmosu etkin */
  editMode?: boolean;
  selectedKey?: string | null;
  onPick?: (key: string | null) => void;
  /** gizmo bırakılınca: seçili parçanın taşınma deltası (mm) */
  onMoveCommit?: (key: string, delta: [number, number, number]) => void;
};

const COLORS = {
  ag925: { fine: 0xe8e6e2, frame: 0xdcd9d4 },
  au14: { fine: 0xe9c47e, frame: 0xd9b368 },
};
const SEL_EMISSIVE = 0xb76e79;

export function GeometriViewer({ meshes, material, editMode, selectedKey, onPick, onMoveCommit }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const fittedRef = useRef(false);
  const camRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const gizmoRef = useRef<TransformControls | null>(null);
  const handleRef = useRef<THREE.Object3D | null>(null);
  const handleBaseRef = useRef(new THREE.Vector3());
  const onPickRef = useRef(onPick);
  const onMoveRef = useRef(onMoveCommit);
  const selectedRef = useRef<string | null>(null);
  const editRef = useRef(!!editMode);
  onPickRef.current = onPick;
  onMoveRef.current = onMoveCommit;
  selectedRef.current = selectedKey ?? null;
  editRef.current = !!editMode;

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

    // taşıma gizmosu (seçim olunca handle'a bağlanır)
    const handle = new THREE.Object3D();
    scene.add(handle);
    handleRef.current = handle;
    const gizmo = new TransformControls(camera, renderer.domElement);
    gizmo.setMode("translate");
    gizmo.setSize(0.8);
    scene.add(gizmo.getHelper());
    gizmoRef.current = gizmo;
    gizmo.addEventListener("dragging-changed", (e) => {
      const dragging = (e as unknown as { value: boolean }).value;
      controls.enabled = !dragging;
      if (!dragging) {
        // bırakıldı -> taşımayı reçeteye işle
        const delta = handle.position.clone().sub(handleBaseRef.current);
        if (delta.length() > 1e-6 && selectedRef.current) {
          onMoveRef.current?.(selectedRef.current, [delta.x, delta.y, delta.z]);
        }
      }
    });
    gizmo.addEventListener("objectChange", () => {
      const delta = handle.position.clone().sub(handleBaseRef.current);
      const g = groupRef.current;
      if (!g) return;
      for (const child of g.children) {
        const m = child as THREE.Mesh;
        if (m.userData.partKey && m.userData.partKey === selectedRef.current) m.position.copy(delta);
      }
    });

    // tıkla-seç (sürükleme değil, kısa tıklama)
    const ray = new THREE.Raycaster();
    let downX = 0, downY = 0;
    const onDown = (ev: PointerEvent) => { downX = ev.clientX; downY = ev.clientY; };
    const onUp = (ev: PointerEvent) => {
      if (!editRef.current || !onPickRef.current) return;
      if (gizmo.dragging) return;
      if (Math.hypot(ev.clientX - downX, ev.clientY - downY) > 5) return; // orbit sürüklemesi
      const r = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((ev.clientX - r.left) / r.width) * 2 - 1,
        -((ev.clientY - r.top) / r.height) * 2 + 1,
      );
      ray.setFromCamera(ndc, camera);
      const g = groupRef.current;
      if (!g) return;
      const hits = ray.intersectObjects(g.children, false);
      const hit = hits.find((h) => (h.object as THREE.Mesh).userData.partKey);
      onPickRef.current(hit ? (hit.object as THREE.Mesh).userData.partKey : null);
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);

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
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      gizmo.detach();
      gizmo.dispose();
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
      gizmoRef.current = null;
      handleRef.current = null;
      fittedRef.current = false;
    };
  }, []);

  // içerik değişince sahneyi yeniden kur
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    gizmoRef.current?.detach();
    while (group.children.length) {
      const child = group.children[0] as THREE.Mesh;
      group.remove(child);
      child.geometry?.dispose();
      (child.material as THREE.Material)?.dispose();
    }
    const pal = COLORS[material];
    const matDef: Record<ViewMesh["kind"], () => THREE.MeshStandardMaterial> = {
      fine: () => new THREE.MeshStandardMaterial({
        color: pal.fine, metalness: 0.95, roughness: 0.28, envMapIntensity: 0.85,
      }),
      frame: () => new THREE.MeshStandardMaterial({
        color: pal.frame, metalness: 0.95, roughness: 0.38, envMapIntensity: 0.85,
      }),
      warn: () => new THREE.MeshStandardMaterial({
        color: 0xd08a1f, metalness: 0.5, roughness: 0.45,
        emissive: 0x7a4a00, emissiveIntensity: 0.35, envMapIntensity: 0.5,
      }),
      danger: () => new THREE.MeshStandardMaterial({
        color: 0xd23c3c, metalness: 0.5, roughness: 0.45,
        emissive: 0x8a1010, emissiveIntensity: 0.45, envMapIntensity: 0.5,
      }),
    };
    for (const m of meshes) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.BufferAttribute(Float32Array.from(m.positions), 3));
      geom.setIndex(new THREE.BufferAttribute(m.indices, 1));
      geom.computeVertexNormals();
      const mesh = new THREE.Mesh(geom, matDef[m.kind]());
      mesh.userData.partKey = m.partKey ?? null;
      group.add(mesh);
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

  // seçim vurgusu + gizmo bağlama (mesh listesi her değiştiğinde de tazelenir)
  useEffect(() => {
    /* eslint-disable react-hooks/immutability -- three.js sahne/materyal nesneleri imperatif API ile güncellenir */
    const group = groupRef.current;
    const gizmo = gizmoRef.current;
    const handle = handleRef.current;
    if (!group || !gizmo || !handle) return;
    const selMeshes: THREE.Mesh[] = [];
    for (const child of group.children) {
      const m = child as THREE.Mesh;
      m.position.set(0, 0, 0);
      const mat = m.material as THREE.MeshStandardMaterial;
      const isSel = !!selectedKey && m.userData.partKey === selectedKey;
      if (isSel) {
        mat.emissive = new THREE.Color(SEL_EMISSIVE);
        mat.emissiveIntensity = 0.5;
        selMeshes.push(m);
      } else if (m.userData.partKey && (mat.emissive?.getHex() === SEL_EMISSIVE)) {
        mat.emissive = new THREE.Color(0x000000);
        mat.emissiveIntensity = 0;
      }
    }
    const box = new THREE.Box3();
    selMeshes.forEach((m) => box.expandByObject(m));
    if (editMode && selMeshes.length) {
      const c = box.getCenter(new THREE.Vector3());
      handle.position.copy(c);
      handleBaseRef.current.copy(c);
      gizmo.attach(handle);
    } else {
      gizmo.detach();
    }
    /* eslint-enable react-hooks/immutability */
  }, [selectedKey, meshes, editMode]);

  return <div ref={mountRef} className="relative h-full w-full" />;
}
