import { NextRequest, NextResponse } from "next/server";
import { translateTurkishLineWithAnthropic } from "@/lib/modeller/anthropic-line-translate";

const LOG_PREFIX = "[translate]";

export async function POST(req: NextRequest) {
  try {
    const { text, sourceLang = "tr" } = (await req.json()) as {
      text?: string;
      sourceLang?: string;
    };
    if (!text?.trim()) {
      return NextResponse.json({ error: "Metin gerekli" }, { status: 400 });
    }
    void sourceLang;

    const translations = await translateTurkishLineWithAnthropic(text);

    return NextResponse.json({ ok: true, translations });
  } catch (err) {
    console.error(LOG_PREFIX, err);
    console.error(
      "[translate] detay:",
      JSON.stringify(err, Object.getOwnPropertyNames(err as object)),
    );
    if (err instanceof SyntaxError || (err instanceof Error && err.message === "Invalid translations shape")) {
      return NextResponse.json({ error: "Çeviri yanıtı işlenemedi" }, { status: 502 });
    }
    return NextResponse.json({ error: "Çeviri başarısız" }, { status: 500 });
  }
}
