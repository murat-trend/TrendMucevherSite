import { createClient } from "@supabase/supabase-js";

export function getReportsStorageBucketName(): string {
  return process.env.SUPABASE_REPORTS_BUCKET?.trim() || "reports";
}

/**
 * PDF’i yerel diske yazmak yerine Supabase Storage’a yükler (varsayılan bucket: `reports`).
 * Dönüş: `bucket/objectPath` (örn. reports/dashboard/Dashboard-2026-04-12.pdf)
 */
export async function savePdfToReportsFolder(pdfBytes: Uint8Array, fileName: string): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error("PDF yükleme için NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.");
  }
  const bucket = getReportsStorageBucketName();
  const safeName = fileName.replace(/[/\\]/g, "_").replace(/\.\./g, "_") || "report.pdf";
  const objectPath = `dashboard/${safeName}`;

  const supabase = createClient(url, key);
  const { error } = await supabase.storage.from(bucket).upload(objectPath, Buffer.from(pdfBytes), {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) throw error;
  return `${bucket}/${objectPath}`;
}
