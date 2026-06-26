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
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);
  const groupsRef = useRef<THREE.Group[]>([]);
  const calibrationRef = useRef<THREE.Group | null>(null);
  const sparklesRef = useRef<THREE.Points[]>([]);
  const composerRef = useRef<EffectComposer | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const configRef = useRef(config);

  useEffect(() => { configRef.current = config; }, [config]);

  const textTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const textCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const updateTextTexture = (text: string, color: string) => {
    if (!textCanvasRef.current) {
      textCanvasRef.current = document.createElement('canvas');
      textCanvasRef.current.width = 512;
      textCanvasRef.current.height = 128;
    }
    const canvas = textCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const fontSize = text.length > 8 ? Math.max(30, 80 - text.length * 3) : 55;
    ctx.font = `bold ${fontSize}px "Courier New", Courier, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.fillStyle = color;
    ctx.fillText(text.toUpperCase(), canvas.width / 2, canvas.height / 2);
    ctx.shadowBlur = 2;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text.toUpperCase(), canvas.width / 2, canvas.height / 2);
    if (textTextureRef.current) textTextureRef.current.needsUpdate = true;
    else textTextureRef.current = new THREE.CanvasTexture(canvas);
  };

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 100);
    camera.position.z = configRef.current.cameraZ;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 6-point cinematic jewelry studio lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));

    const keyLight = new THREE.DirectionalLight(0xfff8e7, 2.8);
    keyLight.position.set(5, 8, 6);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe0f0ff, 1.8);
    fillLight.position.set(-6, 3, 4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 3.2);
    rimLight.position.set(0, 4, -8);
    scene.add(rimLight);

    const bottomLight = new THREE.DirectionalLight(0xffffff, 1.6);
    bottomLight.position.set(0, -6, 2);
    scene.add(bottomLight);

    const accent1 = new THREE.PointLight(0xffccaa, 3.5, 12);
    accent1.position.set(2, 1, 3);
    scene.add(accent1);

    const accent2 = new THREE.PointLight(0xaaccff, 3.5, 12);
    accent2.position.set(-2, 1, -3);
    scene.add(accent2);

    // Bloom post-processing
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      configRef.current.bloomStrength,
      configRef.current.bloomRadius,
      configRef.current.bloomThreshold
    );
    bloomPassRef.current = bloomPass;
    composer.addPass(bloomPass);
    composerRef.current = composer;

    const buildHologramMeshes = async () => {
      groupsRef.current.forEach(g => scene.remove(g));
      groupsRef.current = [];
      sparklesRef.current = [];

      const activeConfig = configRef.current;
      const parsedColor = new THREE.Color(activeConfig.color);
      const isPoints = activeConfig.renderStyle === 'points';

      let meshMaterial: THREE.Material;
      if (isPoints) {
        meshMaterial = new THREE.PointsMaterial({ color: parsedColor, size: 0.12, transparent: true, opacity: activeConfig.opacity, blending: THREE.AdditiveBlending });
      } else if (activeConfig.renderStyle === 'hybrid') {
        meshMaterial = new THREE.MeshStandardMaterial({ color: parsedColor, transparent: true, opacity: activeConfig.opacity * 0.45, roughness: 0.05, metalness: 0.95, side: THREE.DoubleSide, envMapIntensity: 1.5 });
      } else {
        meshMaterial = new THREE.MeshStandardMaterial({ color: parsedColor, transparent: true, opacity: activeConfig.opacity, wireframe: activeConfig.renderStyle === 'wireframe', side: THREE.DoubleSide, roughness: 0.05, metalness: 0.95, envMapIntensity: 1.5 });
      }

      const parseLoadedGeometry = (object: THREE.Object3D | THREE.BufferGeometry, isGeometry = false) => {
        let mesh: THREE.Object3D;
        if (isGeometry && object instanceof THREE.BufferGeometry) {
          const stlMat = new THREE.MeshStandardMaterial({ color: activeConfig.useOriginalMaterials ? 0xeeeeee : parsedColor, metalness: 0.9, roughness: 0.08, side: THREE.DoubleSide, transparent: true, opacity: activeConfig.opacity });
          mesh = new THREE.Mesh(object, stlMat);
        } else {
          mesh = object as THREE.Object3D;
          mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              if (!activeConfig.useOriginalMaterials) {
                child.material = meshMaterial;
              } else if (child.material) {
                (child.material as any).transparent = true;
                (child.material as any).opacity = activeConfig.opacity;
                (child.material as any).metalness = 0.9;
                (child.material as any).roughness = 0.08;
                (child.material as any).envMapIntensity = 1.5;
              }
            }
          });
        }
        return mesh;
      };

      const centerAndScale = (mesh: THREE.Object3D, targetMaxSize = 2.8) => {
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        const sf = targetMaxSize / (Math.max(size.x, size.y, size.z) || 1);
        mesh.scale.set(sf, sf, sf);
        const center = box.getCenter(new THREE.Vector3());
        mesh.position.sub(center.multiplyScalar(sf));
        return mesh;
      };

      if (activeConfig.showroomMode) {
        const compositeGroup = new THREE.Group();
        const gltfL = new GLTFLoader();
        const objL = new OBJLoader();
        const stlL = new STLLoader();

        const loadModelPromise = (url: string | null, format: 'gltf' | 'obj' | 'stl' | null, position: THREE.Vector3, scaleSize: number, isLogo = false): Promise<THREE.Object3D> => {
          return new Promise((resolve) => {
            if (!url) {
              const geo = isLogo ? new THREE.IcosahedronGeometry(0.4, 1) : new THREE.OctahedronGeometry(0.28, 0);
              const mat = new THREE.MeshStandardMaterial({ color: isLogo ? 0xffd700 : parsedColor, wireframe: true, transparent: true, opacity: 0.8, metalness: 1.0, roughness: 0.05 });
              const p = new THREE.Mesh(geo, mat); p.position.copy(position); resolve(p); return;
            }
            const onLoad = (obj: THREE.Object3D | THREE.BufferGeometry, isGeo: boolean) => {
              const mesh = parseLoadedGeometry(obj, isGeo);
              centerAndScale(mesh, scaleSize); mesh.position.copy(position); resolve(mesh);
            };
            const onErr = () => {
              const f = new THREE.Mesh(new THREE.IcosahedronGeometry(scaleSize * 0.4, 0), meshMaterial);
              f.position.copy(position); resolve(f);
            };
            if (format === 'obj') objL.load(url, o => onLoad(o, false), undefined, onErr);
            else if (format === 'stl') stlL.load(url, g => onLoad(g, true), undefined, onErr);
            else gltfL.load(url, gltf => onLoad(gltf.scene, false), undefined, onErr);
          });
        };

        const loadedObjects = await Promise.all([
          loadModelPromise(activeConfig.slot1Url, activeConfig.slot1Format, new THREE.Vector3(0, 0, -1.4), 0.7),
          loadModelPromise(activeConfig.slot2Url, activeConfig.slot2Format, new THREE.Vector3(1.4, 0, 0), 0.7),
          loadModelPromise(activeConfig.slot3Url, activeConfig.slot3Format, new THREE.Vector3(0, 0, 1.4), 0.7),
          loadModelPromise(activeConfig.slot4Url, activeConfig.slot4Format, new THREE.Vector3(-1.4, 0, 0), 0.7),
          loadModelPromise(activeConfig.slot5Url, activeConfig.slot5Format, new THREE.Vector3(0, 0, 0), 1.0, true),
        ]);
        loadedObjects.forEach(o => compositeGroup.add(o));

        if (activeConfig.specialEffect === 'sparkles') {
          const sg = new THREE.BufferGeometry();
          const sp = new Float32Array(30 * 3);
          for (let i = 0; i < 30; i++) { sp[i*3] = (Math.random()-0.5)*4; sp[i*3+1] = (Math.random()-0.5)*4; sp[i*3+2] = (Math.random()-0.5)*2.5; }
          sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
          const sparkles = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending }));
          compositeGroup.add(sparkles);
          sparklesRef.current.push(sparkles);
        }

        const wrapper = new THREE.Group(); wrapper.add(compositeGroup); wrapper.position.set(0, 0, 0);
        scene.add(wrapper); groupsRef.current.push(wrapper);
        return;
      }

      if (activeConfig.objectType === 'customModel' && activeConfig.customModelUrl) {
        const loadSingle = (obj: THREE.Object3D | THREE.BufferGeometry, isGeo: boolean) => {
          const mesh = parseLoadedGeometry(obj, isGeo); centerAndScale(mesh, 2.8);
          const w = new THREE.Group(); w.add(mesh); buildFourWaySymmetry(w);
        };
        const onErr = () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), meshMaterial)); buildFourWaySymmetry(g); };
        try {
          if (activeConfig.customModelFormat === 'obj') new OBJLoader().load(activeConfig.customModelUrl, o => loadSingle(o, false), undefined, onErr);
          else if (activeConfig.customModelFormat === 'stl') new STLLoader().load(activeConfig.customModelUrl, g => loadSingle(g, true), undefined, onErr);
          else new GLTFLoader().load(activeConfig.customModelUrl, gltf => loadSingle(gltf.scene, false), undefined, onErr);
          return;
        } catch (e) { console.error("Model yükleme hatası:", e); }
      }

      if (activeConfig.objectType === 'text') {
        updateTextTexture(activeConfig.text || "HOLO", activeConfig.color);
        const textMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 0.9), new THREE.MeshBasicMaterial({ map: textTextureRef.current, transparent: true, opacity: activeConfig.opacity, side: THREE.DoubleSide }));
        buildFourWaySymmetry(textMesh);
      }
    };

    const buildFourWaySymmetry = (templateMesh: THREE.Object3D) => {
      const activeConfig = configRef.current;
      const d = activeConfig.distance;
      const allCfgs = [
        { pos: [0, -d, 0] as [number,number,number], rotZ: 0, rotY: 0 },
        { pos: [0, d, 0] as [number,number,number], rotZ: Math.PI, rotY: Math.PI },
        { pos: [-d, 0, 0] as [number,number,number], rotZ: -Math.PI/2, rotY: -Math.PI/2 },
        { pos: [d, 0, 0] as [number,number,number], rotZ: Math.PI/2, rotY: Math.PI/2 },
      ];

      allCfgs.slice(0, activeConfig.cloneCount).forEach(cfg => {
        const clone = templateMesh.clone();
        const gw = new THREE.Group();
        gw.position.set(cfg.pos[0], cfg.pos[1], 0);
        gw.rotation.z = cfg.rotZ;
        clone.rotation.y = cfg.rotY;
        gw.add(clone);

        if (activeConfig.specialEffect === 'sparkles') {
          const sg = new THREE.BufferGeometry();
          const sp = new Float32Array(12 * 3);
          for (let i = 0; i < 12; i++) { sp[i*3] = (Math.random()-0.5)*2.2; sp[i*3+1] = (Math.random()-0.5)*2.2; sp[i*3+2] = (Math.random()-0.5)*1.5; }
          sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
          const sparkles = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.14, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending }));
          gw.add(sparkles); sparklesRef.current.push(sparkles);
        }

        scene.add(gw); groupsRef.current.push(gw);
      });
    };

    const buildCalibrationGuides = () => {
      if (calibrationRef.current) scene.remove(calibrationRef.current);
      const activeConfig = configRef.current;
      if (!activeConfig.showGuide) return;

      const guideGroup = new THREE.Group();
      const colorVal = new THREE.Color(activeConfig.guideColor);
      const mat = new THREE.MeshBasicMaterial({ color: colorVal, transparent: true, opacity: 0.85 });

      if (activeConfig.guideType === 'dot') {
        guideGroup.add(new THREE.Mesh(new THREE.CircleGeometry(0.12, 32), mat));
      } else if (activeConfig.guideType === 'crosshair') {
        const ll = 1.6;
        const lm = new THREE.LineBasicMaterial({ color: colorVal, transparent: true, opacity: 0.75 });
        guideGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-ll/2,0,0), new THREE.Vector3(ll/2,0,0)]), lm));
        guideGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-ll/2,0), new THREE.Vector3(0,ll/2,0)]), lm));
        const circ = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.43, 32), mat);
        circ.position.z = 0.01; guideGroup.add(circ);
      } else if (activeConfig.guideType === 'target') {
        [0.2, 0.6, 1.2].forEach((r, i) => guideGroup.add(new THREE.Mesh(new THREE.RingGeometry(r, r+0.02, 32), mat)));
        const cl = 2.4;
        const lm = new THREE.LineBasicMaterial({ color: colorVal, transparent: true, opacity: 0.5 });
        guideGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-cl/2,0,0), new THREE.Vector3(cl/2,0,0)]), lm));
        guideGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-cl/2,0), new THREE.Vector3(0,cl/2,0)]), lm));
      }

      scene.add(guideGroup); calibrationRef.current = guideGroup;
    };

    buildHologramMeshes();
    buildCalibrationGuides();

    let lastObjectType = configRef.current.objectType;
    let lastColor = configRef.current.color;
    let lastStyle = configRef.current.renderStyle;
    let lastGuideType = configRef.current.guideType;
    let lastGuideShow = configRef.current.showGuide;
    let lastGuideColor = configRef.current.guideColor;
    let lastText = configRef.current.text;
    let lastCustomModelUrl = configRef.current.customModelUrl;
    let lastUseOriginalMaterials = configRef.current.useOriginalMaterials;
    let lastCloneCount = configRef.current.cloneCount;
    let lastSpecialEffect = configRef.current.specialEffect;
    let lastShowroomMode = configRef.current.showroomMode;
    let lastS1 = configRef.current.slot1Url;
    let lastS2 = configRef.current.slot2Url;
    let lastS3 = configRef.current.slot3Url;
    let lastS4 = configRef.current.slot4Url;
    let lastS5 = configRef.current.slot5Url;

    let globalRotation = 0;

    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);
      const ac = configRef.current;

      let dynamicScale = ac.scale;
      if (ac.audioReactive) dynamicScale = ac.scale * (1.0 + ac.audioValue * 0.7);

      if (lastObjectType !== ac.objectType || lastColor !== ac.color || lastStyle !== ac.renderStyle || lastText !== ac.text || lastCustomModelUrl !== ac.customModelUrl || lastUseOriginalMaterials !== ac.useOriginalMaterials || lastCloneCount !== ac.cloneCount || lastSpecialEffect !== ac.specialEffect || lastShowroomMode !== ac.showroomMode || lastS1 !== ac.slot1Url || lastS2 !== ac.slot2Url || lastS3 !== ac.slot3Url || lastS4 !== ac.slot4Url || lastS5 !== ac.slot5Url) {
        buildHologramMeshes();
        lastObjectType = ac.objectType; lastColor = ac.color; lastStyle = ac.renderStyle; lastText = ac.text; lastCustomModelUrl = ac.customModelUrl; lastUseOriginalMaterials = ac.useOriginalMaterials; lastCloneCount = ac.cloneCount; lastSpecialEffect = ac.specialEffect; lastShowroomMode = ac.showroomMode; lastS1 = ac.slot1Url; lastS2 = ac.slot2Url; lastS3 = ac.slot3Url; lastS4 = ac.slot4Url; lastS5 = ac.slot5Url;
      }

      if (lastGuideType !== ac.guideType || lastGuideShow !== ac.showGuide || lastGuideColor !== ac.guideColor) {
        buildCalibrationGuides();
        lastGuideType = ac.guideType; lastGuideShow = ac.showGuide; lastGuideColor = ac.guideColor;
      }

      // Canlı güncellenenler: kamera pozisyonu + bloom parametreleri
      if (cameraRef.current) cameraRef.current.position.z = ac.cameraZ;
      if (bloomPassRef.current) {
        bloomPassRef.current.strength = ac.bloomStrength;
        bloomPassRef.current.radius = ac.bloomRadius;
        bloomPassRef.current.threshold = ac.bloomThreshold;
      }

      globalRotation += ac.speed * 0.015;

      groupsRef.current.forEach((gw, index) => {
        if (!ac.showroomMode) {
          const positions = [[0,-ac.distance,0],[0,ac.distance,0],[-ac.distance,0,0],[ac.distance,0,0]];
          const p = positions[index] ?? [0,0,0];
          gw.position.set(p[0], p[1], 0);
        } else {
          gw.position.set(0, 0, 0);
        }

        const inner = gw.children[0];
        if (inner) {
          inner.scale.set(dynamicScale, dynamicScale, dynamicScale);
          inner.rotation.y = globalRotation;
          inner.rotation.x = globalRotation * 0.25;
          if (ac.specialEffect === 'flicker' && Math.random() > 0.94) inner.scale.set(0, 0, 0);
          if (ac.specialEffect === 'scanlines') {
            const pulse = 1.0 + Math.sin(globalRotation * 8.0) * 0.04;
            inner.scale.set(dynamicScale * pulse, dynamicScale, dynamicScale * pulse);
          }
        }
      });

      if (ac.specialEffect === 'sparkles' && sparklesRef.current.length > 0) {
        sparklesRef.current.forEach(sparkles => {
          const positions = sparkles.geometry.attributes.position as THREE.BufferAttribute;
          for (let i = 0; i < positions.count; i++) {
            (positions.array as Float32Array)[i * 3 + 1] += 0.015;
            if ((positions.array as Float32Array)[i * 3 + 1] > 1.5) (positions.array as Float32Array)[i * 3 + 1] = -1.5;
          }
          positions.needsUpdate = true;
          (sparkles.material as THREE.PointsMaterial).opacity = 0.5 + Math.sin(globalRotation * 5.0) * 0.45;
        });
      }

      if (composerRef.current) composerRef.current.render();
      else renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composerRef.current?.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      renderer.dispose();
      if (mountRef.current && renderer.domElement) mountRef.current.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`${className ?? ''} relative overflow-hidden bg-black select-none cursor-pointer`}
      style={{ minHeight: isFullScreen ? '100vh' : '450px' }}
    />
  );
}
