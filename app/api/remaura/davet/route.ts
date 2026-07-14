import { NextRequest, NextResponse } from "next/server";
import { DAVET_KODLARI } from "@/lib/remaura/davet-kodlari";

// Usta davet kodu doğrulama — kod + kategori eşleşmeli ve süresi geçmemiş olmalı.
export async function GET(req: NextRequest) {
  const kod = req.nextUrl.searchParams.get("kod") ?? "";
  const kategori = req.nextUrl.searchParams.get("kategori") ?? "";
  const kayit = DAVET_KODLARI[kod];
  if (!kayit || kayit.kategori !== kategori) {
    return NextResponse.json({ ok: false });
  }
  if (new Date(kayit.sonTarih + "T23:59:59") < new Date()) {
    return NextResponse.json({ ok: false });
  }
  return NextResponse.json({ ok: true, ad: kayit.ad });
}
