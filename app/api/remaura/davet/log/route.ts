import { NextRequest, NextResponse } from "next/server";
import { DAVET_KODLARI } from "@/lib/remaura/davet-kodlari";
import { appendRemauraJob, listRemauraJobs, type RemauraJobType } from "@/lib/remaura/jobs-store";
import { requireSuperAdmin } from "@/lib/remaura/uretim-3d/auth";

// USTA KULLANIM GÜNLÜĞÜ — davetli kullanıcıların araç içi olayları.
// Amaç (Murat, 2026-07-14): gerçek kullanım verisiyle hata bulmak / geliştirmek.
// Depo: remaura_jobs tablosu, type="usta_log" (yeni tablo/migration gerekmez).

export async function POST(req: NextRequest) {
  try {
    const { kod, olay, detay } = await req.json();
    const kayit = DAVET_KODLARI[String(kod ?? "")];
    if (!kayit || typeof olay !== "string" || olay.length > 60) {
      return NextResponse.json({ ok: false });
    }
    await appendRemauraJob({
      type: "usta_log" as RemauraJobType,
      status: "ok",
      platform: kayit.ad,
      message: JSON.stringify({ kod, kategori: kayit.kategori, olay, detay: detay ?? null }).slice(0, 2000),
      durationMs: 0,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}

// Günlükleri okuma — sadece süper-admin.
export async function GET() {
  const yetki = await requireSuperAdmin();
  if (!yetki.ok) return yetki.response;
  const hepsi = await listRemauraJobs(500);
  const loglar = hepsi
    .filter((j) => (j.type as string) === "usta_log")
    .map((j) => {
      let icerik: unknown = null;
      try { icerik = JSON.parse(j.message ?? "null"); } catch { icerik = j.message; }
      return { zaman: j.createdAt, usta: j.platform, ...(<object>icerik ?? {}) };
    });
  return NextResponse.json({ ok: true, adet: loglar.length, loglar });
}
