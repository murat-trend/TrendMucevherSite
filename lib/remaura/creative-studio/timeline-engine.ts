// TIMELINE MOTORU — saf fonksiyonlar, çerçeveden bağımsız (sosyal-boyut
// engine.ts ile aynı ilke: ileride remauraai'ye taşınabilir).
// Her işlem yeni Track döndürür; mutasyon yok.

import type { Clip, Track } from "./types";
import { uid } from "./types";

const MIN_CLIP_SEC = 0.1;

function sortClips(clips: Clip[]): Clip[] {
  return [...clips].sort((a, b) => a.start - b.start);
}

export function trackDuration(track: Track): number {
  return track.clips.reduce((max, c) => Math.max(max, c.start + c.duration), 0);
}

export function projectDuration(tracks: Track[]): number {
  return tracks.reduce((max, t) => Math.max(max, trackDuration(t)), 0);
}

export function addClip(track: Track, clip: Omit<Clip, "id">): Track {
  return { ...track, clips: sortClips([...track.clips, { ...clip, id: uid("clip") }]) };
}

export function removeClip(track: Track, clipId: string): Track {
  return { ...track, clips: track.clips.filter((c) => c.id !== clipId) };
}

/** Klibi timeline'da `at` saniyesinden ikiye böler. */
export function splitClip(track: Track, clipId: string, at: number): Track {
  const clip = track.clips.find((c) => c.id === clipId);
  if (!clip) return track;
  const offset = at - clip.start;
  if (offset < MIN_CLIP_SEC || clip.duration - offset < MIN_CLIP_SEC) return track;

  const left: Clip = { ...clip, duration: offset };
  const right: Clip = {
    ...clip,
    id: uid("clip"),
    start: at,
    duration: clip.duration - offset,
    inPoint: clip.inPoint + offset,
  };
  return {
    ...track,
    clips: sortClips(track.clips.flatMap((c) => (c.id === clipId ? [left, right] : [c]))),
  };
}

/** Klibin baş/son noktasını kırpar (saniye cinsinden yeni sınırlar). */
export function trimClip(
  track: Track,
  clipId: string,
  edit: { start?: number; end?: number },
): Track {
  return {
    ...track,
    clips: sortClips(
      track.clips.map((c) => {
        if (c.id !== clipId) return c;
        const end = c.start + c.duration;
        const newStart = Math.min(edit.start ?? c.start, end - MIN_CLIP_SEC);
        const newEnd = Math.max(edit.end ?? end, newStart + MIN_CLIP_SEC);
        const delta = newStart - c.start;
        return {
          ...c,
          start: newStart,
          inPoint: c.inPoint + Math.max(0, delta),
          duration: newEnd - newStart,
        };
      }),
    ),
  };
}

/** Aynı kaynaktan gelen, timeline'da bitişik iki klibi tek klipte birleştirir. */
export function mergeClips(track: Track, firstId: string, secondId: string): Track {
  const clips = sortClips(track.clips);
  const i = clips.findIndex((c) => c.id === firstId);
  const j = clips.findIndex((c) => c.id === secondId);
  if (i < 0 || j < 0 || Math.abs(i - j) !== 1) return track;
  const [a, b] = i < j ? [clips[i], clips[j]] : [clips[j], clips[i]];
  if (a.assetId !== b.assetId) return track;
  if (Math.abs(a.start + a.duration - b.start) > 0.05) return track;

  const merged: Clip = { ...a, duration: a.duration + b.duration };
  return { ...track, clips: clips.filter((c) => c.id !== b.id).map((c) => (c.id === a.id ? merged : c)) };
}

/** Klibi yeni başlangıca taşır; negatif başlangıcı sıfıra kelepçeler. */
export function moveClip(track: Track, clipId: string, newStart: number): Track {
  return {
    ...track,
    clips: sortClips(
      track.clips.map((c) => (c.id === clipId ? { ...c, start: Math.max(0, newStart) } : c)),
    ),
  };
}

/**
 * Varlığı ilgili türdeki ilk track'in sonuna klip olarak ekler.
 * Görsel Stüdyo / Ses Stüdyo / Arşiv panelleri ortak kullanır.
 */
export function appendToTrack(
  tracks: Track[],
  kind: Track["kind"],
  clip: { assetId: string | null; label: string; duration: number; gain?: number },
): Track[] {
  const target = tracks.find((t) => t.kind === kind);
  if (!target) return tracks;
  const updated = addClip(target, {
    assetId: clip.assetId,
    label: clip.label,
    start: trackDuration(target),
    duration: clip.duration,
    inPoint: 0,
    gain: clip.gain,
  });
  return tracks.map((t) => (t.id === target.id ? updated : t));
}

/** `t` anında görünen klip (video track'lerinde önizleme için). */
export function clipAt(track: Track, t: number): Clip | null {
  return track.clips.find((c) => t >= c.start && t < c.start + c.duration) ?? null;
}
