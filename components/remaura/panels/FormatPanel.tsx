"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { FORMAT_IDS, type PlatformFormat } from "@/components/remaura/remaura-types";
import { useRemauraApp } from "@/components/remaura/workspace/RemauraWorkspaceContexts";

export function FormatPanel() {
  const { t } = useLanguage();
  const { platformFormat, setPlatformFormat } = useRemauraApp();
  const meta: Record<PlatformFormat, { label: string; size: string; ratio: string; boxSize: string }> = {
    "insta-post": {
      label: t.remauraWorkspace.formatInstagram,
      size: "1080 x 1080",
      ratio: "1:1",
      boxSize: "h-5 w-5",
    },
    "story-reels": {
      label: t.remauraWorkspace.formatTiktokReels,
      size: "1080 x 1920",
      ratio: "9:16",
      boxSize: "h-7 w-4",
    },
    "youtube-web": {
      label: t.remauraWorkspace.formatYoutubeWeb,
      size: "1920 x 1080",
      ratio: "16:9",
      boxSize: "h-4 w-7",
    },
    portrait: {
      label: t.remauraWorkspace.formatPortrait,
      size: "1080 x 1350",
      ratio: "4:5",
      boxSize: "h-6 w-5",
    },
    "3d-export": {
      label: t.remauraWorkspace.format3DExport,
      size: "1024 x 1024",
      ratio: "3D",
      boxSize: "h-5 w-5",
    },
  };

  return (
    <div className="rounded-none border-0 bg-transparent p-0 dark:bg-transparent">
      <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
        <div
          className="h-2 w-2 shrink-0 rounded-full bg-[#b76e79]"
          style={{ boxShadow: "0 0 8px #b76e79" }}
          aria-hidden
        />
        <span className="text-[11px] font-black uppercase tracking-widest text-muted">
          {t.remauraWorkspace.visualFormat}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {FORMAT_IDS.map((id) => {
          const { label, size, ratio, boxSize } = meta[id];
          const isActive = platformFormat === id;
          return (
            <div key={id} className="h-full rounded-2xl border-0 bg-transparent p-0">
              <button
                type="button"
                onClick={() => setPlatformFormat(id)}
                className={`group relative flex h-[110px] w-full flex-col items-center justify-center rounded-2xl border-2 px-3 py-3 transition-all focus:outline-none ${
                  isActive
                    ? "border-[#b76e79] bg-[#b76e79]/5"
                    : "border-white/5 bg-white/[0.02] hover:border-[#b76e79]/30 dark:border-white/5 dark:bg-white/[0.02]"
                }`}
              >
                <div
                  className={`mb-2 flex items-center justify-center rounded-sm border-2 text-[9px] font-bold transition-colors ${boxSize} ${
                    isActive
                      ? "border-[#b76e79] text-[#b76e79]"
                      : "border-muted-foreground/50 text-muted group-focus:border-[#b76e79] group-focus:text-[#b76e79]"
                  }`}
                >
                  {ratio}
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">
                  {label}
                </span>
                <span className="mt-1 font-mono text-[12px] font-bold tracking-tight text-[#b76e79]">
                  {size}
                </span>
                {isActive && (
                  <span className="absolute right-2.5 top-2.5 text-[11px] text-[#b76e79]" aria-hidden>
                    ✓
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
      {platformFormat === "3d-export" && (
        <p className="mt-3 text-[10px] text-muted">{t.remauraWorkspace.format3DExportHint}</p>
      )}
    </div>
  );
}
