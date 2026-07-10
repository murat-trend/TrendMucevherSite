"use client";

// GÖRSEL STÜDYO — tek yüklemeden pazarlama görseli. Ürün görseli + istek
// yazısı → üretim; sonuç arşive ve timeline'a tek tıkla gider.

import { useState } from "react";
import Image from "next/image";
import { useStudio } from "@/lib/remaura/creative-studio/store";
import { useAssetUpload, useGenerate } from "@/lib/remaura/creative-studio/hooks";
import { appendToTrack } from "@/lib/remaura/creative-studio/timeline-engine";
import { uid, type Asset } from "@/lib/remaura/creative-studio/types";
import { ErrorNote, FilePick, GhostBtn, PrimaryBtn, Section, Spinner, inputCls } from "../ui";

export function ImageStudioPanel() {
  const { project, dispatch } = useStudio();
  const { fileToAsset } = useAssetUpload();
  const { generate, loading, error } = useGenerate();

  const [productImage, setProductImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<string | null>(null);

  async function onPick(files: File[]) {
    const asset = await fileToAsset(files[0]);
    if (asset?.kind === "image" && asset.dataUrl) {
      setProductImage(asset.dataUrl);
      dispatch({ type: "ADD_ASSET", asset });
    }
  }

  async function onGenerate() {
    const image = await generate({
      type: "image",
      prompt,
      industry: project.industry,
      platform: project.platform,
      videoMode: project.videoMode,
      productImage: productImage ?? undefined,
    });
    if (image) setResult(image);
  }

  function saveResult(addToTimeline: boolean) {
    if (!result) return;
    const asset: Asset = {
      id: uid("ast"),
      kind: "image",
      name: `uretim-${Date.now()}.png`,
      mimeType: "image/png",
      size: result.length,
      dataUrl: result,
      createdAt: Date.now(),
    };
    dispatch({ type: "ADD_ASSET", asset });
    if (addToTimeline) {
      dispatch({
        type: "EDIT",
        next: { tracks: appendToTrack(project.tracks, "video", { assetId: asset.id, label: asset.name, duration: 3 }) },
      });
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <Section title="Ürün Görseli" desc="Bir yükleme — her şey bundan üretilir.">
          {productImage ? (
            <div className="space-y-2">
              <Image src={productImage} alt="Ürün" width={640} height={640} unoptimized className="max-h-64 w-auto rounded-xl border border-white/[0.06]" />
              <GhostBtn onClick={() => setProductImage(null)}>Kaldır</GhostBtn>
            </div>
          ) : (
            <FilePick accept="image/*" label="Ürün görseli yükle (JPG/PNG/WEBP)" onFile={onPick} />
          )}
        </Section>

        <Section title="İstek" desc="Ne tür bir pazarlama görseli istiyorsun?">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="örn. mermer zemin üzerinde, yumuşak sabah ışığıyla..."
            className={inputCls}
          />
          <div className="mt-3 flex items-center gap-3">
            <PrimaryBtn onClick={onGenerate} disabled={loading || (!prompt.trim() && !productImage)}>
              {loading ? "Üretiliyor..." : "Görsel Üret"}
            </PrimaryBtn>
            {loading ? <Spinner label="10–20 sn sürebilir" /> : null}
          </div>
          <ErrorNote msg={error} />
        </Section>
      </div>

      <Section title="Sonuç" desc="Beğendiysen arşive kaydet veya doğrudan videona ekle.">
        {result ? (
          <div className="space-y-3">
            <Image src={result} alt="Üretilen görsel" width={800} height={800} unoptimized className="w-full rounded-xl border border-white/[0.06]" />
            <div className="flex flex-wrap gap-2">
              <PrimaryBtn onClick={() => saveResult(true)}>Timeline&apos;a Ekle</PrimaryBtn>
              <GhostBtn onClick={() => saveResult(false)}>Arşive Kaydet</GhostBtn>
              <GhostBtn
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = result;
                  a.download = `creative-studio-${Date.now()}.png`;
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
