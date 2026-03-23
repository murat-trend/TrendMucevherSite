import { buildDailyDashboardReportPayload } from "@/lib/reports/daily-report-data";
import { buildDailyDashboardPdfBuffer } from "@/lib/reports/buildDailyDashboardPdf";
import { deliverDailyReportPdf } from "@/lib/reports/deliverReport";
import { savePdfToReportsFolder } from "@/lib/reports/saveReportToDisk";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Her gece 00:00 (Vercel Cron: UTC — bkz. docs) tetiklenir.
 * Yetki: `Authorization: Bearer ${CRON_SECRET}` (Vercel otomatik ekler).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  if (secret) {
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return Response.json(
      { ok: false, error: "CRON_SECRET tanımlı değil — üretimde zorunludur." },
      { status: 500 },
    );
  }

  try {
    const payload = buildDailyDashboardReportPayload();
    const pdfBytes = await buildDailyDashboardPdfBuffer(payload);
    const fileName = `Dashboard-${payload.reportDateIso}.pdf`;
    const savedPath = savePdfToReportsFolder(pdfBytes, fileName);
    const delivery = await deliverDailyReportPdf(pdfBytes, fileName, { absolutePath: savedPath });

    return Response.json({
      ok: true,
      fileName,
      savedPath,
      ...delivery,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
