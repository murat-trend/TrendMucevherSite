"use client";

import {
  Camera, Video, RotateCcw, Box, Sparkles, Calculator, Gem, Layers,
  Share2, ShoppingBag, Warehouse, Users, ClipboardList, BarChart3,
  Code, Shield, Zap, Globe, Palette, FileText, type LucideIcon,
} from "lucide-react";
import { useReveal } from "../lib/useReveal";
import { useRai } from "../i18n/RaiI18nProvider";
import { SectionHeader } from "./SectionHeader";

// dict.features.categories ile sıra bazlı eşleşen ikonlar
const CATEGORY_ICONS: LucideIcon[] = [Sparkles, Box, Layers, BarChart3];
const ITEM_ICONS: LucideIcon[][] = [
  [Camera, Video, RotateCcw, Palette],
  [Box, RotateCcw, Sparkles, Calculator, Calculator, Gem, Gem],
  [Layers, Share2, Share2, ShoppingBag],
  [Warehouse, Users, ClipboardList, Users, BarChart3, Code],
];
const STAT_ICONS: LucideIcon[] = [Shield, Zap, Globe, FileText];

export function Features() {
  const { dict } = useRai();
  const t = dict.features;
  const { ref, visible } = useReveal<HTMLElement>(0.1);

  return (
    <section id="features" ref={ref} className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] rounded-full bg-[#D4AF37]/[0.02] blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-[1440px] mx-auto section-padding">
        <SectionHeader tag={t.tag} pre={t.titlePre} gold={t.titleGold} post={t.titlePost} desc={t.desc} visible={visible} />

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {t.categories.map((category, catIdx) => {
            const CatIcon = CATEGORY_ICONS[catIdx];
            return (
              <div
                key={catIdx}
                className={`glass-card rounded-2xl p-6 lg:p-8 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                style={{ transitionDelay: `${catIdx * 100}ms` }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                    <CatIcon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{category.title}</h3>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {category.items.map((feature, featIdx) => {
                    const ItemIcon = ITEM_ICONS[catIdx]?.[featIdx] ?? Sparkles;
                    return (
                      <div
                        key={featIdx}
                        className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-all group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-[#94A3B8] group-hover:text-[#D4AF37] transition-colors shrink-0">
                          <ItemIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white group-hover:text-[#D4AF37] transition-colors">
                            {feature.name}
                          </p>
                          <p className="text-xs text-[#64748B] mt-0.5">{feature.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 mt-12 transition-all duration-700 delay-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {t.stats.map((stat, idx) => {
            const StatIcon = STAT_ICONS[idx];
            return (
              <div key={idx} className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                  <StatIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{stat.label}</p>
                  <p className="text-xs text-[#64748B]">{stat.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
