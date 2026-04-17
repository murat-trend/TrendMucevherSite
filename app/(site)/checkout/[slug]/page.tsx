"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { getThumbnailViewUrl } from "@/lib/modeller/model-store";
import { createClient } from "@/utils/supabase/client";
import { type DbProduct3D, mapDbProductToUi } from "@/lib/modeller/supabase";

function fallbackNameFromSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR") + part.slice(1))
    .join(" ");
}

export default function CheckoutSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { locale } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { slug } = use(params);
  const requested = searchParams.get("license");
  const selectedLicense = requested === "commercial" ? "commercial" : "personal";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [model, setModel] = useState<ReturnType<typeof mapDbProductToUi> | null>(null);
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // İndirim kodu state
  const [discountInput, setDiscountInput] = useState("");
  const [discountApplying, setDiscountApplying] = useState(false);
  const [discountPercent, setDiscountPercent] = useState<number | null>(null);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const loadModel = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("products_3d").select("*").eq("slug", slug).maybeSingle();
      if (error) {
        console.error("[checkout] supabase error", error);
        if (alive) setModel(null);
        return;
      }
      if (!alive) return;
      setModel(data ? mapDbProductToUi(data as DbProduct3D) : null);
    };
    void loadModel();
    return () => {
      alive = false;
    };
  }, [slug]);

  const copy = useMemo(() => {
    if (locale === "en") {
      return {
        title: "Checkout",
        orderSummary: "Order Summary",
        modelName: "Model",
        license: "License",
        personal: "Personal Use",
        commercial: "Commercial Use",
        fullName: "Full Name",
        email: "Email",
        continue: "Proceed to Payment",
        back: "Back to Model",
        price: "Price",
        total: "Total",
        discountCode: "Discount Code",
        apply: "Apply",
        discountApplied: "Discount applied",
        discountRemove: "Remove",
        currencyLocale: "en-US",
      };
    }
    if (locale === "de") {
      return {
        title: "Kasse",
        orderSummary: "Bestellübersicht",
        modelName: "Modell",
        license: "Lizenz",
        personal: "Private Nutzung",
        commercial: "Kommerzielle Nutzung",
        fullName: "Vor- und Nachname",
        email: "E-Mail",
        continue: "Zur Zahlung",
        back: "Zurück zum Modell",
        price: "Preis",
        total: "Gesamt",
        discountCode: "Rabattcode",
        apply: "Anwenden",
        discountApplied: "Rabatt angewendet",
        discountRemove: "Entfernen",
        currencyLocale: "de-DE",
      };
    }
    if (locale === "ru") {
      return {
        title: "Оформление",
        orderSummary: "Сводка заказа",
        modelName: "Модель",
        license: "Лицензия",
        personal: "Личное использование",
        commercial: "Коммерческое использование",
        fullName: "Имя и фамилия",
        email: "Email",
        continue: "Перейти к оплате",
        back: "Назад к модели",
        price: "Цена",
        total: "Итого",
        discountCode: "Промокод",
        apply: "Применить",
        discountApplied: "Скидка применена",
        discountRemove: "Убрать",
        currencyLocale: "ru-RU",
      };
    }
    return {
      title: "Ödeme",
      orderSummary: "Sipariş Özeti",
      modelName: "Model",
      license: "Lisans",
      personal: "Kişisel Kullanım",
      commercial: "Ticari Kullanım",
      fullName: "Ad Soyad",
      email: "Email",
      continue: "Ödemeye Geç",
      back: "Modele Dön",
      price: "Fiyat",
      total: "Toplam",
      discountCode: "İndirim Kodu",
      apply: "Uygula",
      discountApplied: "İndirim uygulandı",
      discountRemove: "Kaldır",
      currencyLocale: "tr-TR",
    };
  }, [locale]);

  const personalPrice =
    model?.licensePersonalPrice && model.licensePersonalPrice > 0
      ? model.licensePersonalPrice
      : model?.price ?? 0;
  const commercialPrice =
    model?.licenseCommercialPrice && model.licenseCommercialPrice > 0
      ? model.licenseCommercialPrice
      : Math.round((model?.price ?? 0) * 1.8);
  const basePrice = selectedLicense === "commercial" ? commercialPrice : personalPrice;
  const discountAmount = discountPercent != null ? Math.round(basePrice * discountPercent / 100) : 0;
  const finalPrice = basePrice - discountAmount;

  const thumbnailUrl =
    model?.thumbnailViews?.on ??
    model?.thumbnailUrl ??
    getThumbnailViewUrl(slug, "on");

  const handleApplyDiscount = async () => {
    const code = discountInput.trim();
    if (!code) return;
    setDiscountApplying(true);
    setDiscountError(null);
    try {
      const res = await fetch("/api/discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json()) as { ok?: boolean; percentOff?: number; error?: string };
      if (!res.ok || !data.ok) {
        setDiscountError(data.error ?? "Geçersiz kod");
      } else {
        setDiscountPercent(data.percentOff ?? 0);
        setAppliedCode(code.toUpperCase());
        setDiscountInput("");
      }
    } catch {
      setDiscountError("Bağlantı hatası");
    } finally {
      setDiscountApplying(false);
    }
  };

  const handleRemoveDiscount = () => {
    setDiscountPercent(null);
    setAppliedCode(null);
    setDiscountError(null);
    setDiscountInput("");
  };

  const handleOrder = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/giris?tip=uye&redirect=${encodeURIComponent(`/checkout/${slug}`)}`);
      return;
    }

    if (!fullName.trim() || !email.trim()) return;
    setOrdering(true);
    setOrderError(null);
    const dbRow = await supabase.from("products_3d").select("id, seller_id").eq("slug", slug).maybeSingle();
    const productId = dbRow.data?.id ?? null;
    const sellerId = dbRow.data?.seller_id ?? null;
    const { error } = await supabase.from("orders").insert({
      buyer_id: user.id,
      seller_id: sellerId,
      product_id: productId,
      product_name: model?.name ?? slug,
      customer_name: fullName.trim(),
      customer_email: email.trim(),
      license_type: selectedLicense,
      amount: finalPrice,
      discount_code: appliedCode ?? null,
      discount_amount: discountAmount,
      payment_status: "pending",
      ip_address: (await fetch("https://api.ipify.org?format=json").then((r) => r.json()).catch(() => ({ ip: null }))).ip,
      user_agent: navigator.userAgent,
    });
    if (error) {
      setOrderError("Sipariş oluşturulamadı. Lütfen tekrar deneyin.");
      setOrdering(false);
      return;
    }
    if (sellerId) {
      await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: sellerId,
        product_id: productId,
        message: `Yeni sipariş: ${model?.name ?? slug} — ${selectedLicense === "commercial" ? "Ticari" : "Kişisel"} lisans — ₺${finalPrice}${appliedCode ? ` (${appliedCode} kodu ile ₺${discountAmount} indirim)` : ""} — ${fullName} (${email})`,
      });
    }
    setOrderSuccess(true);
    setOrdering(false);
  };

  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e8e0d0", padding: "2rem 1.25rem" }}>
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>
        <header style={{ marginBottom: "1.5rem" }}>
          <Link href={`/modeller/${slug}`} style={{ color: "#8a8278", fontSize: "12px", textDecoration: "none" }}>
            ← {copy.back}
          </Link>
          <h1 style={{ fontFamily: "var(--font-serif)", fontWeight: 300, letterSpacing: "0.08em", marginTop: "10px" }}>
            {copy.title}
          </h1>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(280px, 1fr) minmax(320px, 1fr)",
            gap: "1rem",
          }}
        >
          {/* Sol: Sipariş özeti */}
          <section
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "6px",
              background: "#101010",
              padding: "16px",
            }}
          >
            <h2 style={{ marginBottom: "12px", fontSize: "13px", letterSpacing: "0.15em", color: "#c9a84c" }}>
              {copy.orderSummary}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: "12px", alignItems: "center" }}>
              <div style={{ aspectRatio: "1", background: "#161616", borderRadius: "4px", overflow: "hidden" }}>
                <img
                  src={thumbnailUrl}
                  alt={model?.name ?? slug}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
              <div>
                <p style={{ margin: 0, color: "#8a8278", fontSize: "11px" }}>{copy.modelName}</p>
                <p style={{ margin: "3px 0 8px", fontSize: "16px" }}>{model?.name ?? fallbackNameFromSlug(slug)}</p>
                <p style={{ margin: 0, color: "#8a8278", fontSize: "11px" }}>{copy.license}</p>
                <p style={{ margin: "3px 0 0" }}>{selectedLicense === "commercial" ? copy.commercial : copy.personal}</p>
              </div>
            </div>

            {/* Fiyat satırları */}
            <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: discountAmount > 0 ? "6px" : "0" }}>
                <span style={{ color: "#8a8278" }}>{copy.price}</span>
                <span style={{ color: discountAmount > 0 ? "#6b6460" : "#c9a84c", textDecoration: discountAmount > 0 ? "line-through" : "none" }}>
                  ₺{basePrice.toLocaleString(copy.currencyLocale)}
                </span>
              </div>
              {discountAmount > 0 && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ color: "#4ade80", fontSize: "12px" }}>
                      {appliedCode} (−%{discountPercent})
                    </span>
                    <span style={{ color: "#4ade80", fontSize: "12px" }}>
                      −₺{discountAmount.toLocaleString(copy.currencyLocale)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "6px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <strong style={{ fontSize: "13px" }}>{copy.total}</strong>
                    <strong style={{ color: "#c9a84c", fontSize: "18px" }}>
                      ₺{finalPrice.toLocaleString(copy.currencyLocale)}
                    </strong>
                  </div>
                </>
              )}
              {discountAmount === 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong style={{ fontSize: "13px" }}>{copy.total}</strong>
                  <strong style={{ color: "#c9a84c", fontSize: "18px" }}>
                    ₺{finalPrice.toLocaleString(copy.currencyLocale)}
                  </strong>
                </div>
              )}
            </div>
          </section>

          {/* Sağ: Form */}
          <section
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "6px",
              background: "#101010",
              padding: "16px",
            }}
          >
            <label style={{ display: "block", marginBottom: "10px" }}>
              <span style={{ display: "block", marginBottom: "6px", color: "#8a8278", fontSize: "12px" }}>{copy.fullName}</span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                type="text"
                style={{
                  width: "100%",
                  background: "#0a0a0a",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "4px",
                  color: "#f3efe9",
                  padding: "10px 12px",
                }}
              />
            </label>
            <label style={{ display: "block", marginBottom: "14px" }}>
              <span style={{ display: "block", marginBottom: "6px", color: "#8a8278", fontSize: "12px" }}>{copy.email}</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                style={{
                  width: "100%",
                  background: "#0a0a0a",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "4px",
                  color: "#f3efe9",
                  padding: "10px 12px",
                }}
              />
            </label>

            {/* İndirim kodu alanı */}
            <div style={{ marginBottom: "14px" }}>
              <span style={{ display: "block", marginBottom: "6px", color: "#8a8278", fontSize: "12px" }}>
                {copy.discountCode}
              </span>
              {appliedCode ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{
                    flex: 1,
                    background: "rgba(74,222,128,0.08)",
                    border: "1px solid rgba(74,222,128,0.3)",
                    borderRadius: "4px",
                    padding: "10px 12px",
                    fontSize: "12px",
                    color: "#4ade80",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}>
                    <span>✓</span>
                    <span>{copy.discountApplied} — {appliedCode}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveDiscount}
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "4px",
                      color: "#8a8278",
                      padding: "10px 12px",
                      fontSize: "11px",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {copy.discountRemove}
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    value={discountInput}
                    onChange={(e) => {
                      setDiscountInput(e.target.value);
                      setDiscountError(null);
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") void handleApplyDiscount(); }}
                    type="text"
                    placeholder="HOSGELDIN10"
                    style={{
                      flex: 1,
                      background: "#0a0a0a",
                      border: `1px solid ${discountError ? "rgba(248,113,113,0.5)" : "rgba(255,255,255,0.12)"}`,
                      borderRadius: "4px",
                      color: "#f3efe9",
                      padding: "10px 12px",
                      fontSize: "13px",
                      letterSpacing: "0.05em",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void handleApplyDiscount()}
                    disabled={!discountInput.trim() || discountApplying}
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(201,168,76,0.4)",
                      borderRadius: "4px",
                      color: "#c9a84c",
                      padding: "10px 14px",
                      fontSize: "11px",
                      letterSpacing: "0.1em",
                      cursor: !discountInput.trim() || discountApplying ? "not-allowed" : "pointer",
                      opacity: !discountInput.trim() || discountApplying ? 0.5 : 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {discountApplying ? "..." : copy.apply}
                  </button>
                </div>
              )}
              {discountError && (
                <p style={{ margin: "6px 0 0", color: "#f87171", fontSize: "11px" }}>{discountError}</p>
              )}
            </div>

            {orderSuccess ? (
              <div style={{ textAlign: "center", padding: "1rem" }}>
                <p style={{ color: "#4ade80", fontSize: "14px", marginBottom: "8px" }}>✓ Siparişiniz alındı!</p>
                <p style={{ color: "#8a8278", fontSize: "12px" }}>Ödeme onaylandıktan sonra dosyalarınız hazır olacak.</p>
                <Link href="/modeller" style={{ display: "inline-block", marginTop: "12px", color: "#c9a84c", fontSize: "12px" }}>
                  Modellere Dön →
                </Link>
              </div>
            ) : (
              <>
                {orderError && <p style={{ color: "#f87171", fontSize: "12px", marginBottom: "8px" }}>{orderError}</p>}
                <button
                  type="button"
                  disabled={!fullName.trim() || !email.trim() || ordering}
                  onClick={() => void handleOrder()}
                  style={{
                    width: "100%",
                    padding: "14px",
                    border: "1px solid #c9a84c",
                    color: "#c9a84c",
                    background: "transparent",
                    borderRadius: "4px",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    fontSize: "11px",
                    opacity: !fullName.trim() || !email.trim() || ordering ? 0.6 : 1,
                    cursor: !fullName.trim() || !email.trim() || ordering ? "not-allowed" : "pointer",
                  }}
                >
                  {ordering ? "İşleniyor..." : copy.continue}
                </button>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
