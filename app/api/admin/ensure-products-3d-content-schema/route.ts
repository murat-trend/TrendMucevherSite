import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Client } from "pg";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { PRODUCTS_3D_CONTENT_SOURCE_LOCALE_DDL } from "@/lib/supabase/ddl-products-3d-content-source-locale";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Canlı şema: `content_source_locale` kolonu yoksa uygulama hata verir.
 * Supabase JS (service role) DDL çalıştıramaz; tek seferlik Postgres URI gerekir.
 */
export async function POST() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
  }
  if (!isRemauraSuperAdminUserId(user.id)) {
    return NextResponse.json({ error: "Yalnızca süper admin" }, { status: 403 });
  }

  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    return NextResponse.json(
      {
        ok: false as const,
        error: "DATABASE_URL tanımlı değil",
        hint:
          "Supabase Dashboard → Project Settings → Database → Connection string (URI). " +
          "Session mode (pooler 5432) veya Direct connection kullanın. " +
          "Vercel / hosting ortam değişkenlerine DATABASE_URL ekleyip tekrar deneyin.",
      },
      { status: 500 },
    );
  }

  const client = new Client({
    connectionString,
    ssl: /localhost|127\.0\.0\.1/i.test(connectionString) ? undefined : { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    await client.query(PRODUCTS_3D_CONTENT_SOURCE_LOCALE_DDL);
  } catch (e) {
    console.error("[ensure-products-3d-content-schema]", e);
    const msg = e instanceof Error ? e.message : "Bilinmeyen hata";
    return NextResponse.json({ ok: false as const, error: msg }, { status: 500 });
  } finally {
    await client.end().catch(() => {});
  }

  return NextResponse.json({
    ok: true as const,
    message: "products_3d.content_source_locale şeması uygulandı (idempotent).",
  });
}
