import Link from "next/link";
import { ArrowRight, FileSpreadsheet, Table2, Tags } from "lucide-react";

const cards = [
  {
    href: "/admin/finance/gelir-tablosu",
    title: "Gelir Tablosu",
    desc: "Ciro, maliyet, net kâr ve dönem özeti",
    icon: Table2,
  },
  {
    href: "/admin/finance/gider-tanimlama",
    title: "Gider Tanımlama",
    desc: "Gider kalemleri ve hesap eşlemesi",
    icon: Tags,
  },
  {
    href: "/admin/finance/muhasebe-raporu",
    title: "Muhasebe Raporu",
    desc: "Mizan ve dönem raporları",
    icon: FileSpreadsheet,
  },
] as const;

export function FinansOverviewPage() {
  return (
    <div className="rounded-2xl border border-white/[0.14] bg-gradient-to-br from-[#14161d] via-[#0e1015] to-[#08090c] p-8 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] sm:p-10">
      <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-zinc-50">Finans</h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-400">
        Mali özet ve muhasebe araçlarına hızlı erişim. Detaylı gelir tablosu ve raporlar için aşağıdaki bağlantıları
        kullanın.
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-1 md:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <li key={c.href}>
              <Link
                href={c.href}
                className="group flex h-full flex-col rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 transition-colors hover:border-[#c69575]/35 hover:bg-[#c69575]/[0.06]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-[#c9a88a]">
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-[#d4b896]"
                    strokeWidth={1.5}
                  />
                </div>
                <p className="mt-4 font-display text-lg font-semibold text-zinc-100">{c.title}</p>
                <p className="mt-1 text-sm text-zinc-500">{c.desc}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
