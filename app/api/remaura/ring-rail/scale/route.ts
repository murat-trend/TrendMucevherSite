import { NextResponse } from "next/server";
import { runRingScale } from "@/lib/remaura/ring-rail-runner";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const targetRaw = formData.get("targetInnerMm");
    const slicesRaw = formData.get("slices");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "STL dosyası gerekli." }, { status: 400 });
    }

    const name = (file as File).name?.toLowerCase() ?? "";
    if (!name.endsWith(".stl")) {
      return NextResponse.json({ error: "Sadece STL kabul edilir." }, { status: 400 });
    }

    const targetInnerMm =
      typeof targetRaw === "string" ? parseFloat(targetRaw) : Number(targetRaw);
    if (!Number.isFinite(targetInnerMm) || targetInnerMm <= 0 || targetInnerMm > 50) {
      return NextResponse.json(
        { error: "Geçerli hedef iç çap (mm) gerekli (0–50)." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    const slices =
      typeof slicesRaw === "string" && slicesRaw
        ? Math.min(15, Math.max(3, parseInt(slicesRaw, 10) || 7))
        : 7;

    const { stlBuffer, report, log } = await runRingScale(
      inputBuffer,
      targetInnerMm,
      slices
    );

    if (report.error || report.scaled === false) {
      return NextResponse.json(
        {
          error: report.error ?? "Boyutlandırma yapılamadı.",
          report,
          log: log.slice(-2000),
        },
        { status: 422 }
      );
    }

    const reportJson = JSON.stringify(report);

    return new NextResponse(new Uint8Array(stlBuffer), {
      status: 200,
      headers: {
        "Content-Type": "model/stl",
        "Content-Disposition": 'attachment; filename="remaura-ring-rail-scaled.stl"',
        "X-Ring-Report": Buffer.from(reportJson, "utf-8").toString("base64"),
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { error: err?.message ?? "Boyutlandırma başarısız." },
      { status: 500 }
    );
  }
}
