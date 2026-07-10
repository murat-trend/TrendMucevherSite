"use client";

// MARKA KİTİ — logo, marka renkleri, font, filigran. Varsayılan marka tutarlılığı:
// filigran/logo dışa aktarmada otomatik uygulanır.

import Image from "next/image";
import { useStudio } from "@/lib/remaura/creative-studio/store";
import { useAssetUpload } from "@/lib/remaura/creative-studio/hooks";
import { GOOGLE_FONTS, WATERMARK_POSITIONS } from "@/lib/remaura/creative-studio/constants";
import { Chip, Field, FilePick, GhostBtn, Section, inputCls } from "../ui";

export function BrandKitPanel() {
  const { project, dispatch } = useStudio();
  const { fileToAsset } = useAssetUpload();
  const brand = project.brand;
  const logo = project.assets.find((a) => a.id === brand.logoAssetId);

  async function onLogo(files: File[]) {
    const asset = await fileToAsset(files[0]);
    if (asset?.kind === "image") {
      dispatch({ type: "ADD_ASSET", asset });
      dispatch({ type: "SET_BRAND", brand: { logoAssetId: asset.id } });
    }
  }

  function setColor(i: number, value: string) {
    const colors = brand.colors.map((c, j) => (j === i ? value : c));
    dispatch({ type: "SET_BRAND", brand: { colors } });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Logo" desc="Filigran olarak da kullanılabilir.">
        {logo?.dataUrl ? (
          <div className="space-y-2">
            <Image src={logo.dataUrl} alt="Logo" width={240} height={240} unoptimized className="max-h-32 w-auto rounded-lg border border-white/[0.06] bg-white/[0.03] p-2" />
            <GhostBtn onClick={() => dispatch({ type: "SET_BRAND", brand: { logoAssetId: null } })}>
              Logoyu Kaldır
            </GhostBtn>
          </div>
        ) : (
          <FilePick accept="image/*" label="Logo yükle (tercihen şeffaf PNG)" onFile={onLogo} />
        )}
      </Section>

      <Section title="Marka Renkleri" desc="Kullanıcı verisi — üretimlerde referans alınır.">
        <div className="flex flex-wrap gap-3">
          {brand.colors.map((c, i) => (
            <label key={i} className="flex flex-col items-center gap-1">
              <input
                type="color"
                value={c}
                onChange={(e) => setColor(i, e.target.value)}
                className="h-12 w-12 cursor-pointer rounded-lg border border-white/[0.08] bg-transparent"
              />
              <span className="font-mono text-[10px] text-white/40">{c}</span>
            </label>
          ))}
          <button
            type="button"
            onClick={() => dispatch({ type: "SET_BRAND", brand: { colors: [...brand.colors, "#b76e79"] } })}
            className="h-12 w-12 rounded-lg border border-dashed border-white/[0.15] text-white/40 hover:border-[#b76e79]/50"
          >
            +
          </button>
        </div>
      </Section>

      <Section title="Marka Fontu">
        <select
          value={brand.fontFamily}
          onChange={(e) => dispatch({ type: "SET_BRAND", brand: { fontFamily: e.target.value } })}
          className={inputCls}
        >
          {GOOGLE_FONTS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </Section>

      <Section title="Filigran" desc="Dışa aktarılan her videoya uygulanır.">
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={brand.watermark.enabled}
              onChange={(e) =>
                dispatch({ type: "SET_BRAND", brand: { watermark: { ...brand.watermark, enabled: e.target.checked } } })
              }
              className="accent-[#b76e79]"
            />
            Filigran aktif
          </label>
          <Field label="Metin (logo yoksa)">
            <input
              value={brand.watermark.text}
              onChange={(e) =>
                dispatch({ type: "SET_BRAND", brand: { watermark: { ...brand.watermark, text: e.target.value } } })
              }
              placeholder="örn. markam.com"
              className={inputCls}
            />
          </Field>
          <Field label={`Opaklık — %${Math.round(brand.watermark.opacity * 100)}`}>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={brand.watermark.opacity}
              onChange={(e) =>
                dispatch({ type: "SET_BRAND", brand: { watermark: { ...brand.watermark, opacity: Number(e.target.value) } } })
              }
              className="range-slider w-full"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            {WATERMARK_POSITIONS.map((p) => (
              <Chip
                key={p.key}
                active={brand.watermark.position === p.key}
                onClick={() =>
                  dispatch({ type: "SET_BRAND", brand: { watermark: { ...brand.watermark, position: p.key } } })
                }
              >
                {p.label}
              </Chip>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}
