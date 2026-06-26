"use client";

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface Props {
  className?: string;
  color?: string;
}

export function VirtualSimulator({ className, color = '#00e5ff' }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isDragging = useRef(false);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);

  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (!mountRef.current) return;
    const w = mountRef.current.clientWidth;
    const h = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 100);
    camera.position.set(0, 3.5, 7);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const setupScene = (dark: boolean) => {
      scene.clear();

      scene.add(new THREE.AmbientLight(dark ? 0x222244 : 0xfff5e0, dark ? 0.6 : 1.0));

      if (dark) {
        const topLight = new THREE.DirectionalLight(0x8888ff, 1.2);
        topLight.position.set(5, 8, 5);
        scene.add(topLight);
        const neonLight = new THREE.PointLight(0x00ccff, 6, 15);
        neonLight.position.set(0, 3, 2);
        scene.add(neonLight);
      } else {
        const sunLight = new THREE.DirectionalLight(0xfff0d0, 2.2);
        sunLight.position.set(6, 10, 7);
        scene.add(sunLight);
        const fillLight = new THREE.DirectionalLight(0xd0e8ff, 1.0);
        fillLight.position.set(-5, 4, 5);
        scene.add(fillLight);
      }

      // Smartphone body
      const phone = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.08, 3.2),
        new THREE.MeshStandardMaterial({
          color: dark ? 0x1a1a2e : 0xfafafa,
          roughness: dark ? 0.12 : 0.22,
          metalness: dark ? 0.95 : 0.35
        })
      );
      phone.position.y = -0.04;
      scene.add(phone);

      // Screen
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(1.42, 2.9),
        new THREE.MeshStandardMaterial({ color: dark ? 0x001520 : 0xffffff, roughness: 0, metalness: 0, emissive: dark ? 0x001015 : 0xfff5e0, emissiveIntensity: dark ? 0.6 : 0.15 })
      );
      screen.rotation.x = -Math.PI / 2;
      screen.position.y = 0.01;
      scene.add(screen);

      // Color rings (alignment guides)
      const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.7, side: THREE.DoubleSide });
      const ring1 = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.11, 32), ringMat);
      ring1.rotation.x = -Math.PI / 2; ring1.position.y = 0.01;
      scene.add(ring1);

      // Hologram pyramid (inverted truncated pyramid)
      const group = new THREE.Group();
      const pyramidH = 2.2;
      const topR = 0.13; const botR = 0.9;
      const geo = new THREE.CylinderGeometry(topR, botR, pyramidH, 4, 1, true);
      const pyMat = new THREE.MeshStandardMaterial({
        color: dark ? 0x88ddff : 0xdddddd,
        transparent: true, opacity: dark ? 0.25 : 0.22,
        side: THREE.DoubleSide, roughness: 0, metalness: dark ? 0.8 : 0.2
      });
      const pyramid = new THREE.Mesh(geo, pyMat);
      pyramid.rotation.x = Math.PI; pyramid.position.y = 1.1 + 0.04;
      group.add(pyramid);

      const edgeGeo = new THREE.EdgesGeometry(geo);
      const edgeMat = new THREE.LineBasicMaterial({ color: dark ? 0x44aaff : 0x888888, transparent: true, opacity: dark ? 0.8 : 0.6 });
      const edges = new THREE.LineSegments(edgeGeo, edgeMat);
      edges.rotation.x = Math.PI; edges.position.y = 1.1 + 0.04;
      group.add(edges);

      // Hologram object inside pyramid (floating diamond)
      const hologramGeo = new THREE.OctahedronGeometry(0.28, 0);
      const hologramMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        transparent: true, opacity: 0.85, wireframe: true,
        roughness: 0, metalness: 1
      });
      const holoMesh = new THREE.Mesh(hologramGeo, hologramMat);
      holoMesh.position.y = 1.55;
      group.add(holoMesh);

      // Hologram glow point
      const glowLight = new THREE.PointLight(new THREE.Color(color), dark ? 5 : 2, 4);
      glowLight.position.y = 1.55;
      group.add(glowLight);

      scene.add(group);
      groupRef.current = group;

      // Floor plane
      const floor = new THREE.Mesh(
        new THREE.CircleGeometry(5, 32),
        new THREE.MeshStandardMaterial({ color: dark ? 0x0a0a18 : 0xeeeeee, roughness: 0.95, metalness: 0 })
      );
      floor.rotation.x = -Math.PI / 2; floor.position.y = -0.05;
      scene.add(floor);

      // Grid helper
      const grid = new THREE.GridHelper(8, 20, dark ? 0x222240 : 0xdddddd, dark ? 0x111128 : 0xe8e8e8);
      grid.position.y = -0.045;
      scene.add(grid);
    };

    setupScene(isDark);

    let t = 0;
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      t += 0.02;
      if (groupRef.current) {
        const holoMesh = groupRef.current.children[2] as THREE.Mesh;
        if (holoMesh) {
          holoMesh.rotation.y = t;
          holoMesh.rotation.x = t * 0.3;
          holoMesh.position.y = 1.55 + Math.sin(t * 1.2) * 0.12;
        }
      }
      renderer.render(scene, camera);
    };
    animate();

    const onPointerDown = (e: PointerEvent) => { isDragging.current = true; lastPointer.current = { x: e.clientX, y: e.clientY }; };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current || !lastPointer.current || !groupRef.current) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      groupRef.current.rotation.y += dx * 0.01;
      groupRef.current.rotation.x += dy * 0.01;
      lastPointer.current = { x: e.clientX, y: e.clientY };
    };
    const onPointerUp = () => { isDragging.current = false; lastPointer.current = null; };

    const el = mountRef.current;
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointerleave', onPointerUp);

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointerleave', onPointerUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (mountRef.current?.contains(renderer.domElement)) mountRef.current.removeChild(renderer.domElement);
    };
  }, []);

  // Rebuild scene on dark/light toggle
  useEffect(() => {
    if (!sceneRef.current) return;
    // Trigger full re-init on dark/light change — handled by the key prop in parent
  }, [isDark]);

  return (
    <div className={`relative ${className ?? ''}`}>
      <div ref={mountRef} className="w-full h-full rounded-xl overflow-hidden" style={{ minHeight: 340 }} />
      <div className="absolute top-3 right-3 flex gap-2">
        <button
          onClick={() => setIsDark(prev => !prev)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
          style={{ background: isDark ? '#0e1122' : '#fafaf5', color: isDark ? '#44aaff' : '#b76e79', borderColor: isDark ? '#334' : '#e0d8d0' }}
        >
          {isDark ? '🌙 Gece' : '☀️ Gündüz'}
        </button>
      </div>
      <p className="absolute bottom-3 left-0 w-full text-center text-[11px] text-white/40 pointer-events-none">
        Döndürmek için sürükle
      </p>
    </div>
  );
}
