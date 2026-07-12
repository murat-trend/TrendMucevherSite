"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { useReveal } from "../lib/useReveal";
import { useRai } from "../i18n/RaiI18nProvider";
import { SectionHeader } from "./SectionHeader";

export function FAQ() {
  const { dict } = useRai();
  const t = dict.faq;
  const { ref, visible } = useReveal<HTMLElement>(0.1);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" ref={ref} className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-[#D4AF37]/[0.02] blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-[1440px] mx-auto section-padding">
        <SectionHeader tag={t.tag} pre={t.titlePre} gold={t.titleGold} post={t.titlePost} desc={t.desc} visible={visible} />

        <div className="max-w-3xl mx-auto space-y-3">
          {t.items.map((faq, idx) => (
            <div
              key={idx}
              className={`glass-card rounded-xl overflow-hidden transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              style={{ transitionDelay: `${idx * 50}ms` }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="flex items-center justify-between w-full p-5 lg:p-6 text-start"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
                    <HelpCircle className="w-4 h-4 text-[#D4AF37]" />
                  </div>
                  <span className="text-base font-medium text-white">{faq.question}</span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-[#64748B] shrink-0 transition-transform duration-300 ${openIndex === idx ? "rotate-180" : ""}`}
                />
              </button>

              <div className={`overflow-hidden transition-all duration-300 ${openIndex === idx ? "max-h-96" : "max-h-0"}`}>
                <div className="px-5 lg:px-6 pb-5 lg:pb-6">
                  <p className="text-sm text-[#94A3B8] leading-relaxed ps-12">{faq.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
