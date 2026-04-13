'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Package, LogOut } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useSaticiProducts } from '@/hooks/useSaticiProducts'
import { MagazaAdiBanner } from '@/components/satici/MagazaAdiBanner'
import { UrunKarti } from '@/components/satici/UrunKarti'
import { UrunEkleModal } from '@/components/satici/UrunEkleModal'
import { UrunDuzenleModal } from '@/components/satici/UrunDuzenleModal'
import { MesajlarModal, type Mesaj } from '@/components/satici/MesajlarModal'

export default function SaticiUrunlerimPage() {
  const router = useRouter()

  // ── Ürün state (hook) ─────────────────────────────────────────
  const {
    products, loading,
    editingId, editForm, editSaving, editError,
    deletingId, deleteError,
    load,
    startEdit, cancelEdit, saveEdit,
    setEditForm,
    deleteProduct,
  } = useSaticiProducts()

  // ── Profil / mağaza ───────────────────────────────────────────
  const [hasSession, setHasSession]           = useState(false)
  const [storeName, setStoreName]             = useState<string | null>(null)
  const [profileLoading, setProfileLoading]   = useState(true)
  const [savingStoreName, setSavingStoreName] = useState(false)
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null)

  // ── Mesajlar ──────────────────────────────────────────────────
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [showMessages, setShowMessages]     = useState(false)
  const [messages, setMessages]             = useState<Mesaj[]>([])

  // ── Modal ─────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false)

  // ── Çıkış ─────────────────────────────────────────────────────
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = useCallback(async () => {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }, [router])

  // ── Profil yükle ──────────────────────────────────────────────
  const loadProfile = useCallback(async () => {
    setProfileLoading(true)
    setProfileSaveError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setHasSession(false)
      setProfileLoading(false)
      return
    }

    setHasSession(true)

    const { data } = await supabase
      .from('profiles')
      .select('store_name')
      .eq('id', user.id)
      .maybeSingle()

    const raw = typeof data?.store_name === 'string' ? data.store_name.trim() : ''
    setStoreName(raw === '' ? null : raw)

    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('is_read', false)

    setUnreadMessages(count ?? 0)
    setProfileLoading(false)
  }, [])

  useEffect(() => { void loadProfile() }, [loadProfile])

  // ── Mağaza adı kaydet ─────────────────────────────────────────
  const handleSaveStoreName = useCallback(async () => {
    setProfileSaveError(null)
    const el = document.getElementById('store-name-input') as HTMLInputElement | null
    const v  = el?.value?.trim() ?? ''
    if (!v) { setProfileSaveError('Mağaza adı zorunludur'); return }

    setSavingStoreName(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setProfileSaveError('Oturum bulunamadı'); return }

      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, store_name: v, store_name_locked: true }, { onConflict: 'id' })

      if (error) { setProfileSaveError(error.message); return }
      await loadProfile()
    } finally {
      setSavingStoreName(false)
    }
  }, [loadProfile])

  // ── Mesajları aç ──────────────────────────────────────────────
  const handleOpenMessages = useCallback(async () => {
    setShowMessages(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('messages')
      .select('id, message, created_at, is_read, product_id, sender_id')
      .eq('receiver_id', user.id)
      .order('created_at', { ascending: false })

    // N+1 yerine tek sorguda tüm sender profilleri çek
    const senderIds = [...new Set(
      (data ?? []).map((m) => (m as { sender_id: string | null }).sender_id).filter(Boolean)
    )] as string[]

    const { data: profiles } = senderIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, store_name')
          .in('id', senderIds)
      : { data: [] }

    const profileMap = Object.fromEntries(
      (profiles ?? []).map((p) => [p.id, p.store_name])
    )

    const enriched: Mesaj[] = (data ?? []).map((msg) => {
      const m = msg as {
        id: string; message: string; created_at: string
        is_read: boolean; product_id: string | null; sender_id: string | null
      }
      return {
        ...m,
        sender_name: m.sender_id
          ? (profileMap[m.sender_id] ?? 'Kullanıcı')
          : 'Anonim',
      }
    })

    setMessages(enriched)

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('receiver_id', user.id)
      .eq('is_read', false)

    setUnreadMessages(0)
  }, [])

  // ── Silme onayı ───────────────────────────────────────────────
  const handleDelete = useCallback(async (productId: string) => {
    const urun = products.find((p) => p.id === productId)
    const confirmed = window.confirm(
      `"${urun?.name ?? 'Bu ürün'}" silinecek. Emin misiniz?`
    )
    if (!confirmed) return
    await deleteProduct(productId)
  }, [products, deleteProduct])

  return (
    <div className="min-h-screen bg-background">

      {/* Üst bar */}
      <div className="border-b border-border/60 bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <h1 className="font-display text-xl font-medium tracking-[-0.02em] text-foreground">
              Ürünlerim
            </h1>
            <p className="mt-0.5 text-[13px] text-muted">
              3D modellerinizi yönetin
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
              className="flex items-center gap-2 rounded-full border border-border/80 bg-transparent px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:border-red-500/30 hover:bg-red-500/[0.06] hover:text-red-400 disabled:opacity-50"
            >
              <LogOut size={14} strokeWidth={2} />
              {loggingOut ? 'Çıkılıyor...' : 'Çıkış Yap'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-[13px] font-medium text-accent-foreground hover:opacity-90"
            >
              <Plus size={15} strokeWidth={2} /> Ürün Ekle
            </button>
          </div>
        </div>

        {/* Nav */}
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <nav className="flex gap-6">
            {[
              { href: '/satici/dashboard',    label: 'Dashboard' },
              { href: '/satici/urunlerim',    label: 'Ürünlerim', active: true },
              { href: '/satici/kampanyalarim',label: 'Kampanyalar' },
              { href: '/satici/siparislerim', label: 'Siparişler' },
              { href: '/satici/hesabim',      label: 'Hesabım' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`border-b-2 pb-3 pt-1 text-[13px] font-medium transition-colors ${
                  item.active
                    ? 'border-accent text-accent'
                    : 'border-transparent text-muted hover:text-foreground'
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </div>

      {/* İçerik */}
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">

        <MagazaAdiBanner
          storeName={storeName}
          profileLoading={profileLoading}
          hasSession={hasSession}
          unreadMessages={unreadMessages}
          savingStoreName={savingStoreName}
          profileSaveError={profileSaveError}
          onSaveStoreName={handleSaveStoreName}
          onOpenMessages={handleOpenMessages}
        />

        {loading ? (
          <div className="py-20 text-center text-sm text-muted">Yükleniyor...</div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 py-20 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-surface-alt text-muted">
              <Package size={24} strokeWidth={1.5} />
            </div>
            <h3 className="font-display text-lg font-medium text-foreground">
              Henüz ürün eklemediniz
            </h3>
            <p className="mt-2 text-[13px] text-muted">
              İlk 3D modelinizi ekleyerek başlayın
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-6 flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-[13px] font-medium text-accent-foreground hover:opacity-90"
            >
              <Plus size={14} /> Ürün Ekle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <UrunKarti
                key={p.id}
                product={p}
                deletingId={deletingId}
                deleteError={deleteError}
                onEdit={() => startEdit(p)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

      </div>

      {/* Modaller */}
      {showForm && (
        <UrunEkleModal
          onClose={() => setShowForm(false)}
          onSuccess={() => void load()}
        />
      )}

      {editingId && editForm && (
        <UrunDuzenleModal
          editForm={editForm}
          editSaving={editSaving}
          editError={editError}
          onSave={() => void saveEdit()}
          onCancel={cancelEdit}
          onChange={setEditForm}
        />
      )}

      {showMessages && (
        <MesajlarModal
          messages={messages}
          onClose={() => setShowMessages(false)}
        />
      )}

    </div>
  )
}
