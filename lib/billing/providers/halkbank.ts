import type { PaymentSession } from "../types";

export type HalkbankCheckoutResult = {
  checkoutUrl: string;
  providerRef: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) {
    throw new Error(`${name} eksik. Halkbank sanal POS için ortam değişkenini tanımlayın.`);
  }
  return value.trim();
}

/**
 * Halkbank özel entegrasyonunda gerçek request imza/hash alanları bankanın teknik
 * dökümüne göre doldurulmalıdır. Bu fonksiyon geçiş için hazır checkout URL şablonu üretir.
 */
export function createHalkbankCheckout(session: PaymentSession): HalkbankCheckoutResult {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const checkoutBase = requireEnv("HALKBANK_CHECKOUT_BASE_URL");
  const merchantId = requireEnv("HALKBANK_MERCHANT_ID");
  const currency = (process.env.HALKBANK_CURRENCY || "TRY").toUpperCase();

  const providerRef = `halkbank-${session.id.slice(0, 8)}`;
  const successUrl = `${baseUrl}/api/billing/callback/halkbank/success?sessionId=${encodeURIComponent(session.id)}`;
  const failUrl = `${baseUrl}/api/billing/callback/halkbank/fail?sessionId=${encodeURIComponent(session.id)}`;

  const params = new URLSearchParams({
    merchantId,
    orderId: session.id,
    amount: String(session.amountTry),
    currency,
    successUrl,
    failUrl,
  });

  return {
    checkoutUrl: `${checkoutBase}?${params.toString()}`,
    providerRef,
  };
}
