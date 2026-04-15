import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { Resend } from "resend";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Trend Mücevher <no-reply@no-reply.trendmucevher.com>";
const ADMIN_EMAIL = process.env.CUSTOM_ORDER_NOTIFY_EMAIL ?? "";

function validate(body: Record<string, string>): string | null {
  const { full_name, store_name, phone, tax_number, description } = body;
  if (!full_name?.trim() || full_name.trim().length < 2)   return "Ad Soyad en az 2 karakter olmalı.";
  if (!store_name?.trim() || store_name.trim().length < 2) return "Mağaza adı en az 2 karakter olmalı.";
  if (!phone?.trim() || phone.trim().length < 7)           return "Geçerli bir telefon numarası girin.";
  if (!tax_number?.trim() || !/^\d{10,11}$/.test(tax_number.trim()))
    return "Vergi numarası 10 veya 11 haneli olmalı.";
  if (!description?.trim() || description.trim().length < 10)
    return "Açıklama en az 10 karakter olmalı.";
  if (description.trim().length > 2000)
    return "Açıklama en fazla 2000 karakter olabilir.";
  return null;
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }

  let body: Record<string, string>;
  try {
    body = (await req.json()) as Record<string, string>;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const validationError = validate(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 422 });
  }

  const { full_name, store_name, phone, tax_number, description } = body;

  // Mevcut başvuru kontrolü
  const { data: existing } = await supabase
    .from("seller_applications")
    .select("id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const msg =
      existing.status === "pending"   ? "Zaten inceleme bekleyen bir başvurunuz var." :
      existing.status === "approved"  ? "Başvurunuz onaylandı, satıcı paneline gidebilirsiniz." :
      "Önceki başvurunuz reddedildi. Destek ile iletişime geçin.";
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  const { error: insertError } = await supabase.from("seller_applications").insert({
    user_id:     user.id,
    email:       user.email ?? "",
    full_name:   full_name.trim(),
    store_name:  store_name.trim(),
    phone:       phone.trim(),
    tax_number:  tax_number.trim(),
    description: description.trim(),
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Admin'e bildirim emaili
  if (ADMIN_EMAIL) {
    await resend.emails.send({
      from: FROM,
      to: ADMIN_EMAIL,
      subject: `Yeni satıcı başvurusu — ${store_name.trim()}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#18181b;">
          <h2 style="font-size:18px;font-weight:700;margin:0 0 16px;">Yeni Satıcı Başvurusu</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:8px 0;color:#71717a;width:130px;">Ad Soyad</td><td style="padding:8px 0;font-weight:500;">${full_name.trim()}</td></tr>
            <tr><td style="padding:8px 0;color:#71717a;">Mağaza Adı</td><td style="padding:8px 0;font-weight:500;">${store_name.trim()}</td></tr>
            <tr><td style="padding:8px 0;color:#71717a;">E-posta</td><td style="padding:8px 0;">${user.email ?? "—"}</td></tr>
            <tr><td style="padding:8px 0;color:#71717a;">Telefon</td><td style="padding:8px 0;">${phone.trim()}</td></tr>
            <tr><td style="padding:8px 0;color:#71717a;">Vergi No</td><td style="padding:8px 0;">${tax_number.trim()}</td></tr>
          </table>
          <div style="margin-top:16px;padding:14px;background:#f4f4f5;border-radius:8px;font-size:14px;line-height:1.6;">
            <strong>Açıklama:</strong><br/>${description.trim().replace(/\n/g, "<br/>")}
          </div>
          <p style="margin-top:24px;">
            <a href="https://trendmucevher.com/admin/sellers/applications"
               style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:600;">
              Admin Panelinde İncele
            </a>
          </p>
        </div>
      `,
    }).catch(() => null); // email gönderim hatası başvuruyu engellemez
  }

  return NextResponse.json({ ok: true });
}
