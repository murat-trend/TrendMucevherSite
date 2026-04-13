"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { RemauraLandingHeader } from "@/components/remaura/RemauraLandingHeader";

type HeaderVariant = "main" | "photoEdit" | "backgroundRemoval";

export function RemauraLocalizedLandingHeader({ variant }: { variant: HeaderVariant }) {
  const { t } = useLanguage();
  const { landing } = t.remauraTools;

  const content = (() => {
    if (variant === "photoEdit") {
      const c = t.remauraTools.fotoEdit;
      return { title: c.title, description: c.subtitle };
    }
    if (variant === "backgroundRemoval") {
      const c = t.remauraTools.bgRemove;
      return { title: c.title, description: c.subtitle };
    }
    return { title: landing.mainTitle, description: landing.mainSubtitle };
  })();

  return <RemauraLandingHeader title={content.title} description={content.description} />;
}
