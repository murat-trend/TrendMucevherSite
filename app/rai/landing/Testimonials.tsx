"use client";

import { Star, Quote, Building2, Paintbrush, Store, Factory, type LucideIcon } from "lucide-react";
import { useReveal } from "../lib/useReveal";
import { useRai } from "../i18n/RaiI18nProvider";
import { SectionHeader } from "./SectionHeader";

// dict.testimonials.items ile sıra bazlı eşleşir
const ITEM_ICONS: LucideIcon[] = [Factory, Paintbrush, Store, Building2];

export function Testimonials() {
  const { dict } = useRai();
  const t = dict.testimonials;
  const { ref, visible } = useReveal<HTMLElement>(0.1);

  return (
    <section id="testimonials" ref={ref} className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        <div className="absolute top-1/3 right-1/3 w-[400px] h-[400px] rounded-full bg-[#D4AF37]/[0.02] blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-[1440px] mx-auto section-padding">
        <SectionHeader tag={t.tag} pre={t.titlePre} gold={t.titleGold} post={t.titlePost} desc={t.desc} visible={visible} />

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {t.items.map((testimonial, idx) => {
            const Icon = ITEM_ICONS[idx];
            return (
              <div
                key={idx}
                className={`glass-card-hover rounded-2xl p-6 lg:p-8 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                style={{ transitionDelay: `${idx * 100}ms` }}
              >
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-[#D4AF37] uppercase tracking-wider">{testimonial.category}</span>
                </div>

                <div className="relative mb-6">
                  <Quote className="absolute -top-2 -start-1 w-8 h-8 text-[#D4AF37]/10" />
                  <p className="text-base lg:text-lg text-[#CBD5E1] leading-relaxed ps-6">{testimonial.quote}</p>
                </div>

                <div className="flex items-center gap-1 mb-6">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]" />
                  ))}
                </div>

                <div className="flex items-center gap-4 pt-6 border-t border-white/[0.04]">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border border-[#D4AF37]/20 flex items-center justify-center">
                    <span className="text-sm font-bold text-[#D4AF37]">
                      {testimonial.author
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{testimonial.author}</p>
                    <p className="text-xs text-[#64748B]">
                      {testimonial.role}, {testimonial.company}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
