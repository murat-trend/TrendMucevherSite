import type { Metadata } from "next";
import { getRaiDict, isRaiLocale, RAI_DEFAULT_LOCALE, type RaiLocale } from "../../i18n";
import { StudioClient } from "./StudioClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dict = getRaiDict(isRaiLocale(locale) ? (locale as RaiLocale) : RAI_DEFAULT_LOCALE);
  return { title: dict.meta.studioTitle };
}

export default function RaiStudioPage() {
  return <StudioClient />;
}
