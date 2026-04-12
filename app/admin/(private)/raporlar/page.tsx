import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Cpu,
  FileSpreadsheet,
  ShoppingCart,
  Table2,
  Tags,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Raporlar | Analiz | Super Admin",
  robots: { index: false, follow: false },
};

const links = [
  {
    href: "/admin/finance/gelir-tablosu",
    title: "Gelir tablosu",
    desc: "Aylık gelir, satıcı özetleri ve billing defteri",
    icon: Table2,
  },
  {
    href: "/admin/finance/muhasebe-raporu",
    title: "Muhasebe raporu",
    desc: "KPI, aylık gelir/gider ve satıcı bazlı özet",
    icon: FileSpreadsheet,
  },
  {
    href: "/admin/finance/gider-tanimlama",
    title: "Gider tanımlama",
    desc: "Gider kalemleri ve fatura kayıtları",
    icon: Tags,
  },
  {
    href: "/admin/orders",
    title: "Siparişler",
    desc: "Sipariş listesi ve operasyonel raporlama",
    icon: ShoppingCart,
  },
  {
    href: "/admin/api-usage",
    title: "API kullanımı",
    desc: "Kullanım metrikleri ve kota özeti",
    icon: Cpu,
  },
] as const;

export default function AdminRaporlarPage() {
  return (
    <div className="space-y-8 pb-10">
      <div className="rounded-2xl border border-white/[0.14] bg-gradient-to-br from-[#14161d] via-[#0e1015] to-[#08090c] p-8 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] sm:p-10">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] text-[#c9a88a]">
            <BarChart3 className="h-6 w-6" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-zinc-50">Raporlar</h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-400">
              Finans, operasyon ve kullanım raporlarına buradan geçin. Detaylı tablolar ilgili sayfalarda canlı veriyle
              yüklenir.
            </p>
          </div>
        </div>
      </div>

      <ul className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {links.map((c) => {
          const Icon = c.icon;
          return (
            <li key={c.href}>
              <Link
                href={c.href}
                className="group flex h-full flex-col rounded-2xl border border-white/[0.1] bg-gradient-to-br from-[#12141a]/95 via-[#0c0d11] to-[#08090c] p-6 transition-colors hover:border-[#c69575]/35 hover:bg-[#c69575]/[0.06]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-[#c9a88a]">
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-[#d4b896]"
                    strokeWidth={1.5}
                    aria-hidden
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
