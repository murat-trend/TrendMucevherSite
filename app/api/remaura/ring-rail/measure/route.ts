import { NextResponse } from "next/server";
import { runRingMeasure } from "@/lib/remaura/ring-rail-runner";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const slicesRaw = formData.get("slices");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "STL dosyası gerekli." }, { status: 400 });
    }

    const name = (file as File).name?.toLowerCase() ?? "";
    if (!name.endsWith(".stl")) {
      return NextResponse.json({ error: "Sadece STL kabul edilir." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    const slices =
      typeof slicesRaw === "string" && slicesRaw
        ? Math.min(15, Math.max(3, parseInt(slicesRaw, 10) || 7))
        : 7;

    const { report, log } = await runRingMeasure(inputBuffer, slices);

    if (report.error) {
      return NextResponse.json(
        { error: report.error, log: log.slice(-2000) },
        { status: 422 }
      );
    }

    return NextResponse.json({ ...report, log: log.slice(-2000) });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { error: err?.message ?? "Ölçüm başarısız." },
      { status: 500 }
    );
  }
}
