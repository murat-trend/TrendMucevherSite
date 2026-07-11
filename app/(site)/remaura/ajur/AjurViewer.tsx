"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { MeshBVH, acceleratedRaycast } from "three-mesh-bvh";
import type { HolePlacement } from "./lib/applyAjur";

// ---------------------------------------------------------------------------
// Ajur Viewer (yeniden yapım — PRD §4/§9)
//   - vertex-color maske overlay (gül = güvenli bölge, kırmızı = ince et)
//   - fırça modu: BVH hızlandırmalı raycast ile maske boya/sil
//   - kesit görünümü (clipping plane + slider değeri client'tan)
//   - delik önizleme: ucuz instanced disk overlay (boolean'dan önce)
// Geometri GERÇEK mm koordinatlarında gösterilir (kamera fit) — fırça ve
// önizleme dünyası motorla birebir aynı.
// ---------------------------------------------------------------------------

export type ViewerMode = "orbit" | "brush-add" | "brush-remove";

type Clip = { enabled: boolean; axis: 0 | 1 | 2; position: number };

type Props = {
  geometry: THREE.BufferGeometry | null;
  bvh: MeshBVH | null;
  mode: ViewerMode;
  brushRadius: number;
  /** maske değişince artan sayaç — renkleri yeniden boyar */
  mask: Uint8Array | null;
  maskVersion: number;
  /** ince et vertexleri (kırmızı) */
  thinVerts: Uint32Array | null;
  clip: Clip;
  /** ucuz delik önizlemesi */
  holePreview: HolePlacement[] | null;
  /** fırça değdi — client maskeyi günceller */
  onPaint?: (center: THREE.Vector3) => void;
};

const COL_BASE = new THREE.Color(0xbfb9b6);   // nötr metal grisi
const COL_MASK = new THREE.Color(0xb76e79);   // gül — güvenli bölge
const COL_THIN = new THREE.Color(0xe23b3b);   // kırmızı — ince et

export function AjurViewer({
  geometry, bvh, mode, brushRadius, mask, maskVersion, thinVerts, clip, holePreview, onPaint,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const matRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const previewRef = useRef<THREE.InstancedMesh | null>(null);
  const cursorRef = useRef<THREE.Mesh | null>(null);
  const planeRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(1, 0, 0), 0));
  const raycasterRef = useRef(new THREE.Raycaster());
  const paintingRef = useRef(false);
  const modeRef = useRef<ViewerMode>(mode);
  const radiusRef = useRef(brushRadius);
  const onPaintRef = useRef(onPaint);
  modeRef.current = mode;
  radiusRef.current = brushRadius;
  onPaintRef.current = onPaint;

  // ---- sahne ----
  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;
    let alive = true;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07080a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10_000);
    camera.position.set(0, 0, 60);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.localClippingEnabled = true;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none";
    host.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const d1 = new THREE.DirectionalLight(0xffffff, 1.6); d1.position.set(4, 6, 5); scene.add(d1);
    const d2 = new THREE.DirectionalLight(0xb76e79, 0.7); d2.position.set(-4, -3, 3); scene.add(d2);

    // fırça imleci
    const cursor = new THREE.Mesh(
      new THREE.SphereGeometry(1, 20, 14),
      new THREE.MeshBasicMaterial({ color: 0xb76e79, transparent: true, opacity: 0.28, depthWrite: false }),
    );
    cursor.visible = false;
    scene.add(cursor);
    cursorRef.current = cursor;

    const applySize = () => {
      const w = host.clientWidth || 1, h = host.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    applySize();
    const ro = new ResizeObserver(applySize);
    ro.observe(host);

    // ---- fırça pointer akışı ----
    const ndc = new THREE.Vector2();
    const pick = (ev: PointerEvent): THREE.Vector3 | null => {
      const mesh = meshRef.current;
      if (!mesh) return null;
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -(((ev.clientY - r.top) / r.height) * 2 - 1));
      raycasterRef.current.setFromCamera(ndc, camera);
      const hits = raycasterRef.current.intersectObject(mesh, false);
      return hits.length ? hits[0].point : null;
    };
    const onDown = (ev: PointerEvent) => {
      if (modeRef.current === "orbit") return;
      const p = pick(ev);
      if (!p) return;
      paintingRef.current = true;
      controls.enabled = false;
      onPaintRef.current?.(p);
    };
    const onMove = (ev: PointerEvent) => {
      if (modeRef.current === "orbit") { if (cursorRef.current) cursorRef.current.visible = false; return; }
      const p = pick(ev);
      const c = cursorRef.current;
      if (c) {
        c.visible = !!p;
        if (p) {
          c.position.copy(p);
          c.scale.setScalar(radiusRef.current);
        }
      }
      if (paintingRef.current && p) onPaintRef.current?.(p);
    };
    const onUp = () => {
      paintingRef.current = false;
      controls.enabled = true;
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

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
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      controls.dispose();
      // client'ın geometrisine DOKUNMA — sadece viewer'ın kendi kaynakları
      cursor.geometry.dispose();
      (cursor.material as THREE.Material).dispose();
      previewRef.current?.geometry.dispose();
      (previewRef.current?.material as THREE.Material | undefined)?.dispose();
      matRef.current?.dispose();
      renderer.dispose();
      host.innerHTML = "";
      sceneRef.current = null; cameraRef.current = null; controlsRef.current = null;
      rendererRef.current = null; meshRef.current = null; matRef.current = null;
      previewRef.current = null; cursorRef.current = null;
    };
  }, []);

  // ---- geometri değişimi: mesh kur + kamera fit ----
  useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!scene || !camera || !controls) return;

    if (meshRef.current) {
      scene.remove(meshRef.current);
      matRef.current?.dispose();
      meshRef.current = null;
      matRef.current = null;
    }
    if (!geometry) return;

    // BVH hızlandırmalı raycast (fırça 250K'da akıcı kalsın)
    if (bvh) {
      (geometry as unknown as { boundsTree?: MeshBVH }).boundsTree = bvh;
    }

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      color: 0xffffff,
      roughness: 0.5,
      metalness: 0.35,
      side: THREE.DoubleSide,
      clippingPlanes: [],
    });
    matRef.current = mat;

    const mesh = new THREE.Mesh(geometry, mat);
    mesh.raycast = acceleratedRaycast as typeof mesh.raycast;
    scene.add(mesh);
    meshRef.current = mesh;

    // kamera fit — gerçek mm koordinatları
    geometry.computeBoundingBox();
    const bb = geometry.boundingBox!;
    const center = bb.getCenter(new THREE.Vector3());
    const radius = bb.getSize(new THREE.Vector3()).length() / 2 || 1;
    camera.near = radius / 100;
    camera.far = radius * 40;
    camera.position.copy(center).add(new THREE.Vector3(radius * 0.9, radius * 0.7, radius * 1.9));
    camera.updateProjectionMatrix();
    controls.target.copy(center);
    controls.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometry, bvh]);

  // ---- vertex renkleri: taban + maske + ince et ----
  useEffect(() => {
    if (!geometry) return;
    const n = geometry.attributes.position.count;
    let colorAttr = geometry.attributes.color as THREE.BufferAttribute | undefined;
    if (!colorAttr || colorAttr.count !== n) {
      colorAttr = new THREE.BufferAttribute(new Float32Array(n * 3), 3);
      geometry.setAttribute("color", colorAttr);
    }
    const arr = colorAttr.array as Float32Array;
    for (let i = 0; i < n; i += 1) {
      const c = mask && mask[i] ? COL_MASK : COL_BASE;
      arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b;
    }
    if (thinVerts) {
      for (let k = 0; k < thinVerts.length; k += 1) {
        const i = thinVerts[k];
        arr[i * 3] = COL_THIN.r; arr[i * 3 + 1] = COL_THIN.g; arr[i * 3 + 2] = COL_THIN.b;
      }
    }
    colorAttr.needsUpdate = true;
  }, [geometry, mask, maskVersion, thinVerts]);

  // ---- kesit (clipping plane) ----
  useEffect(() => {
    const mat = matRef.current;
    if (!mat || !geometry) return;
    if (!clip.enabled) {
      mat.clippingPlanes = [];
      mat.needsUpdate = true;
      return;
    }
    geometry.computeBoundingBox();
    const bb = geometry.boundingBox!;
    const lo = bb.min.getComponent(clip.axis);
    const hi = bb.max.getComponent(clip.axis);
    const px = lo + (hi - lo) * clip.position;
    const plane = planeRef.current;
    plane.normal.set(0, 0, 0).setComponent(clip.axis, -1);
    plane.constant = px;
    mat.clippingPlanes = [plane];
    mat.needsUpdate = true;
  }, [clip, geometry]);

  // ---- delik önizleme (instanced diskler) ----
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (previewRef.current) {
      scene.remove(previewRef.current);
      previewRef.current.geometry.dispose();
      (previewRef.current.material as THREE.Material).dispose();
      previewRef.current = null;
    }
    if (!holePreview || holePreview.length === 0) return;

    const disk = new THREE.CircleGeometry(1, 20);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x14060a,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    const inst = new THREE.InstancedMesh(disk, mat, holePreview.length);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const zAxis = new THREE.Vector3(0, 0, 1);
    const s = new THREE.Vector3();
    for (let i = 0; i < holePreview.length; i += 1) {
      const h = holePreview[i];
      const r = Math.max(0.15, Math.sqrt(h.areaMm2 / Math.PI));
      q.setFromUnitVectors(zAxis, h.dir.clone().multiplyScalar(-1));
      s.setScalar(r);
      m4.compose(h.entry.clone().addScaledVector(h.dir, -0.03), q, s);
      inst.setMatrixAt(i, m4);
    }
    inst.instanceMatrix.needsUpdate = true;
    inst.renderOrder = 4;
    scene.add(inst);
    previewRef.current = inst;
  }, [holePreview]);

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
}
