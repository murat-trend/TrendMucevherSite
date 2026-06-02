import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

function errorJson(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return errorJson('Oturum gerekli', 401)

  let body: { slug?: string; videoUrl?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return errorJson('Geçersiz istek gövdesi', 400)
  }

  const slug = typeof body.slug === 'string' ? body.slug.trim() : ''
  const videoUrl = typeof body.videoUrl === 'string' ? body.videoUrl.trim() : ''

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) return errorJson('Geçersiz slug', 400)
  if (!videoUrl) return errorJson('Video URL gerekli', 400)

  // Sadece bu kullanıcının ürününü güncelleyebilir
  const { error } = await supabase
    .from('products_3d')
    .update({ video_url: videoUrl })
    .eq('slug', slug)
    .eq('seller_id', user.id)

  if (error) {
    console.error('[update-product-video]', error)
    return errorJson('Güncelleme başarısız', 500)
  }

  return NextResponse.json({ ok: true })
}
