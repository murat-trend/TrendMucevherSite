import { NextResponse } from "next/server";
import { getTripoApiKey } from "@/lib/api/tripo";
import { requireSuperAdmin } from "@/lib/remaura/uretim-3d/auth";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const key = getTripoApiKey();
  if (!key) {
    return NextResponse.json({ found: false, env_tripo3d: !!process.env.TRIPO3D_API_KEY, env_tripo: !!process.env.TRIPO_API_KEY });
  }
  return NextResponse.json({
    found: true,
    length: key.length,
    prefix: key.slice(0, 8),
    suffix: key.slice(-4),
  });
}
