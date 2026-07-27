/**
 * Remaura Uyarı Sistemi — tipler
 *
 * Süper-admin izleme: bir buton (araç) patladığında hangi sağlayıcıdan, ne
 * yüzden patladığını yakalar. GERÇEK sağlayıcı adları (ticari sır) burada
 * serbestçe kullanılır çünkü bu veri YALNIZCA süper-admin'e döner — asla
 * normal kullanıcıya gitmez.
 */

/** İzlenen dış servis sağlayıcıları (iç kimlik — UI'da nötr etiketlenir). */
export type ProviderId =
  | "fal"
  | "stability"
  | "gemini"
  | "openai"
  | "anthropic"
  | "tripo"
  | "meshy";

/** Bir uyarının türü — ödeme mi, anahtar mı, kota mı? */
export type WarningKind =
  | "payment" // kredi/bakiye bitti (402, insufficient credits, billing)
  | "auth" // API anahtarı geçersiz/eksik (401, invalid key)
  | "config" // env/anahtar hiç yapılandırılmamış
  | "rate_limit" // kota/oran limiti (429)
  | "timeout" // istek zaman aşımı
  | "server" // sağlayıcı tarafı 5xx
  | "unknown"; // sınıflanamayan hata

/** Sağlık kontrolü sonucu — bir sağlayıcı için anlık durum. */
export type HealthState = "ok" | "warn" | "down" | "unknown";

/** Kayıtlı bir uyarı (DB satırı ile eşleşir). */
export type Warning = {
  id: string;
  created_at: string;
  /** Araç slug'ı, ör. "koleksiyon-edit" */
  tool: string;
  /** Kullanıcının gördüğü buton adı, ör. "Koleksiyon Üret" */
  action: string | null;
  provider: ProviderId;
  kind: WarningKind;
  /** HTTP durum kodu (varsa) */
  status: number | null;
  /** Ham sebep — yalnız süper-admin görür */
  reason: string | null;
  /** "live" = gerçek patlama anı, "health" = aktif yoklama */
  source: "live" | "health";
  resolved: boolean;
};

/** Aktif yoklama çıktısı — sağlayıcı başına. */
export type HealthResult = {
  provider: ProviderId;
  state: HealthState;
  kind: WarningKind | null;
  /** İnsan-okur kısa özet, ör. "Bakiye: 12 kredi" veya "Anahtar geçersiz (401)" */
  detail: string;
  /** Okunabildiyse kalan kredi/bakiye */
  balance?: number | null;
};
