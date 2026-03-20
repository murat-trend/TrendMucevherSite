"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { ImageMapsUploadBlock } from "@/components/remaura/ImageMapsUploadBlock";

export function UploadMapPanel() {
  const { t } = useLanguage();
  return <ImageMapsUploadBlock embedded t={t.remauraWorkspace} />;
}
