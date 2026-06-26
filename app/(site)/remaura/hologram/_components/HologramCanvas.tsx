"use client";

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

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

// Kaynak: github.com/hnieto/HoloPyramid
// 4 quadrant — her biri piramit yüzeyine karşılık gelir
const VIEWS = [
  { left: 0,   bottom: 0.5, width: 0.5, height: 0.5, angle: 0,   rotZ: 33.75 },    // top-left
  { left: 0,   bottom: 0,   width: 0.5, height: 0.5, angle: 90,  rotZ: 101.25 },   // bottom-left
  { left: 0.5, bottom: 0,   width: 0.5, height: 0.5, angle: 180, rotZ: -101.25 },  // bottom-right
  { left: 0.5, bottom: 0.5, width: 0.5, height: 0.5, angle: 270, rotZ: 101.25 },   // top-right
];

export function HologramCanvas({ config, className, isFullScreen }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const configRef = useRef(config);
  useEffect(() => { configRef.current = config; }, [config]);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;

    // ── Renderer ──────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.autoClear = false;
    container.appendChild(renderer.domElement);

    // ── Scene ─────────────────────────────────────────────────
    const scene = new THREE.Scene();

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const key = new THREE.DirectionalLight(0xfff8e7, 2.5); key.position.set(4, 8, 5); scene.add(key);
    const fill = new THREE.DirectionalLight(0xe0f0ff, 1.5); fill.position.set(-5, 3, 4); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 2.8); rim.position.set(0, 4, -8); scene.add(rim);
    const bot = new THREE.DirectionalLight(0xffffff, 1.2); bot.position.set(0, -6, 2); scene.add(bot);
    const p1 = new THREE.PointLight(0xffccaa, 3, 12); p1.position.set(2, 1, 3); scene.add(p1);
    const p2 = new THREE.PointLight(0xaaccff, 3, 12); p2.position.set(-2, 1, -3); scene.add(p2);

    const objectGroup = new THREE.Group();
    scene.add(objectGroup);

    // ── 4 cameras ─────────────────────────────────────────────
    const cameras = VIEWS.map(() => new THREE.PerspectiveCamera(30, 1, 0.01, 1000));

    // ── EffectComposer per camera ─────────────────────────────
    // Bloom için her kamera için composer — viewport render ile entegre
    // Not: scissor + composer birlikte çalışmaz, bu yüzden bloom sadece
    // post-render overlay olarak uygulanır. Alternatif: tek composer.
    // Burada tek composer + bloom, scissor ile manuel viewport render.
    const bloomComposers: EffectComposer[] = cameras.map(cam => {
      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, cam));
      const bloom = new UnrealBloomPass(
        new THREE.Vector2(container.clientWidth / 2, container.clientHeight / 2),
        configRef.current.bloomStrength,
        configRef.current.bloomRadius,
        configRef.current.bloomThreshold
      );
      composer.addPass(bloom);
      return composer;
    });

    // ── Guide overlay canvas ──────────────────────────────────
    const guideCanvas = document.createElement('canvas');
    guideCanvas.style.position = 'absolute';
    guideCanvas.style.top = '0'; guideCanvas.style.left = '0';
    guideCanvas.style.pointerEvents = 'none';
    guideCanvas.style.zIndex = '10';
    container.style.position = 'relative';
    container.appendChild(guideCanvas);

    const drawGuide = (w: number, h: number) => {
      guideCanvas.width = w; guideCanvas.height = h;
      const ctx = guideCanvas.getContext('2d')!;
      ctx.clearRect(0, 0, w, h);
      const ac = configRef.current;
      if (!ac.showGuide || ac.guideType === 'none') return;
      const cx = w / 2, cy = h / 2;
      ctx.strokeStyle = ac.guideColor;
      ctx.fillStyle = ac.guideColor;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.7;
      if (ac.guideType === 'dot') {
        ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
      } else if (ac.guideType === 'crosshair') {
        ctx.beginPath(); ctx.moveTo(cx - 20, cy); ctx.lineTo(cx + 20, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy - 20); ctx.lineTo(cx, cy + 20); ctx.stroke();
      } else if (ac.guideType === 'target') {
        ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - 24, cy); ctx.lineTo(cx + 24, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy - 24); ctx.lineTo(cx, cy + 24); ctx.stroke();
      }
    };

    // ── Model yükleme ─────────────────────────────────────────
    const loadModel = () => {
      while (objectGroup.children.length) objectGroup.remove(objectGroup.children[0]);

      const ac = configRef.current;
      const color = new THREE.Color(ac.color);

      const fitToBox = (obj: THREE.Object3D, size = 2.0) => {
        const box = new THREE.Box3().setFromObject(obj);
        const s = box.getSize(new THREE.Vector3());
        const sf = size / Math.max(s.x, s.y, s.z, 0.001);
        obj.scale.setScalar(sf);
        const center = box.getCenter(new THREE.Vector3());
        obj.position.sub(center.multiplyScalar(sf));
      };

      const makeMat = () => new THREE.MeshStandardMaterial({
        color,
        transparent: true,
        opacity: ac.opacity,
        wireframe: ac.renderStyle === 'wireframe',
        side: THREE.DoubleSide,
        roughness: 0.05,
        metalness: 0.95,
      });

      const applyMat = (obj: THREE.Object3D) => {
        obj.traverse(child => {
          if (!(child instanceof THREE.Mesh)) return;
          if (!ac.useOriginalMaterials) {
            child.material = makeMat();
          } else {
            const m = child.material as any;
            if (m) { m.transparent = true; m.opacity = ac.opacity; m.needsUpdate = true; }
          }
        });
      };

      if (ac.objectType === 'text') {
        const cvs = document.createElement('canvas');
        cvs.width = 512; cvs.height = 128;
        const ctx = cvs.getContext('2d')!;
        const txt = (ac.text || 'HOLO').toUpperCase();
        const fs = Math.max(32, 72 - txt.length * 3);
        ctx.font = `bold ${fs}px "Courier New", monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = ac.color; ctx.shadowBlur = 20;
        ctx.fillStyle = ac.color; ctx.fillText(txt, 256, 64);
        ctx.shadowBlur = 3; ctx.fillStyle = '#ffffff'; ctx.fillText(txt, 256, 64);
        objectGroup.add(new THREE.Mesh(
          new THREE.PlaneGeometry(3.5, 0.9),
          new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cvs), transparent: true, opacity: ac.opacity, side: THREE.DoubleSide })
        ));
        return;
      }

      if (ac.objectType === 'customModel' && ac.customModelUrl) {
        const onLoad = (obj: THREE.Object3D) => { applyMat(obj); fitToBox(obj); objectGroup.add(obj); };
        const onErr = () => { objectGroup.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), makeMat())); };

        if (ac.customModelFormat === 'obj') new OBJLoader().load(ac.customModelUrl, onLoad, undefined, onErr);
        else if (ac.customModelFormat === 'stl') new STLLoader().load(ac.customModelUrl, geo => {
          const m = new THREE.Mesh(geo, ac.useOriginalMaterials
            ? new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.9, roughness: 0.08, transparent: true, opacity: ac.opacity, side: THREE.DoubleSide })
            : makeMat());
          fitToBox(m); objectGroup.add(m);
        }, undefined, onErr);
        else new GLTFLoader().load(ac.customModelUrl, gltf => onLoad(gltf.scene), undefined, onErr);
        return;
      }

      // Placeholder
      objectGroup.add(new THREE.Mesh(
        new THREE.IcosahedronGeometry(1, 1),
        new THREE.MeshStandardMaterial({ color, wireframe: true, transparent: true, opacity: 0.8 })
      ));
    };

    loadModel();

    // ── Render loop ───────────────────────────────────────────
    let rafId: number;
    let rotation = 0;
    let lastUrl = configRef.current.customModelUrl;
    let lastType = configRef.current.objectType;
    let lastText = configRef.current.text;
    let lastColor = configRef.current.color;
    let lastOpacity = configRef.current.opacity;
    let lastStyle = configRef.current.renderStyle;

    const render = () => {
      rafId = requestAnimationFrame(render);
      const ac = configRef.current;

      if (lastUrl !== ac.customModelUrl || lastType !== ac.objectType || lastText !== ac.text || lastColor !== ac.color) {
        loadModel();
        lastUrl = ac.customModelUrl; lastType = ac.objectType; lastText = ac.text; lastColor = ac.color;
      }

      if (lastOpacity !== ac.opacity || lastStyle !== ac.renderStyle) {
        objectGroup.traverse(child => {
          if (child instanceof THREE.Mesh) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((m: any) => {
              m.transparent = true;
              m.opacity = ac.opacity;
              if ('wireframe' in m) m.wireframe = ac.renderStyle === 'wireframe';
              m.needsUpdate = true;
            });
            // Points render style
            if (ac.renderStyle === 'points') {
              const pts = new THREE.Points(
                child.geometry,
                new THREE.PointsMaterial({ color: new THREE.Color(ac.color), size: 0.05, transparent: true, opacity: ac.opacity })
              );
              child.visible = false;
              child.parent?.add(pts);
            }
          }
        });
        lastOpacity = ac.opacity; lastStyle = ac.renderStyle;
      }

      objectGroup.visible = !(ac.specialEffect === 'flicker' && Math.random() > ac.flickerRate);

      let dynScale = ac.scale;
      if (ac.audioReactive) dynScale *= (1.0 + ac.audioValue * 0.7);
      if (ac.specialEffect === 'scanlines') dynScale *= 1.0 + Math.sin(rotation * ac.scanlinesSpeed) * ac.scanlinesIntensity;
      objectGroup.rotation.y = rotation;
      objectGroup.scale.setScalar(dynScale);
      rotation += ac.speed * 0.012;

      const cW = container.clientWidth;
      const cH = container.clientHeight;

      renderer.clear();
      renderer.setScissorTest(true);

      // cameraZ slider: 1=çok yakın, 20=uzak — doğrudan birim olarak kullan
      const cameraRadius = ac.cameraZ;
      const elevRad = Math.PI / 2; // 90° — düz yatay

      VIEWS.forEach((v, i) => {
        const cam = cameras[i];
        const angleRad = v.angle * Math.PI / 180;

        cam.position.x = cameraRadius * Math.sin(elevRad) * Math.cos(angleRad);
        cam.position.z = cameraRadius * Math.sin(elevRad) * Math.sin(angleRad);
        cam.position.y = cameraRadius * Math.cos(elevRad);
        cam.lookAt(0, 0, 0);
        cam.rotation.z = (v.rotZ * Math.PI / 180) - Math.PI;
        cam.aspect = 1;
        cam.updateProjectionMatrix();

        const left   = Math.floor(cW * v.left);
        const bottom = Math.floor(cH * v.bottom);
        const width  = Math.floor(cW * v.width);
        const height = Math.floor(cH * v.height);

        renderer.setViewport(left, bottom, width, height);
        renderer.setScissor(left, bottom, width, height);
        renderer.setClearColor(0x000000, 1);
        renderer.clearColor();

        // Bloom aktifse composer, değilse direkt render
        if (ac.bloomStrength > 0.01) {
          const composer = bloomComposers[i];
          const bloom = composer.passes[1] as UnrealBloomPass;
          bloom.strength = ac.bloomStrength;
          bloom.radius = ac.bloomRadius;
          bloom.threshold = ac.bloomThreshold;
          composer.setSize(width, height);
          composer.render();
        } else {
          renderer.render(scene, cam);
        }
      });

      renderer.setScissorTest(false);

      // Guide
      drawGuide(cW, cH);
    };

    render();

    const onResize = () => {
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafId);
      bloomComposers.forEach(c => c.dispose());
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      if (container.contains(guideCanvas)) container.removeChild(guideCanvas);
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
