import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { Resend } from "resend";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Trend Mücevher <no-reply@no-reply.trendmucevher.com>";

async function requireAdmin() {
  const cookieStore = await cookies();
  const auth = createClient(cookieStore);
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Oturum gerekli" }, { status: 401 }) };

  const { data: profile } = await auth.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!isRemauraSuperAdminUserId(user.id) && profile?.role !== "admin") {
    return { error: NextResponse.json({ error: "Yetkisiz" }, { status: 403 }) };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return { adminId: user.id, supabase: createServiceClient(url, serviceKey) };
}

// GET /api/admin/seller-applications/[id]  →  tek başvuru detayı
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (gate.supabase as any)
    .from("seller_applications")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ application: data });
}

// PATCH /api/admin/seller-applications/[id]
// body: { action: "approve" | "reject", rejection_reason?: string }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { adminId, supabase } = gate;

  const { id } = await params;

  let body: { action?: string; rejection_reason?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 }); }

  const action = body.action?.trim();
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action: 'approve' veya 'reject' olmalı" }, { status: 422 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: app, error: fetchErr } = await (supabase as any)
    .from("seller_applications")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !app) {
    return NextResponse.json({ error: "Başvuru bulunamadı" }, { status: 404 });
  }

  if (app.status !== "pending") {
    return NextResponse.json({ error: "Bu başvuru zaten işleme alınmış" }, { status: 409 });
  }

  const now = new Date().toISOString();

  if (action === "approve") {
    // Başvuru güncelle
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("seller_applications").update({
      status: "approved",
      reviewed_at: now,
      reviewed_by: adminId,
    }).eq("id", id);

    // Profil güncelle: seller rolü + onaylı
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("profiles").update({
      role: "seller",
      is_approved_seller: true,
      store_name: app.store_name,
    }).eq("id", app.user_id);

    // Kullanıcıya onay emaili
    await resend.emails.send({
      from: FROM,
      to: app.email,
      subject: "Satıcı başvurunuz onaylandı — Trend Mücevher",
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#18181b;">
          <div style="background:#18181b;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center;">
            <p style="color:#fff;font-size:17px;font-weight:600;margin:0;">Trend Mücevher</p>
          </div>
          <div style="background:#fff;padding:36px 32px;border:1px solid #e4e4e7;border-top:none;border-radius:0 0 12px 12px;">
            <h2 style="font-size:20px;font-weight:700;margin:0 0 12px;">Tebrikler, başvurunuz onaylandı!</h2>
            <p style="color:#52525b;line-height:1.6;margin:0 0 20px;">
              Merhaba <strong>${app.full_name}</strong>,<br/>
              <strong>${app.store_name}</strong> mağazanız incelendi ve satıcı olarak onaylandı.
              Artık satıcı panelinize erişebilirsiniz.
            </p>
            <a href="https://trendmucevher.com/satici/dashboard"
               style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
              Satıcı Paneline Git
            </a>
            <p style="margin-top:28px;font-size:13px;color:#a1a1aa;">
              Herhangi bir sorunuz olursa bizimle iletişime geçebilirsiniz.
            </p>
          </div>
        </div>
      `,
    }).catch(() => null);

  } else {
    const reason = body.rejection_reason?.trim() || "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("seller_applications").update({
      status: "rejected",
      rejection_reason: reason || null,
      reviewed_at: now,
      reviewed_by: adminId,
    }).eq("id", id);

    // Kullanıcıya ret emaili
    await resend.emails.send({
      from: FROM,
      to: app.email,
      subject: "Satıcı başvurunuz hakkında — Trend Mücevher",
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#18181b;">
          <div style="background:#18181b;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center;">
            <p style="color:#fff;font-size:17px;font-weight:600;margin:0;">Trend Mücevher</p>
          </div>
          <div style="background:#fff;padding:36px 32px;border:1px solid #e4e4e7;border-top:none;border-radius:0 0 12px 12px;">
            <h2 style="font-size:20px;font-weight:700;margin:0 0 12px;">Başvurunuz değerlendirme sürecini tamamladı</h2>
            <p style="color:#52525b;line-height:1.6;margin:0 0 16px;">
              Merhaba <strong>${app.full_name}</strong>,<br/>
              <strong>${app.store_name}</strong> mağazanız için yaptığınız başvuruyu inceledik.
              Maalesef bu aşamada başvurunuzu onaylayamıyoruz.
            </p>
            ${reason ? `
            <div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:14px 16px;font-size:14px;color:#713f12;margin-bottom:20px;">
              <strong>Gerekçe:</strong><br/>${reason.replace(/\n/g, "<br/>")}
            </div>` : ""}
            <p style="font-size:13px;color:#71717a;margin:0 0 20px;">
              Daha fazla bilgi almak veya itiraz etmek için lütfen bizimle iletişime geçin.
            </p>
            <a href="mailto:destek@trendmucevher.com"
               style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
              Destek ile İletişime Geç
            </a>
          </div>
        </div>
      `,
    }).catch(() => null);
  }

  return NextResponse.json({ ok: true, action });
}
