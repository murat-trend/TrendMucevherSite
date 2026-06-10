import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Sunucu yapılandırması eksik" }, { status: 500 });
  }

  let body: {
    firmId?: string;
    customerName?: string;
    customerPhone?: string;
    notes?: string;
    depositAmount?: number | null;
    designImage?: string; // base64 data URL
    optimizedPrompt?: string;
  };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const firmId = body.firmId?.trim();
  const customerName = body.customerName?.trim() ?? "";
  const customerPhone = body.customerPhone?.trim() ?? "";
  if (!firmId) return NextResponse.json({ error: "firmId gerekli" }, { status: 400 });
  if (!customerName) return NextResponse.json({ error: "Müşteri adı gerekli" }, { status: 400 });

  const supabase = createServiceClient(url, serviceKey);

  // Firma bilgisi + email için owner
  const { data: firm } = await supabase
    .from("nextaura_firms")
    .select("id, name, slug, owner_user_id")
    .eq("id", firmId)
    .eq("active", true)
    .maybeSingle();

  if (!firm) return NextResponse.json({ error: "Firma bulunamadı" }, { status: 404 });

  // Oturumu kaydet
  const selectedDesign = body.designImage
    ? { image: body.designImage, prompt: body.optimizedPrompt ?? "" }
    : null;

  const { data: session, error: sessionErr } = await supabase
    .from("nextaura_sessions")
    .insert({
      firm_id: firmId,
      customer_name: customerName || null,
      customer_phone: customerPhone || null,
      designs: selectedDesign ? [selectedDesign] : [],
      selected_design: selectedDesign,
      status: "ordered",
      notes: body.notes?.trim() || null,
      deposit_amount: body.depositAmount ?? null,
    })
    .select("id")
    .single();

  if (sessionErr) return NextResponse.json({ error: sessionErr.message }, { status: 500 });

  // Firma sahibine e-posta gönder
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey && firm.owner_user_id) {
    try {
      // Firma sahibinin emailini auth.users'dan al
      const { data: ownerData } = await supabase.auth.admin.getUserById(firm.owner_user_id);
      const ownerEmail = ownerData?.user?.email;

      if (ownerEmail) {
        const resend = new Resend(resendKey);
        const depositLine = body.depositAmount
          ? `<p><strong>Kapora:</strong> ₺${body.depositAmount}</p>`
          : "";
        const notesLine = body.notes?.trim()
          ? `<p><strong>Notlar:</strong></p><pre style="background:#f5f5f5;padding:12px;border-radius:6px;white-space:pre-wrap">${escHtml(body.notes)}</pre>`
          : "";
        const imageLine = body.designImage
          ? `<p><strong>Seçilen tasarım:</strong></p><img src="${body.designImage}" style="max-width:240px;border-radius:12px" />`
          : "";

        await resend.emails.send({
          from: "Nextaura <no-reply@no-reply.trendmucevher.com>",
          to: ownerEmail,
          subject: `Yeni sipariş — ${customerName} · ${firm.name}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;color:#1a1a1a;line-height:1.6">
              <h2 style="color:#b76e79">Yeni Nextaura Siparişi</h2>
              <p><strong>Oturum no:</strong> ${session.id}</p>
              <p><strong>Firma:</strong> ${escHtml(firm.name as string)}</p>
              <p><strong>Müşteri:</strong> ${escHtml(customerName)}</p>
              ${customerPhone ? `<p><strong>Telefon:</strong> ${escHtml(customerPhone)}</p>` : ""}
              ${depositLine}
              ${notesLine}
              ${imageLine}
              <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
              <p style="font-size:12px;color:#999">Powered by Nextaura · trendmucevher.com</p>
            </div>
          `,
        });
      }
    } catch (mailErr) {
      console.error("[nextaura/order] email error:", mailErr);
      // Mail hatası siparişi engellemez
    }
  }

  return NextResponse.json({ ok: true, sessionId: session.id });
}
