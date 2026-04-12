import { Suspense } from "react";
import type { Metadata } from "next";
import { GiderTanimlamaClient } from "@/components/admin/finance/GiderTanimlamaClient";

export const metadata: Metadata = {
  title: "Gider Tanımlama | Muhasebe | Super Admin",
  robots: { index: false, follow: false },
};

function GiderTanimlamaFallback() {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0a0b0e]/80 px-4 py-10 text-center text-sm text-zinc-500">
      Yükleniyor…
    </div>
  );
}

export default function AdminFinanceExpenseDefinitionsPage() {
  return (
    <div className="rounded-2xl border border-white/[0.14] bg-gradient-to-br from-[#14161d] via-[#0e1015] to-[#08090c] p-6 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] sm:p-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">Gider Tanımlama</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
        Fatura dosyalarını yükleyin; veriler sunucuya kaydedilir ve her gece otomatik PDF yedek oluşturulur. Excel ile
        muhasebeciye tıklanabilir fatura bağlantıları gönderebilirsiniz.
      </p>
      <div className="mt-8">
        <Suspense fallback={<GiderTanimlamaFallback />}>
          <GiderTanimlamaClient />
        </Suspense>
      </div>
    </div>
  );
}
