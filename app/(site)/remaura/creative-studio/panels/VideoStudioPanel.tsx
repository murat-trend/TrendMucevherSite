"use client";

// VIDEO STÜDYO — mod seçimi + arşivdeki görsellerden video kurulumu.
// Sunucu tarafı AI video üretimi bağlanana dek: seçilen görseller
// timeline'a klip olarak dizilir, dışa aktarma Timeline'dan yapılır.

import { useState } from "react";
import Image from "next/image";
import { useStudio } from "@/lib/remaura/creative-studio/store";
import { VIDEO_MODES, platformPreset } from "@/lib/remaura/creative-studio/constants";
import { appendToTrack } from "@/lib/remaura/creative-studio/timeline-engine";
import { useGenerate } from "@/lib/remaura/creative-studio/hooks";
import { Chip, ErrorNote, PrimaryBtn, Section } from "../ui";

export function VideoStudioPanel() {
  const { project, dispatch } = useStudio();
  const { generate, error, setError } = useGenerate();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [perClipSec, setPerClipSec] = useState(3);

  const images = project.assets.filter((a) => a.kind === "image" && a.dataUrl);
  const preset = platformPreset(project.platform);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function buildFromImages() {
    let tracks = project.tracks;
    for (const asset of images.filter((a) => selected.has(a.id))) {
      tracks = appendToTrack(tracks, "video", { assetId: asset.id, label: asset.name, duration: perClipSec });
    }
    dispatch({ type: "EDIT", next: { tracks } });
    dispatch({ type: "SET_MODULE", module: "timeline" });
  }

  async function aiVideo() {
    // Sunucu render bağlanana kadar uç nokta bilgilendirici mesaj döner.
    await generate({
      type: "video",
      prompt: "",
      industry: project.industry,
      platform: project.platform,
      videoMode: project.videoMode,
    });
  }

  return (
    <div className="space-y-4">
      <Section title="Video Modu" desc="Üretimin sahne dilini belirler.">
        <div className="flex flex-wrap gap-2">
          {VIDEO_MODES.map((m) => (
            <Chip
              key={m.key}
              active={project.videoMode === m.key}
              onClick={() => dispatch({ type: "SET_META", meta: { videoMode: m.key } })}
            >
              {m.label}
            </Chip>
          ))}
        </div>
        <p className="mt-2 text-xs text-white/40">
          {VIDEO_MODES.find((m) => m.key === project.videoMode)?.desc}
        </p>
      </Section>

      <Section
        title="Görsellerden Video Kur"
        desc={`Seçilen görseller sırayla klip olur. Hedef: ${preset.label} ${preset.width}×${preset.height}, maks. ${preset.maxVideoSec}s.`}
      >
        {images.length === 0 ? (
          <p className="text-sm text-white/30">
            Önce Görsel Stüdyo&apos;dan üret veya Arşiv&apos;e görsel yükle.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {images.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggle(a.id)}
                  className={`overflow-hidden rounded-lg border-2 transition ${
                    selected.has(a.id) ? "border-[#b76e79]" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <Image src={a.dataUrl!} alt={a.name} width={200} height={200} unoptimized className="aspect-square w-full object-cover" />
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-white/50">
                Klip süresi
                <input
                  type="range"
                  min={1}
                  max={8}
                  step={0.5}
                  value={perClipSec}
                  onChange={(e) => setPerClipSec(Number(e.target.value))}
                  className="range-slider w-32"
                />
                <span className="font-mono text-[#c9a88a]">{perClipSec}s</span>
              </label>
              <PrimaryBtn onClick={buildFromImages} disabled={selected.size === 0}>
                {selected.size} görselden video kur
              </PrimaryBtn>
            </div>
          </>
        )}
      </Section>

      <Section title="AI Video (V2)" desc="Tam otomatik video üretimi.">
        <PrimaryBtn onClick={aiVideo}>AI Video Üret</PrimaryBtn>
        <ErrorNote msg={error} />
        {error ? (
          <button type="button" onClick={() => setError(null)} className="mt-1 text-[11px] text-white/30 underline">
            mesajı kapat
          </button>
        ) : null}
      </Section>
    </div>
  );
}
