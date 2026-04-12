import { NextResponse } from "next/server";
import { debitCredits } from "@/lib/billing/store";
import {
  REMAURA_INSUFFICIENT_CREDITS_JSON,
  REMAURA_UNAUTHORIZED_JSON,
  requireRemauraUserAndCredits,
} from "@/lib/remaura/api-billing-guard";
import { resolveRemauraUserIdFromRequest } from "@/lib/remaura/foto-edit-request-user";

export async function POST(req: Request) {
  const userId = await resolveRemauraUserIdFromRequest(req);

  if (!userId) {
    return NextResponse.json(REMAURA_UNAUTHORIZED_JSON, { status: 401 });
  }

  const guard = await requireRemauraUserAndCredits(userId, { minCredits: 1 });
  if (!guard.ok) return guard.response;

  const debit = await debitCredits(userId, 1, "Foto edit indirme");
  if (!debit.ok) {
    return NextResponse.json(REMAURA_INSUFFICIENT_CREDITS_JSON, { status: 402 });
  }

  return NextResponse.json({
    ok: true,
    wallet: { balanceCredits: debit.wallet.balanceCredits },
  });
}
