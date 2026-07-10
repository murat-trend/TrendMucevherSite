"use client";

// SES STÜDYO — MP3/WAV/AAC/M4A yükle, ses track'ine ekle; kazanç + fade ayarı.

import { useStudio } from "@/lib/remaura/creative-studio/store";
import { useAssetUpload, probeAudioDuration } from "@/lib/remaura/creative-studio/hooks";
import { appendToTrack } from "@/lib/remaura/creative-studio/timeline-engine";
import type { Clip, Track } from "@/lib/remaura/creative-studio/types";
import { FilePick, GhostBtn, Section } from "../ui";

export function AudioPanel() {
  const { project, dispatch } = useStudio();
  const { fileToAsset } = useAssetUpload();

  const audioTracks = project.tracks.filter((t) => t.kind === "audio");
  const audioAssets = project.assets.filter((a) => a.kind === "audio");

  async function onPick(files: File[]) {
    for (const file of files) {
      const asset = await fileToAsset(file);
      if (asset?.kind === "audio") dispatch({ type: "ADD_ASSET", asset });
    }
  }

  async function addToTimeline(assetId: string) {
    const asset = project.assets.find((a) => a.id === assetId);
    if (!asset?.dataUrl) return;
    const duration = await probeAudioDuration(asset.dataUrl);
    dispatch({
      type: "EDIT",
      next: {
        tracks: appendToTrack(project.tracks, "audio", {
          assetId: asset.id,
          label: asset.name,
          duration,
          gain: 1,
        }),
      },
    });
  }

  function updateClip(track: Track, clip: Clip, patch: Partial<Clip>) {
    dispatch({
      type: "EDIT",
      next: {
        tracks: project.tracks.map((t) =>
          t.id === track.id
            ? { ...t, clips: t.clips.map((c) => (c.id === clip.id ? { ...c, ...patch } : c)) }
            : t,
        ),
      },
    });
  }

  return (
    <div className="space-y-4">
      <Section title="Müzik Yükle" desc="MP3, WAV, AAC veya M4A.">
        <FilePick accept=".mp3,.wav,.aac,.m4a,audio/*" label="Ses dosyası yükle" onFile={onPick} multiple />
        {audioAssets.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {audioAssets.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-white/80">{a.name}</p>
                  <p className="font-mono text-[10px] text-white/35">{(a.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {a.dataUrl ? <audio src={a.dataUrl} controls className="h-8 w-40" /> : null}
                  <GhostBtn onClick={() => addToTimeline(a.id)}>Timeline&apos;a Ekle</GhostBtn>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </Section>

      <Section title="Ses Klipleri" desc="Kazanç ve fade ayarları dışa aktarmada uygulanır.">
        {audioTracks.every((t) => t.clips.length === 0) ? (
          <p className="text-sm text-white/30">Ses track&apos;inde klip yok.</p>
        ) : (
          <div className="space-y-3">
            {audioTracks.flatMap((track) =>
              track.clips.map((clip) => (
                <div key={clip.id} className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-3">
                  <p className="mb-2 truncate text-sm text-white/80">{clip.label}</p>
                  <div className="grid grid-cols-1 gap-3 text-xs text-white/50 sm:grid-cols-3">
                    <label className="flex items-center gap-2">
                      Ses
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={clip.gain ?? 1}
                        onChange={(e) => updateClip(track, clip, { gain: Number(e.target.value) })}
                        className="range-slider flex-1"
                      />
                      <span className="font-mono text-[#c9a88a]">{Math.round((clip.gain ?? 1) * 100)}%</span>
                    </label>
                    <label className="flex items-center gap-2">
                      Fade in
                      <input
                        type="range"
                        min={0}
                        max={5}
                        step={0.5}
                        value={clip.fadeIn ?? 0}
                        onChange={(e) => updateClip(track, clip, { fadeIn: Number(e.target.value) })}
                        className="range-slider flex-1"
                      />
                      <span className="font-mono text-[#c9a88a]">{clip.fadeIn ?? 0}s</span>
                    </label>
                    <label className="flex items-center gap-2">
                      Fade out
                      <input
                        type="range"
                        min={0}
                        max={5}
                        step={0.5}
                        value={clip.fadeOut ?? 0}
                        onChange={(e) => updateClip(track, clip, { fadeOut: Number(e.target.value) })}
                        className="range-slider flex-1"
                      />
                      <span className="font-mono text-[#c9a88a]">{clip.fadeOut ?? 0}s</span>
                    </label>
                  </div>
                </div>
              )),
            )}
          </div>
        )}
      </Section>
    </div>
  );
}
