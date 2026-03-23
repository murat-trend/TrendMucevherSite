import { NextResponse } from "next/server";
import { getWallet } from "@/lib/billing/store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId")?.trim();
  if (!userId) {
    return NextResponse.json({ error: "userId gerekli." }, { status: 400 });
  }
  const wallet = await getWallet(userId);
  return NextResponse.json({ wallet });
}
