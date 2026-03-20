"use client";

import Link from "next/link";

type RemauraAICtaButtonProps = {
  href?: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "hero";
  className?: string;
};

/** Minimal sparkles icon — elegant, not cartoon-like */
function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .963L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0L9.937 15.5Z" />
    </svg>
  );
}

/**
 * Premium CTA button for Remaura AI.
 * Luxury, minimal, elegant — encourages exploration without aggressive advertising.
 */
export function RemauraAICtaButton({
  href = "/remaura",
  children,
  variant = "primary",
  className = "",
}: RemauraAICtaButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full border font-medium tracking-[0.02em] transition-all duration-300 ease-out";

  const primary =
    "border-accent/50 bg-accent/5 px-6 py-3 text-sm text-accent hover:-translate-y-0.5 hover:border-accent/80 hover:bg-accent/15 hover:shadow-[0_0_24px_rgba(139,105,20,0.12)] dark:hover:shadow-[0_0_24px_rgba(202,138,4,0.1)]";

  const secondary =
    "min-h-[48px] border-accent/40 bg-accent/[0.04] px-8 py-4 text-base text-accent hover:-translate-y-0.5 hover:border-accent/70 hover:bg-accent/10 hover:shadow-[0_0_28px_rgba(139,105,20,0.1)] dark:hover:shadow-[0_0_28px_rgba(202,138,4,0.08)]";

  const hero =
    "relative h-[44px] border border-[#a65f69]/80 bg-[linear-gradient(135deg,#c4838b,#b76e79,#a65f69)] px-[22px] text-base text-white shadow-[0_0_24px_rgba(183,110,121,0.16)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,#b76e79,#a65f69,#9a5560)] hover:shadow-[0_0_28px_rgba(183,110,121,0.22)]";

  const styles =
    variant === "hero"
      ? hero
      : variant === "primary"
        ? primary
        : secondary;

  const showIcon = variant === "hero" && !String(children).includes("✦");

  return (
    <span className="relative inline-block">
      {/* Soft rose gold radial aura behind button */}
      {variant === "hero" && (
        <span
          className="pointer-events-none absolute inset-0 -m-8 rounded-full bg-[radial-gradient(circle,rgba(183,110,121,0.22)_0%,transparent_70%)]"
          aria-hidden
        />
      )}
      <Link
        href={href}
        className={`relative ${base} ${styles} ${className}`.trim()}
      >
        {showIcon && (
          <SparklesIcon className="h-3.5 w-3.5 shrink-0 opacity-90" />
        )}
        {children}
      </Link>
    </span>
  );
}
