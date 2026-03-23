import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Muhasebe Raporu | Muhasebe | Super Admin",
  robots: { index: false, follow: false },
};

export default function AdminFinanceAccountingReportPage() {
  return (
    <div className="rounded-2xl border border-white/[0.14] bg-gradient-to-br from-[#14161d] via-[#0e1015] to-[#08090c] p-8 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] sm:p-10">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">Muhasebe Raporu</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
        Mizan, yevmiye özeti ve dönem kapanışı raporları. İçerik ve ERP bağlantısı yakında.
      </p>
    </div>
  );
}
