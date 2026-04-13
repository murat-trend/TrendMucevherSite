import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function SaticiLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/giris?redirect=/satici/dashboard')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_approved_seller')
    .eq('id', user.id)
    .single()

  // Satıcı veya admin değilse ana sayfaya
  if (!profile || !['seller', 'admin'].includes(profile.role)) {
    redirect('/')
  }

  // Onay bekliyor
  if (profile.role === 'seller' && !profile.is_approved_seller) {
    redirect('/satici/onay-bekleniyor')
  }

  return <>{children}</>
}
