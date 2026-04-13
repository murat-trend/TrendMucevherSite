import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export type SellerSession = {
  userId: string
  role: 'seller' | 'admin'
  isApproved: boolean
}

export type AuthResult =
  | { ok: true; session: SellerSession }
  | { ok: false; response: NextResponse }

export async function requireSeller(): Promise<AuthResult> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Oturum bulunamadı', code: 'UNAUTHORIZED' },
        { status: 401 }
      ),
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_approved_seller')
    .eq('id', user.id)
    .single()

  if (!profile || !['seller', 'admin'].includes(profile.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Satıcı yetkisi gerekli', code: 'FORBIDDEN' },
        { status: 403 }
      ),
    }
  }

  if (profile.role === 'seller' && !profile.is_approved_seller) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Satıcı hesabınız henüz onaylanmadı', code: 'NOT_APPROVED' },
        { status: 403 }
      ),
    }
  }

  return {
    ok: true,
    session: {
      userId: user.id,
      role: profile.role as 'seller' | 'admin',
      isApproved: profile.is_approved_seller ?? false,
    },
  }
}

export async function assertProductOwnership(
  productId: string,
  session: SellerSession
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  if (session.role === 'admin') return { ok: true }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: product } = await supabase
    .from('products_3d')
    .select('seller_id')
    .eq('id', productId)
    .single()

  if (!product) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Ürün bulunamadı', code: 'NOT_FOUND' },
        { status: 404 }
      ),
    }
  }

  if (product.seller_id !== session.userId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Bu ürün size ait değil', code: 'FORBIDDEN' },
        { status: 403 }
      ),
    }
  }

  return { ok: true }
}
