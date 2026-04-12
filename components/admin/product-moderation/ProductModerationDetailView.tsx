"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  ClipboardList,
  Flag,
  ImageIcon,
  Layers,
  MoreHorizontal,
  Package,
  Shield,
  Store,
  X,
} from "lucide-react";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminDataScroll, ADMIN_TABLE_TH_STICKY } from "@/components/admin/ui/AdminDataScroll";
import { AdminKpiCard, type AdminKpiTone } from "@/components/admin/ui/AdminKpiCard";
import {
  MODERATION_STATUS_LABEL_TR,
  type ProductDetailFull,
  type ProductModerationStatus,
  type RiskLevel,
} from "./product-moderation-detail-data";

const tryFmt = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);

const dateFmt = (iso: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

const STATUS_BADGE: Record<ProductModerationStatus, string> = {
  pending: "border-amber-500/40 bg-amber-500/12 text-amber-200",
  published: "border-emerald-500/35 bg-emerald-500/12 text-emerald-200",
  rejected: "border-rose-500/35 bg-rose-500/12 text-rose-200",
  suspended: "border-zinc-500/40 bg-zinc-500/10 text-zinc-400",
};

const RISK_BADGE: Record<RiskLevel, string> = {
  Düşük: "border-sky-500/35 bg-sky-500/10 text-sky-200",
  Orta: "border-amber-500/35 bg-amber-500/10 text-amber-200",
  Yüksek: "border-rose-500/40 bg-rose-500/15 text-rose-200",
};

const SELLER_STATUS_BADGE: Record<ProductDetailFull["sellerStatus"], string> = {
  Aktif: "border-emerald-500/35 bg-emerald-500/10 text-emerald-200",
  Bekleyen: "border-amber-500/35 bg-amber-500/10 text-amber-200",
  Askıda: "border-rose-500/35 bg-rose-500/12 text-rose-200",
};

function Badge({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${className}`}>{children}</span>
  );
}

function Card({
  title,
  icon: Icon,
  children,
  className = "",
  titleRight,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  children: ReactNode;
  className?: string;
  titleRight?: ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#10121a]/95 via-[#0a0b0f] to-[#060708] p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] sm:p-6 ${className}`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-[#b8956f]" strokeWidth={1.5} />}
          <h2 className="font-display text-base font-semibold tracking-tight text-zinc-100">{title}</h2>
        </div>
        {titleRight}
      </div>
      {children}
    </section>
  );
}

function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
          ok ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300" : "border-rose-500/35 bg-rose-500/10 text-rose-300"
        }`}
      >
        {ok ? <Check className="h-3 w-3" strokeWidth={2.5} /> : <X className="h-3 w-3" strokeWidth={2.5} />}
      </span>
      <span className={ok ? "text-zinc-300" : "text-zinc-200"}>{label}</span>
    </li>
  );
}

type BottomTab = "notes" | "history" | "messages" | "similar";

export function ProductModerationDetailView({ initial }: { initial: ProductDetailFull }) {
  const [product, setProduct] = useState(initial);
  const [imgIdx, setImgIdx] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [tab, setTab] = useState<BottomTab>("notes");

  const setStatus = useCallback((status: ProductModerationStatus) => {
    setProduct((p) => ({ ...p, status }));
  }, []);

  const kpis = useMemo(() => {
    const riskTone: AdminKpiTone = product.risk === "Yüksek" ? "critical" : "neutral";
    return [
      { label: "Fiyat", value: tryFmt(product.price), sub: "Satış fiyatı", tone: "neutral" as const },
      {
        label: "Stok",
        value: String(product.stock),
        sub: "Adet",
        tone: "neutral" as const,
      },
      { label: "Varyant Sayısı", value: String(product.variantCount), sub: "SKU varyantı", tone: "neutral" as const },
      { label: "Risk Skoru", value: `${product.riskScore}/100`, sub: product.risk, tone: riskTone },
    ];
  }, [product]);

  const hasCriticalRisk = useMemo(() => {
    const f = product.riskFlags;
    return (
      f.duplicateProduct ||
      f.suspiciousWording ||
      f.missingCategory ||
      f.missingMedia ||
      Boolean(f.manualNote)
    );
  }, [product.riskFlags]);

  const primaryImage = product.images[imgIdx] ?? product.images[0];

  return (
    <div className="min-h-screen bg-[#050608] pb-16 pt-6 text-zinc-200">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-6 border-b border-white/[0.07] pb-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-4">
            <Link
              href="/admin/product-moderation"
              className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500 transition-colors hover:text-[#d4b896]"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
              Ürün Denetimi
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">{product.name}</h1>
              <Badge className={STATUS_BADGE[product.status]}>{MODERATION_STATUS_LABEL_TR[product.status]}</Badge>
              <Badge className={RISK_BADGE[product.risk]}>{product.risk}</Badge>
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-zinc-500">
              Ürün kimliği <span className="font-mono text-zinc-400">{product.id}</span> · Çok satıcılı pazar yeri moderasyonu
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <button
              type="button"
              onClick={() => setStatus("published")}
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/12 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
            >
              Onayla
            </button>
            <button
              type="button"
              onClick={() => setStatus("rejected")}
              className="rounded-xl border border-rose-500/30 bg-rose-500/12 px-4 py-2.5 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20"
            >
              Reddet
            </button>
            <button
              type="button"
              onClick={() => setStatus("suspended")}
              className="rounded-xl border border-amber-500/30 bg-amber-500/12 px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/20"
            >
              Askıya Al
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMoreOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-[#c69575]/25 hover:bg-[#c69575]/10"
              >
                Daha Fazla
                <ChevronDown className={`h-4 w-4 transition ${moreOpen ? "rotate-180" : ""}`} />
              </button>
              {moreOpen && (
                <>
                  <button type="button" className="fixed inset-0 z-10 cursor-default" aria-label="Kapat" onClick={() => setMoreOpen(false)} />
                  <div className="absolute right-0 top-full z-20 mt-2 min-w-[200px] rounded-xl border border-white/[0.1] bg-[#0e1016] py-1 shadow-xl">
                    <button
                      type="button"
                      className="block w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-white/[0.05]"
                      onClick={() => setMoreOpen(false)}
                    >
                      PDF raporu indir
                    </button>
                    <button
                      type="button"
                      className="block w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-white/[0.05]"
                      onClick={() => setMoreOpen(false)}
                    >
                      Satıcıya bildirim gönder
                    </button>
                    <button
                      type="button"
                      className="block w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-white/[0.05]"
                      onClick={() => setMoreOpen(false)}
                    >
                      İçerik kopyasını kaydet
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* KPI strip */}
        <div className="mb-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k) => (
            <AdminKpiCard key={k.label} label={k.label} value={k.value} sub={k.sub} tone={k.tone} />
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] xl:gap-8">
          {/* LEFT */}
          <div className="space-y-6">
            <Card title="Ürün özeti" icon={Package}>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Ürün adı</dt>
                  <dd className="mt-1 text-sm text-zinc-100">{product.name}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">SKU</dt>
                  <dd className="mt-1 font-mono text-sm text-zinc-200">{product.sku}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Satıcı</dt>
                  <dd className="mt-1 text-sm text-zinc-200">{product.seller}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Kategori</dt>
                  <dd className="mt-1 text-sm text-zinc-200">{product.category}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Oluşturulma</dt>
                  <dd className="mt-1 text-sm text-zinc-300">{dateFmt(product.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Son güncelleme</dt>
                  <dd className="mt-1 text-sm text-zinc-300">{dateFmt(product.updatedAt)}</dd>
                </div>
              </dl>
              <div className="mt-5 rounded-xl border border-white/[0.06] bg-black/25 p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Kısa açıklama</p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">{product.shortDescription}</p>
              </div>
            </Card>

            <Card title="Ürün Görselleri" icon={ImageIcon}>
              {product.images.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-6 py-12 text-center">
                  <AlertTriangle className="h-10 w-10 text-amber-400/80" strokeWidth={1.25} />
                  <p className="text-sm font-medium text-amber-100/90">Görsel yüklenmemiş</p>
                  <p className="max-w-md text-xs text-amber-200/70">
                    Bu ürün için henüz görsel bulunmuyor. Yayın öncesi en az üç görsel yüklenmesi önerilir.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-br from-[#1c1914] via-[#12100d] to-[#0a0908]">
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
                      <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">Önizleme</span>
                      <span className="font-display text-lg text-zinc-200">{primaryImage?.alt ?? "Görsel"}</span>
                      <span className="font-mono text-[11px] text-zinc-500">{primaryImage?.id}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.images.map((im, i) => (
                      <button
                        key={im.id}
                        type="button"
                        onClick={() => setImgIdx(i)}
                        className={`relative h-16 w-16 overflow-hidden rounded-lg border transition ${
                          i === imgIdx
                            ? "border-[#c69575]/50 ring-1 ring-[#c69575]/30"
                            : "border-white/[0.08] hover:border-white/20"
                        } bg-gradient-to-br from-[#1a1815] to-[#0c0b09]`}
                        aria-label={im.alt}
                      >
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-zinc-500">{i + 1}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <Card title="Varyantlar" icon={Layers}>
              <AdminDataScroll>
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      <th className={`px-4 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Varyant</th>
                      <th className={`px-4 py-3 ${ADMIN_TABLE_TH_STICKY}`}>SKU</th>
                      <th className={`px-4 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Fiyat</th>
                      <th className={`px-4 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Stok</th>
                      <th className={`px-4 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.variants.map((v) => (
                      <tr key={v.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-medium text-zinc-200">{v.label}</td>
                        <td className="px-4 py-3 font-mono text-xs text-zinc-400">{v.sku}</td>
                        <td className="px-4 py-3 tabular-nums text-zinc-200">{tryFmt(v.price)}</td>
                        <td className="px-4 py-3 tabular-nums text-zinc-300">{v.stock}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-xs text-zinc-300">{v.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AdminDataScroll>
            </Card>

            <Card title="Açıklama ve İçerik" icon={ClipboardList}>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4 text-sm leading-relaxed text-zinc-300">{product.longDescription}</div>
              <ul className="mt-5 space-y-3">
                <CheckRow ok={product.contentChecks.descriptionOk} label="Açıklama yeterli mi" />
                <CheckRow ok={product.contentChecks.categoryMatch} label="Kategori uyumu var mı" />
                <CheckRow ok={!product.contentChecks.bannedPhrases} label="Yasaklı / şüpheli ifade yok" />
                <CheckRow ok={!product.contentChecks.duplicateContentRisk} label="Kopya içerik riski yok" />
              </ul>
            </Card>
          </div>

          {/* RIGHT */}
          <div className="space-y-6">
            <Card title="Satıcı özeti" icon={Store}>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-lg font-semibold text-zinc-50">{product.seller}</span>
                  <Badge className={SELLER_STATUS_BADGE[product.sellerStatus]}>{product.sellerStatus}</Badge>
                </div>
                <dl className="grid gap-3 text-sm">
                  <div className="flex justify-between border-b border-white/[0.05] pb-2">
                    <dt className="text-zinc-500">Toplam satış</dt>
                    <dd className="tabular-nums text-zinc-200">{tryFmt(product.sellerTotalSales)}</dd>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.05] pb-2">
                    <dt className="text-zinc-500">İade oranı</dt>
                    <dd className="tabular-nums text-zinc-200">%{product.sellerReturnRate.toFixed(1)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Ortalama puan</dt>
                    <dd className="tabular-nums text-zinc-200">{product.sellerRating.toFixed(1)} / 5</dd>
                  </div>
                </dl>
                <Link
                  href="/admin/sellers"
                  className="mt-2 inline-flex w-full items-center justify-center rounded-xl border border-[#c69575]/25 bg-[#c69575]/10 py-2.5 text-sm font-medium text-[#f0dcc8] transition hover:bg-[#c69575]/18"
                >
                  Satıcıyı Gör
                </Link>
              </div>
            </Card>

            <Card title="Fiyat ve stok incelemesi" icon={Package}>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Satış fiyatı</dt>
                  <dd className="font-medium tabular-nums text-zinc-100">{tryFmt(product.price)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Karşılaştırma fiyatı</dt>
                  <dd className="tabular-nums text-zinc-300">
                    {product.compareAtPrice != null ? tryFmt(product.compareAtPrice) : "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Stok adedi</dt>
                  <dd className="tabular-nums text-zinc-200">{product.stock}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Düşük stok uyarısı</dt>
                  <dd className={product.lowStockWarning ? "text-amber-200" : "text-emerald-300"}>
                    {product.lowStockWarning ? "Var" : "Yok"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Fiyat anomalisi</dt>
                  <dd className={product.priceAnomaly ? "text-rose-200" : "text-emerald-300"}>{product.priceAnomaly ? "Tespit edildi" : "Yok"}</dd>
                </div>
              </dl>
            </Card>

            <Card title="Moderasyon Kontrolü" icon={Shield}>
              <ul className="space-y-2.5">
                <CheckRow ok={product.moderationChecks.imagesOk} label="Görseller yeterli" />
                <CheckRow ok={product.moderationChecks.categoryOk} label="Kategori doğru" />
                <CheckRow ok={product.moderationChecks.descriptionOk} label="Açıklama uygun" />
                <CheckRow ok={product.moderationChecks.priceOk} label="Fiyat mantıklı" />
                <CheckRow ok={product.moderationChecks.stockOk} label="Stok bilgisi yeterli" />
                <CheckRow ok={product.moderationChecks.policyOk} label="Politika ihlali yok" />
              </ul>
            </Card>

            <Card title="Risk ve işaretler" icon={Flag}>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Yinelenen ürün riski</dt>
                  <dd className={product.riskFlags.duplicateProduct ? "text-rose-200" : "text-emerald-300/90"}>
                    {product.riskFlags.duplicateProduct ? "Evet" : "Hayır"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Şüpheli ifade</dt>
                  <dd className={product.riskFlags.suspiciousWording ? "text-rose-200" : "text-emerald-300/90"}>
                    {product.riskFlags.suspiciousWording ? "Tespit" : "Yok"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Eksik kategori</dt>
                  <dd className={product.riskFlags.missingCategory ? "text-amber-200" : "text-emerald-300/90"}>
                    {product.riskFlags.missingCategory ? "Evet" : "Hayır"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Eksik medya</dt>
                  <dd className={product.riskFlags.missingMedia ? "text-amber-200" : "text-emerald-300/90"}>
                    {product.riskFlags.missingMedia ? "Evet" : "Hayır"}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Manuel not</dt>
                  <dd className="mt-1 rounded-lg border border-white/[0.06] bg-black/30 p-3 text-zinc-300">
                    {product.riskFlags.manualNote ?? "—"}
                  </dd>
                </div>
              </dl>
              {!hasCriticalRisk && (
                <p className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 text-center text-sm text-emerald-200/90">
                  Şu an kritik moderasyon riski bulunmuyor
                </p>
              )}
            </Card>
          </div>
        </div>

        {/* Bottom tabs */}
        <section className="mt-10 rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#10121a]/95 via-[#0a0b0f] to-[#060708] p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] sm:p-6">
          <div className="flex flex-wrap gap-2 border-b border-white/[0.06] pb-4">
            {(
              [
                ["notes", "Moderasyon Notları"],
                ["history", "Değişiklik Geçmişi"],
                ["messages", "Satıcı Mesajları"],
                ["similar", "Benzer Ürünler"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  tab === id
                    ? "bg-[#c69575]/15 text-[#f0dcc8] ring-1 ring-[#c69575]/25"
                    : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="pt-5">
            {tab === "notes" && (
              <ul className="space-y-3">
                {product.tabNotes.length === 0 ? (
                  <AdminEmptyState message="Henüz moderasyon notu eklenmemiş." variant="shield" size="compact" />
                ) : (
                  product.tabNotes.map((n) => (
                    <li key={n.id} className="rounded-xl border border-white/[0.06] bg-black/25 px-4 py-3">
                      <p className="text-xs text-zinc-500">
                        {dateFmt(n.at)} · {n.author}
                      </p>
                      <p className="mt-1 text-sm text-zinc-300">{n.text}</p>
                    </li>
                  ))
                )}
              </ul>
            )}
            {tab === "history" && (
              <ul className="space-y-3">
                {product.tabHistory.length === 0 ? (
                  <AdminEmptyState message="Kayıtlı değişiklik geçmişi yok." variant="shield" size="compact" />
                ) : (
                  product.tabHistory.map((h) => (
                    <li key={h.id} className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-white/[0.06] bg-black/25 px-4 py-3">
                      <span className="text-sm font-medium text-zinc-200">{h.action}</span>
                      <span className="text-xs text-zinc-500">{dateFmt(h.at)}</span>
                      <p className="w-full text-sm text-zinc-400">{h.detail}</p>
                    </li>
                  ))
                )}
              </ul>
            )}
            {tab === "messages" && (
              <ul className="space-y-3">
                {product.tabMessages.length === 0 ? (
                  <AdminEmptyState message="Bu ürün için satıcı mesajı bulunmuyor." variant="shield" size="compact" />
                ) : (
                  product.tabMessages.map((m) => (
                    <li key={m.id} className="rounded-xl border border-white/[0.06] bg-black/25 px-4 py-3">
                      <p className="text-xs text-zinc-500">
                        {dateFmt(m.at)} · {m.from}
                      </p>
                      <p className="mt-1 text-sm text-zinc-300">{m.text}</p>
                    </li>
                  ))
                )}
              </ul>
            )}
            {tab === "similar" && (
              <ul className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.06]">
                {product.similarProducts.length === 0 ? (
                  <li className="px-4 py-10">
                    <AdminEmptyState message="Benzer ürün önerisi henüz oluşturulmadı." variant="shield" size="compact" />
                  </li>
                ) : (
                  product.similarProducts.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.02]">
                      <div>
                        <p className="font-medium text-zinc-200">{s.name}</p>
                        <p className="font-mono text-xs text-zinc-500">{s.sku}</p>
                      </div>
                      <span className="text-xs text-zinc-500">{s.seller}</span>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

