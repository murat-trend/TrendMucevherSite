import nodemailer from "nodemailer";

export type DeliveryExtras = {
  emailSent: boolean;
  emailError?: string;
  webhookOk: boolean;
  webhookError?: string;
};

/**
 * PDF’i e-posta ile gönder (SMTP env) ve/veya webhook’a (Zapier/Make, özel Drive/Dropbox uploader).
 */
export async function deliverDailyReportPdf(
  pdfBytes: Uint8Array,
  fileName: string,
  opts: { savedLocation: string },
): Promise<DeliveryExtras> {
  const emailTo = process.env.REPORT_EMAIL_TO?.trim();
  const webhookUrl = process.env.REPORT_DELIVERY_WEBHOOK_URL?.trim();

  let emailSent = false;
  let emailError: string | undefined;
  let webhookOk = false;
  let webhookError: string | undefined;

  const host = process.env.SMTP_HOST?.trim();
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.REPORT_EMAIL_FROM?.trim() || user || "noreply@localhost";

  if (emailTo && host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      await transporter.sendMail({
        from,
        to: emailTo,
        subject: `Günlük dashboard raporu — ${fileName.replace(/\.pdf$/i, "")}`,
        text: `Ekteki PDF otomatik oluşturulmuştur.\nSupabase Storage: ${opts.savedLocation}`,
        attachments: [
          {
            filename: fileName,
            content: Buffer.from(pdfBytes),
            contentType: "application/pdf",
          },
        ],
      });
      emailSent = true;
    } catch (e) {
      emailError = e instanceof Error ? e.message : String(e);
    }
  }

  if (webhookUrl) {
    try {
      const body = JSON.stringify({
        type: "daily_dashboard_report",
        fileName,
        createdAt: new Date().toISOString(),
        pdfBase64: Buffer.from(pdfBytes).toString("base64"),
      });
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.REPORT_WEBHOOK_SECRET
            ? { Authorization: `Bearer ${process.env.REPORT_WEBHOOK_SECRET}` }
            : {}),
        },
        body,
      });
      if (!res.ok) {
        webhookError = `HTTP ${res.status}`;
      } else {
        webhookOk = true;
      }
    } catch (e) {
      webhookError = e instanceof Error ? e.message : String(e);
    }
  }

  return { emailSent, emailError, webhookOk, webhookError };
}
