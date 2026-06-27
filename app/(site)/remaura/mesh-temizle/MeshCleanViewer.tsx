"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { nonManifoldEdgeLines } from "./lib/meshOps";

type Props = {
  geometry: THREE.BufferGeometry | null;
  wireframe: boolean;
  showBadEdges: boolean;
  previewScale?: [number, number, number]; // canlı eksen ölçeği önizlemesi
  gizmo?: boolean;                          // gumball açık/kapalı
  gizmoMode?: "rotate" | "translate";       // döndür / taşı
  clip?: { enabled: boolean; axis: "x" | "y" | "z"; position: number; flip: boolean }; // kesit
};

export type MeshViewerHandle = {
  /** Modelin kare anlık görüntüsünü (PNG dataURL) döndürür; model yoksa null. */
  capture: (size?: number) => string | null;
  /** Gumball ile uygulanan döndürme matrisi (export'a bake için); yoksa null. */
  getOrientationMatrix: () => THREE.Matrix4 | null;
};

export const MeshCleanViewer = forwardRef<MeshViewerHandle, Props>(function MeshCleanViewer(
  { geometry, wireframe, showBadEdges, previewScale, gizmo, gizmoMode, clip }, ref,
) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const edgesRef = useRef<THREE.LineSegments | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const tcRef = useRef<TransformControls | null>(null);
  const tcHelperRef = useRef<THREE.Object3D | null>(null);
  const clipPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(1, 0, 0), 0));
  const dispBoxRef = useRef<THREE.Box3 | null>(null);
  const outerMatRef = useRef<THREE.MeshStandardMaterial | null>(null);

  useImperativeHandle(ref, () => ({
    getOrientationMatrix: () => {
      const g = groupRef.current;
      if (!g) return null;
      return new THREE.Matrix4().makeRotationFromQuaternion(g.quaternion);
    },
    capture: (size = 1100) => {
      const renderer = rendererRef.current, scene = sceneRef.current, camera = cameraRef.current;
      const host = mountRef.current;
      if (!renderer || !scene || !camera || !host || !groupRef.current) return null;
      const prevW = host.clientWidth || 1, prevH = host.clientHeight || 1;
      const edges = edgesRef.current;
      const edgesWasVisible = edges?.visible ?? false;
      const helper = tcHelperRef.current;
      const helperWasVisible = helper?.visible ?? false;
      try {
        if (edges) edges.visible = false; // satış görseli: yeşil hataları gizle
        if (helper) helper.visible = false; // gumball'ı görsele alma
        renderer.setSize(size, size, false);
        camera.aspect = 1; camera.updateProjectionMatrix();
        renderer.render(scene, camera);
        const url = renderer.domElement.toDataURL("image/png");
        // eski duruma dön
        if (edges) edges.visible = edgesWasVisible;
        if (helper) helper.visible = helperWasVisible;
        renderer.setSize(prevW, prevH, false);
        camera.aspect = prevW / prevH; camera.updateProjectionMatrix();
        renderer.render(scene, camera);
        return url;
      } catch {
        if (edges) edges.visible = edgesWasVisible;
        if (helper) helper.visible = helperWasVisible;
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
    renderer.localClippingEnabled = true;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controlsRef.current = controls;

    // Döndürme gumball'ı (TransformControls)
    const tc = new TransformControls(camera, renderer.domElement);
    tc.setMode("rotate");
    tc.setSpace("local");
    tc.addEventListener("dragging-changed", (e) => { controls.enabled = !(e as unknown as { value: boolean }).value; });
    tcRef.current = tc;
    // three sürümüne göre helper ayrı olabilir
    const tcAny = tc as unknown as { getHelper?: () => THREE.Object3D };
    const helper = tcAny.getHelper ? tcAny.getHelper() : (tc as unknown as THREE.Object3D);
    tcHelperRef.current = helper;
    scene.add(helper);
    tc.enabled = false;
    helper.visible = false;

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
      try { tc.detach(); tc.dispose(); } catch { /* yok say */ }
      renderer.dispose();
      host.innerHTML = "";
      sceneRef.current = null; controlsRef.current = null;
      groupRef.current = null; meshRef.current = null; edgesRef.current = null;
      rendererRef.current = null; cameraRef.current = null;
      tcRef.current = null; tcHelperRef.current = null;
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
      clippingPlanes: [], clipShadows: true,
    });
    const mesh = new THREE.Mesh(disp, mat);
    meshRef.current = mesh;
    outerMatRef.current = mat;
    group.add(mesh);
    disp.computeBoundingBox();
    dispBoxRef.current = disp.boundingBox!.clone();

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

  // canlı eksen ölçeği önizlemesi (group transform — ucuz, yeniden mesh yok)
  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    const [sx, sy, sz] = previewScale ?? [1, 1, 1];
    g.scale.set(sx, sy, sz);
  }, [previewScale, geometry]);

  // kesit (clipping plane) — modelin içini göster
  useEffect(() => {
    const mat = outerMatRef.current, plane = clipPlaneRef.current, box = dispBoxRef.current;
    if (!mat) return;
    if (!clip || !clip.enabled || !box) { mat.clippingPlanes = []; mat.needsUpdate = true; return; }
    const ai = clip.axis === "x" ? 0 : clip.axis === "y" ? 1 : 2;
    plane.normal.set(0, 0, 0).setComponent(ai, clip.flip ? -1 : 1);
    const lo = box.min.getComponent(ai), hi = box.max.getComponent(ai);
    const px = lo + (hi - lo) * clip.position;
    plane.constant = clip.flip ? px : -px;
    mat.clippingPlanes = [plane];
    mat.needsUpdate = true;
  }, [clip, geometry]);

  // gumball aç/kapa
  useEffect(() => {
    const tc = tcRef.current, helper = tcHelperRef.current, g = groupRef.current;
    if (!tc) return;
    if (gizmo && g) {
      tc.setMode(gizmoMode ?? "rotate");
      tc.attach(g); tc.enabled = true;
      if (helper) helper.visible = true;
    } else {
      tc.detach(); tc.enabled = false;
      if (helper) helper.visible = false;
    }
  }, [gizmo, gizmoMode, geometry]);

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
