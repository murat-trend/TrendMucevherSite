import { AlertTriangle, Shield } from "lucide-react";

export type AdminEmptyVariant = "shield" | "warning";

export type AdminEmptySize = "comfortable" | "compact";

export type AdminEmptyStateProps = {
  /** Ana mesaj */
  message: string;
  /** İkincil açıklama (küçük) */
  hint?: string;
  /** Üçüncül mikro metin (en küçük) */
  detail?: string;
  /** `shield` = bilgi / güvenli boşluk, `warning` = dikkat / filtre / arama */
  variant?: AdminEmptyVariant;
  /** Kart içi padding ve ikon ölçüsü */
  size?: AdminEmptySize;
  className?: string;
};

const SHELL =
  "relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/[0.14] bg-gradient-to-b from-white/[0.05] via-[#0a0b0f] to-[#060708] text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_0_40px_rgba(198,149,117,0.05)]";

const BASE_GLOW =
  "pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_72%_48%_at_50%_-8%,rgba(198,149,117,0.1),transparent_58%),radial-gradient(ellipse_55%_42%_at_50%_108%,rgba(255,255,255,0.04),transparent_52%)] opacity-90";

const SIZE: Record<AdminEmptySize, { pad: string; iconBox: string; icon: string }> = {
  comfortable: {
    pad: "px-5 py-9 sm:px-8 sm:py-10",
    iconBox: "h-16 w-16 rounded-2xl",
    icon: "h-8 w-8",
  },
  compact: {
    pad: "px-4 py-7 sm:px-6 sm:py-8",
    iconBox: "h-14 w-14 rounded-xl",
    icon: "h-7 w-7",
  },
};

/**
 * Admin panellerinde boş veri / “temiz” durum kartları — kasıtlı, premium görünüm.
 */
export function AdminEmptyState({
  message,
  hint,
  detail,
  variant = "shield",
  size = "comfortable",
  className = "",
}: AdminEmptyStateProps) {
  const Icon = variant === "warning" ? AlertTriangle : Shield;
  const s = SIZE[size];

  return (
    <div className={`${SHELL} ${s.pad} ${className}`} role="status" aria-live="polite">
      {/* Statik taban + hafif animasyonlu parıltı katmanları */}
      <div className={BASE_GLOW} aria-hidden />
      <div
        className="admin-empty-bloom pointer-events-none absolute left-1/2 top-[18%] h-[55%] w-[85%] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(198,149,117,0.18),transparent_68%)] blur-2xl"
        aria-hidden
      />
      <div className="admin-empty-sheen pointer-events-none absolute inset-0 rounded-2xl mix-blend-screen" aria-hidden />

      <div className="relative flex max-w-lg flex-col items-center gap-3">
        <div
          className={`flex shrink-0 items-center justify-center border border-white/[0.14] bg-white/[0.07] text-[#d4b896] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ${s.iconBox}`}
        >
          <Icon className={s.icon} strokeWidth={1.2} aria-hidden />
        </div>
        <div className="space-y-1.5">
          <p className="text-[0.9375rem] font-medium leading-snug tracking-tight text-zinc-200 sm:text-base">{message}</p>
          {hint ? (
            <p className="text-xs leading-relaxed text-zinc-500 sm:text-[13px]">{hint}</p>
          ) : null}
          {detail ? (
            <p className="text-[11px] leading-relaxed text-zinc-600/95">{detail}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
