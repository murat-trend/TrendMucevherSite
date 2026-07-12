"use client";

import { Upload, Wrench, Ruler, AlertTriangle, Weight, Calculator, CheckCircle, ArrowRight, type LucideIcon } from "lucide-react";
import { useReveal } from "../lib/useReveal";
import { useRai } from "../i18n/RaiI18nProvider";
import { SectionHeader } from "./SectionHeader";
import { MockShot } from "./MockShot";

// dict.manufacturing.steps ile sıra bazlı eşleşir
const STEP_META: { Icon: LucideIcon; color: string; borderColor: string }[] = [
  { Icon: Upload, color: "from-blue-500/20 to-blue-600/10", borderColor: "border-blue-500/20" },
  { Icon: Wrench, color: "from-emerald-500/20 to-emerald-600/10", borderColor: "border-emerald-500/20" },
  { Icon: Ruler, color: "from-amber-500/20 to-amber-600/10", borderColor: "border-amber-500/20" },
  { Icon: AlertTriangle, color: "from-orange-500/20 to-orange-600/10", borderColor: "border-orange-500/20" },
  { Icon: Weight, color: "from-purple-500/20 to-purple-600/10", borderColor: "border-purple-500/20" },
  { Icon: Calculator, color: "from-pink-500/20 to-pink-600/10", borderColor: "border-pink-500/20" },
  { Icon: CheckCircle, color: "from-[#D4AF37]/30 to-[#D4AF37]/10", borderColor: "border-[#D4AF37]/30" },
];

export function Manufacturing() {
  const { dict } = useRai();
  const t = dict.manufacturing;
  const { ref, visible } = useReveal<HTMLElement>(0.1);

  return (
    <section id="manufacturing" ref={ref} className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] rounded-full bg-[#D4AF37]/[0.02] blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-[1440px] mx-auto section-padding">
        <SectionHeader tag={t.tag} pre={t.titlePre} gold={t.titleGold} post={t.titlePost} desc={t.desc} visible={visible} />

        <div className={`mb-16 transition-all duration-700 delay-100 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="relative glass-card rounded-2xl overflow-hidden border border-white/[0.08]">
            <MockShot />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/60 via-transparent to-transparent pointer-events-none" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {t.steps.map((step, idx) => {
            const meta = STEP_META[idx];
            const Icon = meta.Icon;
            return (
              <div
                key={idx}
                className={`group glass-card-hover rounded-2xl p-5 lg:p-6 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                style={{ transitionDelay: `${200 + idx * 75}ms` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${meta.color} border ${meta.borderColor} flex items-center justify-center text-[#D4AF37]`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-[#64748B]">0{idx + 1}</span>
                </div>

                <h3 className="text-base font-semibold text-white group-hover:text-[#D4AF37] transition-colors mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">{step.description}</p>
              </div>
            );
          })}
        </div>

        <div className={`mt-12 text-center transition-all duration-700 delay-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <button className="btn-primary">
            {t.cta}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
