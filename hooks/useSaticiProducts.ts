'use client'
import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  normalizeContentSourceLocale,
  type ContentSourceLocale,
} from '@/lib/modeller/product-translations-anthropic'

export type SaticiProduct = {
  id: string
  name: string
  slug: string
  thumbnail_url: string | null
  is_published: boolean
  personal_price: number
  jewelry_type: string
  story: string | null
  seller_note: string | null
  content_source_locale: string | null
}

export type EditFormState = {
  name: string
  story: string
  sellerNote: string
  personal_price: number
  contentSourceLang: ContentSourceLocale
}

export function useSaticiProducts() {
  const [products, setProducts]       = useState<SaticiProduct[]>([])
  const [loading, setLoading]         = useState(true)
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [editForm, setEditForm]       = useState<EditFormState | null>(null)
  const [editSaving, setEditSaving]   = useState(false)
  const [editError, setEditError]     = useState<string | null>(null)
  const [deletingId, setDeletingId]   = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // ── Ürünleri yükle ───────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data } = await supabase
      .from('products_3d')
      .select(`
        id, name, slug, thumbnail_url, is_published,
        personal_price, jewelry_type, story, seller_note,
        content_source_locale
      `)
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })

    setProducts((data ?? []) as SaticiProduct[])
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  // ── Düzenleme başlat ─────────────────────────────────────────
  const startEdit = useCallback((p: SaticiProduct) => {
    setEditingId(p.id)
    setEditError(null)
    setEditForm({
      name: p.name,
      story: p.story ?? '',
      sellerNote: p.seller_note ?? '',
      personal_price: p.personal_price ?? 0,
      contentSourceLang: normalizeContentSourceLocale(p.content_source_locale),
    })
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setEditForm(null)
    setEditError(null)
  }, [])

  // ── Düzenleme kaydet ─────────────────────────────────────────
  const saveEdit = useCallback(async () => {
    if (!editingId || !editForm || editSaving) return
    setEditSaving(true)
    setEditError(null)

    try {
      const res = await fetch(`/api/satici/urun/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name:              editForm.name,
          story:             editForm.story,
          sellerNote:        editForm.sellerNote,
          personal_price:    editForm.personal_price,
          contentSourceLang: editForm.contentSourceLang,
        }),
      })

      const json = await res.json() as { ok?: boolean; error?: string }

      if (!res.ok || !json.ok) {
        setEditError(json.error ?? 'Güncelleme başarısız')
        return
      }

      cancelEdit()
      await load()
    } finally {
      setEditSaving(false)
    }
  }, [editingId, editForm, editSaving, cancelEdit, load])

  // ── Sil ──────────────────────────────────────────────────────
  const deleteProduct = useCallback(async (productId: string): Promise<boolean> => {
    setDeletingId(productId)
    setDeleteError(null)

    try {
      const res = await fetch(`/api/satici/urun/${productId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const json = await res.json() as {
        ok?: boolean
        error?: string
        code?: string
      }

      if (!res.ok || !json.ok) {
        setDeleteError(json.error ?? 'Silme başarısız')
        return false
      }

      await load()
      return true
    } finally {
      setDeletingId(null)
    }
  }, [load])

  return {
    products,
    loading,
    editingId,
    editForm,
    editSaving,
    editError,
    deletingId,
    deleteError,
    load,
    startEdit,
    cancelEdit,
    saveEdit,
    setEditForm,
    deleteProduct,
  }
}
