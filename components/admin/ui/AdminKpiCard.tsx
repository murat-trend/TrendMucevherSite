import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";

/**
 * KPI renk sistemi (sadeleştirilmiş):
 * - `neutral` — varsayılan, çoğu kart
 * - `revenue` — yalnızca birincil toplam gelir / ciro metriği (altın vurgu)
 * - `info` — operasyon / hacim (mavi; “iş var” nötr, alarm değil)
 * - `positive` / `negative` — iyi / dikkat (yeşil / yumuşak kırmızı)
 * - `critical` — acil / risk (güçlü kırmızı; `negative`’den daha belirgin)
 */
export type AdminKpiTone = "neutral" | "revenue" | "info" | "positive" | "negative" | "critical";

const SHELL: Record<AdminKpiTone, string> = {
  neutral:
    "border-white/[0.09] bg-[#08090d]/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] hover:border-white/[0.14] hover:bg-[#0b0d14] hover:shadow-[0_10px_40px_-16px_rgba(0,0,0,0.55)]",
  revenue:
    "border-[#c69575]/20 bg-gradient-to-br from-[#c69575]/[0.07] via-[#08090d] to-[#0a0b0f] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-[#c69575]/32 hover:shadow-[inset_0_0_40px_rgba(198,149,117,0.06)]",
  info:
    "border-sky-500/20 bg-[#08090d]/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-sky-500/32 hover:bg-[#0a0f14] hover:shadow-[0_10px_40px_-18px_rgba(14,165,233,0.12)]",
  positive:
    "border-emerald-500/18 bg-[#08090d]/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-emerald-500/28 hover:bg-[#0a100e]",
  negative:
    "border-rose-500/18 bg-[#08090d]/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-rose-500/28 hover:bg-[#100a0c]",
  critical:
    "relative overflow-hidden border-rose-500/45 bg-gradient-to-br from-rose-950/35 via-[#0c0808] to-[#08090d] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_44px_-10px_rgba(244,63,94,0.35)] ring-1 ring-rose-500/30 hover:border-rose-400/55 hover:shadow-[0_0_52px_-8px_rgba(244,63,94,0.4)]",
};

const VALUE: Record<AdminKpiTone, string> = {
  neutral: "text-zinc-50",
  revenue: "text-[#e4d0bf]",
  info: "text-sky-100/95",
  positive: "text-emerald-400/90",
  negative: "text-rose-400/90",
  critical: "text-rose-300",
};

const ICON_WRAP: Record<AdminKpiTone, string> = {
  neutral: "border-white/[0.08] bg-white/[0.04] text-zinc-500",
  revenue: "border-[#c69575]/18 bg-[#c69575]/[0.08] text-[#c4a574]",
  info: "border-sky-500/25 bg-sky-500/[0.08] text-sky-400/90",
  positive: "border-emerald-500/22 bg-emerald-500/[0.07] text-emerald-400/85",
  negative: "border-rose-500/22 bg-rose-500/[0.07] text-rose-400/85",
  critical: "border-rose-400/45 bg-rose-500/20 text-rose-200 shadow-[inset_0_0_12px_rgba(244,63,94,0.15)]",
};

/** Birincil KPI — ~1.2× değer boyutu, hafif altın parlama (dashboard odak). */
const PRIMARY_HERO =
  "relative overflow-hidden ring-1 ring-[#c69575]/30 shadow-[0_0_52px_-12px_rgba(198,149,117,0.28),inset_0_0_72px_rgba(198,149,117,0.07),inset_0_1px_0_rgba(255,255,255,0.06)]";

/** Stratejik üst satır — birincil olmayan kartlarda daha büyük rakam + hafif altın çerçeve. */
const HERO_ROW_SHELL =
  "relative overflow-hidden rounded-2xl border-[#c69575]/18 bg-gradient-to-br from-[#c69575]/[0.07] via-[#08090d] to-[#0a0b0f] p-6 shadow-[inset_0_0_56px_rgba(198,149,117,0.05),inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-[#c69575]/20 hover:border-[#c69575]/30 hover:shadow-[inset_0_0_64px_rgba(198,149,117,0.07)]";

const HERO_ROW_GLOW = (
  <div
    className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_95%_60%_at_50%_-18%,rgba(198,149,117,0.11),transparent_55%)]"
    aria-hidden
  />
);

export type AdminKpiCardProps = {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: LucideIcon;
  tone?: AdminKpiTone;
  /** Birincil metrik — daha büyük rakam + altın vurgu; diğer KPI’lar ikincil kalır. */
  primary?: boolean;
  /** Stratejik satır — `primary` değilse kullanın; rakam boyutu birincile yakın, kart biraz daha belirgin. */
  heroRow?: boolean;
  /** Tüm kartı tıklanabilir bağlantı yapar (dashboard kısayolları). */
  href?: string;
  className?: string;
  children?: ReactNode;
};

export function AdminKpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "neutral",
  primary = false,
  heroRow = false,
  href,
  className,
  children,
}: AdminKpiCardProps) {
  const useHeroSizing = primary || heroRow;
  const shell = primary
    ? `${SHELL[tone]} ${PRIMARY_HERO}`
    : heroRow
      ? HERO_ROW_SHELL
      : SHELL[tone];
  const labelClass =
    primary || heroRow
      ? "text-zinc-400/90"
      : tone === "critical"
        ? "font-semibold text-rose-400/90"
        : tone === "info"
          ? "text-sky-500/75"
          : "text-zinc-500/65";
  const valueClass = useHeroSizing
    ? `text-[2.1rem] sm:text-[2.35rem] sm:leading-[1.1] ${VALUE[tone]}`
    : `text-3xl sm:text-[2rem] sm:leading-[1.15] ${VALUE[tone]}`;

  const paddingClass = primary || heroRow ? "p-6" : "p-5";
  const roundedClass = heroRow && !primary ? "rounded-2xl" : "rounded-xl";

  const outerClass = `relative group border transition-all duration-200 ease-out hover:-translate-y-0.5 ${roundedClass} ${paddingClass} ${shell} ${className ?? ""}`;

  const inner = (
    <>
      {primary ? (
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_-15%,rgba(198,149,117,0.14),transparent_58%)]"
          aria-hidden
        />
      ) : heroRow ? (
        HERO_ROW_GLOW
      ) : tone === "critical" ? (
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_50%_at_50%_-20%,rgba(244,63,94,0.16),transparent_55%)]"
          aria-hidden
        />
      ) : tone === "info" ? (
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_-15%,rgba(14,165,233,0.08),transparent_55%)]"
          aria-hidden
        />
      ) : null}
      <div className={`relative ${Icon ? "flex items-start justify-between gap-2" : ""}`}>
        <div className={`min-w-0 ${Icon ? "flex-1" : ""}`}>
          <p className={`text-[11px] font-semibold uppercase tracking-wider ${labelClass}`}>{label}</p>
          <p className={`mt-2 font-display font-semibold tracking-tight tabular-nums ${valueClass}`}>{value}</p>
          {sub && <p className="mt-1.5 text-[11px] text-zinc-600/75">{sub}</p>}
          {children}
        </div>
        {Icon && (
          <div
            className={`relative flex shrink-0 items-center justify-center rounded-lg border transition-colors group-hover:opacity-95 ${useHeroSizing ? "h-11 w-11" : "h-10 w-10"} ${ICON_WRAP[tone]}`}
          >
            <Icon className={useHeroSizing ? "h-5 w-5" : "h-[18px] w-[18px]"} strokeWidth={1.5} />
          </div>
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`${outerClass} block cursor-pointer outline-none ring-offset-2 ring-offset-[#08090c] transition-[transform,box-shadow] focus-visible:ring-2 focus-visible:ring-[#c69575]/55`}
      >
        {inner}
      </Link>
    );
  }

  return <div className={outerClass}>{inner}</div>;
}
