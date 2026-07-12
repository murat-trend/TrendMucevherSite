"use client";

import { Wand2, Eraser, ImagePlus, Scissors, Eye, Box, FileType, Video, Sparkles, ArrowRight } from "lucide-react";
import { useReveal } from "../lib/useReveal";
import { useRai } from "../i18n/RaiI18nProvider";
import { SectionHeader } from "./SectionHeader";
import { MockShot } from "./MockShot";

// dict.aiSuite.features ile sıra bazlı eşleşir
const FEATURE_META = [
  { Icon: Wand2, hasImage: true, tag: "mostPopular" as const },
  { Icon: Eraser, hasImage: false, tag: null },
  { Icon: ImagePlus, hasImage: false, tag: null },
  { Icon: Scissors, hasImage: false, tag: null },
  { Icon: Eye, hasImage: true, tag: "new" as const },
  { Icon: Box, hasImage: false, tag: null },
  { Icon: FileType, hasImage: true, tag: null },
  { Icon: Video, hasImage: false, tag: null },
];

export function AISuite() {
  const { dict } = useRai();
  const t = dict.aiSuite;
  const { ref, visible } = useReveal<HTMLElement>(0.1);

  const tagLabel = (tag: "mostPopular" | "new" | null) =>
    tag === "mostPopular" ? t.tagMostPopular : tag === "new" ? t.tagNew : null;

  return (
    <section id="ai-suite" ref={ref} className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] rounded-full bg-[#D4AF37]/[0.02] blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-[1440px] mx-auto section-padding">
        <SectionHeader tag={t.tag} pre={t.titlePre} gold={t.titleGold} post={t.titlePost} desc={t.desc} visible={visible} />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
          {t.features.map((feature, idx) => {
            const meta = FEATURE_META[idx];
            const Icon = meta.Icon;
            const label = tagLabel(meta.tag);
            return (
              <div
                key={idx}
                className={`group glass-card-hover rounded-2xl overflow-hidden transition-all duration-500 ${
                  meta.hasImage ? "md:col-span-2" : ""
                } ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                style={{ transitionDelay: `${idx * 75}ms` }}
              >
                {meta.hasImage && (
                  <div className="relative h-48 overflow-hidden">
                    <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105">
                      <MockShot />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#131318] via-transparent to-transparent" />
                    {label && (
                      <div className="absolute top-4 start-4">
                        <span className="tag-gold">{label}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-5 lg:p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] shrink-0 group-hover:bg-[#D4AF37]/20 transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-white group-hover:text-[#D4AF37] transition-colors">
                          {feature.title}
                        </h3>
                        {!meta.hasImage && label && <span className="tag-gold text-[9px] px-2 py-0.5">{label}</span>}
                      </div>
                      <p className="mt-2 text-sm text-[#94A3B8] leading-relaxed">{feature.description}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/[0.04]">
                    <button className="flex items-center gap-2 text-sm font-medium text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity">
                      {t.learnMore}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className={`mt-12 text-center transition-all duration-700 delay-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <button className="btn-secondary">
            <Sparkles className="w-4 h-4" />
            {t.cta}
          </button>
        </div>
      </div>
    </section>
  );
}
