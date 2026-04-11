import { NextResponse } from "next/server";
import { getWallet } from "@/lib/billing/store";

export const REMAURA_UNAUTHORIZED_JSON = {
  error: "Giriş yapmanız gerekiyor",
  code: "UNAUTHORIZED",
} as const;

export const REMAURA_INSUFFICIENT_CREDITS_JSON = {
  error: "Yetersiz kredi",
  code: "INSUFFICIENT_CREDITS",
} as const;

export type RemauraBillingGuardResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

/**
 * Remaura ücretli API girişi: userId zorunlu, cüzdan bakiyesi minCredits’ten az ise 402.
 */
export async function requireRemauraUserAndCredits(
  userIdRaw: string | undefined | null,
  options?: { minCredits?: number }
): Promise<RemauraBillingGuardResult> {
  const userId = String(userIdRaw ?? "").trim();
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json(REMAURA_UNAUTHORIZED_JSON, { status: 401 }),
    };
  }

  const minCredits = options?.minCredits ?? 1;

  try {
    const wallet = await getWallet(userId);
    if (!wallet || wallet.balanceCredits < minCredits) {
      return {
        ok: false,
        response: NextResponse.json(REMAURA_INSUFFICIENT_CREDITS_JSON, { status: 402 }),
      };
    }
  } catch (e) {
    console.error("[remaura billing guard] getWallet failed:", e);
    return {
      ok: false,
      response: NextResponse.json(REMAURA_INSUFFICIENT_CREDITS_JSON, { status: 402 }),
    };
  }

  return { ok: true, userId };
}
