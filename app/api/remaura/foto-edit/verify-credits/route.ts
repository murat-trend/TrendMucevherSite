import { NextResponse } from "next/server";
import {
  REMAURA_UNAUTHORIZED_JSON,
  requireRemauraUserAndCredits,
} from "@/lib/remaura/api-billing-guard";
import { resolveRemauraUserIdFromRequest } from "@/lib/remaura/foto-edit-request-user";

/** Görsel yükleme / düzenleme öncesi: en az 1 kredi (sunucu cüzdanı, manipülasyona kapalı). */
export async function POST(req: Request) {
  const userId = await resolveRemauraUserIdFromRequest(req);

  if (!userId) {
    return NextResponse.json(REMAURA_UNAUTHORIZED_JSON, { status: 401 });
  }

  const guard = await requireRemauraUserAndCredits(userId, { minCredits: 1 });
  if (!guard.ok) return guard.response;

  return NextResponse.json({ ok: true as const });
}
