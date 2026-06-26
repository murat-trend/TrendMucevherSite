"use client";

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

export interface HologramConfig {
  objectType: 'text' | 'customModel';
  color: string;
  speed: number;
  scale: number;
  cameraZ: number;
  distance: number;
  opacity: number;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  renderStyle: 'wireframe' | 'points' | 'solid' | 'hybrid';
  showGuide: boolean;
  guideType: 'dot' | 'crosshair' | 'target' | 'none';
  guideColor: string;
  text: string;
  audioValue: number;
  audioReactive: boolean;
  customModelUrl: string | null;
  customModelFormat: 'gltf' | 'obj' | 'stl' | null;
  useOriginalMaterials: boolean;
  cloneCount: number;
  specialEffect: 'none' | 'sparkles' | 'scanlines' | 'flicker';
  sparklesCount: number;
  sparklesSpeed: number;
  sparklesSize: number;
  scanlinesSpeed: number;
  scanlinesIntensity: number;
  flickerRate: number;
  showroomMode: boolean;
  slot1Url: string | null; slot1Format: 'gltf' | 'obj' | 'stl' | null;
  slot2Url: string | null; slot2Format: 'gltf' | 'obj' | 'stl' | null;
  slot3Url: string | null; slot3Format: 'gltf' | 'obj' | 'stl' | null;
  slot4Url: string | null; slot4Format: 'gltf' | 'obj' | 'stl' | null;
  slot5Url: string | null; slot5Format: 'gltf' | 'obj' | 'stl' | null;
}

interface Props {
  config: HologramConfig;
  className?: string;
  isFullScreen?: boolean;
}

export function HologramCanvas({ config, className, isFullScreen }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const configRef = useRef(config);

  useEffect(() => { configRef.current = config; }, [config]);

  useEffect(() => {
    if (!mountRef.current) return;

    const W = mountRef.current.clientWidth;
    const H = mountRef.current.clientHeight;

    // ── Renderer ──────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setClearColor(0x000000, 1);
    renderer.autoClear = false;
    mountRef.current.appendChild(renderer.domElement);

    // ── Scene & Object ────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = null;

    // 6-point jewelry lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const key = new THREE.DirectionalLight(0xfff8e7, 2.5); key.position.set(4, 8, 5); scene.add(key);
    const fill = new THREE.DirectionalLight(0xe0f0ff, 1.5); fill.position.set(-5, 3, 4); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 2.8); rim.position.set(0, 4, -8); scene.add(rim);
    const bot = new THREE.DirectionalLight(0xffffff, 1.2); bot.position.set(0, -6, 2); scene.add(bot);
    const p1 = new THREE.PointLight(0xffccaa, 3, 12); p1.position.set(2, 1, 3); scene.add(p1);
    const p2 = new THREE.PointLight(0xaaccff, 3, 12); p2.position.set(-2, 1, -3); scene.add(p2);

    const objectGroup = new THREE.Group();
    scene.add(objectGroup);

    // Sparkles particles
    let sparklesMesh: THREE.Points | null = null;

    // ── 4 cameras for Pepper's Ghost ─────────────────────────
    // Each camera looks at the object from a different side.
    // They orbit around Y axis: 0°, 90°, 180°, 270°
    const makeCamera = (angleY: number, dist: number) => {
      const cam = new THREE.PerspectiveCamera(45, 1, 0.01, 200);
      cam.position.set(
        Math.sin(angleY) * dist,
        0,
        Math.cos(angleY) * dist
      );
      cam.lookAt(0, 0, 0);
      return cam;
    };

    const cameras = [
      makeCamera(0, 5),           // bottom  → front view
      makeCamera(Math.PI, 5),     // top     → back view
      makeCamera(-Math.PI / 2, 5),// left    → left view
      makeCamera(Math.PI / 2, 5), // right   → right view
    ];

    // ── Load model ────────────────────────────────────────────
    const loadModel = async () => {
      // clear previous
      while (objectGroup.children.length) objectGroup.remove(objectGroup.children[0]);
      if (sparklesMesh) { scene.remove(sparklesMesh); sparklesMesh = null; }

      const ac = configRef.current;
      const parsedColor = new THREE.Color(ac.color);

      const applyMaterial = (obj: THREE.Object3D) => {
        obj.traverse(child => {
          if (!(child instanceof THREE.Mesh)) return;
          if (!ac.useOriginalMaterials || !child.material) {
            child.material = new THREE.MeshStandardMaterial({
              color: parsedColor,
              transparent: true,
              opacity: ac.opacity,
              wireframe: ac.renderStyle === 'wireframe',
              side: THREE.DoubleSide,
              roughness: 0.05,
              metalness: 0.95,
            });
          } else {
            const m = child.material as THREE.MeshStandardMaterial;
            m.transparent = true;
            m.opacity = ac.opacity;
            m.needsUpdate = true;
          }
        });
      };

      const fitToBox = (obj: THREE.Object3D, size = 2.2) => {
        const box = new THREE.Box3().setFromObject(obj);
        const s = box.getSize(new THREE.Vector3());
        const sf = size / Math.max(s.x, s.y, s.z, 0.001);
        obj.scale.setScalar(sf);
        const center = box.getCenter(new THREE.Vector3());
        obj.position.sub(center.multiplyScalar(sf));
      };

      if (ac.objectType === 'text') {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 128;
        const ctx = canvas.getContext('2d')!;
        const txt = ac.text || 'HOLO';
        const fs = Math.max(32, 72 - txt.length * 3);
        ctx.clearRect(0, 0, 512, 128);
        ctx.font = `bold ${fs}px "Courier New", monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = ac.color; ctx.shadowBlur = 18;
        ctx.fillStyle = ac.color; ctx.fillText(txt.toUpperCase(), 256, 64);
        ctx.shadowBlur = 2; ctx.fillStyle = '#ffffff'; ctx.fillText(txt.toUpperCase(), 256, 64);
        const tex = new THREE.CanvasTexture(canvas);
        const mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(3.5, 0.9),
          new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: ac.opacity, side: THREE.DoubleSide })
        );
        objectGroup.add(mesh);
        return;
      }

      if (ac.objectType === 'customModel' && ac.customModelUrl) {
        const onLoaded = (obj: THREE.Object3D) => {
          applyMaterial(obj);
          fitToBox(obj, 2.2);
          objectGroup.add(obj);
        };
        const onErr = () => {
          const fallback = new THREE.Mesh(
            new THREE.IcosahedronGeometry(1, 1),
            new THREE.MeshStandardMaterial({ color: parsedColor, wireframe: true, transparent: true, opacity: ac.opacity })
          );
          objectGroup.add(fallback);
        };
        if (ac.customModelFormat === 'obj') {
          new OBJLoader().load(ac.customModelUrl, onLoaded, undefined, onErr);
        } else if (ac.customModelFormat === 'stl') {
          new STLLoader().load(ac.customModelUrl, geo => {
            const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
              color: ac.useOriginalMaterials ? 0xeeeeee : parsedColor,
              metalness: 0.9, roughness: 0.08, transparent: true, opacity: ac.opacity, side: THREE.DoubleSide
            }));
            fitToBox(m, 2.2);
            objectGroup.add(m);
          }, undefined, onErr);
        } else {
          new GLTFLoader().load(ac.customModelUrl, gltf => onLoaded(gltf.scene), undefined, onErr);
        }
        return;
      }

      // Fallback: placeholder
      const placeholder = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1, 1),
        new THREE.MeshStandardMaterial({ color: parsedColor, wireframe: true, transparent: true, opacity: 0.7 })
      );
      objectGroup.add(placeholder);
    };

    loadModel();

    // ── Animate ───────────────────────────────────────────────
    let rafId: number;
    let rotation = 0;
    let lastUrl = configRef.current.customModelUrl;
    let lastType = configRef.current.objectType;
    let lastText = configRef.current.text;
    let lastOpacity = configRef.current.opacity;
    let lastStyle = configRef.current.renderStyle;
    let lastColor = configRef.current.color;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const ac = configRef.current;

      // Reload trigger
      if (lastUrl !== ac.customModelUrl || lastType !== ac.objectType || lastText !== ac.text || lastColor !== ac.color) {
        loadModel();
        lastUrl = ac.customModelUrl; lastType = ac.objectType; lastText = ac.text; lastColor = ac.color;
      }

      // Live material updates
      if (lastOpacity !== ac.opacity || lastStyle !== ac.renderStyle) {
        objectGroup.traverse(obj => {
          if (obj instanceof THREE.Mesh) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach((m: THREE.Material) => {
              m.transparent = true;
              m.opacity = ac.opacity;
              if ('wireframe' in m) (m as any).wireframe = ac.renderStyle === 'wireframe';
              m.needsUpdate = true;
            });
          }
        });
        lastOpacity = ac.opacity; lastStyle = ac.renderStyle;
      }

      // Rotation
      let dynScale = ac.scale;
      if (ac.audioReactive) dynScale = ac.scale * (1.0 + ac.audioValue * 0.7);

      objectGroup.rotation.y = rotation;
      objectGroup.scale.setScalar(dynScale);

      if (ac.specialEffect === 'flicker' && Math.random() > ac.flickerRate) {
        objectGroup.visible = false;
      } else {
        objectGroup.visible = true;
      }

      rotation += ac.speed * 0.012;

      // ── Pepper's Ghost: 4-viewport render ─────────────────
      const w = renderer.domElement.clientWidth;
      const h = renderer.domElement.clientHeight;
      const half = Math.floor(Math.min(w, h) / 2);

      // viewport positions (x, y, w, h) — origin bottom-left in WebGL
      const viewports: [number, number, number, number][] = [
        [Math.floor(w / 2) - half, 0,            half, half],  // bottom
        [Math.floor(w / 2) - half, half,          half, half],  // top
        [Math.floor(w / 2) - half * 2, Math.floor(h / 2) - half, half, half], // left
        [Math.floor(w / 2), Math.floor(h / 2) - half, half, half],            // right
      ];

      // Update camera distances
      cameras.forEach((cam, i) => {
        const angles = [0, Math.PI, -Math.PI / 2, Math.PI / 2];
        cam.position.set(
          Math.sin(angles[i]) * ac.cameraZ,
          0,
          Math.cos(angles[i]) * ac.cameraZ
        );
        cam.lookAt(0, 0, 0);
        cam.aspect = 1;
        cam.updateProjectionMatrix();
      });

      renderer.clear();
      renderer.setScissorTest(true);

      viewports.forEach(([x, y, vw, vh], i) => {
        renderer.setViewport(x, y, vw, vh);
        renderer.setScissor(x, y, vw, vh);
        renderer.render(scene, cameras[i]);
      });

      renderer.setScissorTest(false);
    };

    animate();

    // ── Resize ────────────────────────────────────────────────
    const onResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafId);
      renderer.dispose();
      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`${className ?? ''} relative overflow-hidden bg-black select-none`}
      style={{ minHeight: isFullScreen ? '100vh' : '520px' }}
    />
  );
}
