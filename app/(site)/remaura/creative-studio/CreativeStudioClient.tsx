"use client";

// AI CREATIVE STUDIO — kabuk (izole süper-admin araç, trendmucevher).
// Sol modül rayı + üst proje ayarları + aktif panel. Tüm durum StudioProvider'da;
// autosave otomatik. TR etiketler dev içindir; remauraai sürümü i18n olacak.

import { INDUSTRIES, MODULES, PLATFORMS } from "@/lib/remaura/creative-studio/constants";
import { StudioProvider, useStudio } from "@/lib/remaura/creative-studio/store";
import { clearProject } from "@/lib/remaura/creative-studio/autosave";
import { ImageStudioPanel } from "./panels/ImageStudioPanel";
import { VideoStudioPanel } from "./panels/VideoStudioPanel";
import { TimelinePanel } from "./panels/TimelinePanel";
import { AudioPanel } from "./panels/AudioPanel";
import { TypographyPanel } from "./panels/TypographyPanel";
import { ThumbnailPanel } from "./panels/ThumbnailPanel";
import { BrandKitPanel } from "./panels/BrandKitPanel";
import { AssetLibraryPanel } from "./panels/AssetLibraryPanel";
import { inputCls } from "./ui";
import type { ModuleKey } from "@/lib/remaura/creative-studio/types";
import type { JSX } from "react";

const PANELS: Record<ModuleKey, () => JSX.Element> = {
  image: ImageStudioPanel,
  video: VideoStudioPanel,
  timeline: TimelinePanel,
  audio: AudioPanel,
  typography: TypographyPanel,
  thumbnail: ThumbnailPanel,
  brand: BrandKitPanel,
  assets: AssetLibraryPanel,
};

function StudioShell() {
  const { project, activeModule, dispatch, saveStatus } = useStudio();
  const Panel = PANELS[activeModule];

  return (
    <div className="min-h-screen bg-[#07080a] text-white/90">
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Üst bar */}
        <header className="mb-5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[#b76e79]/40 bg-[#b76e79]/10 px-3 py-1 text-xs font-semibold text-[#e8c4ca]">
              AI Creative Studio
            </span>
            <span className="text-[10px] uppercase tracking-widest text-white/25">izole deney</span>
          </div>
          <input
            value={project.name}
            onChange={(e) => dispatch({ type: "SET_META", meta: { name: e.target.value } })}
            className="w-44 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm text-white/80 outline-none hover:border-white/[0.08] focus:border-[#b76e79]/50"
            aria-label="Proje adı"
          />
          <span
            className={`text-[11px] ${
              saveStatus === "hata" ? "text-[#b85070]" : saveStatus === "kaydediliyor" ? "text-white/30" : "text-[#c9a88a]/70"
            }`}
          >
            {saveStatus === "kaydedildi" ? "✓ otomatik kaydedildi" : saveStatus === "kaydediliyor" ? "kaydediliyor…" : "kayıt hatası — depolama dolu olabilir"}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <select
              value={project.industry}
              onChange={(e) => dispatch({ type: "SET_META", meta: { industry: e.target.value as typeof project.industry } })}
              className={`${inputCls} w-auto py-1.5 text-xs`}
              aria-label="Sektör"
            >
              {INDUSTRIES.map((i) => (
                <option key={i.key} value={i.key}>{i.label}</option>
              ))}
            </select>
            <select
              value={project.platform}
              onChange={(e) => dispatch({ type: "SET_META", meta: { platform: e.target.value as typeof project.platform } })}
              className={`${inputCls} w-auto py-1.5 text-xs`}
              aria-label="Platform"
            >
              {PLATFORMS.map((p) => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Proje sıfırlansın mı? Autosave da silinir.")) {
                  clearProject();
                  dispatch({ type: "RESET" });
                }
              }}
              className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-white/50 hover:border-[#b85070]/50 hover:text-[#e8a2b8]"
            >
              Yeni Proje
            </button>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
          {/* Modül rayı */}
          <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {MODULES.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => dispatch({ type: "SET_MODULE", module: m.key })}
                className={`shrink-0 rounded-xl border px-3 py-2.5 text-left transition lg:w-full ${
                  activeModule === m.key
                    ? "border-[#b76e79]/60 bg-[#b76e79]/10"
                    : "border-white/[0.05] bg-white/[0.02] hover:border-[#c69575]/40"
                }`}
              >
                <span className={`block text-sm font-medium ${activeModule === m.key ? "text-[#e8c4ca]" : "text-white/70"}`}>
                  {m.label}
                </span>
                <span className="hidden text-[10px] text-white/30 lg:block">{m.desc}</span>
              </button>
            ))}
          </nav>

          {/* Aktif modül paneli */}
          <main>
            <Panel />
          </main>
        </div>
      </div>
    </div>
  );
}

export function CreativeStudioClient() {
  return (
    <StudioProvider>
      <StudioShell />
    </StudioProvider>
  );
}
