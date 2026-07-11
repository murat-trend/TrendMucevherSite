"use client";

// Sanal Kolye Deneme (Web AR) — canlı kamera + yüz takibi + 3D kolye render.
// Tüm işlem client-side; kamera görüntüsü hiçbir zaman sunucuya gönderilmez.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  Suspense,
} from "react";
import { useSearchParams } from "next/navigation";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import {
  loadFaceLandmarker,
  LM_CHIN,
  LM_FACE_LEFT,
  LM_FACE_RIGHT,
} from "./useFaceTracking";
import { OneEuroVec3, OneEuroQuat } from "./one-euro";

// ─── Ayar sabitleri (cihazda ince ayar için ?debug=1) ────────────────────────
const FACE_WIDTH_CM = 14; // ortalama insan yüz genişliği (234↔454)
const CAM_FOV = 50; // sanal kamera dikey FOV (derece)
const NECK_OFFSET_Y = -7.5; // çene ucundan aşağı (cm, baş-lokal)
const NECK_OFFSET_Z = -2.5; // çene düzleminden geriye (cm, baş-lokal)
const NECK_FOLLOW = 0.6; // boyun başı ne oranda takip eder (0-1)
const FADE_SPEED = 4; // opaklık geçiş hızı (1/sn) → ~500ms fade
const LOW_FPS_THRESHOLD = 15;

// Metal renk preset'leri (PBR baseColor)
const METALS = {
  yellow: { color: 0xffd27d, roughness: 0.2, label: { tr: "Sarı", en: "Yellow" } },
  white: { color: 0xe8e8e8, roughness: 0.1, label: { tr: "Beyaz", en: "White" } },
  rose: { color: 0xecb3a0, roughness: 0.18, label: { tr: "Rose", en: "Rose" } },
} as const;
type MetalKey = keyof typeof METALS;

// ─── i18n ─────────────────────────────────────────────────────────────────────
const T = {
  tr: {
    title: "Kolye Dene",
    startCamera: "Kamerayı Aç",
    privacy: "Görüntünüz cihazınızdan çıkmaz — tüm işlem tarayıcınızda yapılır.",
    starting: "Kamera açılıyor…",
    loadingModel: "Kolye hazırlanıyor…",
    findFace: "Yüzünüzü çerçeveye alın",
    denied: "Kameraya erişilemedi.",
    deniedHint:
      "Tarayıcı ayarlarından kamera iznini verin ve sayfayı yenileyin, ya da ürün fotoğraflarına göz atın.",
    retry: "Tekrar Dene",
    photo: "Fotoğraf Çek",
    back: "Geri Dön",
    tip: "En iyi sonuç için saçınızı toplayın ve aydınlık ortamda deneyin.",
    tipOk: "Anladım",
    modelError: "Model yüklenemedi, örnek kolye gösteriliyor.",
    metal: "Metal",
  },
  en: {
    title: "Try On Necklace",
    startCamera: "Open Camera",
    privacy: "Your image never leaves your device — everything runs in your browser.",
    starting: "Starting camera…",
    loadingModel: "Preparing necklace…",
    findFace: "Position your face in the frame",
    denied: "Camera access was denied.",
    deniedHint:
      "Allow camera access in your browser settings and refresh the page, or browse the product photos.",
    retry: "Try Again",
    photo: "Take Photo",
    back: "Go Back",
    tip: "For best results, tie your hair back and try in a well-lit area.",
    tipOk: "Got it",
    modelError: "Model could not be loaded; showing a sample necklace.",
    metal: "Metal",
  },
} as const;
type Lang = keyof typeof T;

type CameraState = "idle" | "starting" | "ready" | "denied";

// ─── Prosedürel test kolyesi (gerçek GLB beklemeden geliştirme/test) ─────────
function buildTestNecklace(): THREE.Group {
  const group = new THREE.Group();

  // Zincir eğrisi: boyundan göğse doğal drape (cm, origin = zincir tepe orta)
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-6.5, 0.5, -1.5),
    new THREE.Vector3(-4.5, -2.5, 0.8),
    new THREE.Vector3(0, -4.8, 1.6),
    new THREE.Vector3(4.5, -2.5, 0.8),
    new THREE.Vector3(6.5, 0.5, -1.5),
  ]);

  const goldMat = new THREE.MeshStandardMaterial({
    color: METALS.yellow.color,
    metalness: 1.0,
    roughness: METALS.yellow.roughness,
  });

  // Zincir: eğri boyunca küre boncuklar (InstancedMesh)
  const COUNT = 64;
  const bead = new THREE.SphereGeometry(0.22, 12, 12);
  const chain = new THREE.InstancedMesh(bead, goldMat, COUNT);
  const m = new THREE.Matrix4();
  for (let i = 0; i < COUNT; i++) {
    const p = curve.getPoint(i / (COUNT - 1));
    m.makeTranslation(p.x, p.y, p.z);
    chain.setMatrixAt(i, m);
  }
  chain.instanceMatrix.needsUpdate = true;
  group.add(chain);

  // Pendant: altın çerçeve + taş
  const bail = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.1, 10, 20), goldMat);
  bail.position.set(0, -5.1, 1.65);
  group.add(bail);

  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.7, 0),
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.02,
      transmission: 1.0,
      ior: 2.4,
      thickness: 0.6,
    }),
  );
  gem.position.set(0, -6.1, 1.7);
  gem.scale.set(1, 1.35, 1);
  group.add(gem);

  return group;
}

// ─── object-fit: cover koordinat dönüşümü ────────────────────────────────────
// Landmark'lar video kaynak karesine normalize; container'daki görünen piksele çevir.
function coverMap(
  nx: number,
  ny: number,
  vw: number,
  vh: number,
  cw: number,
  ch: number,
): { x: number; y: number; scale: number } {
  const scale = Math.max(cw / vw, ch / vh);
  const dispW = vw * scale;
  const dispH = vh * scale;
  const offX = (dispW - cw) / 2;
  const offY = (dispH - ch) / 2;
  return { x: nx * dispW - offX, y: ny * dispH - offY, scale };
}

function KolyeDeneInner() {
  const searchParams = useSearchParams();
  const modelId = searchParams.get("model"); // /public/models/necklaces/{id}.glb
  const debug = searchParams.get("debug") === "1";

  const [lang, setLang] = useState<Lang>("tr");
  const [camState, setCamState] = useState<CameraState>("idle");
  const [faceVisible, setFaceVisible] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [modelError, setModelError] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [metal, setMetal] = useState<MetalKey>("yellow");
  const [debugVals, setDebugVals] = useState({
    offY: NECK_OFFSET_Y,
    offZ: NECK_OFFSET_Z,
    follow: NECK_FOLLOW,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);

  // Three.js + tracking durumu (render döngüsü — state değil ref)
  const stateRef = useRef<{
    renderer?: THREE.WebGLRenderer;
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    anchor?: THREE.Group;
    necklace?: THREE.Group;
    materials: THREE.Material[];
    landmarker?: FaceLandmarker;
    stream?: MediaStream;
    raf?: number;
    lastTs: number;
    lastVideoTime: number;
    opacity: number;
    targetOpacity: number;
    posFilter: OneEuroVec3;
    quatFilter: OneEuroQuat;
    fpsSamples: number[];
    lowFpsApplied: boolean;
    running: boolean;
  }>({
    materials: [],
    lastTs: 0,
    lastVideoTime: -1,
    opacity: 0,
    targetOpacity: 0,
    posFilter: new OneEuroVec3(1.0, 0.01),
    quatFilter: new OneEuroQuat(1.0, 0.01),
    fpsSamples: [],
    lowFpsApplied: false,
    running: false,
  });
  const debugRef = useRef(debugVals);
  debugRef.current = debugVals;
  const t = T[lang];

  useEffect(() => {
    const docLang = document.documentElement.lang;
    setLang(docLang === "tr" ? "tr" : "en");
    if (!localStorage.getItem("kolye-dene-tip-seen")) setShowTip(true);
  }, []);

  const dismissTip = useCallback(() => {
    localStorage.setItem("kolye-dene-tip-seen", "1");
    setShowTip(false);
  }, []);

  // ── Kolye materyallerini topla (fade + metal swap için) ──
  const collectMaterials = useCallback((root: THREE.Object3D) => {
    const mats: THREE.Material[] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh && mesh.material) {
        const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const mat of list) {
          mat.transparent = true;
          mat.opacity = 0;
          mats.push(mat);
        }
      }
    });
    return mats;
  }, []);

  // ── Model yükleme ──
  const loadNecklace = useCallback(
    async (scene: THREE.Scene, anchor: THREE.Group) => {
      const s = stateRef.current;
      let necklace: THREE.Group | null = null;

      if (modelId && /^[\w-]+$/.test(modelId)) {
        try {
          const loader = new GLTFLoader();
          const draco = new DRACOLoader();
          draco.setDecoderPath(
            "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
          );
          loader.setDRACOLoader(draco);
          const gltf = await loader.loadAsync(
            `/models/necklaces/${modelId}.glb`,
          );
          necklace = gltf.scene;
          // GLB mm cinsinden → sahne birimi cm
          necklace.scale.setScalar(0.1);
        } catch {
          setModelError(true);
        }
      }
      if (!necklace) necklace = buildTestNecklace();

      s.necklace = necklace;
      s.materials = collectMaterials(necklace);
      anchor.add(necklace);
      setModelReady(true);
    },
    [modelId, collectMaterials],
  );

  // ── Metal rengi swap ──
  useEffect(() => {
    const s = stateRef.current;
    const preset = METALS[metal];
    for (const mat of s.materials) {
      const std = mat as THREE.MeshStandardMaterial;
      // sadece metal materyaller (taş = transmission'lı physical, atla)
      const phys = mat as THREE.MeshPhysicalMaterial;
      if (std.isMeshStandardMaterial && std.metalness > 0.5 && !phys.transmission) {
        std.color.setHex(preset.color);
        std.roughness = preset.roughness;
      }
    }
  }, [metal, modelReady]);

  // ── Ana kurulum: kamera + landmarker + three ──
  const start = useCallback(async () => {
    const s = stateRef.current;
    setCamState("starting");

    // 1) Kamera
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch {
      setCamState("denied");
      return;
    }
    s.stream = stream;
    const video = videoRef.current!;
    video.srcObject = stream;
    await video.play();

    // 2) Yüz takibi (paralel model indirme zaten tarayıcı cache'inde)
    try {
      s.landmarker = await loadFaceLandmarker();
    } catch {
      setCamState("denied");
      stream.getTracks().forEach((tr) => tr.stop());
      return;
    }

    // 3) Three.js sahnesi
    const host = canvasHostRef.current!;
    const cw = host.clientWidth;
    const ch = host.clientHeight;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true, // fotoğraf çekimi için
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(cw, ch);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const camera = new THREE.PerspectiveCamera(CAM_FOV, cw / ch, 1, 500);
    camera.position.set(0, 0, 0);

    const anchor = new THREE.Group();
    scene.add(anchor);

    s.renderer = renderer;
    s.scene = scene;
    s.camera = camera;
    s.anchor = anchor;
    s.running = true;

    void loadNecklace(scene, anchor);
    setCamState("ready");

    // 4) Render + tracking döngüsü
    const tmpMat4 = new THREE.Matrix4();
    const tmpPos = new THREE.Vector3();
    const tmpQuat = new THREE.Quaternion();
    const tmpScale = new THREE.Vector3();
    const outPos = new THREE.Vector3();
    const outQuat = new THREE.Quaternion();
    const identity = new THREE.Quaternion();

    const loop = (now: number) => {
      if (!s.running) return;
      s.raf = requestAnimationFrame(loop);

      const dt = s.lastTs ? (now - s.lastTs) / 1000 : 1 / 60;
      s.lastTs = now;

      // FPS izleme → düşükse taş transmission kapat
      s.fpsSamples.push(1 / Math.max(dt, 0.001));
      if (s.fpsSamples.length > 90) s.fpsSamples.shift();
      if (!s.lowFpsApplied && s.fpsSamples.length === 90) {
        const avg = s.fpsSamples.reduce((a, b) => a + b, 0) / 90;
        if (avg < LOW_FPS_THRESHOLD) {
          s.lowFpsApplied = true;
          for (const mat of s.materials) {
            const phys = mat as THREE.MeshPhysicalMaterial;
            if (phys.isMeshPhysicalMaterial && phys.transmission > 0) {
              phys.transmission = 0;
              phys.metalness = 0.2;
              phys.roughness = 0.05;
              phys.color.setHex(0xd8e8f0);
            }
          }
        }
      }

      const cwNow = host.clientWidth;
      const chNow = host.clientHeight;
      if (
        renderer.domElement.width !== Math.round(cwNow * renderer.getPixelRatio()) ||
        renderer.domElement.height !== Math.round(chNow * renderer.getPixelRatio())
      ) {
        renderer.setSize(cwNow, chNow);
        camera.aspect = cwNow / chNow;
        camera.updateProjectionMatrix();
      }

      // Yüz tespiti (video karesi değiştiyse)
      let detected = false;
      if (video.currentTime !== s.lastVideoTime && video.videoWidth > 0) {
        s.lastVideoTime = video.currentTime;
        const res = s.landmarker!.detectForVideo(video, now);
        const lms = res.faceLandmarks?.[0];
        const matData = res.facialTransformationMatrixes?.[0]?.data;

        if (lms && matData) {
          detected = true;
          const vw = video.videoWidth;
          const vh = video.videoHeight;

          // Baş rotasyonu — MediaPipe hazır matrisinden (landmark'tan hesaplama YOK)
          tmpMat4.fromArray(matData);
          tmpMat4.decompose(tmpPos, tmpQuat, tmpScale);
          // boyun başı kısmen takip eder
          tmpQuat.slerpQuaternions(identity, tmpQuat, debugRef.current.follow);

          // Ölçek/mesafe: yüz genişliği (234↔454) görünen px → sanal kamera mesafesi
          const l = coverMap(lms[LM_FACE_LEFT].x, lms[LM_FACE_LEFT].y, vw, vh, cwNow, chNow);
          const r = coverMap(lms[LM_FACE_RIGHT].x, lms[LM_FACE_RIGHT].y, vw, vh, cwNow, chNow);
          const faceWidthPx = Math.hypot(r.x - l.x, r.y - l.y);
          const focalPx = (chNow / 2) / Math.tan(THREE.MathUtils.degToRad(CAM_FOV) / 2);
          const dist = (FACE_WIDTH_CM * focalPx) / Math.max(faceWidthPx, 1);

          // Çene ucunu (152) o mesafede dünya uzayına unproject et
          const chin = coverMap(lms[LM_CHIN].x, lms[LM_CHIN].y, vw, vh, cwNow, chNow);
          const ndcX = (chin.x / cwNow) * 2 - 1;
          const ndcY = -((chin.y / chNow) * 2 - 1);
          tmpPos.set(ndcX, ndcY, 0.5).unproject(camera).normalize().multiplyScalar(dist);

          // Boyun ofseti: baş-lokal uzayda aşağı + geriye
          const offset = new THREE.Vector3(
            0,
            debugRef.current.offY,
            debugRef.current.offZ,
          ).applyQuaternion(tmpQuat);
          tmpPos.add(offset);

          // One-Euro filtre
          s.posFilter.filter(tmpPos, dt, outPos);
          s.quatFilter.filter(tmpQuat, dt, outQuat);
          anchor.position.copy(outPos);
          anchor.quaternion.copy(outQuat);
        }
        s.targetOpacity = detected ? 1 : 0;
        setFaceVisible((prev) => (prev !== detected ? detected : prev));
        if (!detected) {
          s.posFilter.reset();
          s.quatFilter.reset();
        }
      }

      // 500ms fade in/out
      if (s.opacity !== s.targetOpacity) {
        const dir = s.targetOpacity > s.opacity ? 1 : -1;
        s.opacity = THREE.MathUtils.clamp(
          s.opacity + dir * FADE_SPEED * dt,
          0,
          1,
        );
        for (const mat of s.materials) mat.opacity = s.opacity;
      }

      renderer.render(scene, camera);
    };
    s.raf = requestAnimationFrame(loop);
  }, [loadNecklace]);

  // ── Temizlik ──
  useEffect(() => {
    const s = stateRef.current;
    return () => {
      s.running = false;
      if (s.raf) cancelAnimationFrame(s.raf);
      s.stream?.getTracks().forEach((tr) => tr.stop());
      s.landmarker?.close();
      s.renderer?.dispose();
    };
  }, []);

  // ── Fotoğraf çek: video (cover+mirror) + 3D katman birleşik PNG ──
  const takePhoto = useCallback(() => {
    const s = stateRef.current;
    const video = videoRef.current;
    const host = canvasHostRef.current;
    if (!s.renderer || !video || !host) return;

    const cw = host.clientWidth;
    const ch = host.clientHeight;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const out = document.createElement("canvas");
    out.width = cw * dpr;
    out.height = ch * dpr;
    const ctx = out.getContext("2d")!;
    ctx.scale(dpr, dpr);

    // Ayna: tüm kompozit yatay çevrilir (ekranda göründüğü gibi)
    ctx.translate(cw, 0);
    ctx.scale(-1, 1);

    // Video: object-fit cover crop
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const scale = Math.max(cw / vw, ch / vh);
    const dw = vw * scale;
    const dh = vh * scale;
    ctx.drawImage(video, (cw - dw) / 2, (ch - dh) / 2, dw, dh);

    // 3D katman (renderer canvas'ı ayna öncesi uzayda — aynı transform geçerli)
    ctx.drawImage(s.renderer.domElement, 0, 0, cw, ch);

    const a = document.createElement("a");
    a.download = `kolye-deneme-${Date.now()}.png`;
    a.href = out.toDataURL("image/png");
    a.click();
  }, []);

  // ─── UI ───
  return (
    <div className="fixed inset-0 bg-[#07080a] text-white">
      <div ref={containerRef} className="relative h-full w-full overflow-hidden">
        {/* Kamera + 3D katmanı — ikisi birden CSS ile aynalanır */}
        <div
          className="absolute inset-0"
          style={{ transform: "scaleX(-1)" }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div ref={canvasHostRef} className="absolute inset-0" />
        </div>

        {/* ── Başlangıç ekranı ── */}
        {camState === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6 text-center">
            <h1 className="font-display text-3xl font-medium tracking-[-0.03em]">
              {t.title}
            </h1>
            <p className="max-w-sm text-sm text-[#c9a88a]">{t.privacy}</p>
            <button
              onClick={start}
              className="rounded-xl bg-gradient-to-r from-[#c4838b] to-[#a65f69] px-8 py-3 text-sm font-medium text-white shadow-lg transition hover:opacity-90"
            >
              {t.startCamera}
            </button>
          </div>
        )}

        {camState === "starting" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="animate-pulse text-sm text-[#c9a88a]">{t.starting}</p>
          </div>
        )}

        {/* ── İzin reddedildi fallback ── */}
        {camState === "denied" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-lg font-medium">{t.denied}</p>
            <p className="max-w-sm text-sm text-white/60">{t.deniedHint}</p>
            <button
              onClick={start}
              className="mt-2 rounded-xl border border-[#b76e79]/60 px-6 py-2.5 text-sm text-[#b76e79] transition hover:bg-[#b76e79]/10"
            >
              {t.retry}
            </button>
          </div>
        )}

        {/* ── Yüz aranıyor overlay ── */}
        {camState === "ready" && !faceVisible && (
          <div className="pointer-events-none absolute inset-x-0 top-16 flex justify-center">
            <span className="rounded-full bg-black/50 px-4 py-2 text-sm backdrop-blur">
              {modelReady ? t.findFace : t.loadingModel}
            </span>
          </div>
        )}

        {/* ── İlk açılış ipucu ── */}
        {camState === "ready" && showTip && (
          <div className="absolute inset-x-4 top-4 z-10 mx-auto max-w-md rounded-2xl border border-white/[0.06] bg-black/70 p-4 backdrop-blur">
            <p className="text-sm text-white/80">{t.tip}</p>
            <button
              onClick={dismissTip}
              className="mt-3 rounded-lg bg-[#b76e79]/20 px-4 py-1.5 text-xs text-[#b76e79]"
            >
              {t.tipOk}
            </button>
          </div>
        )}

        {modelError && (
          <div className="pointer-events-none absolute inset-x-0 bottom-28 flex justify-center">
            <span className="rounded-full bg-black/50 px-3 py-1.5 text-xs text-white/60 backdrop-blur">
              {t.modelError}
            </span>
          </div>
        )}

        {/* ── Debug ayar paneli (?debug=1) ── */}
        {debug && camState === "ready" && (
          <div className="absolute right-3 top-3 z-20 w-52 space-y-2 rounded-xl border border-white/[0.06] bg-black/70 p-3 text-xs backdrop-blur">
            {(
              [
                ["offY", -14, 0, 0.1],
                ["offZ", -8, 4, 0.1],
                ["follow", 0, 1, 0.05],
              ] as const
            ).map(([key, min, max, step]) => (
              <label key={key} className="block">
                <span className="font-mono text-white/60">
                  {key}: {debugVals[key].toFixed(2)}
                </span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={debugVals[key]}
                  onChange={(e) =>
                    setDebugVals((v) => ({ ...v, [key]: Number(e.target.value) }))
                  }
                  className="range-slider w-full"
                />
              </label>
            ))}
          </div>
        )}

        {/* ── Alt bar ── */}
        {camState === "ready" && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 bg-gradient-to-t from-black/70 to-transparent px-4 pb-6 pt-10">
            {/* Metal seçici */}
            <div className="flex gap-2 rounded-full bg-black/50 p-1.5 backdrop-blur">
              {(Object.keys(METALS) as MetalKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setMetal(key)}
                  aria-label={METALS[key].label[lang]}
                  className={`h-7 w-7 rounded-full border-2 transition ${
                    metal === key ? "border-white" : "border-transparent"
                  }`}
                  style={{
                    background: `#${METALS[key].color.toString(16).padStart(6, "0")}`,
                  }}
                />
              ))}
            </div>

            <button
              onClick={takePhoto}
              disabled={!faceVisible}
              className="rounded-xl bg-gradient-to-r from-[#c4838b] to-[#a65f69] px-6 py-2.5 text-sm font-medium text-white shadow-lg transition hover:opacity-90 disabled:opacity-40"
            >
              {t.photo}
            </button>

            <button
              onClick={() => history.back()}
              className="rounded-xl border border-white/[0.15] px-5 py-2.5 text-sm text-white/80 transition hover:bg-white/5"
            >
              {t.back}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function KolyeDeneClient() {
  return (
    <Suspense fallback={null}>
      <KolyeDeneInner />
    </Suspense>
  );
}
