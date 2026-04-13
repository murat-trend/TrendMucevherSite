import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { requireSeller, assertProductOwnership } from '@/lib/auth/seller'
import { z } from 'zod'
import {
  buildProductTranslationsFromSource,
  normalizeContentSourceLocale,
  productTranslationsToDbPatch,
} from '@/lib/modeller/product-translations-anthropic'

const PatchSchema = z.object({
  name:             z.string().min(1).max(200).optional(),
  story:            z.string().max(5000).optional(),
  personal_price:   z.number().positive().optional(),
  commercial_price: z.number().positive().nullable().optional(),
  contentSourceLang: z.enum(['tr', 'en', 'de', 'ru']).optional(),
})

// ── PATCH /api/satici/urun/[id] ───────────────────────────────────
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params
  const id = rawId?.trim()
  if (!id) {
    return NextResponse.json({ error: 'Geçersiz id' }, { status: 400 })
  }

  // 1. Auth + rol
  const auth = await requireSeller()
  if (!auth.ok) return auth.response

  // 2. Ownership — bu ürün bu satıcıya ait mi?
  const ownership = await assertProductOwnership(id, auth.session)
  if (!ownership.ok) return ownership.response

  // 3. Body validasyonu
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Geçersiz veri', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { name, story, personal_price, commercial_price, contentSourceLang } = parsed.data

  // 4. Mevcut kaydı çek (çeviri için gerekli)
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: current, error: fetchError } = await supabase
    .from('products_3d')
    .select('name, story, content_source_locale')
    .eq('id', id)
    .single()

  if (fetchError || !current) {
    return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 })
  }

  // 5. Çeviri — isim veya hikaye değiştiyse yeniden üret
  const finalName  = name  ?? current.name  ?? ''
  const finalStory = story ?? current.story ?? ''
  const finalLang  = normalizeContentSourceLocale(
    contentSourceLang ?? current.content_source_locale ?? 'tr'
  )

  let trPatch = null
  const textChanged = name !== undefined || story !== undefined || contentSourceLang !== undefined
  if (textChanged && finalName) {
    try {
      const built = await buildProductTranslationsFromSource(finalLang, finalName, finalStory)
      if (built) trPatch = productTranslationsToDbPatch(built, finalLang)
    } catch (e) {
      console.warn('[satici/urun PATCH] translations skipped:', e)
    }
  }

  // 6. DB güncelleme
  const updatePayload = {
    ...(name             !== undefined && { name }),
    ...(story            !== undefined && { story }),
    ...(personal_price   !== undefined && { personal_price }),
    ...(commercial_price !== undefined && { commercial_price }),
    ...(contentSourceLang && { content_source_locale: contentSourceLang }),
    ...(trPatch ?? {}),
  }

  const { data, error } = await supabase
    .from('products_3d')
    .update(updatePayload)
    .eq('id', id)
    .select('id, name, personal_price, is_published')
    .single()

  if (error) {
    console.error('[satici/urun PATCH]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, product: data })
}

// ── DELETE /api/satici/urun/[id] ──────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params
  const id = rawId?.trim()
  if (!id) {
    return NextResponse.json({ error: 'Geçersiz id' }, { status: 400 })
  }

  // 1. Auth + rol
  const auth = await requireSeller()
  if (!auth.ok) return auth.response

  // 2. Ownership
  const ownership = await assertProductOwnership(id, auth.session)
  if (!ownership.ok) return ownership.response

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // 3. Aktif sipariş var mı?
  const { count: activeOrders } = await supabase
    .from('order_items')
    .select('order_id', { count: 'exact', head: true })
    .eq('product_id', id)

  if ((activeOrders ?? 0) > 0) {
    return NextResponse.json(
      {
        error: `Bu ürünün ${activeOrders} aktif siparişi var. Tamamlanmadan silinemez.`,
        code: 'ACTIVE_ORDERS',
      },
      { status: 409 }
    )
  }

  // 4. Sil (CASCADE migration zaten ilgili tabloları temizler)
  const { error } = await supabase
    .from('products_3d')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[satici/urun DELETE]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
