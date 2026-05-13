import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, HelpCircle, LayoutList, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "İçerik Yönetimi | Super Admin",
  robots: { index: false, follow: false },
};

const sections = [
  {
    href: "/admin/cms/egitimler",
    icon: GraduationCap,
    title: "Eğitimler & Kurslar",
    desc: "MatrixGold, ZBrush ve diğer eğitim setlerini yönetin. Fiyat, açıklama, modül listesi ve yayın durumunu buradan değiştirin.",
    badge: null,
  },
  {
    href: "/admin/cms/sss",
    icon: HelpCircle,
    title: "SSS",
    desc: "Sık sorulan soruları 4 dilde ekleyin ve düzenleyin. /sss sayfasında otomatik görünür.",
    badge: "Yakında",
  },
  {
    href: "/admin/cms/sayfa-metinleri",
    icon: LayoutList,
    title: "Sayfa Metinleri",
    desc: "Ana sayfa hero, hakkımızda ve diğer statik metin bloklarını kod değiştirmeden düzenleyin.",
    badge: "Yakında",
  },
];

export default function CmsHubPage() {
  return (
    <div className="space-y-6 pb-10">
      <div className="rounded-2xl border border-white/[0.14] bg-gradient-to-br from-[#14161d] via-[#0e1015] to-[#08090c] p-6 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] sm:p-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">İçerik Yönetimi</h1>
        <p className="mt-2 text-sm text-zinc-400">Eğitimler, SSS ve sayfa metinlerini kod değiştirmeden yönetin.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group relative flex flex-col rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#10121a]/95 via-[#0a0b0f] to-[#060708] p-6 transition-colors hover:border-[#c9a84c]/30"
          >
            {s.badge && (
              <span className="absolute right-4 top-4 rounded-full border border-white/[0.1] bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                {s.badge}
              </span>
            )}
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.1] bg-[#c9a84c]/10">
              <s.icon className="h-5 w-5 text-[#c9a84c]" />
            </div>
            <h2 className="font-display text-base font-semibold text-zinc-100 group-hover:text-[#c9a84c] transition-colors">
              {s.title}
            </h2>
            <p className="mt-2 flex-1 text-[13px] leading-relaxed text-zinc-500">{s.desc}</p>
            <div className="mt-4 flex items-center gap-1 text-xs font-medium text-[#c9a84c]/60 group-hover:text-[#c9a84c] transition-colors">
              {s.badge ? "Yakında" : "Aç"}
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
