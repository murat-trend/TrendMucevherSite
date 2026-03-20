"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";

export function SeoPanel() {
  const { t } = useLanguage();
  return (
    <div className="space-y-2 text-sm text-muted">
      <p className="font-medium text-foreground">SEO</p>
      <p className="text-xs leading-relaxed">
        Bu panel düzenlenebilir çalışma alanına eklendi. Başlık, meta açıklama ve yapılandırılmış veri
        önerileri yakında burada görünecek. Şimdilik üretilen içerikleri &quot;{t.remauraWorkspace.distributionChannels}&quot; bölümünden
        kopyalayabilirsiniz.
      </p>
    </div>
  );
}
