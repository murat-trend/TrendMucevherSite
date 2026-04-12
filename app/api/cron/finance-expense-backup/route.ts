import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { normalizeExpenseRow } from "@/lib/finance/expense-row";
import { fetchFinanceExpenseRows } from "@/lib/finance/expense-data-path";
import { generateExpenseBackupPdf } from "@/lib/finance/generate-expense-backup-pdf";
import { getReportsStorageBucketName } from "@/lib/reports/saveReportToDisk";

export const runtime = "nodejs";

const MANIFEST_KEY = "finance-backups/manifest.jsonl";

function verifyCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV === "development";
  }
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const q = req.nextUrl.searchParams.get("secret");
  if (q === secret) return true;
  return false;
}

function backupFileName(d: Date): string {
  const iso = d.toISOString().replace(/[:.]/g, "-");
  return `gider-yedek-${iso}.pdf`;
}

function requireStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error("Gider yedeği için NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.");
  }
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = (await fetchFinanceExpenseRows()).map(normalizeExpenseRow);
    const now = new Date();
    const pdfBytes = await generateExpenseBackupPdf(rows, now);

    const supabase = requireStorageClient();
    const bucket = getReportsStorageBucketName();
    const name = backupFileName(now);
    const objectPath = `finance-backups/${name}`;

    const { error: upErr } = await supabase.storage.from(bucket).upload(objectPath, Buffer.from(pdfBytes), {
      contentType: "application/pdf",
      upsert: true,
    });
    if (upErr) throw upErr;

    let manifestPrev = "";
    const { data: manifestBlob, error: dlErr } = await supabase.storage.from(bucket).download(MANIFEST_KEY);
    if (!dlErr && manifestBlob) {
      manifestPrev = await manifestBlob.text();
    }

    const line =
      JSON.stringify({
        file: name,
        createdAt: now.toISOString(),
        rowCount: rows.length,
      }) + "\n";
    const { error: manErr } = await supabase.storage.from(bucket).upload(MANIFEST_KEY, manifestPrev + line, {
      contentType: "application/x-ndjson; charset=utf-8",
      upsert: true,
    });
    if (manErr) throw manErr;

    return NextResponse.json({
      ok: true,
      file: name,
      storagePath: `${bucket}/${objectPath}`,
      rows: rows.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
