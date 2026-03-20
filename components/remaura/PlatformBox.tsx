"use client";

import { useState } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { PlatformIcon, getPlatformHex } from "./PlatformIcons";
import type { ChannelTab } from "./remaura-types";

export type PlatformBoxProps = {
  name: string;
  dotColor: string;
  activeClasses: string;
  tab: ChannelTab;
  setTab: (t: ChannelTab) => void;
  copyId: string;
  descBorder?: string;
  expanded: boolean;
  onToggle: () => void;
  handleCopy: (id: string, content: string) => void;
  copiedId: string | null;
  copyIconDefault: string;
  copyIconCopied: string;
  contentToCopy: string;
};

export function PlatformBox({
  name,
  dotColor,
  activeClasses,
  tab,
  setTab,
  copyId,
  descBorder,
  expanded,
  onToggle,
  handleCopy,
  copiedId,
  copyIconDefault,
  copyIconCopied,
  contentToCopy,
}: PlatformBoxProps) {
  const { t } = useLanguage();
  const btnBase =
    "rounded px-2.5 py-1.5 text-[10px] font-bold uppercase transition sm:px-3 sm:py-1 sm:text-[9px]";
  const btnInactive = "bg-white/5 text-muted hover:text-foreground";
  const [isHovered, setIsHovered] = useState(false);
  const glowHex = getPlatformHex(copyId);
  const glowStyle = glowHex
    ? {
        boxShadow: isHovered ? `0 0 0 1px ${glowHex}40, 0 0 20px ${glowHex}20` : "none",
      }
    : undefined;
  return (
    <div
      className="relative isolate flex flex-col overflow-hidden rounded-2xl border border-border bg-card/80 transition-shadow duration-200 dark:border-white/5 dark:bg-white/[0.02]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={glowStyle}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="relative z-10 flex w-full cursor-pointer flex-col gap-3 border-b border-border bg-white/[0.02] p-4 text-left transition-colors hover:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-white/5 dark:hover:bg-white/[0.06]"
        aria-expanded={expanded}
        aria-controls={`platform-${copyId}`}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center [&_svg]:h-4 [&_svg]:w-4">
            <PlatformIcon copyId={copyId} size={18} useBrandColor />
          </span>
          <div className={`h-2 w-2 shrink-0 animate-pulse rounded-full ${dotColor}`} aria-hidden />
          <span className="text-xs font-bold uppercase tracking-widest">{name}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`shrink-0 text-muted transition-transform duration-700 ease-in-out ${expanded ? "rotate-180" : ""}`}
            aria-hidden
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </button>
      <div
        id={`platform-${copyId}`}
        role="region"
        aria-hidden={!expanded}
        className={`relative z-0 overflow-hidden transition-[max-height,opacity] duration-700 ease-in-out ${expanded ? "max-h-[600px] opacity-100 pointer-events-auto" : "max-h-0 opacity-0 pointer-events-none"}`}
      >
        <div className="flex flex-col">
          <div className="flex flex-wrap items-center justify-end gap-1.5 border-b border-border bg-white/[0.02] px-4 py-3 dark:border-white/5 sm:px-5">
            <button
              type="button"
              onClick={() => setTab("desc")}
              className={`${btnBase} ${tab === "desc" ? activeClasses : btnInactive}`}
            >
              {t.remauraWorkspace.description}
            </button>
            <button
              type="button"
              onClick={() => setTab("tags")}
              className={`${btnBase} ${tab === "tags" ? activeClasses : btnInactive}`}
            >
              {t.remauraWorkspace.tags}
            </button>
            <button
              type="button"
              onClick={() => setTab("hash")}
              className={`${btnBase} ${tab === "hash" ? activeClasses : btnInactive}`}
            >
              {t.remauraWorkspace.hashtags}
            </button>
            <span className="mx-1.5 text-muted/50" aria-hidden>
              |
            </span>
            <button
              type="button"
              onClick={() => handleCopy(copyId, contentToCopy)}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${copiedId === copyId ? copyIconCopied : copyIconDefault}`}
              aria-label={t.remauraWorkspace.copySection}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
            </button>
          </div>
          <div className="flex min-h-[180px] flex-col p-4 sm:p-6">
            {tab === "desc" && (
              <p
                className={`whitespace-pre-wrap pl-4 text-xs leading-relaxed text-foreground/90 ${descBorder || "border-l-2 border-border"}`}
              >
                {contentToCopy || t.remauraWorkspace.channelDescPlaceholder}
              </p>
            )}
            {tab === "tags" && (
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/90">
                {contentToCopy || t.remauraWorkspace.channelTagsPlaceholder}
              </p>
            )}
            {tab === "hash" && (
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/90">
                {contentToCopy || t.remauraWorkspace.channelHashtagsPlaceholder}
              </p>
            )}
          </div>
          <p className="mt-auto border-t border-border px-4 py-2.5 text-[10px] text-muted/70 dark:border-white/5 dark:bg-white/[0.02] sm:px-6">
            {t.remauraWorkspace.aiGeneratedDisclaimer}
          </p>
        </div>
      </div>
    </div>
  );
}
