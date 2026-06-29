"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import {
  AlertTriangle, CheckCircle2, Download, FileText, ListChecks,
  RotateCcw, Scissors, Scale, Upload, Wrench,
} from "lucide-react";
import { MeshCleanViewer, type MeshViewerHandle } from "./MeshCleanViewer";
import {
  analyzeGeometry, basicCleanup, keepLargestShell, deleteNonManifoldFaces,
  repairEdgesAndSmallHoles, fixWinding, scaleGeometry, scaleGeometryXYZ, hollowShell, hollowShellSDF,
  computeWeight, METALS, type MeshAnalysis, type MetalWeight,
} from "./lib/meshOps";
import { buildEtsyCard } from "./lib/etsyCard";
import { HollowMagicOverlay } from "./HollowMagicOverlay";
import { Ruler, ImageIcon, Compass, Wand2, Egg, Undo2, Redo2 } from "lucide-react";

type HollowResult = {
  shell: THREE.BufferGeometry;
  wallMm: number;
  solidCm3: number;
  cavityCm3: number;
  materialCm3: number;
  savingPct: number;
  weights: { key: string; label: string; grams: number }[];
};

type Log = { id: number; type: "info" | "ok" | "warn" | "err"; msg: string };

export function MeshTemizleClient() {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [analysis, setAnalysis] = useState<MeshAnalysis | null>(null);
  const [weight, setWeight] = useState<MetalWeight | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [targetMm, setTargetMm] = useState("");
  const [previewScale, setPreviewScale] = useState<[number, number, number]>([1, 1, 1]);
  const [exportName, setExportName] = useState("");
  const [gizmo, setGizmo] = useState(false);
  const [gizmoMode, setGizmoMode] = useState<"rotate" | "translate">("rotate");
  const [clip, setClip] = useState<{ enabled: boolean; axis: "x" | "y" | "z"; position: number; flip: boolean }>({ enabled: false, axis: "x", position: 0.5, flip: false });
  const [hollowWall, setHollowWall] = useState(1.0);
  const [shrinkPct, setShrinkPct] = useState(2.0);
  const [hollowMethod, setHollowMethod] = useState<"fast" | "sdf">("fast");
  const [hollow, setHollow] = useState<HollowResult | null>(null);
  const [showHollow, setShowHollow] = useState(false);
  const [hollowBusy, setHollowBusy] = useState(false);
  const [magic, setMagic] = useState<{ title: string; label: string }>({ title: "", label: "" });
  const [checkResult, setCheckResult] = useState<{ verdict: string; summary: string; checks: { id: string; label: string; status: string; detail: string }[] } | null>(null);
  const [checkBusy, setCheckBusy] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [showBadEdges, setShowBadEdges] = useState(true);
  const [logs, setLogs] = useState<Log[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const logBoxRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<MeshViewerHandle>(null);
  // geri/ileri al geçmişi (geometri yığını + mevcut indeks)
  const [hist, setHist] = useState<{ stack: THREE.BufferGeometry[]; idx: number }>({ stack: [], idx: -1 });

  function outputBaseName() {
    const custom = exportName.trim().replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "");
    if (custom) return `remaura-clean-mesh-${custom}`;
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
    return `remaura-clean-mesh-${stamp}`;
  }

  const addLog = useCallback((type: Log["type"], msg: string) => {
    const t = new Date().toLocaleTimeString("tr-TR", { hour12: false });
    setLogs((p) => [...p, { id: Date.now() + Math.random(), type, msg: `[${t}] ${msg}` }].slice(-40));
    requestAnimationFrame(() => logBoxRef.current?.scrollTo({ top: logBoxRef.current.scrollHeight }));
  }, []);

  const MAX_HIST = 24;
  // Geometriyi aktif yap (analiz + bağlı state'leri sıfırla). Geçmişe YAZMAZ.
  function setActive(next: THREE.BufferGeometry, label: string) {
    const a = analyzeGeometry(next);
    setGeometry(next);
    setAnalysis(a);
    setWeight(null); // geometri değişti, ağırlık tekrar hesaplanmalı
    setPreviewScale([1, 1, 1]); // önizleme ölçeğini sıfırla
    setHollow(null); setShowHollow(false); // boşaltma sonucu geçersiz
    setCheckResult(null); // önceki kontrol geçersiz
    addLog(a.watertight ? "ok" : "warn",
      `${label}: ${a.triangleCount.toLocaleString()} üçgen, ${a.shellCount} parça, ${a.boundaryEdges} açık kenar, ${a.nonManifoldEdges} non-manifold.`);
    return a;
  }
  // İşlem uygula + geçmişe kaydet (ileri dal kesilir)
  function apply(next: THREE.BufferGeometry, label: string) {
    const a = setActive(next, label);
    setHist((prev) => {
      let stack = prev.stack.slice(0, prev.idx + 1);
      stack.push(next);
      if (stack.length > MAX_HIST) stack = stack.slice(stack.length - MAX_HIST);
      return { stack, idx: stack.length - 1 };
    });
    return a;
  }
  function undo() {
    if (hist.idx <= 0) return;
    const idx = hist.idx - 1;
    setActive(hist.stack[idx], "↩ Geri al");
    setHist((prev) => ({ ...prev, idx }));
  }
  function redo() {
    if (hist.idx >= hist.stack.length - 1) return;
    const idx = hist.idx + 1;
    setActive(hist.stack[idx], "↪ İleri al");
    setHist((prev) => ({ ...prev, idx }));
  }
  const canUndo = hist.idx > 0;
  const canRedo = hist.idx < hist.stack.length - 1;

  // Klavye: Ctrl/Cmd+Z geri, Ctrl+Shift+Z / Ctrl+Y ileri
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return; // form alanlarına dokunma
      if (k === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((k === "z" && e.shiftKey) || k === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hist]);

  function loadFile(file: File) {
    setFileName(file.name);
    setWeight(null);
    setHist({ stack: [], idx: -1 }); // yeni dosya → geçmişi sıfırla
    addLog("info", `Yükleniyor: ${file.name} (${(file.size / 1024).toFixed(0)} KB)`);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buf = e.target?.result as ArrayBuffer;
        const geo = new STLLoader().parse(buf);
        geo.computeVertexNormals();
        apply(geo, "Analiz");
      } catch {
        addLog("err", "STL okunamadı. Dosya bozuk veya desteklenmeyen formatta olabilir.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function onInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (f) loadFile(f);
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) loadFile(f);
  }

  function runAutoClean() {
    if (!geometry) return;
    addLog("info", "🪄 Otomatik temizlik başladı…");
    try {
      let g = geometry;
      let a = analyzeGeometry(g);

      // 1) temel temizlik (weld + duplicate/degenerate)
      g = basicCleanup(g, 5); a = analyzeGeometry(g);
      addLog("info", `Temel temizlik: ${a.triangleCount.toLocaleString()} üçgen.`);

      // 2) non-manifold (yeşil çöp) sil
      if (a.nonManifoldEdges > 0) {
        g = deleteNonManifoldFaces(g, 1); a = analyzeGeometry(g);
        addLog("info", `Yeşil çöp temizlendi → non-manifold ${a.nonManifoldEdges}.`);
      }

      // 3) izole parça — sadece artık kabuklar küçükse (gerçek parçaları silme)
      if (a.shellCount > 1) {
        const faces = Array.from(a.shellFaceGroups.values()).map((f) => f.length).sort((x, y) => y - x);
        const dominant = faces[0] / faces.reduce((s, n) => s + n, 0);
        if (dominant >= 0.95) {
          g = keepLargestShell(g, a); a = analyzeGeometry(g);
          addLog("info", `İzole çöp parçalar silindi → parça ${a.shellCount}.`);
        } else {
          addLog("warn", `${a.shellCount} parça var ama küçük değil — otomatik silmedim (gerçek parça olabilir).`);
        }
      }

      // 4) açık kenar / küçük delik kapat
      if (a.boundaryEdges > 0 || a.nonManifoldEdges > 0) {
        g = repairEdgesAndSmallHoles(g); a = analyzeGeometry(g);
        addLog("info", `Kenar onarımı → açık kenar ${a.boundaryEdges}, non-manifold ${a.nonManifoldEdges}.`);
      }

      // 5) normalleri düzelt
      if (!a.windingConsistent) {
        g = fixWinding(g); a = analyzeGeometry(g);
        addLog("info", `Normaller düzeltildi → ters normal ${a.flippedEdges}.`);
      }

      apply(g, "🪄 Otomatik temizlik tamam");
      addLog(a.productionReady ? "ok" : "warn",
        a.productionReady ? "✓ Üretime/döküme hazır." : "⚠ Bazı sorunlar kaldı — manuel kontrol et.");
    } catch {
      addLog("err", "Otomatik temizlik başarısız.");
    }
  }

  function runBasicCleanup() {
    if (!geometry) return;
    addLog("info", "Temel temizlik: weld + duplicate/degenerate yüz temizliği…");
    try { apply(basicCleanup(geometry, 5), "Temel temizlik"); }
    catch { addLog("err", "Temel temizlik başarısız."); }
  }
  function runKeepLargest() {
    if (!geometry || !analysis) return;
    addLog("info", `İzole parça temizliği. Mevcut parça: ${analysis.shellCount}.`);
    try { apply(keepLargestShell(geometry, analysis), "En büyük parça"); }
    catch { addLog("err", "İzole parça temizliği başarısız."); }
  }
  function runDeleteNM() {
    if (!geometry) return;
    addLog("info", "Yeşil (non-manifold) yüzler ve bağlı çöpler siliniyor…");
    try { apply(deleteNonManifoldFaces(geometry, 1), "Yeşil çöp temizliği"); }
    catch { addLog("err", "Non-manifold temizliği başarısız."); }
  }
  function runEdgeRepair() {
    if (!geometry || !analysis) return;
    addLog("info", `Açık kenar kapatma. Açık kenar: ${analysis.boundaryEdges}, non-manifold: ${analysis.nonManifoldEdges}.`);
    try {
      const before = { b: analysis.boundaryEdges, n: analysis.nonManifoldEdges };
      const a = apply(repairEdgesAndSmallHoles(geometry), "Kenar onarımı");
      addLog("ok", `Açık kenar ${before.b} → ${a.boundaryEdges}, non-manifold ${before.n} → ${a.nonManifoldEdges}.`);
    } catch { addLog("err", "Kenar onarımı başarısız."); }
  }
  function runFixWinding() {
    if (!geometry || !analysis) return;
    addLog("info", `Normaller düzeltiliyor. Ters kenar: ${analysis.flippedEdges}…`);
    try {
      const before = analysis.flippedEdges;
      const a = apply(fixWinding(geometry), "Normal düzeltme");
      addLog("ok", `Ters normal ${before} → ${a.flippedEdges}. ${a.windingConsistent ? "Normaller tutarlı ✓" : ""}`);
    } catch { addLog("err", "Normal düzeltme başarısız."); }
  }

  function runScale(factor: number, label: string) {
    if (!geometry || factor <= 0 || !isFinite(factor)) return;
    addLog("info", `Ölçek uygulanıyor: ${label} (×${factor.toFixed(4)})`);
    try { apply(scaleGeometry(geometry, factor), `Ölçek ${label}`); }
    catch { addLog("err", "Ölçekleme başarısız."); }
  }
  function runScaleToMax(targetMm: number) {
    if (!geometry || !analysis) return;
    const cur = Math.max(...analysis.dimensions);
    if (cur <= 0 || targetMm <= 0) return;
    runScale(targetMm / cur, `en büyük boyut ${targetMm}mm`);
  }

  function setAxisFactor(axis: 0 | 1 | 2, factor: number) {
    setPreviewScale((p) => {
      const n: [number, number, number] = [...p];
      n[axis] = factor;
      return n;
    });
  }
  function applyResize() {
    if (!geometry) return;
    const [fx, fy, fz] = previewScale;
    if (fx === 1 && fy === 1 && fz === 1) return;
    addLog("info", `Yeniden boyutlandırılıyor: X×${fx.toFixed(3)} Y×${fy.toFixed(3)} Z×${fz.toFixed(3)}`);
    try { apply(scaleGeometryXYZ(geometry, fx, fy, fz), "Yeniden boyutlandırma"); }
    catch { addLog("err", "Yeniden boyutlandırma başarısız."); }
  }

  function runWeight() {
    if (!geometry) return;
    const w = computeWeight(geometry);
    setWeight(w);
    addLog("ok", `Hacim ${w.volumeMm3.toFixed(2)} mm³ · gümüş ${w.weights[0].grams.toFixed(2)} g.`);
    if (analysis && !analysis.watertight) {
      addLog("warn", "Model watertight değil — temizledikten sonra gramaj daha güvenilir olur.");
    }
  }

  function exportStl() {
    if (!geometry) return;
    try {
      // gumball ile yapılan döndürmeyi geometriye bake et
      let geo = geometry;
      const rot = viewerRef.current?.getOrientationMatrix?.();
      if (rot) { geo = geometry.clone(); geo.applyMatrix4(rot); geo.computeVertexNormals(); }
      const mesh = new THREE.Mesh(geo);
      mesh.updateMatrixWorld(true);
      // Binary çıktı three sürümüne göre DataView / ArrayBuffer / Uint8Array dönebilir.
      const result = new STLExporter().parse(mesh, { binary: true }) as unknown;

      let blobPart: BlobPart;
      if (typeof result === "string") {
        blobPart = result;
      } else if (result instanceof ArrayBuffer) {
        blobPart = new Uint8Array(result.slice(0));
      } else if (ArrayBuffer.isView(result)) {
        // DataView / Uint8Array vb. → taze Uint8Array'e kopyala
        const v = result as ArrayBufferView;
        const src = new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
        blobPart = new Uint8Array(src); // kopya
      } else {
        // son çare: ASCII
        blobPart = new STLExporter().parse(mesh) as unknown as string;
      }

      const blob = new Blob([blobPart], { type: "model/stl" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = outputBaseName() + ".stl";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      addLog("ok", `Temizlenmiş STL indirildi (${(blob.size / 1024).toFixed(0)} KB).`);
    } catch (err) {
      addLog("err", `İndirme başarısız: ${(err as Error).message}`);
    }
  }

  function finishHollow(shell: THREE.BufferGeometry, cavityMm3: number, solidCm3: number, trapped: number, t0: number) {
    const cavityCm3 = cavityMm3 / 1000;
    const materialCm3 = Math.max(solidCm3 - cavityCm3, 0);
    const savingPct = solidCm3 > 0 ? (cavityCm3 / solidCm3) * 100 : 0;
    const weights = METALS.map((m) => ({ key: m.key, label: m.label, grams: materialCm3 * m.density }));
    setHollow({ shell, wallMm: hollowWall, solidCm3, cavityCm3, materialCm3, savingPct, weights });
    setShowHollow(true);
    if (trapped > 0) addLog("ok", `🪄 ${trapped} kör havuz avlandı ve dolduruldu.`);
    addLog("ok", `Boşaltıldı: dolu ${solidCm3.toFixed(3)} → boş ${materialCm3.toFixed(3)} cm³ · tasarruf %${savingPct.toFixed(0)} · gümüş ${(materialCm3 * 10.36).toFixed(2)} g`);
    // sihir için minimum gösterim süresi
    const elapsed = performance.now() - t0;
    window.setTimeout(() => setHollowBusy(false), Math.max(0, 1500 - elapsed));
  }

  function runHollow() {
    if (!geometry) return;
    const sdf = hollowMethod === "sdf";
    const t0 = performance.now();
    setMagic({ title: "✨ Sihirli Boşaltma", label: sdf ? "Sanal sıvı dökülüyor · kör havuzlar avlanıyor…" : "İçi boşaltılıyor…" });
    setHollowBusy(true);
    addLog("info", `İç boşaltma (${sdf ? "Sağlam / SDF" : "Hızlı"})… duvar ${hollowWall.toFixed(2)} mm${sdf ? " — birkaç saniye sürebilir" : ""}`);
    const solidCm3 = Math.abs(computeWeight(geometry).volumeMm3) / 1000;

    // Web Worker (akıcı animasyon); başarısız olursa ana thread'de çalış
    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL("./lib/hollow.worker.ts", import.meta.url));
    } catch {
      worker = null;
    }

    if (worker) {
      const positions = (geometry.attributes.position.array as Float32Array).slice();
      worker.onmessage = (e: MessageEvent) => {
        const d = e.data as { type: string; positions?: Float32Array; cavityMm3?: number; resolutionMm?: number; trapped?: number; message?: string };
        if (d.type === "progress") return;
        if (d.type === "error") {
          addLog("err", `İç boşaltma başarısız: ${d.message}`);
          setHollowBusy(false); worker?.terminate(); return;
        }
        const shell = new THREE.BufferGeometry();
        shell.setAttribute("position", new THREE.BufferAttribute(d.positions!, 3));
        shell.computeVertexNormals();
        if (sdf && d.resolutionMm) addLog("info", `SDF çözünürlük ~${d.resolutionMm.toFixed(2)} mm`);
        finishHollow(shell, d.cavityMm3!, solidCm3, d.trapped ?? 0, t0);
        worker?.terminate();
      };
      worker.postMessage({ positions, wall: hollowWall, method: hollowMethod }, [positions.buffer]);
      return;
    }

    // Fallback: ana thread (animasyon donabilir)
    setTimeout(() => {
      try {
        const r = sdf ? hollowShellSDF(geometry, hollowWall) : hollowShell(geometry, hollowWall);
        if (sdf && "resolutionMm" in r) addLog("info", `SDF çözünürlük ~${(r as { resolutionMm: number }).resolutionMm.toFixed(2)} mm`);
        finishHollow(r.shell, r.cavityMm3, solidCm3, "trappedRemoved" in r ? (r as { trappedRemoved: number }).trappedRemoved : 0, t0);
      } catch (err) {
        addLog("err", `İç boşaltma başarısız: ${(err as Error).message}`);
        setHollowBusy(false);
      }
    }, 60);
  }

  function exportHollowStl() {
    if (!hollow) return;
    try {
      let geo = hollow.shell;
      const rot = viewerRef.current?.getOrientationMatrix?.();
      if (rot) { geo = hollow.shell.clone(); geo.applyMatrix4(rot); }
      const mesh = new THREE.Mesh(geo);
      mesh.updateMatrixWorld(true);
      const result = new STLExporter().parse(mesh, { binary: true }) as unknown;
      let blobPart: BlobPart;
      if (typeof result === "string") blobPart = result;
      else if (result instanceof ArrayBuffer) blobPart = new Uint8Array(result.slice(0));
      else if (ArrayBuffer.isView(result)) { const v = result as ArrayBufferView; blobPart = new Uint8Array(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)); }
      else blobPart = new STLExporter().parse(mesh) as unknown as string;
      const blob = new Blob([blobPart], { type: "model/stl" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = outputBaseName() + "_hollow.stl";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      addLog("ok", `Boşaltılmış STL indirildi (${(blob.size / 1024).toFixed(0)} KB).`);
    } catch (err) {
      addLog("err", `İndirme başarısız: ${(err as Error).message}`);
    }
  }

  async function exportEtsyCard() {
    if (!geometry || !analysis) return;
    addLog("info", "Etsy görseli hazırlanıyor…");
    try {
      const w = weight ?? computeWeight(geometry);
      if (!weight) setWeight(w);
      // Boşaltıldıysa boşaltılmış ağırlığı göster; değilse dolu (ince model)
      let cardWeight: MetalWeight = w;
      const hollowed = !!hollow;
      if (hollow) {
        cardWeight = {
          volumeMm3: hollow.materialCm3 * 1000,
          volumeCm3: hollow.materialCm3,
          weights: METALS.map((m) => ({ key: m.key, label: m.label, density: m.density, grams: hollow.materialCm3 * m.density })),
        };
      }
      // model anlık görüntüsü (yeşil hataları gizleyip temiz çek)
      const img = viewerRef.current?.capture(1100) ?? null;
      const png = await buildEtsyCard({ modelImg: img, analysis, weight: cardWeight, fileName, hollowed });
      const a = document.createElement("a");
      a.href = png;
      a.download = outputBaseName() + "_etsy.png";
      document.body.appendChild(a); a.click(); a.remove();
      addLog("ok", "Etsy görseli indirildi (2000×2000 PNG).");
    } catch (err) {
      addLog("err", `Görsel üretilemedi: ${(err as Error).message}`);
    }
  }

  async function runCheck() {
    if (!geometry || !analysis) return;
    setCheckBusy(true);
    addLog("info", "Check Mesh — kuyumculuk standartları kontrol ediliyor…");
    try {
      const vol = weight?.volumeMm3 ?? computeWeight(geometry).volumeMm3;
      const body = {
        watertight: analysis.watertight,
        windingConsistent: analysis.windingConsistent,
        shellCount: analysis.shellCount,
        boundaryEdges: analysis.boundaryEdges,
        nonManifoldEdges: analysis.nonManifoldEdges,
        flippedEdges: analysis.flippedEdges,
        dimensionsMm: analysis.dimensions,
        volumeMm3: vol,
        metal: "ag925",
        ...(hollow ? { hollow: { wallMm: hollow.wallMm, minWallMm: hollow.wallMm } } : {}),
      };
      const res = await fetch("/api/remaura/mesh-temizle/check/", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "kontrol başarısız");
      setCheckResult({ verdict: data.verdict, summary: data.summary, checks: data.checks });
      addLog(data.verdict === "pass" ? "ok" : data.verdict === "warn" ? "warn" : "err", `Check Mesh: ${data.summary}`);
    } catch (err) {
      addLog("err", `Check Mesh başarısız: ${(err as Error).message}`);
    } finally {
      setCheckBusy(false);
    }
  }

  function reset() {
    setGeometry(null); setAnalysis(null); setWeight(null); setFileName("");
    setHist({ stack: [], idx: -1 });
    addLog("info", "Sıfırlandı.");
  }

  return (
    <div className="min-h-screen bg-[#07080a] px-4 py-8 text-white">
      <HollowMagicOverlay visible={hollowBusy} title={magic.title} label={magic.label} />
      <div className="mx-auto max-w-6xl">
        {/* Başlık */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#b76e79]/30 bg-[#b76e79]/10 px-3 py-1 text-xs font-medium text-[#b76e79]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#b76e79]" />
              Mesh Temizleme &amp; Gramaj
            </div>
            <h1 className="font-display text-3xl font-medium tracking-tight">Modeli oku, temizle, tart</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={reset} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/60 hover:text-white">
              <RotateCcw className="h-4 w-4" /> Sıfırla
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px]">
          {/* SOL: sahne + log */}
          <div className="flex flex-col gap-4">
            <div className="relative h-[480px] overflow-hidden rounded-2xl border border-white/[0.06] bg-[#07080a]">
              <MeshCleanViewer ref={viewerRef} geometry={showHollow && hollow ? hollow.shell : geometry} wireframe={wireframe} showBadEdges={showBadEdges} previewScale={previewScale} gizmo={gizmo} gizmoMode={gizmoMode} clip={clip} />
              <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white/60 backdrop-blur">
                {fileName || "STL yüklenmedi"}
              </div>
              <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-end gap-2">
                <button onClick={() => setGizmo((v) => !v)} disabled={!geometry} className={`rounded-full px-3 py-1.5 text-xs font-medium disabled:opacity-40 ${gizmo ? "bg-[#b76e79] text-white" : "bg-white/10 hover:bg-white/15"}`}>
                  {gizmo ? "Gumball açık" : "Gumball"}
                </button>
                {gizmo && (
                  <>
                    <button onClick={() => setGizmoMode("rotate")} className={`rounded-full px-3 py-1.5 text-xs font-medium ${gizmoMode === "rotate" ? "bg-[#b76e79] text-white" : "bg-white/10 hover:bg-white/15"}`}>
                      Döndür
                    </button>
                    <button onClick={() => setGizmoMode("translate")} className={`rounded-full px-3 py-1.5 text-xs font-medium ${gizmoMode === "translate" ? "bg-[#b76e79] text-white" : "bg-white/10 hover:bg-white/15"}`}>
                      Taşı
                    </button>
                  </>
                )}
                <button onClick={undo} disabled={!canUndo} title="Geri al (Ctrl+Z)" className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/15 disabled:opacity-40">
                  <Undo2 className="h-3.5 w-3.5" /> Geri
                </button>
                <button onClick={redo} disabled={!canRedo} title="İleri al (Ctrl+Shift+Z)" className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/15 disabled:opacity-40">
                  <Redo2 className="h-3.5 w-3.5" /> İleri
                </button>
                <button onClick={() => setClip((c) => {
                  if (c.enabled) return { ...c, enabled: false };
                  // Kesiti aç: kameraya bakan eksende yakın yarıyı kes → kesit yüzü sana döner
                  const v = viewerRef.current?.getViewClip();
                  return { enabled: true, position: 0.5, axis: v?.axis ?? c.axis, flip: v?.flip ?? c.flip };
                })} disabled={!geometry} className={`rounded-full px-3 py-1.5 text-xs font-medium disabled:opacity-40 ${clip.enabled ? "bg-[#b76e79] text-white" : "bg-white/10 hover:bg-white/15"}`}>
                  {clip.enabled ? "Kesit açık" : "Kesit (içini gör)"}
                </button>
                <button onClick={() => setWireframe((v) => !v)} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/15">
                  {wireframe ? "Katı" : "Tel kafes"}
                </button>
                <button onClick={() => setShowBadEdges((v) => !v)} className="rounded-full bg-[#00ff66]/20 px-3 py-1.5 text-xs font-medium text-[#7dffb0] hover:bg-[#00ff66]/30">
                  {showBadEdges ? "Yeşil hataları gizle" : "Yeşil hataları göster"}
                </button>
                <button onClick={exportStl} disabled={!geometry} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-40">
                  <Download className="h-3.5 w-3.5" /> STL indir
                </button>
              </div>
            </div>

            {/* Kesit kontrolleri */}
            {clip.enabled && (
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#b76e79]/20 bg-[#b76e79]/[0.06] px-4 py-3">
                <span className="text-xs font-medium text-[#e6b3bb]">Kesit:</span>
                <div className="flex gap-1">
                  {(["x", "y", "z"] as const).map((ax) => (
                    <button key={ax} onClick={() => setClip((c) => ({ ...c, axis: ax }))}
                      className={`rounded-md px-2.5 py-1 font-mono text-xs ${clip.axis === ax ? "bg-[#b76e79] text-white" : "bg-white/10 text-white/60 hover:bg-white/15"}`}>
                      {ax.toUpperCase()}
                    </button>
                  ))}
                </div>
                <input type="range" min={0} max={1} step={0.01} value={clip.position}
                  onChange={(e) => setClip((c) => ({ ...c, position: Number(e.target.value) }))}
                  className="range-slider flex-1 min-w-[120px]" />
                <button onClick={() => setClip((c) => ({ ...c, flip: !c.flip }))}
                  className="rounded-md bg-white/10 px-2.5 py-1 text-xs text-white/70 hover:bg-white/15">↔ Yön</button>
              </div>
            )}

            {/* Log */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#030712] p-3">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/50">
                  <ListChecks className="h-3.5 w-3.5" /> İşlem Günlüğü
                </span>
                {logs.length > 0 && <button onClick={() => setLogs([])} className="text-[11px] text-white/30 hover:text-white/60">temizle</button>}
              </div>
              <div ref={logBoxRef} className="h-28 overflow-y-auto px-1 font-mono text-[11px] leading-relaxed">
                {logs.length === 0 ? <p className="text-white/25">Hazır. STL yükleyin…</p> :
                  logs.map((l) => (
                    <div key={l.id} className={l.type === "err" ? "text-red-400" : l.type === "ok" ? "text-emerald-400" : l.type === "warn" ? "text-amber-400" : "text-white/55"}>{l.msg}</div>
                  ))}
              </div>
            </div>
          </div>

          {/* SAĞ: kontrol */}
          <div className="flex flex-col gap-4">
            {/* Yükle */}
            <div
              onDragOver={(e) => e.preventDefault()} onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className="flex min-h-[96px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 text-center hover:border-[#b76e79]/40 hover:bg-[#b76e79]/5"
            >
              <input ref={inputRef} type="file" accept=".stl" className="hidden" onChange={onInput} />
              <Upload className="h-5 w-5 text-white/40" />
              <p className="text-sm text-white/50">{fileName || "STL sürükle veya tıkla"}</p>
            </div>

            {/* Analiz raporu */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70">
                  <FileText className="h-4 w-4" /> Analiz Raporu
                </span>
                {analysis && (analysis.watertight
                  ? <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  : <AlertTriangle className="h-5 w-5 text-amber-400" />)}
              </div>
              {analysis && (
                <div className={`mb-3 rounded-lg px-3 py-2 text-center text-sm font-semibold ${
                  analysis.productionReady
                    ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                    : "border border-amber-400/30 bg-amber-400/10 text-amber-300"
                }`}>
                  {analysis.productionReady
                    ? "✓ WATERTIGHT — Üretime / Döküme Hazır"
                    : analysis.watertight
                      ? "⚠ Kapalı ama normaller ters — «Normalleri düzelt»"
                      : "⚠ Onarım gerekli — henüz watertight değil"}
                </div>
              )}
              {analysis ? (
                <div className="space-y-2 text-sm">
                  <Row label="Üçgen" value={analysis.triangleCount.toLocaleString()} />
                  <Row label="Vertex (weld)" value={analysis.vertexCount.toLocaleString()} />
                  <Row label="Parça / Shell" value={String(analysis.shellCount)} bad={analysis.shellCount > 1} />
                  <Row label="Açık kenar" value={analysis.boundaryEdges.toLocaleString()} bad={analysis.boundaryEdges > 0} />
                  <Row label="Non-manifold" value={analysis.nonManifoldEdges.toLocaleString()} bad={analysis.nonManifoldEdges > 0} />
                  <Row label="Ters normal" value={analysis.flippedEdges.toLocaleString()} bad={analysis.flippedEdges > 0} />
                  <Row label="Boyut (mm)" value={analysis.dimensions.map((d) => d.toFixed(2)).join(" × ")} />
                </div>
              ) : <p className="text-sm text-white/30">STL yüklenince rapor burada görünür.</p>}
              {analysis && (Math.max(...analysis.dimensions) < 4 || Math.max(...analysis.dimensions) > 250) && (
                <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
                  Boyut mücevher için olağandışı görünüyor — gerçek ölçüyü aşağıdan girip ölçekle.
                </p>
              )}
            </div>

            {/* Yeniden Boyutlandırma */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
              <span className="mb-3 flex items-center gap-1.5 text-sm font-medium text-white/70">
                <Ruler className="h-4 w-4" /> Yeniden Boyutlandırma
              </span>

              {/* Homojen (en büyük boyuta) */}
              <p className="mb-2 text-xs text-white/35">Homojen — gerçek en büyük boyutu (mm) gir:</p>
              <div className="mb-4 flex items-center gap-2">
                <input
                  type="number" inputMode="decimal" placeholder="En büyük boyut (mm)"
                  value={targetMm} onChange={(e) => setTargetMm(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#b76e79]/40 focus:outline-none"
                />
                <button
                  onClick={() => { const v = parseFloat(targetMm); if (v > 0) runScaleToMax(v); }}
                  disabled={!geometry || !(parseFloat(targetMm) > 0)}
                  className="shrink-0 rounded-lg bg-[#b76e79]/20 px-4 py-2 text-sm font-medium text-[#e6b3bb] hover:bg-[#b76e79]/30 disabled:opacity-35"
                >Uygula</button>
              </div>

              {/* Manuel eksen (X/Y/Z) — canlı önizleme */}
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs text-white/35">Manuel eksen (kalınlık vb. düzeltme):</p>
                {analysis && previewScale.some((s) => s !== 1) && (
                  <button onClick={() => setPreviewScale([1, 1, 1])} className="text-[11px] text-white/30 hover:text-white/60">sıfırla</button>
                )}
              </div>
              {analysis ? (
                <div className="space-y-2.5">
                  {(["X", "Y", "Z"] as const).map((ax, i) => {
                    const base = analysis.dimensions[i];
                    const cur = base * previewScale[i];
                    return (
                      <div key={ax} className="flex items-center gap-2">
                        <span className="w-4 font-mono text-xs text-[#e6b3bb]">{ax}</span>
                        <input
                          type="range" min={0.3} max={3} step={0.01}
                          value={previewScale[i]}
                          onChange={(e) => setAxisFactor(i as 0 | 1 | 2, Number(e.target.value))}
                          className="range-slider flex-1"
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="number" inputMode="decimal" step={0.1}
                            value={cur.toFixed(2)}
                            onChange={(e) => {
                              const mm = parseFloat(e.target.value);
                              if (mm > 0 && base > 0) setAxisFactor(i as 0 | 1 | 2, Math.min(3, Math.max(0.3, mm / base)));
                            }}
                            className="w-16 rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-1 text-right font-mono text-xs text-white focus:border-[#b76e79]/40 focus:outline-none"
                          />
                          <span className="text-[10px] text-white/30">mm</span>
                        </div>
                      </div>
                    );
                  })}
                  <button
                    onClick={applyResize}
                    disabled={!geometry || previewScale.every((s) => s === 1)}
                    className="mt-1 w-full rounded-lg bg-[#b76e79]/20 px-4 py-2 text-sm font-medium text-[#e6b3bb] hover:bg-[#b76e79]/30 disabled:opacity-35"
                  >Boyutları Uygula</button>
                </div>
              ) : <p className="text-xs text-white/25">STL yüklenince eksen kontrolleri açılır.</p>}
            </div>

            {/* İşlemler */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
              <span className="mb-3 block text-sm font-medium text-white/70">Temizleme İşlemleri</span>
              <div className="flex flex-col gap-2">
                {/* En üstte: tek tıkla tüm sırayı çalıştır */}
                <button
                  onClick={runAutoClean}
                  disabled={!geometry}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#c4838b,#b76e79,#a65f69)] px-4 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <Wand2 className="h-4 w-4" /> Otomatik Temizle (tek tık)
                </button>
                <div className="my-1 flex items-center gap-2 text-[11px] text-white/25">
                  <span className="h-px flex-1 bg-white/10" /> veya adım adım <span className="h-px flex-1 bg-white/10" />
                </div>
                {/* Kullanım sırasına göre (yukarıdan aşağıya) */}
                <OpBtn onClick={runDeleteNM} disabled={!analysis || analysis.nonManifoldEdges === 0} icon={<Scissors className="h-4 w-4" />} green>1 · Yeşil çöpleri temizle</OpBtn>
                <OpBtn onClick={runKeepLargest} disabled={!analysis || analysis.shellCount < 2} icon={<Scissors className="h-4 w-4" />}>2 · İzole parçaları sil (en büyüğü tut)</OpBtn>
                <OpBtn onClick={runEdgeRepair} disabled={!analysis || (analysis.boundaryEdges === 0 && analysis.nonManifoldEdges === 0)} icon={<AlertTriangle className="h-4 w-4" />}>3 · Açık kenarları kapat (delik onarımı)</OpBtn>
                <OpBtn onClick={runFixWinding} disabled={!analysis || analysis.windingConsistent} icon={<Compass className="h-4 w-4" />}>4 · Normalleri düzelt (ters yüz)</OpBtn>
                <OpBtn onClick={runBasicCleanup} disabled={!geometry} icon={<Wrench className="h-4 w-4" />}>Temel topoloji temizliği</OpBtn>
              </div>
            </div>

            {/* Çekme Payı (döküm telafisi) */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
              <span className="mb-1 flex items-center gap-1.5 text-sm font-medium text-white/70">
                <Ruler className="h-4 w-4" /> Çekme Payı (Döküm Telafisi)
              </span>
              <p className="mb-3 text-xs text-white/35">Döküm soğurken metal çeker; modeli telafi için homojen büyütür. Temizlik bittikten sonra, dışa aktarmadan önce uygula.</p>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-white/60">Pay oranı</span>
                <span className="font-mono text-sm text-[#e6b3bb]">+%{shrinkPct.toFixed(1)}</span>
              </div>
              <input
                type="range" min={1} max={5} step={0.1} value={shrinkPct}
                onChange={(e) => setShrinkPct(Number(e.target.value))}
                className="range-slider mb-2 w-full"
              />
              <div className="mb-3 flex justify-between text-[11px] text-white/25"><span>%1</span><span>%5</span></div>
              <button
                onClick={() => runScale(1 + shrinkPct / 100, `çekme payı +%${shrinkPct.toFixed(1)}`)}
                disabled={!geometry}
                className="w-full rounded-lg bg-[#b76e79]/20 px-4 py-2 text-sm font-medium text-[#e6b3bb] hover:bg-[#b76e79]/30 disabled:opacity-35"
              >Çekme Payını Uygula</button>
            </div>

            {/* Hacim & ağırlık */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
              <div className="mb-1 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70">
                  <Scale className="h-4 w-4" /> Hacim ve Metal Ağırlığı
                </span>
                <button onClick={runWeight} disabled={!geometry} className="rounded-full bg-[linear-gradient(135deg,#c4838b,#b76e79,#a65f69)] px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40">
                  Hesapla
                </button>
              </div>
              <p className="mb-3 text-xs text-white/35">Temizlenmiş modelde en güvenilir sonucu verir.</p>
              {weight ? (
                <>
                  <div className="mb-3 rounded-xl border border-[#b76e79]/20 bg-[#b76e79]/5 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-white/40">Hacim</p>
                    <p className="font-mono text-2xl font-semibold">{weight.volumeMm3.toFixed(2)} <span className="text-base text-white/50">mm³</span></p>
                    <p className="font-mono text-xs text-white/40">{weight.volumeCm3.toFixed(4)} cm³</p>
                  </div>
                  <div className="space-y-1.5">
                    {weight.weights.map((w) => (
                      <div key={w.key} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                        <div>
                          <p className="text-sm font-medium">{w.label}</p>
                          <p className="font-mono text-[11px] text-white/35">{w.density} g/cm³</p>
                        </div>
                        <p className="font-mono text-lg font-semibold text-[#e6b3bb]">{w.grams.toFixed(2)} g</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : <p className="text-sm text-white/30">«Hesapla» ile gramajı gör.</p>}
            </div>

            {/* İç Boşaltma */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
              <span className="mb-1 flex items-center gap-1.5 text-sm font-medium text-white/70">
                <Egg className="h-4 w-4" /> İç Boşaltma
              </span>
              <p className="mb-3 text-xs text-white/35">Dış yüzey korunur; içi boşaltılır, döküm gramajı düşer.</p>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-white/60">Duvar kalınlığı</span>
                <span className="font-mono text-sm text-[#e6b3bb]">{hollowWall.toFixed(2)} mm</span>
              </div>
              <input
                type="range" min={0.1} max={3} step={0.01} value={hollowWall}
                onChange={(e) => setHollowWall(Number(e.target.value))}
                className="range-slider mb-2 w-full"
              />
              <div className="mb-3 flex justify-between text-[11px] text-white/25"><span>0.10 mm</span><span>3.0 mm</span></div>

              {/* Yöntem seçimi */}
              <div className="mb-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setHollowMethod("fast")}
                  className={`rounded-lg border px-3 py-2 text-left transition-colors ${hollowMethod === "fast" ? "border-[#b76e79]/40 bg-[#b76e79]/15" : "border-white/10 bg-white/[0.03] hover:border-white/20"}`}
                >
                  <span className={`block text-xs font-medium ${hollowMethod === "fast" ? "text-[#e6b3bb]" : "text-white/70"}`}>Hızlı</span>
                  <span className="block text-[10px] text-white/35">basit parçalar</span>
                </button>
                <button
                  onClick={() => setHollowMethod("sdf")}
                  className={`rounded-lg border px-3 py-2 text-left transition-colors ${hollowMethod === "sdf" ? "border-[#b76e79]/40 bg-[#b76e79]/15" : "border-white/10 bg-white/[0.03] hover:border-white/20"}`}
                >
                  <span className={`block text-xs font-medium ${hollowMethod === "sdf" ? "text-[#e6b3bb]" : "text-white/70"}`}>Sağlam (SDF)</span>
                  <span className="block text-[10px] text-white/35">zor modeller · yavaş</span>
                </button>
              </div>

              <button
                onClick={runHollow}
                disabled={!geometry}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#c4838b,#b76e79,#a65f69)] px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-35"
              >
                <Egg className="h-4 w-4" /> İç Boşalt
              </button>

              {hollow && (
                <div className="mt-3 rounded-xl border border-[#b76e79]/20 bg-[#b76e79]/5 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-white/45">Tasarruf</span>
                    <span className="font-mono text-lg font-semibold text-emerald-400">−%{hollow.savingPct.toFixed(0)}</span>
                  </div>
                  <p className="mb-2 font-mono text-[11px] text-white/40">
                    dolu {hollow.solidCm3.toFixed(3)} → boş {hollow.materialCm3.toFixed(3)} cm³ · duvar {hollow.wallMm.toFixed(2)} mm
                  </p>
                  <div className="space-y-1">
                    {hollow.weights.map((w) => (
                      <div key={w.key} className="flex items-center justify-between text-xs">
                        <span className="text-white/55">{w.label}</span>
                        <span className="font-mono font-semibold text-[#e6b3bb]">{w.grams.toFixed(2)} g</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => setShowHollow((v) => !v)} className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white/70 hover:bg-white/[0.08]">
                      {showHollow ? "Dolu göster" : "Boşaltılmışı göster"}
                    </button>
                    <button onClick={exportHollowStl} className="flex-1 rounded-lg bg-[#b76e79]/20 px-3 py-2 text-xs font-semibold text-[#e6b3bb] hover:bg-[#b76e79]/30">
                      Boşaltılmış STL
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] text-white/25">İpucu: reçine baskıda mum/reçine akması için slicer&apos;da drenaj deliği ekle.</p>
                </div>
              )}
            </div>

            {/* Dışa aktarım */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
              <span className="mb-2 block text-sm font-medium text-white/70">Dışa Aktarım</span>
              <input
                type="text"
                placeholder="Dosya adı (opsiyonel)"
                value={exportName}
                onChange={(e) => setExportName(e.target.value)}
                className="mb-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#b76e79]/40 focus:outline-none"
              />
              <p className="mb-3 font-mono text-[11px] text-white/30">→ {outputBaseName()}.stl</p>
              <button
                onClick={exportEtsyCard}
                disabled={!geometry}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#b76e79]/30 bg-[#b76e79]/10 px-4 py-3 text-sm font-semibold text-[#e6b3bb] transition-colors hover:bg-[#b76e79]/20 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ImageIcon className="h-4 w-4" /> Etsy Görseli Oluştur (2000×2000)
              </button>
            </div>

            {/* Check Mesh — son adım: döküme hazır mı? */}
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Check Mesh
                </span>
                <button onClick={runCheck} disabled={!geometry || checkBusy}
                  className="rounded-full bg-emerald-500/90 px-4 py-1.5 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-40">
                  {checkBusy ? "Kontrol…" : "Kontrol Et"}
                </button>
              </div>
              <p className="mb-3 text-xs text-white/35">Son adım: kuyumculuk döküm standartları kontrolü.</p>
              {checkResult ? (
                <div>
                  <div className={`mb-2 rounded-lg px-3 py-2 text-center text-sm font-semibold ${
                    checkResult.verdict === "pass" ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                    : checkResult.verdict === "warn" ? "border border-amber-400/30 bg-amber-400/10 text-amber-300"
                    : "border border-red-400/30 bg-red-400/10 text-red-300"}`}>
                    {checkResult.summary}
                  </div>
                  <div className="space-y-1">
                    {checkResult.checks.map((c) => (
                      <div key={c.id} className="flex items-start gap-2 text-xs">
                        <span className={c.status === "pass" ? "text-emerald-400" : c.status === "warn" ? "text-amber-400" : "text-red-400"}>
                          {c.status === "pass" ? "✓" : c.status === "warn" ? "!" : "✕"}
                        </span>
                        <span className="text-white/45">{c.label}:</span>
                        <span className="flex-1 text-white/60">{c.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="text-sm text-white/30">«Kontrol Et» ile döküme hazırlık raporu al.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.05] pb-1.5 last:border-0">
      <span className="text-white/45">{label}</span>
      <span className={`font-mono ${bad ? "text-amber-400" : "text-white"}`}>{value}</span>
    </div>
  );
}

function OpBtn({ onClick, disabled, icon, green, children }: { onClick: () => void; disabled?: boolean; icon: React.ReactNode; green?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
        green
          ? "border border-[#00ff66]/30 bg-[#00ff66]/10 text-[#7dffb0] hover:bg-[#00ff66]/20"
          : "border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]"
      }`}
    >
      {icon}{children}
    </button>
  );
}
