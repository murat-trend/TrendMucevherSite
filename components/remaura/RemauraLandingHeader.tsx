"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/analytics/track";

type RemauraLandingHeaderProps = {
  title: string;
  description: string;
};

export function RemauraLandingHeader({ title, description }: RemauraLandingHeaderProps) {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-4 pt-8 text-center sm:px-6">
      <h1 className="text-balance text-2xl font-semibold text-foreground sm:text-3xl">{title}</h1>
      <p className="mx-auto mt-3 max-w-3xl text-pretty text-sm text-muted sm:text-base">{description}</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <a
          href="#remaura-workspace"
          onClick={() => trackEvent("cta_workspace_click", { source: "landing_header" })}
          className="inline-flex min-h-11 items-center rounded-lg border border-[#b76e79]/70 bg-[#b76e79]/15 px-4 py-2 text-sm font-semibold text-[#b76e79] transition-colors hover:bg-[#b76e79]/20"
        >
          Araci Hemen Kullan
        </a>
        <Link
          href="/iletisim"
          onClick={() => trackEvent("cta_contact_click", { source: "landing_header" })}
          className="inline-flex min-h-11 items-center rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-white/30"
        >
          Ozel Siparis Icin Iletisime Gec
        </Link>
      </div>
    </section>
  );
}

