"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";

type Clip = { enabled: boolean; axis: "x" | "y" | "z"; position: number; flip: boolean };

type Props = {
  geometry: THREE.BufferGeometry | null;
  clip: Clip;
  wireframe?: boolean;
  /** serbest döndürme gumball'ı açık/kapalı */
  gizmo?: boolean;
  /** yarı saydam hayalet (relief) — panel modunda yerini görmek için. Ortak ölçek referansı. */
  ghost?: THREE.BufferGeometry | null;
  /** seçili yüz göstergesi — o yüze renkli yarı saydam levha koyar (yön seçimi netliği). */
  marker?: { axis: "x" | "y" | "z"; flip: boolean } | null;
};

export type AjurViewerHandle = {
  /** Kameraya göre en uygun kesim ekseni + yön (yakın yarıyı kes). */
  getViewClip: () => { axis: "x" | "y" | "z"; flip: boolean };
  /** Gumball ile uygulanan döndürme matrisi (kesim öncesi geometriye bake için). */
  getOrientationMatrix: () => THREE.Matrix4 | null;
};

export const AjurViewer = forwardRef<AjurViewerHandle, Props>(function AjurViewer(
  { geometry, clip, wireframe, gizmo, ghost, marker }, ref,
) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const ghostRef = useRef<THREE.Mesh | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const outerMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const innerMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const planeRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(1, 0, 0), 0));
  const boxRef = useRef<THREE.Box3 | null>(null);
  const quadRef = useRef<THREE.Mesh | null>(null);
  const markerRef = useRef<THREE.Mesh | null>(null);
  const tcRef = useRef<TransformControls | null>(null);
  const tcHelperRef = useRef<THREE.Object3D | null>(null);

  // Ortak ölçek/merkez referansı: hayalet varsa O (relief), yoksa ana geometri.
  // Böylece panel, relief içinde DOĞRU konum ve oranda görünür.
  const refForXform = ghost ?? geometry;

  useImperativeHandle(ref, () => ({
    getViewClip: () => {
      const cam = cameraRef.current;
      const p = cam ? cam.position : new THREE.Vector3(0, 0, 1);
      const ax = Math.abs(p.x), ay = Math.abs(p.y), az = Math.abs(p.z);
      let axis: "x" | "y" | "z" = "z"; let comp = p.z;
      if (ax >= ay && ax >= az) { axis = "x"; comp = p.x; }
      else if (ay >= ax && ay >= az) { axis = "y"; comp = p.y; }
      return { axis, flip: comp > 0 };
    },
    getOrientationMatrix: () => {
      const g = groupRef.current;
      if (!g) return null;
      return new THREE.Matrix4().makeRotationFromQuaternion(g.quaternion);
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

    // Serbest döndürme gumball'ı (TransformControls, rotate)
    const tc = new TransformControls(camera, renderer.domElement);
    tc.setMode("rotate");
    tc.setSpace("local");
    tc.addEventListener("dragging-changed", (e) => { controls.enabled = !(e as unknown as { value: boolean }).value; });
    tcRef.current = tc;
    const tcAny = tc as unknown as { getHelper?: () => THREE.Object3D };
    const helper = tcAny.getHelper ? tcAny.getHelper() : (tc as unknown as THREE.Object3D);
    tcHelperRef.current = helper;
    scene.add(helper);
    tc.enabled = false;
    helper.visible = false;

    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const d1 = new THREE.DirectionalLight(0xffffff, 1.7); d1.position.set(4, 6, 5); scene.add(d1);
    const d2 = new THREE.DirectionalLight(0xb76e79, 0.8); d2.position.set(-4, -3, 3); scene.add(d2);

    // Kesit düzlemi göstergesi (yarı saydam quad)
    const quad = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: 0xb76e79, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }),
    );
    quad.visible = false;
    quad.renderOrder = 5;
    quadRef.current = quad;
    scene.add(quad);

    // Seçili yüz göstergesi (parlak gül levha) — yön seçiminde "burası" demek için
    const marker3d = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: 0xff6b9d, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false }),
    );
    marker3d.visible = false;
    marker3d.renderOrder = 6;
    markerRef.current = marker3d;
    scene.add(marker3d);

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
      sceneRef.current = null; controlsRef.current = null; groupRef.current = null;
      rendererRef.current = null; cameraRef.current = null;
      outerMatRef.current = null; innerMatRef.current = null; quadRef.current = null;
      markerRef.current = null; tcRef.current = null; tcHelperRef.current = null;
    };
  }, []);

  // Gumball aç/kapa (geometri değişince yeni group'a yeniden attach)
  useEffect(() => {
    const tc = tcRef.current, helper = tcHelperRef.current, g = groupRef.current;
    if (!tc) return;
    if (gizmo && g) {
      tc.setMode("rotate");
      tc.attach(g); tc.enabled = true;
      if (helper) helper.visible = true;
    } else {
      tc.detach(); tc.enabled = false;
      if (helper) helper.visible = false;
    }
  }, [gizmo, geometry]);

  // Geometri değişince yeniden kur (merkez + ölçek normalize)
  useEffect(() => {
    const scene = sceneRef.current;
    const controls = controlsRef.current;
    if (!scene) return;

    if (groupRef.current) {
      scene.remove(groupRef.current);
      groupRef.current.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && m.geometry) m.geometry.dispose();
      });
      groupRef.current = null;
    }
    if (!geometry) return;

    // Ortak transform referansı (hayalet varsa relief) — panel doğru oranda otursun
    const ref = refForXform ?? geometry;
    ref.computeBoundingBox();
    const box = ref.boundingBox!;
    const center = box.getCenter(new THREE.Vector3());
    const sphereR = box.getSize(new THREE.Vector3()).length() / 2 || 1;
    const scale = 2.35 / sphereR;

    const disp = geometry.clone();
    disp.translate(-center.x, -center.y, -center.z);
    disp.scale(scale, scale, scale);
    disp.computeVertexNormals();
    disp.computeBoundingBox();
    boxRef.current = disp.boundingBox!.clone();

    const group = new THREE.Group();

    const outer = new THREE.MeshStandardMaterial({
      color: 0xc4838b, roughness: 0.55, metalness: 0.1, side: THREE.FrontSide,
      wireframe: !!wireframe, clippingPlanes: [], clipShadows: true,
    });
    outerMatRef.current = outer;
    group.add(new THREE.Mesh(disp, outer));

    const inner = new THREE.MeshStandardMaterial({
      color: 0xe4b56f, roughness: 0.4, metalness: 0.5, side: THREE.BackSide,
      clippingPlanes: [], clipShadows: true,
    });
    innerMatRef.current = inner;
    group.add(new THREE.Mesh(disp, inner));

    scene.add(group);
    groupRef.current = group;
    if (controls) { controls.target.set(0, 0, 0); controls.update(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometry, ghost]);

  // Hayalet (relief) — yarı saydam; ana geometriyle AYNI transform (relief bbox).
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (ghostRef.current) {
      scene.remove(ghostRef.current);
      ghostRef.current.geometry.dispose();
      (ghostRef.current.material as THREE.Material).dispose();
      ghostRef.current = null;
    }
    if (!ghost) return;

    ghost.computeBoundingBox();
    const box = ghost.boundingBox!;
    const center = box.getCenter(new THREE.Vector3());
    const sphereR = box.getSize(new THREE.Vector3()).length() / 2 || 1;
    const scale = 2.35 / sphereR;

    const gd = ghost.clone();
    gd.translate(-center.x, -center.y, -center.z);
    gd.scale(scale, scale, scale);
    gd.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0xc4838b, roughness: 0.6, metalness: 0.1,
      transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(gd, mat);
    mesh.renderOrder = -1; // panelden önce çiz
    scene.add(mesh);
    ghostRef.current = mesh;
  }, [ghost]);

  useEffect(() => {
    if (outerMatRef.current) outerMatRef.current.wireframe = !!wireframe;
  }, [wireframe]);

  // Kesit (clip plane) + düzlem göstergesi — display uzayında (merkez+ölçek normalize)
  useEffect(() => {
    const outer = outerMatRef.current, inner = innerMatRef.current;
    const plane = planeRef.current, box = boxRef.current, quad = quadRef.current;
    if (!outer || !inner) return;
    const on = !!(clip.enabled && box);
    if (!on) {
      outer.clippingPlanes = []; inner.clippingPlanes = [];
      outer.needsUpdate = true; inner.needsUpdate = true;
      if (quad) quad.visible = false;
      return;
    }
    const ai = clip.axis === "x" ? 0 : clip.axis === "y" ? 1 : 2;
    plane.normal.set(0, 0, 0).setComponent(ai, clip.flip ? -1 : 1);
    const lo = box!.min.getComponent(ai), hi = box!.max.getComponent(ai);
    const pxLocal = lo + (hi - lo) * clip.position;
    plane.constant = clip.flip ? pxLocal : -pxLocal;
    outer.clippingPlanes = [plane]; inner.clippingPlanes = [plane];
    outer.needsUpdate = true; inner.needsUpdate = true;

    if (quad) {
      quad.visible = true;
      const size = box!.getSize(new THREE.Vector3());
      const u = size.x, v = size.y, w = size.z;
      quad.position.set(0, 0, 0).setComponent(ai, pxLocal);
      // quad'ı kesit eksenine dik konumla
      quad.rotation.set(0, 0, 0);
      if (ai === 0) { quad.rotation.y = Math.PI / 2; quad.scale.set(w * 1.15, v * 1.15, 1); }
      else if (ai === 1) { quad.rotation.x = Math.PI / 2; quad.scale.set(u * 1.15, w * 1.15, 1); }
      else { quad.scale.set(u * 1.15, v * 1.15, 1); }
    }
  }, [clip, geometry]);

  // Seçili yüz göstergesi — o eksenin uç yüzüne parlak gül levha koy
  useEffect(() => {
    const m = markerRef.current, box = boxRef.current;
    if (!m) return;
    if (!marker || !box) { m.visible = false; return; }
    const ai = marker.axis === "x" ? 0 : marker.axis === "y" ? 1 : 2;
    const size = box.getSize(new THREE.Vector3());
    const u = size.x, v = size.y, w = size.z;
    // flip=false → MIN uç (alçak), flip=true → MAX uç (yüksek)
    const facePos = marker.flip ? box.max.getComponent(ai) : box.min.getComponent(ai);
    const out = marker.flip ? 0.02 : -0.02; // yüzeyin biraz dışına taşır → görünür
    m.visible = true;
    m.position.set(0, 0, 0).setComponent(ai, facePos + out);
    m.rotation.set(0, 0, 0);
    if (ai === 0) { m.rotation.y = Math.PI / 2; m.scale.set(w * 1.05, v * 1.05, 1); }
    else if (ai === 1) { m.rotation.x = Math.PI / 2; m.scale.set(u * 1.05, w * 1.05, 1); }
    else { m.scale.set(u * 1.05, v * 1.05, 1); }
  }, [marker, geometry]);

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
