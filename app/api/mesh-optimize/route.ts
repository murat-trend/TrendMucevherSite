import { NextResponse } from "next/server";
import { requireRemauraUserAndCredits } from "@/lib/remaura/api-billing-guard";

export async function POST(req: Request) {
  const formData = await req.formData();
  const billing = await requireRemauraUserAndCredits(String(formData.get("userId") ?? ""));
  if (!billing.ok) return billing.response;

  return NextResponse.json(
    { error: "Bu özellik geçici olarak devre dışı." },
    { status: 503 },
  );
}
