"use client";

import { useEffect, useMemo, useRef, useState, useDeferredValue } from "react";
import { GeometriViewer, ViewMesh } from "./GeometriViewer";
import { buildTelkariDrop } from "@/lib/remaura/geo/telkari";
import { buildTelkariArabesk } from "@/lib/remaura/geo/telkariArabesk";
import { buildTelkariKelebek } from "@/lib/remaura/geo/telkariKelebek";
import { buildKelebekOzgun } from "@/lib/remaura/geo/kelebekOzgun";
import { sweepWire, sweepTwistedWire, sweepBeadedWire, makeWavyPath, offsetPathN } from "@/lib/remaura/geo/wire";
import { analyzeSpans, AnalyzeWire, SPAN_WARN_RATIO } from "@/lib/remaura/geo/analyze";
import { unionMeshes } from "@/lib/remaura/geo/union";
import type { V3 } from "@/lib/remaura/geo/vec3";
import { sphereMesh, measureSphere } from "@/lib/remaura/geo/granule";
import { measureWire, meshVolumeMm3, edgeManifoldReport } from "@/lib/remaura/geo/measure";
import { toBinarySTL } from "@/lib/remaura/geo/stl";
import { fmtUm, mmToUm } from "@/lib/remaura/geo/units";
import { GeoRecipe, listRecipes, saveRecipe, deleteRecipe, canvasThumb } from "@/lib/remaura/geo/library";
import { KATEGORILER, KategoriId, Parcalar } from "@/lib/remaura/geo/kategori";
import { Polyline, adaptiveSample } from "@/lib/remaura/geo/wire";
import { spiralFn } from "@/lib/remaura/geo/curves";

// ---- PARÇA DÜZENLEME (Faz 2): düzenlemeler reçete katmanında yaşar,
// mesh her seferinde deterministik yeniden doğar. Tel çapı MALZEME özelliğidir:
// parça ölçeklenince omurga ölçeklenir, çap sabit kalır (TELKARI.md §1.9).
type MotifId = "spiral" | "gul" | "yaprak" | "damla" | "halka" | "kalp" | "sscroll";
const MOTIFLER: Record<MotifId, { ad: string; anahtar: RegExp }> = {
  spiral: { ad: "Spiral", anahtar: /spiral/ },
  gul: { ad: "Gül", anahtar: /g[üu]l/ },
  yaprak: { ad: "Yaprak", anahtar: /yaprak/ },
  damla: { ad: "Damla", anahtar: /damla/ },
  halka: { ad: "Halka", anahtar: /halka|[çc]ember/ },
  kalp: { ad: "Kalp", anahtar: /kalp/ },
  sscroll: { ad: "S-kıvrım", anahtar: /s-k[ıi]vr[ıi]m|scroll/ },
};
type PartEdit = { dx: number; dy: number; dz: number; scale: number; motif?: MotifId; deleted?: boolean };
const BOS_EDIT: PartEdit = { dx: 0, dy: 0, dz: 0, scale: 1 };

/** Parçanın omurgasını, aynı yere/boyuta oturan yeni motifle değiştirir. */
function motifYap(orig: Polyline, motif: MotifId): Polyline {
  let cx = 0, cy = 0, cz = 0;
  for (const p of orig.pts) { cx += p[0]; cy += p[1]; cz += p[2]; }
  const n = orig.pts.length;
  cx /= n; cy /= n; cz /= n;
  let R = 0;
  for (const p of orig.pts) R = Math.max(R, Math.hypot(p[0] - cx, p[1] - cy));
  R = Math.max(R, 0.6);
  const tol = 0.002;
  switch (motif) {
    case "spiral":
      return adaptiveSample(spiralFn(cx, cy, R, 0.16 * R, 2.2, 0, 1), 0, 1, tol, false);
    case "gul": // rhodonea (5 yapraklı gül eğrisi) — tek sürekli tel
      return adaptiveSample((t) => {
        const r = R * Math.cos(5 * t);
        return [cx + r * Math.cos(t), cy + r * Math.sin(t), cz];
      }, 0, Math.PI, tol, true);
    case "yaprak":
      return adaptiveSample((t) => {
        const pinch = Math.sin(t / 2);
        return [cx + 0.9 * R * Math.sin(t) * pinch * pinch, cy + R * Math.cos(t), cz];
      }, 0, 2 * Math.PI, tol, true);
    case "damla":
      return adaptiveSample((t) => {
        const pinch = Math.sin(t / 2);
        return [cx + 0.62 * R * Math.sin(t) * pinch * pinch, cy + R * Math.cos(t), cz];
      }, 0, 2 * Math.PI, tol, true);
    case "halka":
      return adaptiveSample((t) => [cx + R * Math.cos(t), cy + R * Math.sin(t), cz], 0, 2 * Math.PI, tol, true);
    case "kalp": // klasik parametrik kalp
      return adaptiveSample((t) => [
        cx + (R / 16) * 16 * Math.pow(Math.sin(t), 3) * 0.9,
        cy + (R / 16) * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)),
        cz,
      ], 0, 2 * Math.PI, tol, true);
    case "sscroll": {
      const ust = adaptiveSample(spiralFn(cx, cy + 0.45 * R, 0.55 * R, 0.12 * R, 1.3, -Math.PI / 2, 1), 0, 1, tol, false);
      const alt = adaptiveSample(spiralFn(cx, cy - 0.45 * R, 0.55 * R, 0.12 * R, 1.3, Math.PI / 2, -1), 0, 1, tol, false);
      return { pts: [...[...ust.pts].reverse(), ...alt.pts].map((p) => [p[0], p[1], cz] as typeof p), closed: false };
    }
  }
}

// döküm yaklaşık yoğunluklar (g/mm³)
const MATERIALS = {
  ag925: { label: "Gümüş 925", density: 0.01036 },
  au14: { label: "Altın 14K", density: 0.01358 },
} as const;
type MaterialId = keyof typeof MATERIALS;

// adlar çarşı diliyle (terminoloji araştırması 2026-07-14): burma (burgu değil),
// boncuk tel (miligren/güherse başka şeylerdir), dalgalı (zikzak)
const DOKULAR = {
  duz: "Düz tel",
  burgu: "Burma",
  "burgu-yassi": "Yassı burma",
  "cift-burma": "Çift burma (S+Z)",
  orgu: "Örgü tel (3 damar)",
  boncuk: "Boncuk tel",
  sarma: "Sarma (kazaziye)",
  ondule: "Dalgalı (zikzak)",
} as const;
type DokuId = keyof typeof DOKULAR;

const MODELS = {
  ozgun: { label: "Kelebek — özgün tasarım", defaults: { fine: 0.3, frame: 0.55, height: 44 } },
  kelebek: { label: "Kelebek (foto kopya, arşiv)", defaults: { fine: 0.26, frame: 0.5, height: 44 } },
  arabesk: { label: "Arabesk (referans kopya)", defaults: { fine: 0.4, frame: 0.7, height: 36 } },
  damla: { label: "Damla (parametrik)", defaults: { fine: 0.3, frame: 0.8, height: 30 } },
} as const;
type ModelId = keyof typeof MODELS;

/** mm değeri + kuyumcu dili karşılığı ("mikron" = 0.01mm) gösteren kontrol */
function DiaControl({ label, value, onChange, min, max, step, jewelerUnit = true }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; jewelerUnit?: boolean;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[13px] text-[#c9a88a]">{label}</span>
        <span className="font-mono text-[13px] text-white/90">
          {value.toFixed(2)} mm
          {jewelerUnit && (
            <span className="ml-2 text-[11px] text-[#b76e79]">{Math.round(value * 100)} mikron</span>
          )}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="range-slider flex-1"
        />
        <input
          type="number" min={min} max={max} step={step} value={value}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)));
          }}
          className="w-20 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-right font-mono text-[12px] text-white/90 outline-none focus:border-[#b76e79]/50"
        />
      </div>
    </div>
  );
}

export function GeometriClient() {
  const [kategori, setKategori] = useState<KategoriId>("kolye");
  const [model, setModel] = useState<ModelId>("ozgun");
  const [material, setMaterial] = useState<MaterialId>("ag925");
  const [doku, setDoku] = useState<DokuId>("duz");
  const [analiz, setAnaliz] = useState(false);
  const [fineDiaMm, setFineDiaMm] = useState<number>(MODELS.ozgun.defaults.fine);
  const [frameDiaMm, setFrameDiaMm] = useState<number>(MODELS.ozgun.defaults.frame);
  const [heightMm, setHeightMm] = useState<number>(MODELS.ozgun.defaults.height);
  const [unionBusy, setUnionBusy] = useState(false);
  const [unionInfo, setUnionInfo] = useState<{ volumeMm3: number; parca: number } | null>(null);

  // ---- Parça düzenleme durumu (Faz 2)
  const [partEdits, setPartEdits] = useState<Record<string, PartEdit>>({});
  const [selKey, setSelKey] = useState<string | null>(null);
  const [past, setPast] = useState<Record<string, PartEdit>[]>([]);
  const [future, setFuture] = useState<Record<string, PartEdit>[]>([]);
  const [promptMsg, setPromptMsg] = useState<string | null>(null);
  const applyEdit = (key: string, patch: Partial<PartEdit>, olay: string) => {
    setPast((p) => [...p.slice(-29), partEdits]);
    setFuture([]);
    setPartEdits({ ...partEdits, [key]: { ...(partEdits[key] ?? BOS_EDIT), ...patch } });
    ustaLog(olay, { key, ...patch });
  };
  const undoEdit = () => {
    if (!past.length) return;
    setFuture((f) => [partEdits, ...f].slice(0, 30));
    setPartEdits(past[past.length - 1]);
    setPast((p) => p.slice(0, -1));
  };
  const redoEdit = () => {
    if (!future.length) return;
    setPast((p) => [...p.slice(-29), partEdits]);
    setPartEdits(future[0]);
    setFuture((f) => f.slice(1));
  };
  const resetEdits = () => {
    if (!Object.keys(partEdits).length) return;
    setPast((p) => [...p.slice(-29), partEdits]);
    setFuture([]);
    setPartEdits({});
  };
  // model değişince parça indeksleri değişir — düzenlemeler o modele aitti
  useEffect(() => {
    setPartEdits({}); setPast([]); setFuture([]); setSelKey(null);
  }, [model]);

  // usta kullanım günlüğü: yalnız davet koduyla girenlerden olay toplar
  const ustaLog = (olay: string, detay?: unknown) => {
    try {
      const kod = localStorage.getItem("remaura-davet-geometri");
      if (!kod) return;
      void fetch("/api/remaura/davet/log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kod, olay, detay: detay ?? null }),
        keepalive: true,
      }).catch(() => {});
    } catch { /* günlük asla aracı bozmaz */ }
  };
  useEffect(() => { ustaLog("sayfa-acildi"); }, []);
  const durum = () => ({ kategori, model, doku, malzeme: material, boyMm: heightMm, telMm: fineDiaMm });

  const switchModel = (m: ModelId) => {
    setModel(m);
    setFineDiaMm(MODELS[m].defaults.fine);
    setFrameDiaMm(MODELS[m].defaults.frame);
    setHeightMm(MODELS[m].defaults.height);
    ustaLog("model-degisti", { model: m });
  };
  const switchKategori = (k: KategoriId) => {
    setKategori(k);
    ustaLog("kategori-degisti", { kategori: k });
  };

  // Kütüphane: reçete defteri (model = reçete; mesh motordan yeniden doğar)
  const [recipes, setRecipes] = useState<GeoRecipe[]>([]);
  const viewerBoxRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    listRecipes().then(setRecipes).catch(() => {});
  }, []);
  const saveCurrent = async () => {
    const canvas = viewerBoxRef.current?.querySelector("canvas");
    if (!canvas) return;
    await saveRecipe({
      id: crypto.randomUUID(),
      ad: `${KATEGORILER[kategori].label} · ${MODELS[model].label.split(" ")[0]} · ${new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`,
      model, material, heightMm, fineDiaMm, frameDiaMm,
      kategori,
      createdAt: Date.now(),
      thumb: canvasThumb(canvas),
    });
    setRecipes(await listRecipes());
    ustaLog("kaydedildi", durum());
  };
  const applyRecipe = (r: GeoRecipe) => {
    if (r.model in MODELS) setModel(r.model as ModelId);
    if (r.material in MATERIALS) setMaterial(r.material as MaterialId);
    if (r.kategori && r.kategori in KATEGORILER) setKategori(r.kategori as KategoriId);
    setHeightMm(r.heightMm);
    setFineDiaMm(r.fineDiaMm);
    setFrameDiaMm(r.frameDiaMm);
  };
  const removeRecipe = async (id: string) => {
    await deleteRecipe(id);
    setRecipes(await listRecipes());
  };

  // Komut alanı v1: serbest metinden model/ölçü/malzeme/tel okur.
  // Kuyumcu dili desteklenir: "N mikron" = N/100 mm (30 mikron = 0.30mm).
  const [prompt, setPrompt] = useState("");
  const applyPrompt = () => {
    ustaLog("komut", { metin: prompt.slice(0, 200) });
    const t = prompt.toLowerCase().replace(/,/g, ".");
    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
    // MOTİF KOMUTU (Faz 2): parça seçiliyken motif adı yazılırsa parça dönüşür
    const motifEs = Object.entries(MOTIFLER).find(([, m]) => m.anahtar.test(t));
    if (motifEs) {
      if (selKey) {
        applyEdit(selKey, { motif: motifEs[0] as MotifId }, "motif-degisti");
        setPromptMsg(`"${built.names[selKey] ?? selKey}" → ${motifEs[1].ad} motifine çevrildi ✓`);
        return;
      }
      if (!/damla/.test(t)) { // "damla" aynı zamanda model adı — seçim yoksa modele düşsün
        setPromptMsg(`${motifEs[1].ad} motifi için önce viewer'da bir parça seç`);
        return;
      }
    }
    setPromptMsg(null);
    if (t.includes("kelebek")) switchModel("ozgun");
    else if (t.includes("arabesk")) switchModel("arabesk");
    else if (t.includes("damla")) switchModel("damla");
    if (/alt[ıi]n|14k/.test(t)) setMaterial("au14");
    else if (/g[üu]m[üu]ş|gumus|925/.test(t)) setMaterial("ag925");
    const mm = t.match(/(\d+(?:\.\d+)?)\s*mm/);
    if (mm) setHeightMm(clamp(parseFloat(mm[1]), 15, 60));
    for (const m of t.matchAll(/([çc]er[çc]eve\s+)?(\d+(?:\.\d+)?)\s*mikron/g)) {
      const v = parseFloat(m[2]) / 100; // kuyumcu mikronu -> mm
      if (m[1]) setFrameDiaMm(clamp(v, 0.3, 2));
      else setFineDiaMm(clamp(v, 0.03, 1));
    }
  };

  // kaydırıcı sürüklenirken UI donmasın
  const dKategori = useDeferredValue(kategori);
  const dEdits = useDeferredValue(partEdits);
  const dModel = useDeferredValue(model);
  const dFine = useDeferredValue(fineDiaMm);
  const dFrame = useDeferredValue(frameDiaMm);
  const dHeight = useDeferredValue(heightMm);
  const dDoku = useDeferredValue(doku);
  const dAnaliz = useDeferredValue(analiz);

  const built = useMemo(() => {
    const src = dModel === "ozgun"
      ? buildKelebekOzgun({ wingspanMm: dHeight, fineDiaMm: dFine, frameDiaMm: dFrame })
      : dModel === "kelebek"
      ? buildTelkariKelebek({ heightMm: dHeight, fineDiaMm: dFine, frameDiaMm: dFrame })
      : dModel === "arabesk"
      ? buildTelkariArabesk({
          heightMm: dHeight, widthMm: dHeight * (26 / 36), fineDiaMm: dFine, frameDiaMm: dFrame,
        })
      : { wires: buildTelkariDrop({ heightMm: dHeight, fineDiaMm: dFine, frameDiaMm: dFrame }), granules: [] };
    type SolidRow = { name: string; mesh: { positions: Float64Array; indices: Uint32Array } };
    const srcSolids = "solids" in src ? (src.solids as SolidRow[]) : [];
    // KATEGORİ saf seçimdir (Murat, 2026-07-14): model dönüştürülmez —
    // kolye dışındaki kategorilerin kendi modelleri ileride eklenecek.
    const kat: Parcalar = {
      wires: src.wires, granules: src.granules, solids: srcSolids as Parcalar["solids"],
    };

    // ---- PARÇA DÜZENLEMELERİ (Faz 2): silinen atlanır; motif -> ölçek -> taşıma.
    // Ölçek OMURGAYI ölçekler, tel çapına dokunmaz (çap malzeme özelliğidir).
    const edWires: { tw: Parcalar["wires"][number]; key: string }[] = [];
    kat.wires.forEach((tw, i) => {
      const key = `w${i}`;
      const e = dEdits[key];
      if (e?.deleted) return;
      let path = tw.path;
      if (e) {
        if (e.motif) path = motifYap(path, e.motif);
        if (e.scale !== 1 || e.dx || e.dy || e.dz) {
          let cx = 0, cy = 0, cz = 0;
          for (const p of path.pts) { cx += p[0]; cy += p[1]; cz += p[2]; }
          const np = path.pts.length; cx /= np; cy /= np; cz /= np;
          path = {
            closed: path.closed,
            pts: path.pts.map((p): V3 => [
              cx + (p[0] - cx) * e.scale + e.dx,
              cy + (p[1] - cy) * e.scale + e.dy,
              cz + (p[2] - cz) * e.scale + e.dz,
            ]),
          };
        }
      }
      edWires.push({ tw: { ...tw, path }, key });
    });
    const edGrans = kat.granules
      .map((g, i) => ({ g, key: `g${i}` }))
      .filter(({ key }) => !dEdits[key]?.deleted)
      .map(({ g, key }) => {
        const e = dEdits[key];
        if (!e) return { g, key };
        return {
          key,
          g: {
            ...g,
            center: [g.center[0] + e.dx, g.center[1] + e.dy, g.center[2] + e.dz] as V3,
            radiusMm: g.radiusMm * e.scale,
          },
        };
      });
    const edSolids = kat.solids
      .map((s, i) => ({ s, key: `s${i}` }))
      .filter(({ key }) => !dEdits[key]?.deleted)
      .map(({ s, key }) => {
        const e = dEdits[key];
        if (!e || (!e.dx && !e.dy && !e.dz)) return { s, key };
        const P = Float64Array.from(s.mesh.positions);
        for (let k = 0; k < P.length; k += 3) { P[k] += e.dx; P[k + 1] += e.dy; P[k + 2] += e.dz; }
        return { s: { ...s, mesh: { ...s.mesh, positions: P } }, key };
      });
    const names: Record<string, string> = {};
    edWires.forEach(({ tw, key }) => { names[key] = tw.name; });
    edGrans.forEach(({ g, key }) => { names[key] = g.name; });
    edSolids.forEach(({ s, key }) => { names[key] = s.name; });

    // teller: dolgu telleri (ince) doku seçimine göre düz veya BURGU süpürülür
    const wireRows: {
      view: ViewMesh; lengthMm: number; vol: number;
      meas: ReturnType<typeof measureWire>; manifoldOk: boolean;
      anaPts: V3[]; anaR: number; anaDia?: number; fineFlag: boolean;
    }[] = [];
    for (const { tw, key } of edWires) {
      const isFine = tw.radiusMm * 2 === dFine;
      const kind = (isFine ? "fine" : "frame") as ViewMesh["kind"];
      if (isFine && (dDoku === "burgu" || dDoku === "burgu-yassi" || dDoku === "orgu")) {
        const D = tw.radiusMm * 2;
        const strands = sweepTwistedWire(tw.path, D, {
          strands: dDoku === "orgu" ? 3 : 2,
          pitchMm: D * (dDoku === "orgu" ? 4 : 3.2),
          flattenZ: dDoku === "burgu-yassi" ? 0.55 : 1,
          tolMm: 0.003, // damar görsel toleransı (3µm) — mesh patlamasın
          minRingSpacingMm: 0.12,
        });
        for (const st of strands) {
          wireRows.push({
            view: { positions: st.mesh.positions, indices: st.mesh.indices, kind, partKey: key },
            lengthMm: st.mesh.lengthMm, // gerçek tel tüketimi (burgu daha uzundur)
            vol: meshVolumeMm3(st.mesh.positions, st.mesh.indices),
            meas: measureWire(st.mesh, st.path),
            manifoldOk: edgeManifoldReport(st.mesh.indices).ok,
            anaPts: st.path.pts, anaR: st.mesh.requestedRadiusMm, anaDia: D, fineFlag: true,
          });
        }
      } else if (isFine && dDoku === "cift-burma") {
        // S+Z: ters yönlü iki burma yan yana (balıksırtı) — her biri D/2 kalınlıkta
        const D = tw.radiusMm * 2;
        for (const yon of [1, -1] as const) {
          const off = offsetPathN(tw.path, (yon * D) / 4);
          for (const st of sweepTwistedWire(off, D / 2, {
            pitchMm: yon * (D / 2) * 3.2, tolMm: 0.003, minRingSpacingMm: 0.1,
          })) {
            wireRows.push({
              view: { positions: st.mesh.positions, indices: st.mesh.indices, kind, partKey: key },
              lengthMm: st.mesh.lengthMm,
              vol: meshVolumeMm3(st.mesh.positions, st.mesh.indices),
              meas: measureWire(st.mesh, st.path),
              manifoldOk: edgeManifoldReport(st.mesh.indices).ok,
              anaPts: st.path.pts, anaR: st.mesh.requestedRadiusMm, anaDia: D, fineFlag: true,
            });
          }
        }
      } else if (isFine && dDoku === "sarma") {
        // kazaziye: kalın çekirdek + üstüne sık sarılan ince tel
        const D = tw.radiusMm * 2;
        const rCoil = 0.15 * D, rCore = 0.2 * D;
        const core = sweepWire(tw.path, rCore);
        wireRows.push({
          view: { positions: core.positions, indices: core.indices, kind, partKey: key },
          lengthMm: core.lengthMm,
          vol: meshVolumeMm3(core.positions, core.indices),
          meas: measureWire(core, tw.path),
          manifoldOk: edgeManifoldReport(core.indices).ok,
          anaPts: tw.path.pts, anaR: rCore, anaDia: D, fineFlag: true,
        });
        for (const st of sweepTwistedWire(tw.path, D, {
          strands: 1, strandRadiusMm: rCoil, orbitMm: rCore + rCoil,
          pitchMm: 2.1 * (2 * rCoil), tolMm: 0.003, minRingSpacingMm: 0.08,
        })) {
          wireRows.push({
            view: { positions: st.mesh.positions, indices: st.mesh.indices, kind, partKey: key },
            lengthMm: st.mesh.lengthMm,
            vol: meshVolumeMm3(st.mesh.positions, st.mesh.indices),
            meas: measureWire(st.mesh, st.path),
            manifoldOk: edgeManifoldReport(st.mesh.indices).ok,
            anaPts: st.path.pts, anaR: rCoil, anaDia: D, fineFlag: true,
          });
        }
      } else if (isFine && dDoku === "boncuk") {
        const D = tw.radiusMm * 2;
        const b = sweepBeadedWire(tw.path, D, { tolMm: 0.003 });
        wireRows.push({
          view: { positions: b.mesh.positions, indices: b.mesh.indices, kind, partKey: key },
          lengthMm: b.mesh.lengthMm,
          vol: meshVolumeMm3(b.mesh.positions, b.mesh.indices),
          meas: {
            requestedDiaMm: D,
            worstCircumErrUm: mmToUm(b.worstErrMm),        // dürüst yapı denetimi
            minInscribedDiaMm: b.minNeckDiaMm,             // en ince nokta = boğaz
            worstInradiusDeficitUm: 0,
          },
          manifoldOk: edgeManifoldReport(b.mesh.indices).ok,
          anaPts: b.path.pts, anaR: tw.radiusMm, anaDia: D, fineFlag: true,
        });
      } else if (isFine && dDoku === "ondule") {
        const D = tw.radiusMm * 2;
        const wavy = makeWavyPath(tw.path, D * 0.8, D * 4);
        const mesh = sweepWire(wavy, tw.radiusMm);
        wireRows.push({
          view: { positions: mesh.positions, indices: mesh.indices, kind, partKey: key },
          lengthMm: mesh.lengthMm, // dalga gerçek tel tüketimini artırır
          vol: meshVolumeMm3(mesh.positions, mesh.indices),
          meas: measureWire(mesh, wavy),
          manifoldOk: edgeManifoldReport(mesh.indices).ok,
          anaPts: wavy.pts, anaR: tw.radiusMm, anaDia: D, fineFlag: true,
        });
      } else {
        const mesh = sweepWire(tw.path, tw.radiusMm);
        wireRows.push({
          view: { positions: mesh.positions, indices: mesh.indices, kind, partKey: key },
          lengthMm: mesh.lengthMm,
          vol: meshVolumeMm3(mesh.positions, mesh.indices),
          meas: measureWire(mesh, tw.path),
          manifoldOk: edgeManifoldReport(mesh.indices).ok,
          anaPts: tw.path.pts, anaR: tw.radiusMm, fineFlag: isFine,
        });
      }
    }
    const granRows = edGrans.map(({ g, key }) => {
      const mesh = sphereMesh(g.center, g.radiusMm);
      return {
        view: { positions: mesh.positions, indices: mesh.indices, kind: "frame" as ViewMesh["kind"], partKey: key },
        vol: meshVolumeMm3(mesh.positions, mesh.indices),
        worstErrUm: mmToUm(measureSphere(mesh)),
        manifoldOk: edgeManifoldReport(mesh.indices).ok,
      };
    });

    const solidRows = edSolids.map(({ s, key }) => ({
      view: { positions: s.mesh.positions, indices: s.mesh.indices, kind: "frame" as ViewMesh["kind"], partKey: key },
      vol: meshVolumeMm3(s.mesh.positions, s.mesh.indices),
      manifoldOk: edgeManifoldReport(s.mesh.indices).ok,
    }));

    void dKategori; // kategori şimdilik salt seçim (yeniden üretimi etkilemez)

    // KIRILGANLIK ANALİZİ: teller + granüller (tek-nokta destek) omurgadan denetlenir
    let uyari = 0, riskli = 0, worstRatio = 0;
    if (dAnaliz) {
      const anaWires: AnalyzeWire[] = [
        ...wireRows.map((r) => ({ pts: r.anaPts, radiusMm: r.anaR, diaMm: r.anaDia })),
        ...edGrans.map(({ g }) => ({ pts: [g.center], radiusMm: g.radiusMm })),
      ];
      const { verdicts, worstRatio: wr } = analyzeSpans(anaWires);
      worstRatio = wr;
      wireRows.forEach((r, i) => {
        const v = verdicts[i];
        if (v.level === 1) { r.view.kind = "warn"; uyari++; }
        else if (v.level === 2) { r.view.kind = "danger"; riskli++; }
      });
      edGrans.forEach((_, i) => {
        const v = verdicts[wireRows.length + i];
        if (v.level === 2) { granRows[i].view.kind = "danger"; riskli++; }
      });
    }

    const fineRows = wireRows.filter((r) => r.fineFlag);
    const totalVol = wireRows.reduce((s, r) => s + r.vol, 0)
      + granRows.reduce((s, r) => s + r.vol, 0) + solidRows.reduce((s, r) => s + r.vol, 0);
    const meshes: ViewMesh[] = [
      ...wireRows.map((r) => r.view), ...granRows.map((r) => r.view), ...solidRows.map((r) => r.view),
    ];
    return {
      meshes, names,
      uyari, riskli, worstRatio,
      totalLen: wireRows.reduce((s, r) => s + r.lengthMm, 0),
      totalVol,
      tris: meshes.reduce((s, m) => s + m.indices.length / 3, 0),
      worstDiaErrUm: Math.max(
        ...wireRows.map((r) => r.meas.worstCircumErrUm),
        ...granRows.map((r) => r.worstErrUm),
      ),
      minInscribedDiaMm: fineRows.length
        ? Math.min(...fineRows.map((r) => r.meas.minInscribedDiaMm)) : 0,
      manifoldOk: wireRows.every((r) => r.manifoldOk) && granRows.every((r) => r.manifoldOk)
        && solidRows.every((r) => r.manifoldOk),
      granuleCount: granRows.length,
    };
  }, [dModel, dFine, dFrame, dHeight, dDoku, dAnaliz, dKategori, dEdits]);

  // parametre değişince birleşik gövde bilgisi bayatlar
  useEffect(() => { setUnionInfo(null); }, [built]);

  const gram = built.totalVol * MATERIALS[material].density;

  const indir = (buf: ArrayBuffer, ad: string) => {
    const url = URL.createObjectURL(new Blob([buf], { type: "model/stl" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = ad;
    a.click();
    URL.revokeObjectURL(url);
  };
  const downloadSTL = () => {
    indir(toBinarySTL(built.meshes, "Remaura Telkari"), `telkari-${dModel}-${dHeight}mm-tel${dFine.toFixed(2)}mm.stl`);
    ustaLog("stl-indirildi", durum());
  };
  // TEK GÖVDE: tüm parçalar manifold-3d ile birleştirilir -> döküme hazır STL + GERÇEK gramaj
  const downloadUnionSTL = async () => {
    if (unionBusy) return;
    setUnionBusy(true);
    try {
      const u = await unionMeshes(built.meshes);
      setUnionInfo({ volumeMm3: u.volumeMm3, parca: u.parcaSayisi });
      indir(toBinarySTL([u], "Remaura Telkari (tek gövde)"),
        `telkari-${dModel}-${dHeight}mm-tekgovde.stl`);
      ustaLog("tekgovde-indirildi", { ...durum(), hacimMm3: Math.round(u.volumeMm3) });
    } catch {
      setUnionInfo(null);
    } finally {
      setUnionBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080a] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="rounded-full border border-[#b76e79]/40 bg-[#b76e79]/10 px-3 py-1 text-[11px] font-medium tracking-wide text-[#b76e79]">
            GEOMETRİ ÇEKİRDEĞİ
          </span>
          <h1 className="font-display text-2xl font-medium tracking-[-0.03em]">Telkari</h1>
          <span className="ml-auto font-mono text-[11px] text-white/40">
            mikron-doğrulamalı parametrik model
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          {/* sol panel */}
          <div className="space-y-4">
            <div className="space-y-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div>
                <div className="mb-1.5 text-[13px] text-[#c9a88a]">Komut</div>
                <div className="flex gap-2">
                  <input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") applyPrompt(); }}
                    placeholder="örn: kelebek 40mm gümüş, 30 mikron tel"
                    className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[12px] text-white/90 outline-none placeholder:text-white/25 focus:border-[#b76e79]/50"
                  />
                  <button
                    onClick={applyPrompt}
                    className="shrink-0 rounded-lg border border-[#b76e79]/40 bg-[#b76e79]/10 px-3 py-2 text-[12px] font-medium text-[#b76e79] transition-colors hover:bg-[#b76e79]/20"
                  >
                    Uygula
                  </button>
                </div>
                {promptMsg && (
                  <p className="mt-1 text-[10px] leading-snug text-[#b76e79]">{promptMsg}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="mb-1.5 text-[13px] text-[#c9a88a]">Kategori</div>
                  <select
                    value={kategori}
                    onChange={(e) => switchKategori(e.target.value as KategoriId)}
                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-[12px] text-white/90 outline-none focus:border-[#b76e79]/50"
                  >
                    {Object.entries(KATEGORILER).map(([id, k]) => (
                      <option key={id} value={id} className="bg-[#141414]">{k.label}</option>
                    ))}
                  </select>
                  {kategori !== "kolye" && (
                    <p className="mt-1 text-[10px] leading-snug text-[#c9a88a]/70">
                      Bu kategorinin modelleri yakında — aşağıdakiler kolye ucu modelleridir.
                    </p>
                  )}
                </div>
                <div>
                  <div className="mb-1.5 text-[13px] text-[#c9a88a]">Model</div>
                  <select
                    value={model}
                    onChange={(e) => switchModel(e.target.value as ModelId)}
                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-[12px] text-white/90 outline-none focus:border-[#b76e79]/50"
                  >
                    {Object.entries(MODELS).map(([id, m]) => (
                      <option key={id} value={id} className="bg-[#141414]">{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <div className="mb-1.5 text-[13px] text-[#c9a88a]">Malzeme</div>
                <select
                  value={material}
                  onChange={(e) => { setMaterial(e.target.value as MaterialId); ustaLog("malzeme-degisti", { malzeme: e.target.value }); }}
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-[12px] text-white/90 outline-none focus:border-[#b76e79]/50"
                >
                  {Object.entries(MATERIALS).map(([id, m]) => (
                    <option key={id} value={id} className="bg-[#141414]">{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="mb-1.5 text-[13px] text-[#c9a88a]">Doku (dolgu teli)</div>
                  <select
                    value={doku}
                    onChange={(e) => { setDoku(e.target.value as DokuId); ustaLog("doku-degisti", { doku: e.target.value }); }}
                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-[12px] text-white/90 outline-none focus:border-[#b76e79]/50"
                  >
                    {Object.entries(DOKULAR).map(([id, ad]) => (
                      <option key={id} value={id} className="bg-[#141414]">{ad}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="mb-1.5 text-[13px] text-[#c9a88a]">Kırılganlık analizi</div>
                  <button
                    onClick={() => { setAnaliz((v) => !v); ustaLog("analiz", { acik: !analiz }); }}
                    className={`w-full rounded-lg border px-2 py-1.5 text-[12px] font-medium transition-colors ${
                      analiz
                        ? "border-[#b76e79]/60 bg-[#b76e79]/20 text-[#e8b6bd]"
                        : "border-white/[0.08] bg-white/[0.04] text-white/60 hover:text-white/85"
                    }`}
                  >
                    {analiz ? "Açık — teller boyalı" : "Kapalı"}
                  </button>
                </div>
              </div>
              <DiaControl label="İnce tel çapı" value={fineDiaMm} onChange={setFineDiaMm}
                min={0.03} max={1.0} step={0.01} />
              <DiaControl label="Çerçeve tel çapı" value={frameDiaMm} onChange={setFrameDiaMm}
                min={0.3} max={2.0} step={0.05} />
              <DiaControl label="Gövde boyu" value={heightMm} onChange={setHeightMm}
                min={15} max={60} step={1} jewelerUnit={false} />
            </div>

            {/* DÜZENLE (Faz 2): parça seç -> taşı / kat değiştir / boyutla / motife çevir */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[13px] font-medium text-[#c9a88a]">Düzenle</span>
                <div className="flex gap-1.5">
                  <button onClick={undoEdit} disabled={!past.length}
                    className="rounded-md border border-white/[0.08] px-2 py-1 text-[11px] text-white/70 disabled:opacity-30 hover:text-white">◀ Geri</button>
                  <button onClick={redoEdit} disabled={!future.length}
                    className="rounded-md border border-white/[0.08] px-2 py-1 text-[11px] text-white/70 disabled:opacity-30 hover:text-white">İleri ▶</button>
                  <button onClick={resetEdits} disabled={!Object.keys(partEdits).length}
                    className="rounded-md border border-white/[0.08] px-2 py-1 text-[11px] text-white/70 disabled:opacity-30 hover:text-white">Sıfırla</button>
                </div>
              </div>
              {!selKey ? (
                <p className="text-[12px] leading-relaxed text-white/40">
                  Viewer&apos;da bir tele/parçaya tıkla → okla taşı, aşağıdan katını ve
                  boyutunu değiştir ya da komuta motif adı yaz (&quot;gül&quot;, &quot;kalp&quot;…) — parça o motife dönüşür.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="font-mono text-[12px] text-white/85">{built.names[selKey] ?? selKey}</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button onClick={() => applyEdit(selKey, { dz: (partEdits[selKey]?.dz ?? 0) + Math.max(fineDiaMm, 0.3) }, "uste-al")}
                      className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-[12px] text-white/80 hover:text-white">▲ Üste al</button>
                    <button onClick={() => applyEdit(selKey, { dz: (partEdits[selKey]?.dz ?? 0) - Math.max(fineDiaMm, 0.3) }, "alta-al")}
                      className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-[12px] text-white/80 hover:text-white">▼ Alta al</button>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-[11px]">
                      <span className="text-[#c9a88a]">Boyut (tel çapı sabit kalır)</span>
                      <span className="font-mono text-white/70">×{(partEdits[selKey]?.scale ?? 1).toFixed(2)}</span>
                    </div>
                    <input type="range" min={0.4} max={2.5} step={0.05}
                      value={partEdits[selKey]?.scale ?? 1}
                      onChange={(e) => applyEdit(selKey, { scale: parseFloat(e.target.value) }, "boyutlandi")}
                      className="range-slider w-full" />
                  </div>
                  {selKey.startsWith("w") && (
                  <div>
                    <div className="mb-1 text-[11px] text-[#c9a88a]">Motife çevir</div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(MOTIFLER).map(([id, m]) => (
                        <button key={id}
                          onClick={() => applyEdit(selKey, { motif: id as MotifId }, "motif-degisti")}
                          className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${
                            partEdits[selKey]?.motif === id
                              ? "border-[#b76e79]/60 bg-[#b76e79]/20 text-[#e8b6bd]"
                              : "border-white/[0.08] bg-white/[0.04] text-white/70 hover:text-white"
                          }`}>{m.ad}</button>
                      ))}
                    </div>
                  </div>
                  )}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button onClick={() => {
                      setPast((p) => [...p.slice(-29), partEdits]); setFuture([]);
                      const next = { ...partEdits }; delete next[selKey]; setPartEdits(next);
                      ustaLog("parca-sifirlandi", { key: selKey });
                    }}
                      className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-[12px] text-white/80 hover:text-white">Parçayı sıfırla</button>
                    <button onClick={() => { applyEdit(selKey, { deleted: true }, "parca-silindi"); setSelKey(null); }}
                      className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-[12px] text-red-300 hover:bg-red-500/20">Parçayı sil</button>
                  </div>
                </div>
              )}
            </div>

            {/* ölçüm raporu — "istedik" değil "ölçtük" */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="mb-3 text-[13px] font-medium text-[#c9a88a]">Geri-ölçüm raporu</div>
              <dl className="space-y-2 font-mono text-[12px]">
                <div className="flex justify-between">
                  <dt className="text-white/50">İstenen ince tel çapı</dt>
                  <dd className="text-white/90">{fmtUm(dFine, 1)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-white/50">Ölçülen sapma (en kötü)</dt>
                  <dd className={built.worstDiaErrUm < 1 ? "text-emerald-400" : "text-red-400"}>
                    {built.worstDiaErrUm < 0.001 ? "< 0.001" : built.worstDiaErrUm.toFixed(3)} µm
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-white/50">En ince nokta (facet dibi)</dt>
                  <dd className="text-white/90">{fmtUm(built.minInscribedDiaMm, 1)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-white/50">Toplam tel</dt>
                  <dd className="text-white/90">{built.totalLen.toFixed(1)} mm</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-white/50">Granül</dt>
                  <dd className="text-white/90">{built.granuleCount} adet</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-white/50">Hacim</dt>
                  <dd className="text-white/90">{built.totalVol.toFixed(2)} mm³</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-white/50">{MATERIALS[material].label} (yaklaşık)</dt>
                  <dd className="text-white/90">{gram.toFixed(3)} g</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-white/50">Üçgen</dt>
                  <dd className="text-white/60">{Math.round(built.tris).toLocaleString("tr-TR")}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-white/50">Kapalı yüzey (manifold)</dt>
                  <dd className={built.manifoldOk ? "text-emerald-400" : "text-red-400"}>
                    {built.manifoldOk ? "✓ tüm parçalar" : "✗ sorun var"}
                  </dd>
                </div>
                {analiz && (
                  <div className="flex justify-between">
                    <dt className="text-white/50">Kırılganlık (L/d {">"} {SPAN_WARN_RATIO})</dt>
                    <dd className={built.riskli ? "text-red-400" : built.uyari ? "text-amber-400" : "text-emerald-400"}>
                      {built.riskli || built.uyari
                        ? `${built.riskli} riskli · ${built.uyari} uyarı · en kötü ${built.worstRatio.toFixed(0)}`
                        : `✓ temiz (en kötü L/d ${built.worstRatio.toFixed(1)})`}
                    </dd>
                  </div>
                )}
                {unionInfo && (
                  <div className="flex justify-between">
                    <dt className="text-white/50">Birleşik gövde (gerçek)</dt>
                    <dd className="text-emerald-400">
                      {unionInfo.volumeMm3.toFixed(2)} mm³ · {(unionInfo.volumeMm3 * MATERIALS[material].density).toFixed(3)} g
                    </dd>
                  </div>
                )}
              </dl>
              <p className="mt-3 text-[11px] leading-relaxed text-white/35">
                Ağırlık, tel kesişimlerini (lehim noktaları) çift sayar — birleşik gövde
                hacmi bir sonraki adımda. Döküm uygunluğu ayrı rapordur.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={saveCurrent}
                className="shrink-0 rounded-full border border-[#b76e79]/40 bg-[#b76e79]/10 px-5 py-3 text-sm font-medium text-[#b76e79] transition-colors hover:bg-[#b76e79]/20"
              >
                Kaydet
              </button>
              <button
                onClick={downloadSTL}
                className="min-w-0 flex-1 rounded-full bg-[linear-gradient(135deg,#c4838b,#b76e79,#a65f69)] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                STL indir ({Math.round(built.tris).toLocaleString("tr-TR")} üçgen)
              </button>
            </div>
            <button
              onClick={downloadUnionSTL}
              disabled={unionBusy}
              className="w-full rounded-full border border-white/[0.12] bg-white/[0.04] px-6 py-3 text-sm font-medium text-white/85 transition-colors hover:bg-white/[0.08] disabled:opacity-50"
            >
              {unionBusy ? "Birleştiriliyor…" : "Tek gövde STL (döküme hazır) + gerçek gramaj"}
            </button>
          </div>

          {/* viewer */}
          <div ref={viewerBoxRef} className="relative min-h-[70vh] overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a0b0e]">
            <GeometriViewer
              meshes={built.meshes}
              material={material}
              editMode
              selectedKey={selKey}
              onPick={(k) => {
                setSelKey(k);
                if (k) ustaLog("parca-secildi", { key: k, ad: built.names[k] });
              }}
              onMoveCommit={(k, d) => {
                const cur = partEdits[k] ?? BOS_EDIT;
                applyEdit(k, { dx: cur.dx + d[0], dy: cur.dy + d[1], dz: cur.dz + d[2] }, "parca-tasindi");
              }}
            />
            {selKey && (
              <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-black/60 px-3 py-1.5 font-mono text-[11px] text-[#e8b6bd]">
                Seçili: {built.names[selKey] ?? selKey} — okla taşı, panelden düzenle
              </div>
            )}
          </div>
        </div>

        {/* kütüphane — son 10 reçete (model=reçete; tıkla -> aynen geri yüklenir) */}
        {recipes.length > 0 && (
          <div className="mt-5">
            <div className="mb-2.5 flex items-baseline gap-2">
              <span className="text-[13px] font-medium text-[#c9a88a]">Kütüphane</span>
              <span className="font-mono text-[11px] text-white/35">son {Math.min(10, recipes.length)} model</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {recipes.slice(0, 10).map((r) => (
                <div key={r.id} className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] transition-colors hover:border-[#b76e79]/40">
                  <button onClick={() => applyRecipe(r)} className="block w-full text-left">
                    {/* eslint-disable-next-line @next/next/no-img-element -- dataURL önizleme */}
                    <img src={r.thumb} alt={r.ad} className="aspect-[4/3] w-full object-cover" />
                    <div className="px-2.5 py-2">
                      <div className="text-[12px] text-white/85">{r.ad}</div>
                      <div className="font-mono text-[10px] text-white/40">
                        {r.heightMm}mm · tel {Math.round(r.fineDiaMm * 100)} mikron
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => removeRecipe(r.id)}
                    aria-label="Sil"
                    className="absolute right-1.5 top-1.5 hidden h-6 w-6 items-center justify-center rounded-full bg-black/60 text-[13px] text-white/70 hover:text-white group-hover:flex"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
