import { NextResponse } from "next/server";
import { requireRemauraUserAndCredits } from "@/lib/remaura/api-billing-guard";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { userId?: string };
  const billing = await requireRemauraUserAndCredits(body.userId);
  if (!billing.ok) return billing.response;

  return NextResponse.json(
    { error: "Bu özellik geçici olarak devre dışı." },
    { status: 503 },
  );
}
