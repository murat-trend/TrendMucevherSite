"use client";

// UV — mesh → UV → displacement pipeline (izole süper-admin DENEY, trendmucevher).
// AŞAMA 1 (bu dosya): mesh yükle (.glb/.gltf/.obj/.stl) + three.js görüntüleyici.
// Sonraki aşamalar: UV kaynağı (uploaded/prosedürel/xatlas) → desen height-map
// displacement → GLB export. Blender YOK; saf-JS (three + gltf-transform).

import { useCallback, useEffect, useRef, useState } from "react";

type Viewer = {
  THREE: typeof import("three");
  scene: import("three").Scene;
  camera: import("three").PerspectiveCamera;
  renderer: import("three").WebGLRenderer;
  controls: { update: () => void; dispose: () => void; target: import("three").Vector3; enabled: boolean };
  transform: {
    attach: (o: import("three").Object3D) => void;
    detach: () => void;
    setMode: (m: "translate" | "rotate" | "scale") => void;
    setSpace: (s: "world" | "local") => void;
  } | null;
  current: import("three").Object3D | null;
};

export function UvClient() {
  const mountRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Desen (height-map kaynağı) — Nakkaş'tan indirip buraya yükle.
  const [desenUrl, setDesenUrl] = useState<string | null>(null);

  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [meshLoaded, setMeshLoaded] = useState(false);
  const [gizmoMode, setGizmoMode] = useState<"translate" | "rotate" | "scale">("rotate");

  function setGizmo(m: "translate" | "rotate" | "scale") {
    viewerRef.current?.transform?.setMode(m);
    setGizmoMode(m);
  }

  // ── Rhino-style texture mapping ── projeksiyon primitifi + mapping widget (gizmo).
  type ProjType = "planar" | "cylindrical" | "box" | "spherical";
  const [projType, setProjType] = useState<ProjType>("cylindrical");
  const [mappingActive, setMappingActive] = useState(false);
  const [widgetVisible, setWidgetVisible] = useState(true);
  const [gizmoTarget, setGizmoTarget] = useState<"model" | "mapping">("model");
  const widgetRef = useRef<import("three").Object3D | null>(null);
  const desenTexRef = useRef<import("three").Texture | null>(null);

  function onPickDesen(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    desenTexRef.current = null; // yeni desen → texture'ı yeniden yükle
    const reader = new FileReader();
    reader.onload = () => setDesenUrl(reader.result as string);
    reader.readAsDataURL(f);
  }

  // three.js sahnesini bir kez kur (client-only, dynamic import — SSR yok).
  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    (async () => {
      const THREE = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      const { TransformControls } = await import("three/examples/jsm/controls/TransformControls.js");
      const mount = mountRef.current;
      if (!mount || disposed) return;

      const width = mount.clientWidth || 640;
      const height = mount.clientHeight || 420;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0a0b0e);

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 1000);
      camera.position.set(0, 1.2, 3.4);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      mount.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.target.set(0, 0, 0);

      scene.add(new THREE.AmbientLight(0xffffff, 0.65));
      const key = new THREE.DirectionalLight(0xffffff, 1.1);
      key.position.set(3, 5, 4);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xffffff, 0.4);
      fill.position.set(-4, 2, -3);
      scene.add(fill);

      const grid = new THREE.GridHelper(10, 20, 0x2a2a2a, 0x1a1a1a);
      scene.add(grid);

      // Gizmo (gumbul) — mesh'in eksenlerini/yönünü ayarlamak için. Sürüklerken
      // orbit'i kapat (çakışmasın). r169+ API: görsel için getHelper() sahneye eklenir.
      const transform = new TransformControls(camera, renderer.domElement);
      transform.setMode("rotate");
      transform.setSpace("local");
      transform.addEventListener("dragging-changed", (event) => {
        controls.enabled = !(event as { value: boolean }).value;
      });
      scene.add(transform.getHelper());

      viewerRef.current = { THREE, scene, camera, renderer, controls, transform, current: null };

      let raf = 0;
      const animate = () => {
        controls.update();
        renderer.render(scene, camera);
        raf = requestAnimationFrame(animate);
      };
      animate();

      const onResize = () => {
        const w = mount.clientWidth || 640;
        const h = mount.clientHeight || 420;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener("resize", onResize);

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", onResize);
        transform.detach();
        (transform as unknown as { dispose: () => void }).dispose();
        controls.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  const onFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const viewer = viewerRef.current;
    if (!viewer) {
      setError("Görüntüleyici hazır değil, biraz bekleyip tekrar deneyin.");
      return;
    }
    setError(null);
    setLoading(true);
    setStatus("Yükleniyor…");
    try {
      const { THREE, scene } = viewer;
      const ext = file.name.split(".").pop()?.toLowerCase();
      const buf = await file.arrayBuffer();

      let object: import("three").Object3D | null = null;
      if (ext === "glb" || ext === "gltf") {
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
        const gltf = await new GLTFLoader().parseAsync(buf, "");
        object = gltf.scene;
      } else if (ext === "obj") {
        const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader.js");
        object = new OBJLoader().parse(new TextDecoder().decode(buf));
      } else if (ext === "stl") {
        const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
        const geo = new STLLoader().parse(buf);
        geo.computeVertexNormals();
        object = new THREE.Mesh(
          geo,
          new THREE.MeshStandardMaterial({ color: 0xb08d57, metalness: 0.2, roughness: 0.55 }),
        );
      } else {
        setError("Desteklenmeyen format. .glb .gltf .obj .stl yükleyin.");
        setStatus("");
        setLoading(false);
        return;
      }

      // Nötr metal materyali ver (görsel tutarlılık için) + üçgen say.
      let tris = 0;
      object.traverse((o: import("three").Object3D) => {
        const mesh = o as import("three").Mesh;
        if ((mesh as { isMesh?: boolean }).isMesh && mesh.geometry) {
          const g = mesh.geometry;
          tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
          if (!g.attributes.normal) g.computeVertexNormals();
          mesh.material = new THREE.MeshStandardMaterial({
            color: 0xb08d57,
            metalness: 0.25,
            roughness: 0.5,
          });
        }
      });

      // Önceki mesh'i kaldır + GPU belleğini serbest bırak (dispose).
      if (viewer.current) {
        viewer.transform?.detach();
        scene.remove(viewer.current);
        viewer.current.traverse((o: import("three").Object3D) => {
          const m = o as import("three").Mesh;
          if ((m as { isMesh?: boolean }).isMesh) {
            m.geometry?.dispose();
            const mat = m.material;
            (Array.isArray(mat) ? mat : [mat]).forEach((mm) => mm?.dispose());
          }
        });
      }
      // Yeni mesh → varsa mapping widget'ını kaldır + durumu sıfırla.
      if (widgetRef.current) {
        scene.remove(widgetRef.current);
        widgetRef.current = null;
      }
      setApplied(false);
      setMappingActive(false);
      setGizmoTarget("model");

      // Ortala + sahneye sığdır (max=2 birim) + TABANI grid'e (y=0) otur.
      // 1) Ham (ölçeksiz) bbox'tan hedef ölçeği hesapla.
      const preBox = new THREE.Box3().setFromObject(object);
      const preSize = preBox.getSize(new THREE.Vector3());
      const maxDim = Math.max(preSize.x, preSize.y, preSize.z) || 1;
      object.scale.setScalar(2 / maxDim);

      // 2) Ölçekten SONRA dünya matrisini güncelle + bbox'ı yeniden ölç (kritik).
      object.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());

      // 3) X/Z merkezle, tabanı y=0'a indir → box.min.y === 0 (grid'e oturur).
      object.position.x -= center.x;
      object.position.z -= center.z;
      object.position.y -= box.min.y;

      scene.add(object);
      viewer.current = object;

      // 4) Kamerayı + orbit hedefini modele göre çerçevele (paylaşılan).
      frameCamera(viewer, object);

      // Gizmo'yu yeni mesh'e bağla (eksen/yön ayarı).
      viewer.transform?.attach(object);

      const hasUV = (() => {
        let uv = false;
        object!.traverse((o: import("three").Object3D) => {
          const mesh = o as import("three").Mesh;
          if ((mesh as { isMesh?: boolean }).isMesh && mesh.geometry?.attributes?.uv) uv = true;
        });
        return uv;
      })();

      setStatus(
        `${file.name} • ~${Math.round(tris).toLocaleString("tr-TR")} üçgen • UV: ${hasUV ? "VAR ✓" : "yok"}`,
      );
      setMeshLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yükleme hatası");
      setStatus("");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Rhino-style mapping ── projeksiyon widget'ı kur (mesh bbox'a göre) + gizmo'ya bağla.
  function buildWidget(pt: ProjType) {
    const v = viewerRef.current;
    if (!v || !v.current) return;
    const T = v.THREE;
    if (widgetRef.current) {
      v.transform?.detach();
      v.scene.remove(widgetRef.current);
      widgetRef.current.traverse((o: import("three").Object3D) => {
        const m = o as import("three").Mesh;
        if ((m as { isMesh?: boolean }).isMesh) {
          m.geometry?.dispose();
          (Array.isArray(m.material) ? m.material : [m.material]).forEach((mm) => mm?.dispose());
        }
      });
    }
    v.current.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(v.current);
    const size = box.getSize(new T.Vector3());
    const center = box.getCenter(new T.Vector3());

    let geo: import("three").BufferGeometry;
    if (pt === "planar") geo = new T.PlaneGeometry(1, 1);
    else if (pt === "cylindrical") geo = new T.CylinderGeometry(0.5, 0.5, 1, 32, 1, true);
    else if (pt === "box") geo = new T.BoxGeometry(1, 1, 1);
    else geo = new T.SphereGeometry(0.5, 32, 16);

    const wf = new T.Mesh(
      geo,
      new T.MeshBasicMaterial({ color: 0xb76e79, wireframe: true, transparent: true, opacity: 0.55, depthTest: false }),
    );
    const widget = new T.Group();
    widget.add(wf);
    widget.scale.set((size.x || 1) * 1.05, (size.y || 1) * 1.05, (size.z || 1) * 1.05);
    widget.position.copy(center);
    v.scene.add(widget);
    widgetRef.current = widget;

    v.transform?.attach(widget);
    setGizmoTarget("mapping");
    setMappingActive(true);
    setWidgetVisible(true);
  }

  // Gizmo hedefi: model'i yönlendir ↔ mapping widget'ı konumla.
  function setGizmoTargetTo(t: "model" | "mapping") {
    const v = viewerRef.current;
    if (!v || !v.transform) return;
    if (t === "mapping" && widgetRef.current) v.transform.attach(widgetRef.current);
    else if (v.current) v.transform.attach(v.current);
    setGizmoTarget(t);
  }

  // Widget'ı gizle/göster — deseni net görmek için silindiri kapat, sonra aç + düzenle.
  function toggleWidget() {
    const v = viewerRef.current;
    if (!v || !widgetRef.current) return;
    const next = !widgetVisible;
    widgetRef.current.visible = next;
    if (next) {
      v.transform?.attach(widgetRef.current);
      setGizmoTarget("mapping");
    } else {
      v.transform?.detach(); // gizle → gumbul da gizlensin
    }
    setWidgetVisible(next);
  }

  // Deseni seçili projeksiyonla mesh'e YANSIT — widget uzayında UV üret + texture map.
  async function applyMapping() {
    const v = viewerRef.current;
    if (!v || !v.current || !widgetRef.current || !desenUrl) return;
    setApplying(true);
    setError(null);
    try {
      const T = v.THREE;
      if (!desenTexRef.current) {
        const tex: import("three").Texture = await new Promise((res, rej) => {
          new T.TextureLoader().load(desenUrl, res, undefined, () => rej(new Error("Desen yüklenemedi.")));
        });
        tex.colorSpace = T.SRGBColorSpace;
        tex.wrapS = T.RepeatWrapping;
        tex.wrapT = T.RepeatWrapping;
        desenTexRef.current = tex;
      }
      const tex = desenTexRef.current;
      const widget = widgetRef.current;
      widget.updateMatrixWorld(true);
      const inv = new T.Matrix4().copy(widget.matrixWorld).invert();
      const p = new T.Vector3();
      const TAU = Math.PI * 2;
      const pt = projType;

      v.current.traverse((o: import("three").Object3D) => {
        const mesh = o as import("three").Mesh;
        if (!(mesh as { isMesh?: boolean }).isMesh || !mesh.geometry) return;
        const geo = mesh.geometry;
        const pos = geo.attributes.position as import("three").BufferAttribute;
        const uv = new Float32Array(pos.count * 2);
        mesh.updateWorldMatrix(true, false);
        const world = mesh.matrixWorld;
        for (let i = 0; i < pos.count; i++) {
          p.fromBufferAttribute(pos, i).applyMatrix4(world).applyMatrix4(inv); // widget-local
          let u = 0;
          let w = 0;
          if (pt === "planar") {
            u = p.x + 0.5;
            w = p.y + 0.5;
          } else if (pt === "cylindrical") {
            u = Math.atan2(p.x, p.z) / TAU + 0.5;
            w = p.y + 0.5;
          } else if (pt === "spherical") {
            const r = p.length() || 1e-6;
            u = Math.atan2(p.x, p.z) / TAU + 0.5;
            w = Math.asin(Math.max(-1, Math.min(1, p.y / r))) / Math.PI + 0.5;
          } else {
            const ax = Math.abs(p.x);
            const ay = Math.abs(p.y);
            const az = Math.abs(p.z);
            if (ax >= ay && ax >= az) {
              u = p.z + 0.5;
              w = p.y + 0.5;
            } else if (ay >= ax && ay >= az) {
              u = p.x + 0.5;
              w = p.z + 0.5;
            } else {
              u = p.x + 0.5;
              w = p.y + 0.5;
            }
          }
          uv[i * 2] = u;
          uv[i * 2 + 1] = w;
        }
        geo.setAttribute("uv", new T.BufferAttribute(uv, 2));
        const mat = mesh.material as import("three").MeshStandardMaterial;
        mat.map = tex;
        mat.needsUpdate = true;
      });

      setApplied(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yansıtma hatası");
    } finally {
      setApplying(false);
    }
  }

  // Kamerayı objeye çerçevele (onFile + resetView + unify paylaşır).
  function frameCamera(v: Viewer, obj: import("three").Object3D) {
    const T = v.THREE;
    obj.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(obj);
    const c = box.getCenter(new T.Vector3());
    const s = box.getSize(new T.Vector3());
    const m = Math.max(s.x, s.y, s.z) || 1;
    const dist = ((m / 2) / Math.tan((v.camera.fov * Math.PI) / 360)) * 1.6;
    v.camera.position.set(c.x, c.y + m * 0.4, c.z + dist);
    v.camera.near = m / 100;
    v.camera.far = m * 100;
    v.camera.updateProjectionMatrix();
    v.controls.target.copy(c);
    v.controls.update();
  }

  // Sahneyi yenile — kamerayı modele yeniden çerçevele (orbit/zoom sıfırla).
  function resetView() {
    const v = viewerRef.current;
    if (!v || !v.current) return;
    frameCamera(v, v.current);
  }

  // Unify (ZBrush) — modeli normalleştir: en uzun kenar = 2 birim + X/Z ortala,
  // taban grid'e (y=0). Döndürmeyi KORUR. Sonra kamerayı çerçevele.
  function unifyMesh() {
    const v = viewerRef.current;
    if (!v || !v.current) return;
    const T = v.THREE;
    const obj = v.current;
    obj.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(obj);
    const size = box.getSize(new T.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    obj.scale.multiplyScalar(2 / maxDim);
    obj.updateMatrixWorld(true);
    const box2 = new T.Box3().setFromObject(obj);
    const center2 = box2.getCenter(new T.Vector3());
    obj.position.x -= center2.x;
    obj.position.z -= center2.z;
    obj.position.y -= box2.min.y;
    frameCamera(v, obj);
  }

  // Rölyefli mesh'i GLB olarak indir (döküm/3D için).
  async function exportGlb() {
    const viewer = viewerRef.current;
    if (!viewer || !viewer.current) return;
    try {
      const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");
      const glb = (await new GLTFExporter().parseAsync(viewer.current, { binary: true })) as ArrayBuffer;
      const blob = new Blob([glb], { type: "model/gltf-binary" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `uv-rolyef-${Date.now()}.glb`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "GLB indirme hatası");
    }
  }

  return (
    <div className="min-h-screen bg-[#07080a] px-4 py-8 text-zinc-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-[#b76e79]">UV — Mesh Desen Mapping</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Gerçek CAD mesh&apos;i (MatrixGold/Rhino → .glb/.obj/.stl) yükle → gumbul ile eksenini ayarla →{" "}
            <strong>Rhino-style texture mapping</strong> (Planar/Cylindrical/Box/Spherical) + widget ile deseni
            yüzeye yansıt. Geometri korunur (tabla eğilmez). İzole süper-admin deney.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-4 rounded-xl border border-white/[0.06] bg-zinc-900/40 p-4">
            <div>
              <label className="mb-2 block text-sm font-medium">1) Mesh yükle</label>
              <label className="inline-block cursor-pointer rounded-lg bg-[#b76e79] px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110">
                {loading ? "Yükleniyor…" : "Mesh seç (.glb .gltf .obj .stl)"}
                <input
                  type="file"
                  accept=".glb,.gltf,.obj,.stl,model/gltf-binary,model/gltf+json"
                  className="hidden"
                  onChange={onFile}
                />
              </label>
            </div>

            {status ? (
              <p className="rounded-md border border-white/[0.06] bg-zinc-900/60 px-2.5 py-1.5 text-[11px] text-zinc-400">
                {status}
              </p>
            ) : null}
            {error ? (
              <p className="rounded-md border border-red-900/40 bg-red-950/30 px-2.5 py-1.5 text-[11px] text-red-400">
                {error}
              </p>
            ) : null}

            <div className="border-t border-white/[0.06] pt-4">
              <label className="mb-2 block text-sm font-medium">
                Eksen / Yönlendirme <span className="text-zinc-500">(gumbul — mesh&apos;i döndür/taşı)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {(["rotate", "translate", "scale"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setGizmo(m)}
                    disabled={!meshLoaded}
                    className={`rounded-lg border px-3 py-1.5 text-xs transition disabled:opacity-40 ${
                      gizmoMode === m
                        ? "border-[#b76e79] bg-[#b76e79]/20 text-[#e0a0aa]"
                        : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                    }`}
                  >
                    {m === "rotate" ? "Döndür" : m === "translate" ? "Taşı" : "Ölçek"}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={resetView}
                  disabled={!meshLoaded}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-zinc-500 disabled:opacity-40"
                >
                  Sahneyi yenile
                </button>
                <button
                  onClick={unifyMesh}
                  disabled={!meshLoaded}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-zinc-500 disabled:opacity-40"
                  title="Modeli normalleştir: en uzun kenar 2 birim + ortala + grid'e otur (ZBrush Unify)"
                >
                  Unify
                </button>
              </div>
              <p className="mt-2 text-[11px] text-zinc-500">
                Gumbulün <strong className="text-zinc-400">renkli halka/oklarını</strong> sürükle → mesh&apos;i
                eksende döndür/taşı (sürüklerken sahne dönmez). <strong className="text-zinc-400">Sahneyi
                yenile</strong> = kamerayı sıfırla. <strong className="text-zinc-400">Unify</strong> = modeli
                normalleştir + ortala (ZBrush).
              </p>
            </div>

            <div className="border-t border-white/[0.06] pt-4">
              <label className="mb-2 block text-sm font-medium">
                2) Desen yükle <span className="text-zinc-500">(height-map — Nakkaş çıktısı)</span>
              </label>
              <label className="inline-block cursor-pointer rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:border-zinc-500">
                Desen seç (.png .jpg)
                <input type="file" accept="image/*" className="hidden" onChange={onPickDesen} />
              </label>
              <p className="mt-1.5 text-[11px] text-zinc-500">
                Nakkaş&apos;ta ürettiğin deseni indir → buraya yükle. Aşağıdaki projeksiyon + gizmo ile
                mesh yüzeyine yansıtılır.
              </p>
              {desenUrl ? (
                <div className="mt-2 h-28 w-28 overflow-hidden rounded-lg border border-white/[0.06] bg-zinc-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={desenUrl} alt="desen" className="h-full w-full object-cover" />
                </div>
              ) : null}
            </div>

            <div className="border-t border-white/[0.06] pt-4">
              <label className="mb-2 block text-sm font-medium">3) Mapping (Rhino) — deseni yansıt</label>
              <div className="mb-2">
                <div className="mb-1 text-[11px] text-zinc-400">Projeksiyon tipi</div>
                <div className="flex flex-wrap gap-2">
                  {(["planar", "cylindrical", "box", "spherical"] as const).map((pt) => (
                    <button
                      key={pt}
                      onClick={() => {
                        setProjType(pt);
                        if (mappingActive) buildWidget(pt);
                      }}
                      disabled={!meshLoaded}
                      className={`rounded-lg border px-3 py-1.5 text-xs transition disabled:opacity-40 ${
                        projType === pt
                          ? "border-[#b76e79] bg-[#b76e79]/20 text-[#e0a0aa]"
                          : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                      }`}
                    >
                      {pt === "planar"
                        ? "Planar"
                        : pt === "cylindrical"
                          ? "Cylindrical"
                          : pt === "box"
                            ? "Box"
                            : "Spherical"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-2 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => buildWidget(projType)}
                  disabled={!meshLoaded}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-zinc-500 disabled:opacity-40"
                >
                  {mappingActive ? "Widget'ı yenile" : "Mapping başlat"}
                </button>
                {mappingActive ? (
                  <>
                    <div className="flex overflow-hidden rounded-lg border border-zinc-700 text-xs">
                      <button
                        onClick={() => setGizmoTargetTo("model")}
                        className={`px-3 py-1.5 ${gizmoTarget === "model" ? "bg-[#b76e79]/20 text-[#e0a0aa]" : "text-zinc-300"}`}
                      >
                        Gizmo: Model
                      </button>
                      <button
                        onClick={() => setGizmoTargetTo("mapping")}
                        className={`px-3 py-1.5 ${gizmoTarget === "mapping" ? "bg-[#b76e79]/20 text-[#e0a0aa]" : "text-zinc-300"}`}
                      >
                        Widget
                      </button>
                    </div>
                    <button
                      onClick={toggleWidget}
                      className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-zinc-500"
                    >
                      {widgetVisible ? "Widget'ı gizle" : "Widget'ı göster"}
                    </button>
                  </>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={applyMapping}
                  disabled={!mappingActive || !desenUrl || applying}
                  className="rounded-lg bg-[#b76e79] px-4 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                >
                  {applying ? "Yansıtılıyor…" : applied ? "Yeniden yansıt" : "Deseni yansıt"}
                </button>
                <button
                  onClick={exportGlb}
                  disabled={!applied || applying}
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:border-zinc-500 disabled:opacity-40"
                >
                  GLB indir
                </button>
              </div>
              <p className="mt-2 text-[11px] text-zinc-500">
                <strong className="text-zinc-400">Mapping başlat</strong> → projeksiyonun gül-renkli tel-kafes
                widget&apos;ı gelir, gumbul ona geçer. Widget&apos;ı konumla/döndür/ölçekle →{" "}
                <strong className="text-zinc-400">Deseni yansıt</strong> → desen o projeksiyonla yüzeye oturur
                (Cylindrical = banda sarar). <strong className="text-zinc-400">Gizmo: Model</strong> ile tekrar
                modeli yönlendirirsin.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Önizleme (sürükle-döndür)</h2>
              <span className="text-[11px] text-zinc-500">three.js</span>
            </div>
            <div
              ref={mountRef}
              className="h-[460px] w-full overflow-hidden rounded-lg border border-white/[0.06] bg-[#0a0b0e]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
