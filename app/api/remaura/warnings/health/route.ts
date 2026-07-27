import { NextResponse } from "next/server";
import { isSuperAdminRequest } from "@/lib/remaura/warnings/auth";
import { runHealthChecks } from "@/lib/remaura/warnings/health";
import { PROVIDERS } from "@/lib/remaura/warnings/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Aktif yoklama: her sağlayıcıyı anlık kontrol et, şerit için özet döndür. */
export async function GET() {
  if (!(await isSuperAdminRequest())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const results = await runHealthChecks();

  const enriched = results.map((r) => ({
    ...r,
    label: PROVIDERS[r.provider].label,
    billingUrl: PROVIDERS[r.provider].billingUrl,
    usedBy: PROVIDERS[r.provider].usedBy,
  }));

  return NextResponse.json({ health: enriched });
}
