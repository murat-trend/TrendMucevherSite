"use client";

// TİPOGRAFİ STÜDYO — yazı overlay'leri: Google Fonts, animasyon, zamanlama, konum.
// Fontlar seçildikçe <link> ile dinamik yüklenir (önizleme + export'ta kullanılır).

import { useEffect } from "react";
import { useStudio } from "@/lib/remaura/creative-studio/store";
import { GOOGLE_FONTS, TEXT_ANIMATIONS } from "@/lib/remaura/creative-studio/constants";
import { projectDuration } from "@/lib/remaura/creative-studio/timeline-engine";
import { uid, type TextOverlay } from "@/lib/remaura/creative-studio/types";
import { Field, GhostBtn, PrimaryBtn, Section, inputCls } from "../ui";

function ensureFontLoaded(family: string) {
  const id = `cs-font-${family.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;600;700&display=swap`;
  document.head.appendChild(link);
}

export function TypographyPanel() {
  const { project, dispatch } = useStudio();
  const overlays = project.overlays;

  useEffect(() => {
    for (const o of overlays) ensureFontLoaded(o.fontFamily);
  }, [overlays]);

  function addOverlay() {
    const overlay: TextOverlay = {
      id: uid("txt"),
      text: "Yeni Yazı",
      fontFamily: "Outfit",
      fontWeight: 600,
      sizePx: 64,
      color: "#ffffff",
      animation: "fade",
      start: 0,
      duration: Math.max(2, projectDuration(project.tracks) || 3),
      x: 0.5,
      y: 0.5,
    };
    dispatch({ type: "EDIT", next: { overlays: [...overlays, overlay] } });
  }

  function update(id: string, patch: Partial<TextOverlay>) {
    dispatch({
      type: "EDIT",
      next: { overlays: overlays.map((o) => (o.id === id ? { ...o, ...patch } : o)) },
    });
  }

  function remove(id: string) {
    dispatch({ type: "EDIT", next: { overlays: overlays.filter((o) => o.id !== id) } });
  }

  return (
    <div className="space-y-4">
      <Section title="Yazı Katmanları" desc="Videoya bindirilen yazılar; export'ta aynen render edilir.">
        <PrimaryBtn onClick={addOverlay}>+ Yazı Ekle</PrimaryBtn>
      </Section>

      {overlays.map((o) => (
        <Section key={o.id} title={o.text || "(boş yazı)"}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Metin">
              <input value={o.text} onChange={(e) => update(o.id, { text: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Font (Google Fonts)">
              <select
                value={o.fontFamily}
                onChange={(e) => {
                  ensureFontLoaded(e.target.value);
                  update(o.id, { fontFamily: e.target.value });
                }}
                className={inputCls}
              >
                {GOOGLE_FONTS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </Field>
            <Field label="Animasyon">
              <select
                value={o.animation}
                onChange={(e) => update(o.id, { animation: e.target.value as TextOverlay["animation"] })}
                className={inputCls}
              >
                {TEXT_ANIMATIONS.map((a) => (
                  <option key={a.key} value={a.key}>{a.label}</option>
                ))}
              </select>
            </Field>
            <Field label={`Boyut — ${o.sizePx}px`}>
              <input type="range" min={16} max={200} value={o.sizePx} onChange={(e) => update(o.id, { sizePx: Number(e.target.value) })} className="range-slider w-full" />
            </Field>
            <Field label="Renk">
              <input type="color" value={o.color} onChange={(e) => update(o.id, { color: e.target.value })} className="h-9 w-full cursor-pointer rounded-lg border border-white/[0.08] bg-transparent" />
            </Field>
            <Field label="Kalınlık">
              <select value={o.fontWeight} onChange={(e) => update(o.id, { fontWeight: Number(e.target.value) })} className={inputCls}>
                <option value={400}>Normal</option>
                <option value={600}>Yarı Kalın</option>
                <option value={700}>Kalın</option>
              </select>
            </Field>
            <Field label={`Başlangıç — ${o.start.toFixed(1)}s`}>
              <input type="range" min={0} max={30} step={0.1} value={o.start} onChange={(e) => update(o.id, { start: Number(e.target.value) })} className="range-slider w-full" />
            </Field>
            <Field label={`Süre — ${o.duration.toFixed(1)}s`}>
              <input type="range" min={0.5} max={30} step={0.5} value={o.duration} onChange={(e) => update(o.id, { duration: Number(e.target.value) })} className="range-slider w-full" />
            </Field>
            <Field label={`Konum — x %${Math.round(o.x * 100)} · y %${Math.round(o.y * 100)}`}>
              <div className="flex gap-2">
                <input type="range" min={0} max={1} step={0.01} value={o.x} onChange={(e) => update(o.id, { x: Number(e.target.value) })} className="range-slider w-full" />
                <input type="range" min={0} max={1} step={0.01} value={o.y} onChange={(e) => update(o.id, { y: Number(e.target.value) })} className="range-slider w-full" />
              </div>
            </Field>
          </div>
          <div
            className="mt-3 flex h-24 items-center justify-center overflow-hidden rounded-lg border border-white/[0.05] bg-black"
            style={{ fontFamily: `"${o.fontFamily}", sans-serif`, fontWeight: o.fontWeight, color: o.color }}
          >
            <span style={{ fontSize: Math.min(40, o.sizePx / 2.4) }}>{o.text || "Önizleme"}</span>
          </div>
          <div className="mt-2">
            <GhostBtn onClick={() => remove(o.id)}>Katmanı Sil</GhostBtn>
          </div>
        </Section>
      ))}

      {overlays.length === 0 ? (
        <p className="text-center text-sm text-white/25">Henüz yazı katmanı yok.</p>
      ) : null}
    </div>
  );
}
