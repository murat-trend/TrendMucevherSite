import { NextResponse } from "next/server";

function redirectFail(reason?: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const returnUrl = new URL("/remaura?category=jewelry", baseUrl);
  returnUrl.searchParams.set("billing", "fail");
  if (reason) returnUrl.searchParams.set("billingMessage", reason);
  return NextResponse.redirect(returnUrl.toString(), 302);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  return redirectFail(url.searchParams.get("reason") ?? undefined);
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const reason = String(formData.get("reason") || formData.get("errorMessage") || "").trim();
    return redirectFail(reason || undefined);
  } catch {
    return redirectFail();
  }
}
