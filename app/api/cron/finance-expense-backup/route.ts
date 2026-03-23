import { appendFile, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { normalizeExpenseRow } from "@/lib/finance/expense-row";
import { getExpensesJsonPath, getFinanceBackupsDir } from "@/lib/finance/expense-data-path";
import { generateExpenseBackupPdf } from "@/lib/finance/generate-expense-backup-pdf";

export const runtime = "nodejs";

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

export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let rowsRaw: unknown[] = [];
    try {
      const raw = await readFile(getExpensesJsonPath(), "utf-8");
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) rowsRaw = parsed;
    } catch {
      /* dosya yok = boş rapor */
    }

    const rows = rowsRaw.map(normalizeExpenseRow);
    const now = new Date();
    const pdfBytes = await generateExpenseBackupPdf(rows, now);

    const dir = getFinanceBackupsDir();
    await mkdir(dir, { recursive: true });
    const name = backupFileName(now);
    const fullPath = path.join(dir, name);
    await writeFile(fullPath, pdfBytes);

    const manifest = path.join(dir, "manifest.jsonl");
    const line =
      JSON.stringify({
        file: name,
        createdAt: now.toISOString(),
        rowCount: rows.length,
      }) + "\n";
    await appendFile(manifest, line, "utf-8");

    return NextResponse.json({
      ok: true,
      file: name,
      path: `data/finance/backups/${name}`,
      rows: rows.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
