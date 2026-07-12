import { notFound } from "next/navigation";
import { isRaiLocale, isRtl, RAI_LOCALES } from "../i18n";
import { RaiI18nProvider } from "../i18n/RaiI18nProvider";

export function generateStaticParams() {
  return RAI_LOCALES.map((locale) => ({ locale }));
}

export const dynamicParams = false;

export default async function RaiLocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isRaiLocale(locale)) notFound();

  return (
    <div dir={isRtl(locale) ? "rtl" : "ltr"}>
      <RaiI18nProvider locale={locale}>{children}</RaiI18nProvider>
    </div>
  );
}
