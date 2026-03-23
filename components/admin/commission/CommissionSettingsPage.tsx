"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { FileText, Layers, Percent, Plus, Store, Tag, Users } from "lucide-react";
import { ADMIN_PRIMARY_BUTTON_CLASS } from "@/components/admin/ui/adminPrimaryButton";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminDataScroll, ADMIN_TABLE_TH_STICKY } from "@/components/admin/ui/AdminDataScroll";
import { AdminKpiCard, type AdminKpiTone } from "@/components/admin/ui/AdminKpiCard";

const tryFmt = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);

const dateFmt = (iso: string) =>
  new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );

const DEFAULT_RATE = 12;

const KPI: { id: string; label: string; value: string; icon: LucideIcon; sub: string; tone: AdminKpiTone }[] = [
  { id: "def", label: "Varsayılan Komisyon Oranı", value: `%${DEFAULT_RATE}`, icon: Percent, sub: "Platform varsayılanı", tone: "neutral" },
  { id: "act", label: "Aktif Kural Sayısı", value: "11", icon: Layers, sub: "Kategori + satıcı", tone: "neutral" },
  { id: "sell", label: "Özel Satıcı Oranları", value: "4", icon: Users, sub: "Override tanımlı", tone: "neutral" },
  { id: "cat", label: "Kategori Bazlı Kurallar", value: "5", icon: Tag, sub: "Aktif kategori", tone: "neutral" },
];

const CATEGORY_RULES: {
  id: string;
  name: string;
  rate: number;
  priority: number;
  status: "Aktif" | "Pasif";
}[] = [
  { id: "c1", name: "Yüzük", rate: 13.5, priority: 20, status: "Aktif" },
  { id: "c2", name: "Kolye", rate: 12, priority: 15, status: "Aktif" },
  { id: "c3", name: "Bilezik", rate: 11, priority: 15, status: "Aktif" },
  { id: "c4", name: "Küpe", rate: 12.5, priority: 18, status: "Aktif" },
  { id: "c5", name: "Madalyon", rate: 14, priority: 22, status: "Pasif" },
];

const SELLER_RULES: {
  id: string;
  seller: string;
  defaultRate: number;
  specialRate: number;
  valid: string;
  status: "Aktif" | "Beklemede";
}[] = [
  { id: "s1", seller: "Atölye Mara", defaultRate: DEFAULT_RATE, specialRate: 10.5, valid: "Süresiz", status: "Aktif" },
  { id: "s2", seller: "Osmanlı Hat Sanatı", defaultRate: DEFAULT_RATE, specialRate: 11, valid: "31.12.2025", status: "Aktif" },
  { id: "s3", seller: "Pırlanta Loft", defaultRate: DEFAULT_RATE, specialRate: 12, valid: "30.06.2025", status: "Aktif" },
  { id: "s4", seller: "Vintage Koleksiyon", defaultRate: DEFAULT_RATE, specialRate: 11.5, valid: "Onay bekliyor", status: "Beklemede" },
];

const RULE_HISTORY: {
  id: string;
  at: string;
  action: string;
  target: string;
  oldVal: string;
  newVal: string;
  admin: string;
}[] = [
  {
    id: "h1",
    at: "2025-03-12T14:20:00",
    action: "Kategori oranı güncellendi",
    target: "Yüzük",
    oldVal: "%13,0",
    newVal: "%13,5",
    admin: "admin@trendmucevher.com",
  },
  {
    id: "h2",
    at: "2025-03-10T09:15:00",
    action: "Satıcı özel oranı eklendi",
    target: "Osmanlı Hat Sanatı",
    oldVal: "—",
    newVal: "%11,0",
    admin: "ops@trendmucevher.com",
  },
  {
    id: "h3",
    at: "2025-03-08T11:00:00",
    action: "Varsayılan oran değişti",
    target: "Platform",
    oldVal: "%11,5",
    newVal: "%12,0",
    admin: "admin@trendmucevher.com",
  },
  {
    id: "h4",
    at: "2025-03-05T16:40:00",
    action: "Kategori kuralı devre dışı",
    target: "Madalyon",
    oldVal: "Aktif",
    newVal: "Pasif",
    admin: "finance@trendmucevher.com",
  },
];

const SUMMARY = {
  maxRate: 14,
  minRate: 10.5,
  topSellerRules: "Atölye Mara",
  topSellerRuleCount: 3,
  estMonthly: 612_400,
};

function CardShell({ title, children, className = "", action }: { title: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section
      className={`rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#10121a]/95 via-[#0a0b0f] to-[#060708] p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] sm:p-6 ${className}`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] pb-4">
        <h2 className="font-display text-lg font-semibold tracking-tight text-zinc-100">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Sağ sütun özet kartları — daha yüksek kontrast, iç parıltı, güçlü başlık */
function RailCardShell({ title, children, className = "", action }: { title: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-white/[0.13] bg-gradient-to-br from-[#12151f] via-[#0b0d14] to-[#060708] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.09),inset_0_0_60px_rgba(198,149,117,0.045)] sm:p-7 ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-100"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 90% 55% at 50% -15%, rgba(198, 149, 117, 0.09), transparent 52%), radial-gradient(ellipse 70% 40% at 100% 100%, rgba(255, 255, 255, 0.03), transparent 50%)",
        }}
      />
      <div className="relative">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.1] pb-5">
          <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-zinc-50">{title}</h2>
          {action}
        </div>
        {children}
      </div>
    </section>
  );
}

const STATUS_STYLES: Record<string, string> = {
  Aktif: "border-emerald-500/35 bg-emerald-500/12 text-emerald-200",
  Pasif: "border-zinc-500/40 bg-zinc-500/10 text-zinc-400",
  Beklemede: "border-amber-500/35 bg-amber-500/12 text-amber-200",
};

export function CommissionSettingsPage() {
  const hasCategories = CATEGORY_RULES.length > 0;
  const hasSellers = SELLER_RULES.length > 0;
  const hasHistory = RULE_HISTORY.length > 0;

  return (
    <div className="space-y-6 pb-10 lg:space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-zinc-50">Komisyon Ayarları</h1>
          <p className="mt-1 text-sm text-zinc-500">Kategori, satıcı ve platform bazlı komisyon kuralları</p>
        </div>
        <button type="button" className={ADMIN_PRIMARY_BUTTON_CLASS}>
          <Plus className="h-4 w-4" strokeWidth={2} />
          Yeni Kural Ekle
        </button>
      </header>

      <section aria-label="Özet" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {KPI.map((k) => (
          <AdminKpiCard key={k.id} label={k.label} value={k.value} sub={k.sub} icon={k.icon} tone={k.tone} />
        ))}
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <CardShell title="Varsayılan Platform Komisyonu">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Geçerli varsayılan oran</p>
                <p className="mt-2 font-display text-4xl font-semibold tabular-nums text-[#eecdb8]">%{DEFAULT_RATE}</p>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500">
                  Satıcıya veya kategoriye özel kural yoksa işlem anında bu oran uygulanır. Değişiklik yeni siparişlerden itibaren geçerlidir.
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-xl border border-white/[0.1] bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:border-[#c69575]/35 hover:bg-[#c69575]/10 hover:text-[#f0dcc8]"
              >
                Düzenle
              </button>
            </div>
          </CardShell>

          <CardShell title="Kategori Bazlı Komisyonlar">
            {!hasCategories ? (
              <AdminEmptyState
                message="Henüz kategori kuralı tanımlı değil."
                hint="Yeni kural ekleyerek başlayın."
                variant="shield"
                size="compact"
              />
            ) : (
              <AdminDataScroll>
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      <th className={`px-4 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Kategori</th>
                      <th className={`px-4 py-3 tabular-nums ${ADMIN_TABLE_TH_STICKY}`}>Komisyon Oranı</th>
                      <th className={`px-4 py-3 tabular-nums ${ADMIN_TABLE_TH_STICKY}`}>Öncelik</th>
                      <th className={`px-4 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Durum</th>
                      <th className={`px-4 py-3 text-right ${ADMIN_TABLE_TH_STICKY}`}>Aksiyon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {CATEGORY_RULES.map((row) => (
                      <tr key={row.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-medium text-zinc-100">{row.name}</td>
                        <td className="px-4 py-3 tabular-nums text-zinc-200">%{row.rate.toFixed(1).replace(".", ",")}</td>
                        <td className="px-4 py-3 tabular-nums text-zinc-400">{row.priority}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[row.status]}`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-[#c69575]/25 hover:bg-[#c69575]/10"
                            >
                              Düzenle
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-zinc-500/25 bg-zinc-500/10 px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-500/18"
                            >
                              Devre Dışı Bırak
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AdminDataScroll>
            )}
          </CardShell>

          <CardShell title="Satıcı Bazlı Özel Oranlar">
            {!hasSellers ? (
              <AdminEmptyState message="Satıcıya özel komisyon tanımlı değil." variant="shield" size="compact" />
            ) : (
              <AdminDataScroll>
                <table className="w-full min-w-[880px] text-left text-sm">
                  <thead>
                    <tr className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      <th className={`px-4 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Satıcı</th>
                      <th className={`px-4 py-3 tabular-nums ${ADMIN_TABLE_TH_STICKY}`}>Varsayılan Oran</th>
                      <th className={`px-4 py-3 tabular-nums ${ADMIN_TABLE_TH_STICKY}`}>Özel Oran</th>
                      <th className={`px-4 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Geçerlilik</th>
                      <th className={`px-4 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Durum</th>
                      <th className={`px-4 py-3 text-right ${ADMIN_TABLE_TH_STICKY}`}>Aksiyon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {SELLER_RULES.map((row) => (
                      <tr key={row.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-medium text-zinc-100">{row.seller}</td>
                        <td className="px-4 py-3 tabular-nums text-zinc-500">%{row.defaultRate}</td>
                        <td className="px-4 py-3 tabular-nums font-medium text-[#eecdb8]">%{row.specialRate.toFixed(1).replace(".", ",")}</td>
                        <td className="px-4 py-3 text-zinc-400">{row.valid}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[row.status]}`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-[#c69575]/25 hover:bg-[#c69575]/10"
                            >
                              Düzenle
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-200 transition-colors hover:bg-rose-500/18"
                            >
                              Kaldır
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AdminDataScroll>
            )}
          </CardShell>

          <CardShell title="Kural Önceliği">
            <p className="mb-4 text-sm leading-relaxed text-zinc-500">
              Ödeme anında komisyon oranı aşağıdaki sırayla çözümlenir. Yukarıdaki kural varsa alttakiler uygulanmaz.
            </p>
            <ol className="space-y-3">
              {[
                { step: 1, title: "Satıcıya özel kural", desc: "Geçerli tarih aralığında ve aktifse uygulanır.", icon: Store },
                { step: 2, title: "Kategori kuralı", desc: "Ürünün birincil kategorisine göre en yüksek öncelikli eşleşme.", icon: Tag },
                { step: 3, title: "Varsayılan platform oranı", desc: "Hiçbir özel kural yoksa geçerli olan taban oran.", icon: Percent },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <li
                    key={item.step}
                    className="flex gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#c69575]/25 bg-[#c69575]/10 font-display text-lg font-semibold text-[#eecdb8]">
                      {item.step}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-[#b8956f]" strokeWidth={1.5} />
                        <span className="font-semibold text-zinc-100">{item.title}</span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-500">{item.desc}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </CardShell>
        </div>

        <div className="space-y-8 xl:col-span-4 xl:space-y-10">
          <RailCardShell title="Komisyon Özeti">
            <ul className="space-y-5 text-sm">
              <li className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
                <span className="text-[13px] text-zinc-400">En yüksek oran</span>
                <span className="font-display text-lg font-semibold tabular-nums text-emerald-300/90">%{SUMMARY.maxRate}</span>
              </li>
              <li className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
                <span className="text-[13px] text-zinc-400">En düşük oran</span>
                <span className="font-display text-lg font-semibold tabular-nums text-zinc-200">%{SUMMARY.minRate}</span>
              </li>
              <li className="flex flex-col gap-1.5 border-b border-white/[0.08] pb-4">
                <span className="text-[13px] text-zinc-400">En çok özel kurala sahip satıcı</span>
                <span className="font-medium text-zinc-100">{SUMMARY.topSellerRules}</span>
                <span className="text-xs text-zinc-500">{SUMMARY.topSellerRuleCount} aktif kural (örnek)</span>
              </li>
              <li className="rounded-xl border border-[#c69575]/18 bg-gradient-to-br from-[#c69575]/[0.1] via-[#0d0f16]/90 to-[#07080c] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Bu ay tahmini komisyon geliri</p>
                <p className="mt-3 font-display text-3xl font-semibold leading-none tracking-tight tabular-nums text-[#f2dcc8] sm:text-4xl">
                  {tryFmt(SUMMARY.estMonthly)}
                </p>
              </li>
            </ul>
            <p className="mt-6 text-[11px] leading-relaxed text-zinc-500">
              Tahmin, son 30 günlük brüt ciro ve geçerli oranlar üzerinden hesaplanır.
            </p>
          </RailCardShell>

          <RailCardShell title="Hızlı İşlemler">
            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                className={`${ADMIN_PRIMARY_BUTTON_CLASS} w-full !py-3`}
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
                Yeni Kural Ekle
              </button>
              <Link
                href="/admin/sellers"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-[#c69575]/30 hover:bg-[#c69575]/10 hover:text-[#f0dcc8]"
              >
                <Users className="h-4 w-4 text-[#b8956f]" strokeWidth={1.5} />
                Satıcı Oranlarını Gör
              </Link>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-[#c69575]/30 hover:bg-[#c69575]/10 hover:text-[#f0dcc8]"
              >
                <Tag className="h-4 w-4 text-[#b8956f]" strokeWidth={1.5} />
                Kategori Kurallarını Gör
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-[#c69575]/30 hover:bg-[#c69575]/10 hover:text-[#f0dcc8]"
              >
                <FileText className="h-4 w-4 text-[#b8956f]" strokeWidth={1.5} />
                Geçmişi İncele
              </button>
            </div>
          </RailCardShell>
        </div>
      </div>

      <CardShell title="Kural Geçmişi">
        {!hasHistory ? (
          <AdminEmptyState message="Henüz kural değişiklik kaydı yok." variant="shield" size="compact" />
        ) : (
          <AdminDataScroll>
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  <th className={`px-4 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Tarih</th>
                  <th className={`px-4 py-3 ${ADMIN_TABLE_TH_STICKY}`}>İşlem</th>
                  <th className={`px-4 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Hedef</th>
                  <th className={`px-4 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Eski Değer</th>
                  <th className={`px-4 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Yeni Değer</th>
                  <th className={`px-4 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Yapan Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {RULE_HISTORY.map((row) => (
                  <tr key={row.id} className="hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-400">{dateFmt(row.at)}</td>
                    <td className="px-4 py-3 text-zinc-200">{row.action}</td>
                    <td className="px-4 py-3 font-medium text-zinc-300">{row.target}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">{row.oldVal}</td>
                    <td className="px-4 py-3 font-mono text-xs text-emerald-300/90">{row.newVal}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{row.admin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminDataScroll>
        )}
      </CardShell>
    </div>
  );
}

