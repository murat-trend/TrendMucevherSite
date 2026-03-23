import { NextResponse } from "next/server";
import { createPaymentSession, getWallet, setCheckoutInfo } from "@/lib/billing/store";
import { createVirtualPosCheckout } from "@/lib/billing/provider";
import { getAdminSettings } from "@/lib/site/settings-store";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = (body?.userId as string | undefined)?.trim();
    if (!userId) {
      return NextResponse.json({ error: "userId gerekli." }, { status: 400 });
    }

    const wallet = await getWallet(userId);
    const settings = await getAdminSettings();
    if (wallet.balanceCredits > 0) {
      return NextResponse.json({
        alreadyHasCredit: true,
        wallet,
      });
    }

    const session = await createPaymentSession(
      userId,
      settings.contentPriceTry,
      settings.contentCreditCost
    );
    const checkout = await createVirtualPosCheckout(session);
    const updated = await setCheckoutInfo(session.id, checkout.checkoutUrl, checkout.providerRef);

    return NextResponse.json({
      session: updated ?? session,
      checkout,
      wallet,
    });
  } catch {
    return NextResponse.json({ error: "Checkout başlatılamadı." }, { status: 500 });
  }
}
