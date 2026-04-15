import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const SELLER_ROUTES = ['/satici/']
const ADMIN_ROUTES  = ['/admin']
const AUTH_ROUTES   = ['/giris', '/kayit', '/sifremi-unuttum']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Basic Auth (staging) — API route'ları muaf
  const password = process.env.BASIC_AUTH_PASSWORD
  if (password && !pathname.startsWith('/api/')) {
    const auth = request.headers.get('authorization')
    if (!auth?.startsWith('Basic ')) {
      return new NextResponse('Authentication required', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Site"' },
      })
    }
    const [, pass] = atob(auth.slice(6)).split(':')
    if (pass !== password) {
      return new NextResponse('Invalid credentials', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Site"' },
      })
    }
  }

  // 2. Supabase session yenile
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 3. Satıcı route koruması
  const isSellerRoute = SELLER_ROUTES.some(r => pathname.startsWith(r))
  if (isSellerRoute) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/giris'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_approved_seller')
      .eq('id', user.id)
      .single()

    if (!profile || !['seller', 'admin'].includes(profile.role)) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    if (profile.role === 'seller' && !profile.is_approved_seller) {
      return NextResponse.redirect(new URL('/satici/onay-bekleniyor', request.url))
    }
  }

  // 4. Admin route koruması
  const isAdminRoute = ADMIN_ROUTES.some(r => pathname.startsWith(r))
  if (isAdminRoute && pathname !== '/admin/login') {
    if (!user) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/mesh-optimize|.*\\.(?:svg|png|jpg|jpeg|gif|webp|glb|stl)$).*)',
  ],
}
