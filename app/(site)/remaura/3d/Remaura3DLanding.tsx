"use client";

import Link from "next/link";
import { useLanguage } from "@/components/i18n/LanguageProvider";

export function Remaura3DLanding() {
  const { t } = useLanguage();
  const m = t.remauraTools.mesh3dLanding;

  return (
    <main className="min-h-screen bg-background">
      <div className="border-b border-border/60 bg-card">
        <div className="mx-auto max-w-3xl px-4 py-10 text-center sm:px-6 sm:py-14">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{m.title}</h1>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-sm text-muted sm:text-base">{m.subtitle}</p>
          <Link
            href="/remaura?category=mesh3d"
            className="mt-8 inline-flex min-h-11 items-center justify-center rounded-lg border border-[#b76e79]/70 bg-[#b76e79]/15 px-6 py-2.5 text-sm font-semibold text-[#b76e79] transition-colors hover:bg-[#b76e79]/20"
          >
            {m.openWorkspace}
          </Link>
        </div>
      </div>
    </main>
  );
}
