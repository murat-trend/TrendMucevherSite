import { NextResponse } from "next/server";
import { creditCredits, getPaymentSession, markPaymentSessionPaid } from "@/lib/billing/store";

function redirectWithStatus(req: Request, status: "success" | "error", message?: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const returnUrl = new URL("/remaura?category=jewelry", baseUrl);
  returnUrl.searchParams.set("billing", status);
  if (message) returnUrl.searchParams.set("billingMessage", message);
  return NextResponse.redirect(returnUrl.toString(), 302);
}

async function handleSuccess(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId")?.trim() || "";
  const providerRef = url.searchParams.get("providerRef")?.trim() || undefined;
  if (!sessionId) {
    return redirectWithStatus(req, "error", "session_missing");
  }

  const session = await getPaymentSession(sessionId);
  if (!session) {
    return redirectWithStatus(req, "error", "session_not_found");
  }

  if (session.status !== "paid") {
    const paid = await markPaymentSessionPaid(sessionId, providerRef);
    if (paid) {
      await creditCredits(paid.userId, paid.credits, "halkbank_topup", paid.id);
    }
  }

  return redirectWithStatus(req, "success");
}

export async function GET(req: Request) {
  return handleSuccess(req);
}

export async function POST(req: Request) {
  // Halkbank bazı entegrasyonlarda POST callback gönderebilir.
  // sessionId query'de veya form body'de olabilir.
  try {
    const formData = await req.formData();
    const incomingSession = String(formData.get("sessionId") || formData.get("orderId") || "").trim();
    if (incomingSession) {
      const url = new URL(req.url);
      url.searchParams.set("sessionId", incomingSession);
      const patchedReq = new Request(url.toString(), { method: "GET" });
      return handleSuccess(patchedReq);
    }
  } catch {
    // fall through to normal GET-like handler
  }
  return handleSuccess(req);
}
