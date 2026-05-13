import { Resend } from "resend";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { name?: string; email?: string; subject?: string; message?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const name    = typeof body.name    === "string" ? body.name.trim()    : "";
  const email   = typeof body.email   === "string" ? body.email.trim()   : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Ad, e-posta ve mesaj zorunludur" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Geçersiz e-posta adresi" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to     = process.env.REPORT_EMAIL_TO?.trim() ?? "murat@trendmucevher.com";

  if (!apiKey) {
    return NextResponse.json({ error: "E-posta servisi yapılandırılmamış" }, { status: 500 });
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: "Trend Mücevher <no-reply@no-reply.trendmucevher.com>",
      to,
      replyTo: email,
      subject: subject ? `İletişim: ${subject}` : `İletişim formu — ${name}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff">
          <h2 style="margin:0 0 16px;font-size:18px;color:#1a1a1a">Yeni İletişim Mesajı</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr>
              <td style="padding:6px 12px 6px 0;color:#666;white-space:nowrap">Ad Soyad</td>
              <td style="padding:6px 0;font-weight:600;color:#1a1a1a">${name}</td>
            </tr>
            <tr>
              <td style="padding:6px 12px 6px 0;color:#666">E-posta</td>
              <td style="padding:6px 0"><a href="mailto:${email}" style="color:#b8860b">${email}</a></td>
            </tr>
            ${subject ? `<tr><td style="padding:6px 12px 6px 0;color:#666">Konu</td><td style="padding:6px 0;color:#1a1a1a">${subject}</td></tr>` : ""}
          </table>
          <hr style="margin:16px 0;border:none;border-top:1px solid #eee" />
          <p style="white-space:pre-wrap;color:#333;line-height:1.75;font-size:14px">${message.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</p>
          <hr style="margin:16px 0;border:none;border-top:1px solid #eee" />
          <p style="font-size:12px;color:#999">Bu mesaja doğrudan yanıtlayarak gönderene ulaşabilirsiniz.</p>
        </div>
      `,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "E-posta gönderilemedi";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
