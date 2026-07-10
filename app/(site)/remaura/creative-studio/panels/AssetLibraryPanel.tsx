"use client";

// ARŞİV — tüm varlıklar (görsel, video, STL, ses) tek kütüphanede.
// "Reusable Everything": her varlık buradan tekrar kullanılır.

import Image from "next/image";
import { useStudio } from "@/lib/remaura/creative-studio/store";
import { useAssetUpload, probeAudioDuration } from "@/lib/remaura/creative-studio/hooks";
import { appendToTrack } from "@/lib/remaura/creative-studio/timeline-engine";
import type { Asset, AssetKind } from "@/lib/remaura/creative-studio/types";
import { FilePick, GhostBtn, Section } from "../ui";

const KIND_LABEL: Record<AssetKind, string> = {
  image: "Görsel",
  video: "Video",
  stl: "STL",
  audio: "Ses",
};

export function AssetLibraryPanel() {
  const { project, dispatch } = useStudio();
  const { fileToAsset, uploading } = useAssetUpload();

  async function onPick(files: File[]) {
    for (const file of files) {
      const asset = await fileToAsset(file);
      if (asset) dispatch({ type: "ADD_ASSET", asset });
    }
  }

  async function addToTimeline(asset: Asset) {
    if (asset.kind === "image") {
      dispatch({
        type: "EDIT",
        next: { tracks: appendToTrack(project.tracks, "video", { assetId: asset.id, label: asset.name, duration: 3 }) },
      });
    } else if (asset.kind === "audio" && asset.dataUrl) {
      const duration = await probeAudioDuration(asset.dataUrl);
      dispatch({
        type: "EDIT",
        next: { tracks: appendToTrack(project.tracks, "audio", { assetId: asset.id, label: asset.name, duration, gain: 1 }) },
      });
    }
  }

  return (
    <div className="space-y-4">
      <Section title="Yükle" desc="Görsel, video, STL veya ses — hepsi tek arşivde.">
        <FilePick
          accept="image/*,video/*,.stl,.mp3,.wav,.aac,.m4a,audio/*"
          label={uploading ? "Yükleniyor..." : "Dosya yükle (çoklu seçim destekli)"}
          onFile={onPick}
          multiple
        />
      </Section>

      <Section title={`Varlıklar (${project.assets.length})`}>
        {project.assets.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/25">Arşiv boş.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {project.assets.map((a) => (
              <div key={a.id} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                {a.kind === "image" && a.dataUrl ? (
                  <Image src={a.dataUrl} alt={a.name} width={320} height={200} unoptimized className="mb-2 aspect-video w-full rounded-lg object-cover" />
                ) : (
                  <div className="mb-2 flex aspect-video items-center justify-center rounded-lg bg-white/[0.03] text-2xl text-[#c9a88a]">
                    {a.kind === "audio" ? "♪" : a.kind === "stl" ? "◆" : "▶"}
                  </div>
                )}
                <p className="truncate text-xs text-white/80" title={a.name}>{a.name}</p>
                <p className="font-mono text-[10px] text-white/35">
                  {KIND_LABEL[a.kind]} · {(a.size / 1024 / 1024).toFixed(2)} MB
                  {!a.dataUrl && a.kind !== "stl" ? " · içerik oturumda değil" : ""}
                </p>
                <div className="mt-2 flex gap-2">
                  {(a.kind === "image" || a.kind === "audio") && a.dataUrl ? (
                    <GhostBtn onClick={() => addToTimeline(a)}>Timeline&apos;a Ekle</GhostBtn>
                  ) : null}
                  <GhostBtn onClick={() => dispatch({ type: "REMOVE_ASSET", assetId: a.id })}>Sil</GhostBtn>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
