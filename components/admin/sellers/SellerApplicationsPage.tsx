"use client";

import Link from "next/link";
import { ArrowLeft, Layers } from "lucide-react";
import { ADMIN_PRIMARY_BUTTON_CLASS } from "@/components/admin/ui/adminPrimaryButton";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";

type AppRow = { id: string; store: string; date: string };

const INITIAL_APPLICATIONS: AppRow[] = [
  { id: "1", store: "Atölye Mara", date: "14.03.2025" },
  { id: "2", store: "Gümüş İşleri Co.", date: "13.03.2025" },
  { id: "3", store: "Vintage Koleksiyon", date: "12.03.2025" },
  { id: "4", store: "Pırlanta Loft", date: "11.03.2025" },
  { id: "5", store: "Elmas Evi İstanbul", date: "10.03.2025" },
  { id: "6", store: "Luna İnci Atölyesi", date: "09.03.2025" },
  { id: "7", store: "Osmanlı Hat Sanatı", date: "08.03.2025" },
  { id: "8", store: "Kuyumcu Sokak Atölye", date: "07.03.2025" },
];

export function SellerApplicationsPage() {
  const rows = INITIAL_APPLICATIONS;

  return (
    <div className="space-y-6 pb-10 lg:space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/admin/sellers"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#c9a88a] transition-colors hover:text-[#e8d4c4]"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            Satıcı listesi
          </Link>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-zinc-50">Yeni satıcı başvuruları</h1>
          <p className="mt-1 text-sm text-zinc-500">İnceleme bekleyen mağaza kayıtları</p>
        </div>
        <button type="button" className={ADMIN_PRIMARY_BUTTON_CLASS}>
          <Layers className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          Dışa aktar
        </button>
      </header>

      <section
        className="overflow-hidden rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#10121a]/95 via-[#0a0b0f] to-[#060708] shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]"
        aria-label="Başvuru listesi"
      >
        {rows.length === 0 ? (
          <AdminEmptyState
            message="Bekleyen başvuru bulunmuyor."
            hint="Yeni kayıtlar geldiğinde burada listelenir."
            variant="shield"
            size="comfortable"
            className="rounded-2xl border-0 bg-transparent"
          />
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-200">{row.store}</p>
                  <p className="text-xs text-zinc-500">Başvuru: {row.date}</p>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-lg border border-[#c69575]/35 bg-[#c69575]/10 px-3 py-1.5 text-xs font-medium text-[#eecdb8] transition-colors hover:bg-[#c69575]/18"
                >
                  İncele
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
