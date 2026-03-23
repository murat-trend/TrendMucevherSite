import type { PaymentSession } from "./types";
import { createHalkbankCheckout } from "./providers/halkbank";

export type CheckoutInitResult = {
  checkoutUrl: string;
  providerRef: string;
};

export async function createVirtualPosCheckout(session: PaymentSession): Promise<CheckoutInitResult> {
  const provider = (process.env.VPOS_PROVIDER || "mock").toLowerCase();
  if (provider === "halkbank") {
    return createHalkbankCheckout(session);
  }
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const providerRef = `hbk-${session.id.slice(0, 8)}`;
  const checkoutUrl = `${baseUrl}/fiyatlandirma?billingSession=${session.id}&amountTry=${session.amountTry}`;
  return { checkoutUrl, providerRef };
}
