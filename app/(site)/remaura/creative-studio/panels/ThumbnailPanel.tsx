"use client";

// THUMBNAIL STÜDYO — platforma uygun kapak görseli üretimi.
// Arşivden ürün görseli seçilir veya sadece istekle üretilir.

import { useState } from "react";
import Image from "next/image";
import { useStudio } from "@/lib/remaura/creative-studio/store";
import { useGenerate } from "@/lib/remaura/creative-studio/hooks";
import { platformPreset } from "@/lib/remaura/creative-studio/constants";
import { uid, type Asset } from "@/lib/remaura/creative-studio/types";
import { ErrorNote, GhostBtn, PrimaryBtn, Section, Spinner, inputCls } from "../ui";

export function ThumbnailPanel() {
  const { project, dispatch } = useStudio();
  const { generate, loading, error } = useGenerate();
  const [prompt, setPrompt] = useState("");
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const images = project.assets.filter((a) => a.kind === "image" && a.dataUrl);
  const preset = platformPreset(project.platform);
  const source = images.find((a) => a.id === sourceId);

  async function onGenerate() {
    const image = await generate({
      type: "thumbnail",
      prompt,
      industry: project.industry,
      platform: project.platform,
      videoMode: project.videoMode,
      productImage: source?.dataUrl,
    });
    if (image) setResult(image);
  }

  function save() {
    if (!result) return;
    const asset: Asset = {
      id: uid("ast"),
      kind: "image",
      name: `thumbnail-${project.platform}-${Date.now()}.png`,
      mimeType: "image/png",
      size: result.length,
      dataUrl: result,
      createdAt: Date.now(),
    };
    dispatch({ type: "ADD_ASSET", asset });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <Section title="Kaynak" desc={`Hedef: ${preset.label} kapak ${preset.thumbWidth}×${preset.thumbHeight}.`}>
          {images.length === 0 ? (
            <p className="text-sm text-white/30">Arşivde görsel yok — istekle de üretebilirsin.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {images.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSourceId(sourceId === a.id ? null : a.id)}
                  className={`overflow-hidden rounded-lg border-2 transition ${
                    sourceId === a.id ? "border-[#b76e79]" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <Image src={a.dataUrl!} alt={a.name} width={160} height={160} unoptimized className="aspect-square w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </Section>
        <Section title="İstek">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="örn. göz alıcı, yüksek kontrastlı, başlık için üstte boşluklu..."
            className={inputCls}
          />
          <div className="mt-3 flex items-center gap-3">
            <PrimaryBtn onClick={onGenerate} disabled={loading || (!prompt.trim() && !source)}>
              {loading ? "Üretiliyor..." : "Thumbnail Üret"}
            </PrimaryBtn>
            {loading ? <Spinner label="10–20 sn sürebilir" /> : null}
          </div>
          <ErrorNote msg={error} />
        </Section>
      </div>

      <Section title="Sonuç">
        {result ? (
          <div className="space-y-3">
            <Image src={result} alt="Thumbnail" width={800} height={450} unoptimized className="w-full rounded-xl border border-white/[0.06]" />
            <div className="flex gap-2">
              <PrimaryBtn onClick={save}>Arşive Kaydet</PrimaryBtn>
              <GhostBtn
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = result;
                  a.download = `thumbnail-${Date.now()}.png`;
                  a.click();
                }}
              >
                İndir
              </GhostBtn>
            </div>
          </div>
        ) : (
          <p className="py-16 text-center text-sm text-white/25">Henüz üretim yok.</p>
        )}
      </Section>
    </div>
  );
}
