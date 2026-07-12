"use client";

import { X, Check, ArrowRight, FileSpreadsheet, MessageCircle, FolderOpen, Mail, Box, Palette, Cloud, Database } from "lucide-react";
import { useReveal } from "../lib/useReveal";
import { useRai } from "../i18n/RaiI18nProvider";
import { SectionHeader } from "./SectionHeader";

// Araç adları marka adı olduğu için çevrilmez
const disconnectedTools = [
  { icon: <FileSpreadsheet className="w-5 h-5" />, name: "Excel", color: "bg-emerald-500/10 text-emerald-400" },
  { icon: <MessageCircle className="w-5 h-5" />, name: "WhatsApp", color: "bg-green-500/10 text-green-400" },
  { icon: <FolderOpen className="w-5 h-5" />, name: "Google Drive", color: "bg-blue-500/10 text-blue-400" },
  { icon: <Mail className="w-5 h-5" />, name: "Email", color: "bg-red-500/10 text-red-400" },
  { icon: <Box className="w-5 h-5" />, name: "Rhino", color: "bg-orange-500/10 text-orange-400" },
  { icon: <Palette className="w-5 h-5" />, name: "MatrixGold", color: "bg-purple-500/10 text-purple-400" },
  { icon: <Cloud className="w-5 h-5" />, name: "Cloud Storage", color: "bg-sky-500/10 text-sky-400" },
  { icon: <Database className="w-5 h-5" />, name: "Photoshop", color: "bg-indigo-500/10 text-indigo-400" },
];

export function WhyRemaura() {
  const { dict } = useRai();
  const t = dict.why;
  const { ref, visible } = useReveal<HTMLElement>(0.2);

  return (
    <section id="why-remaura" ref={ref} className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        <div className="absolute bottom-1/3 right-0 w-[400px] h-[400px] rounded-full bg-[#D4AF37]/[0.02] blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-[1440px] mx-auto section-padding">
        <SectionHeader tag={t.tag} pre={t.titlePre} gold={t.titleGold} post={t.titlePost} desc={t.desc} visible={visible} />

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto">
          {/* Old way */}
          <div className={`glass-card rounded-2xl p-6 lg:p-8 border border-red-500/10 transition-all duration-700 delay-100 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <X className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{t.oldTitle}</h3>
                <p className="text-sm text-[#64748B]">{t.oldSubtitle}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {disconnectedTools.map((tool, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className={`w-9 h-9 rounded-lg ${tool.color} flex items-center justify-center`}>{tool.icon}</div>
                  <span className="text-sm font-medium text-[#94A3B8]">{tool.name}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 rounded-xl bg-red-500/5 border border-red-500/10">
              <p className="text-sm text-red-300/80">{t.oldNote}</p>
            </div>
          </div>

          {/* REMAURA way */}
          <div className={`glass-card rounded-2xl p-6 lg:p-8 border border-[#D4AF37]/20 gold-border-glow transition-all duration-700 delay-200 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center">
                <Check className="w-5 h-5 text-[#050505]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{t.newTitle}</h3>
                <p className="text-sm text-[#64748B]">{t.newSubtitle}</p>
              </div>
            </div>

            <div className="space-y-2">
              {t.features.map((feature, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-[#D4AF37]/20 transition-colors group"
                >
                  <div className="w-6 h-6 rounded-md gradient-gold flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-[#050505]" />
                  </div>
                  <span className="text-sm font-medium text-white group-hover:text-[#D4AF37] transition-colors">{feature}</span>
                  <ArrowRight className="w-4 h-4 text-[#64748B] ms-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 rounded-xl bg-[#D4AF37]/5 border border-[#D4AF37]/10">
              <p className="text-sm text-[#D4AF37]/80">{t.newNote}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
