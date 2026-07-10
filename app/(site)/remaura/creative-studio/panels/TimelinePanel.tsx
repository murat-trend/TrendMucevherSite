"use client";

// TIMELINE EDİTÖRÜ — böl / kırp / birleştir / taşı / undo-redo + WEBM dışa aktarma.
// Tüm klip işlemleri saf timeline-engine üzerinden geçer; UI sadece dispatch eder.

import { useMemo, useState } from "react";
import Image from "next/image";
import { useStudio } from "@/lib/remaura/creative-studio/store";
import {
  clipAt,
  mergeClips,
  moveClip,
  projectDuration,
  removeClip,
  splitClip,
  trimClip,
} from "@/lib/remaura/creative-studio/timeline-engine";
import { exportWebm } from "@/lib/remaura/creative-studio/export-engine";
import { EXPORT_FORMATS } from "@/lib/remaura/creative-studio/constants";
import type { Track } from "@/lib/remaura/creative-studio/types";
import { ErrorNote, GhostBtn, PrimaryBtn, Section } from "../ui";

const PX_PER_SEC = 56;

export function TimelinePanel() {
  const { project, dispatch, canUndo, canRedo } = useStudio();
  const [playhead, setPlayhead] = useState(0);
  const [selected, setSelected] = useState<{ trackId: string; clipId: string } | null>(null);
  const [exporting, setExporting] = useState<number | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const duration = Math.max(1, projectDuration(project.tracks));
  const selTrack = project.tracks.find((t) => t.id === selected?.trackId);
  const selClip = selTrack?.clips.find((c) => c.id === selected?.clipId);

  const previewSrc = useMemo(() => {
    for (const track of project.tracks.filter((t) => t.kind === "video")) {
      const clip = clipAt(track, playhead);
      const asset = project.assets.find((a) => a.id === clip?.assetId);
      if (asset?.dataUrl) return asset.dataUrl;
    }
    return null;
  }, [project, playhead]);

  function updateTrack(next: Track) {
    dispatch({
      type: "EDIT",
      next: { tracks: project.tracks.map((t) => (t.id === next.id ? next : t)) },
    });
  }

  function onSplit() {
    if (!selTrack || !selClip) return;
    updateTrack(splitClip(selTrack, selClip.id, playhead));
  }

  function onDelete() {
    if (!selTrack || !selClip) return;
    updateTrack(removeClip(selTrack, selClip.id));
    setSelected(null);
  }

  function onMergeNext() {
    if (!selTrack || !selClip) return;
    const sorted = [...selTrack.clips].sort((a, b) => a.start - b.start);
    const i = sorted.findIndex((c) => c.id === selClip.id);
    const next = sorted[i + 1];
    if (next) updateTrack(mergeClips(selTrack, selClip.id, next.id));
  }

  function onTrim(edge: "start" | "end", value: number) {
    if (!selTrack || !selClip) return;
    updateTrack(trimClip(selTrack, selClip.id, edge === "start" ? { start: value } : { end: value }));
  }

  function onMove(value: number) {
    if (!selTrack || !selClip) return;
    updateTrack(moveClip(selTrack, selClip.id, value));
  }

  async function onExport() {
    setExportError(null);
    setExporting(0);
    try {
      const blob = await exportWebm(project, (p) => setExporting(p.progress));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Dışa aktarma başarısız.");
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <Section title="Önizleme" desc="Playhead'in gösterdiği kare.">
          <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-white/[0.06] bg-black">
            {previewSrc ? (
              <Image src={previewSrc} alt="Önizleme" width={960} height={540} unoptimized className="max-h-full w-auto" />
            ) : (
              <p className="text-sm text-white/25">Bu anda görüntü yok</p>
            )}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={duration}
              step={0.05}
              value={playhead}
              onChange={(e) => setPlayhead(Number(e.target.value))}
              className="range-slider flex-1"
            />
            <span className="font-mono text-xs text-[#c9a88a]">
              {playhead.toFixed(2)}s / {duration.toFixed(2)}s
            </span>
          </div>
        </Section>

        <Section title="Seçili Klip" desc={selClip ? selClip.label : "Timeline'dan klip seç."}>
          {selClip ? (
            <div className="space-y-3 text-xs">
              <div className="flex flex-wrap gap-2">
                <GhostBtn onClick={onSplit} title="Playhead'den ikiye böl">Böl</GhostBtn>
                <GhostBtn onClick={onMergeNext} title="Sonraki bitişik kliple birleştir">Birleştir</GhostBtn>
                <GhostBtn onClick={onDelete}>Sil</GhostBtn>
              </div>
              <label className="flex items-center justify-between gap-2 text-white/50">
                Başlangıç
                <input
                  type="number"
                  step={0.1}
                  min={0}
                  value={Number(selClip.start.toFixed(2))}
                  onChange={(e) => onMove(Number(e.target.value))}
                  className="w-20 rounded border border-white/[0.08] bg-white/[0.03] px-2 py-1 font-mono text-white/80"
                />
              </label>
              <label className="flex items-center justify-between gap-2 text-white/50">
                Kırp: baş
                <input
                  type="number"
                  step={0.1}
                  value={Number(selClip.start.toFixed(2))}
                  onChange={(e) => onTrim("start", Number(e.target.value))}
                  className="w-20 rounded border border-white/[0.08] bg-white/[0.03] px-2 py-1 font-mono text-white/80"
                />
              </label>
              <label className="flex items-center justify-between gap-2 text-white/50">
                Kırp: son
                <input
                  type="number"
                  step={0.1}
                  value={Number((selClip.start + selClip.duration).toFixed(2))}
                  onChange={(e) => onTrim("end", Number(e.target.value))}
                  className="w-20 rounded border border-white/[0.08] bg-white/[0.03] px-2 py-1 font-mono text-white/80"
                />
              </label>
            </div>
          ) : (
            <p className="text-xs text-white/30">Klip seçilmedi.</p>
          )}
        </Section>
      </div>

      <Section title="Track'ler">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <GhostBtn onClick={() => dispatch({ type: "UNDO" })} disabled={!canUndo}>↶ Geri Al</GhostBtn>
          <GhostBtn onClick={() => dispatch({ type: "REDO" })} disabled={!canRedo}>↷ Yinele</GhostBtn>
          <div className="ml-auto flex items-center gap-2">
            {EXPORT_FORMATS.map((f) =>
              f.available ? (
                <PrimaryBtn key={f.key} onClick={onExport} disabled={exporting !== null}>
                  {exporting !== null ? `Render %${Math.round(exporting * 100)}` : `${f.label} Dışa Aktar`}
                </PrimaryBtn>
              ) : (
                <GhostBtn key={f.key} onClick={() => setExportError(`${f.label} dışa aktarma yakında.`)}>
                  {f.label}
                </GhostBtn>
              ),
            )}
          </div>
        </div>
        <ErrorNote msg={exportError} />

        <div className="overflow-x-auto">
          <div style={{ width: Math.max(600, duration * PX_PER_SEC + 120) }}>
            {project.tracks.map((track) => (
              <div key={track.id} className="mb-2 flex items-center gap-2">
                <span className="w-16 shrink-0 text-[10px] uppercase tracking-wide text-white/35">
                  {track.label}
                </span>
                <div className="relative h-12 flex-1 rounded-lg border border-white/[0.05] bg-white/[0.02]">
                  {/* playhead çizgisi */}
                  <div
                    className="absolute top-0 z-10 h-full w-px bg-[#b85070]"
                    style={{ left: playhead * PX_PER_SEC }}
                  />
                  {track.clips.map((clip) => (
                    <button
                      key={clip.id}
                      type="button"
                      onClick={() => setSelected({ trackId: track.id, clipId: clip.id })}
                      className={`absolute top-1 h-10 overflow-hidden rounded-md border px-2 text-left text-[10px] leading-tight transition ${
                        selected?.clipId === clip.id
                          ? "border-[#b76e79] bg-[#b76e79]/25 text-[#e8c4ca]"
                          : track.kind === "audio"
                            ? "border-[#c69575]/40 bg-[#c69575]/10 text-[#c9a88a] hover:border-[#c69575]"
                            : "border-white/[0.1] bg-white/[0.05] text-white/60 hover:border-[#b76e79]/50"
                      }`}
                      style={{ left: clip.start * PX_PER_SEC, width: Math.max(24, clip.duration * PX_PER_SEC) }}
                    >
                      <span className="block truncate">{clip.label}</span>
                      <span className="font-mono text-white/40">{clip.duration.toFixed(1)}s</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}
