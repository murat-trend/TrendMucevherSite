import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { creditCredits, getPaymentSession, markPaymentSessionPaid } from "@/lib/billing/store";

function verifySignature(payload: string, signature: string | null): boolean {
  const secret = process.env.VPOS_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!signature) return false;
  const digest = createHmac("sha256", secret).update(payload).digest("hex");
  const a = Buffer.from(digest);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-vpos-signature");
  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Geçersiz imza." }, { status: 401 });
  }

  try {
    const body = JSON.parse(rawBody) as {
      sessionId?: string;
      status?: "paid" | "failed";
      providerRef?: string;
    };

    const sessionId = body.sessionId?.trim();
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId gerekli." }, { status: 400 });
    }

    const session = await getPaymentSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session bulunamadı." }, { status: 404 });
    }
    if (session.status === "paid") {
      return NextResponse.json({ ok: true, alreadyPaid: true });
    }

    if (body.status !== "paid") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const paid = await markPaymentSessionPaid(sessionId, body.providerRef);
    if (!paid) {
      return NextResponse.json({ error: "Session güncellenemedi." }, { status: 500 });
    }

    await creditCredits(paid.userId, paid.credits, "virtual_pos_topup", paid.id);
    return NextResponse.json({ ok: true, session: paid });
  } catch {
    return NextResponse.json({ error: "Webhook işlenemedi." }, { status: 500 });
  }
}
