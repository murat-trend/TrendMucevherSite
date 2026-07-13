"use client";

import { useMemo, useState, useDeferredValue } from "react";
import { GeometriViewer, ViewMesh } from "./GeometriViewer";
import { buildTelkariDrop } from "@/lib/remaura/geo/telkari";
import { buildTelkariArabesk } from "@/lib/remaura/geo/telkariArabesk";
import { buildTelkariKelebek } from "@/lib/remaura/geo/telkariKelebek";
import { buildKelebekOzgun } from "@/lib/remaura/geo/kelebekOzgun";
import { sweepWire } from "@/lib/remaura/geo/wire";
import { sphereMesh, measureSphere } from "@/lib/remaura/geo/granule";
import { measureWire, meshVolumeMm3, edgeManifoldReport } from "@/lib/remaura/geo/measure";
import { toBinarySTL } from "@/lib/remaura/geo/stl";
import { fmtUm, mmToUm } from "@/lib/remaura/geo/units";

// döküm yaklaşık yoğunluklar (g/mm³)
const MATERIALS = {
  ag925: { label: "Gümüş 925", density: 0.01036 },
  au14: { label: "Altın 14K", density: 0.01358 },
} as const;
type MaterialId = keyof typeof MATERIALS;

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
  const [model, setModel] = useState<ModelId>("ozgun");
  const [material, setMaterial] = useState<MaterialId>("ag925");
  const [fineDiaMm, setFineDiaMm] = useState<number>(MODELS.ozgun.defaults.fine);
  const [frameDiaMm, setFrameDiaMm] = useState<number>(MODELS.ozgun.defaults.frame);
  const [heightMm, setHeightMm] = useState<number>(MODELS.ozgun.defaults.height);

  const switchModel = (m: ModelId) => {
    setModel(m);
    setFineDiaMm(MODELS[m].defaults.fine);
    setFrameDiaMm(MODELS[m].defaults.frame);
    setHeightMm(MODELS[m].defaults.height);
  };

  // Komut alanı v1: serbest metinden model/ölçü/malzeme/tel okur.
  // Kuyumcu dili desteklenir: "N mikron" = N/100 mm (30 mikron = 0.30mm).
  const [prompt, setPrompt] = useState("");
  const applyPrompt = () => {
    const t = prompt.toLowerCase().replace(/,/g, ".");
    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
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
  const dModel = useDeferredValue(model);
  const dFine = useDeferredValue(fineDiaMm);
  const dFrame = useDeferredValue(frameDiaMm);
  const dHeight = useDeferredValue(heightMm);

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

    const wireRows = src.wires.map((tw) => {
      const mesh = sweepWire(tw.path, tw.radiusMm);
      const meas = measureWire(mesh, tw.path);
      return {
        view: {
          positions: mesh.positions, indices: mesh.indices,
          kind: (tw.radiusMm * 2 === dFine ? "fine" : "frame") as ViewMesh["kind"],
        },
        lengthMm: mesh.lengthMm,
        vol: meshVolumeMm3(mesh.positions, mesh.indices),
        meas,
        manifoldOk: edgeManifoldReport(mesh.indices).ok,
      };
    });
    const granRows = src.granules.map((g) => {
      const mesh = sphereMesh(g.center, g.radiusMm);
      return {
        view: { positions: mesh.positions, indices: mesh.indices, kind: "frame" as ViewMesh["kind"] },
        vol: meshVolumeMm3(mesh.positions, mesh.indices),
        worstErrUm: mmToUm(measureSphere(mesh)),
        manifoldOk: edgeManifoldReport(mesh.indices).ok,
      };
    });

    const solidRows = srcSolids.map((s) => ({
      view: { positions: s.mesh.positions, indices: s.mesh.indices, kind: "frame" as ViewMesh["kind"] },
      vol: meshVolumeMm3(s.mesh.positions, s.mesh.indices),
      manifoldOk: edgeManifoldReport(s.mesh.indices).ok,
    }));

    const fineRows = wireRows.filter((r) => r.view.kind === "fine");
    const totalVol = wireRows.reduce((s, r) => s + r.vol, 0)
      + granRows.reduce((s, r) => s + r.vol, 0) + solidRows.reduce((s, r) => s + r.vol, 0);
    const meshes: ViewMesh[] = [
      ...wireRows.map((r) => r.view), ...granRows.map((r) => r.view), ...solidRows.map((r) => r.view),
    ];
    return {
      meshes,
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
  }, [dModel, dFine, dFrame, dHeight]);

  const gram = built.totalVol * MATERIALS[material].density;

  const downloadSTL = () => {
    const buf = toBinarySTL(built.meshes, "Remaura Telkari");
    const url = URL.createObjectURL(new Blob([buf], { type: "model/stl" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `telkari-${dModel}-${dHeight}mm-tel${dFine.toFixed(2)}mm.stl`;
    a.click();
    URL.revokeObjectURL(url);
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
              </div>
              <div className="grid grid-cols-2 gap-2">
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
                <div>
                  <div className="mb-1.5 text-[13px] text-[#c9a88a]">Malzeme</div>
                  <select
                    value={material}
                    onChange={(e) => setMaterial(e.target.value as MaterialId)}
                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-[12px] text-white/90 outline-none focus:border-[#b76e79]/50"
                  >
                    {Object.entries(MATERIALS).map(([id, m]) => (
                      <option key={id} value={id} className="bg-[#141414]">{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <DiaControl label="İnce tel çapı" value={fineDiaMm} onChange={setFineDiaMm}
                min={0.03} max={1.0} step={0.01} />
              <DiaControl label="Çerçeve tel çapı" value={frameDiaMm} onChange={setFrameDiaMm}
                min={0.3} max={2.0} step={0.05} />
              <DiaControl label="Gövde boyu" value={heightMm} onChange={setHeightMm}
                min={15} max={60} step={1} jewelerUnit={false} />
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
              </dl>
              <p className="mt-3 text-[11px] leading-relaxed text-white/35">
                Ağırlık, tel kesişimlerini (lehim noktaları) çift sayar — birleşik gövde
                hacmi bir sonraki adımda. Döküm uygunluğu ayrı rapordur.
              </p>
            </div>

            <button
              onClick={downloadSTL}
              className="w-full rounded-full bg-[linear-gradient(135deg,#c4838b,#b76e79,#a65f69)] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              STL indir ({Math.round(built.tris).toLocaleString("tr-TR")} üçgen)
            </button>
          </div>

          {/* viewer */}
          <div className="relative min-h-[70vh] overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a0b0e]">
            <GeometriViewer meshes={built.meshes} material={material} />
          </div>
        </div>
      </div>
    </div>
  );
}
