import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Bu özellik geçici olarak devre dışı." },
    { status: 503 },
  );
}
