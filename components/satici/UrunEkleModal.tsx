'use client'
import { useState, useCallback } from 'react'
import { X, Upload } from 'lucide-react'
import {
  normalizeContentSourceLocale,
  type ContentSourceLocale,
} from '@/lib/modeller/product-translations-anthropic'

type JewelryType = 'Yüzük' | 'Kolye' | 'Bilezik' | 'Küpe' | 'Pandant' | 'Broş'

type ProductForm = {
  name: string
  contentSourceLang: ContentSourceLocale
  jewelryType: JewelryType
  price: string
  width: string
  height: string
  depth: string
  weight: string
  story: string
  glbFile: File | null
  stlFile: File | null
  thumbnailOn: File | null
  thumbnailArka: File | null
  thumbnailKenar: File | null
  thumbnailUst: File | null
  licensePersonal: boolean
  licensePersonalPrice: string
  licenseCommercial: boolean
  licenseCommercialPrice: string
}

const EMPTY_FORM: ProductForm = {
  name: '', contentSourceLang: 'tr', jewelryType: 'Yüzük',
  price: '', width: '', height: '', depth: '', weight: '',
  story: '',
  glbFile: null, stlFile: null,
  thumbnailOn: null, thumbnailArka: null, thumbnailKenar: null, thumbnailUst: null,
  licensePersonal: true, licensePersonalPrice: '',
  licenseCommercial: false, licenseCommercialPrice: '',
}

const inputCls = 'w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-[14px] text-foreground placeholder:text-muted/50 outline-none transition-all focus:border-accent/50 focus:ring-2 focus:ring-accent/10'
const fileCls  = 'block w-full cursor-pointer rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-alt file:px-3 file:py-1 file:text-xs file:text-foreground'

function Field({ label, children, span2 = false }: {
  label: string
  children: React.ReactNode
  span2?: boolean
}) {
  return (
    <div className={span2 ? 'sm:col-span-2' : ''}>
      <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
        {label}
      </label>
      {children}
    </div>
  )
}

const slugify = (s: string) =>
  s.toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

interface Props {
  onClose: () => void
  onSuccess: () => void
}

export function UrunEkleModal({ onClose, onSuccess }: Props) {
  const [form, setForm]       = useState<ProductForm>(EMPTY_FORM)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const set = (key: keyof ProductForm, value: unknown) =>
    setForm((p) => ({ ...p, [key]: value }))

  const showError = useCallback((message: string) => {
    setError(message)
    if (typeof window !== 'undefined') {
      window.alert(message)
    }
  }, [])

  const handleSave = useCallback(async () => {
    setError(null)
    const name   = form.name.trim()
    const price  = Number(form.price)
    const width  = Number(form.width)
    const height = Number(form.height)
    const depth  = Number(form.depth)
    const weight = Number(form.weight)

    if (!name) return showError('Ürün adı zorunludur')
    if (!price || price <= 0) return showError('Geçerli bir fiyat girin')
    if (!width || !height || !depth || !weight) return showError('Tüm ölçüler zorunludur')
    if (!form.licensePersonal && !form.licenseCommercial) return showError('En az bir lisans seçin')
    if (!form.glbFile && !form.stlFile) return showError('En az bir model dosyası gerekli')

    setSaving(true)
    try {
      const slug = slugify(name) || `urun-${Date.now()}`

      // Model + çeviri yükle
      const fd = new FormData()
      fd.set('slug', slug)
      fd.set('name', name)
      fd.set('story', form.story.trim())
      fd.set('sourceLang', form.contentSourceLang)
      if (form.glbFile) fd.set('glb', form.glbFile)
      if (form.stlFile) fd.set('stl', form.stlFile)

      const uploadRes = await fetch('https://trend-mucevher-site.vercel.app/api/upload-model', { method: 'POST', body: fd })
      if (!uploadRes.ok) {
        const text = await uploadRes.text()
        let errMsg = `Model yükleme hatası (HTTP ${uploadRes.status})`
        try {
          const b = JSON.parse(text) as { error?: string }
          if (b.error) errMsg = `Model yükleme hatası: ${b.error} (HTTP ${uploadRes.status})`
        } catch {
          if (text.length < 200) errMsg = text || errMsg
        }
        throw new Error(errMsg)
      }
      const uploadData = await uploadRes.json() as {
        glbUrl?: string
        stlUrl?: string
        translationPatch?: Record<string, unknown> | null
      }
      console.log('uploadData', uploadData)

      // Thumbnail'lar
      const thumbKeys = ['on', 'arka', 'kenar', 'ust'] as const
      const thumbFormKeys: Record<string, keyof ProductForm> = {
        on: 'thumbnailOn', arka: 'thumbnailArka',
        kenar: 'thumbnailKenar', ust: 'thumbnailUst',
      }
      const thumbViews: Record<string, string | null> = { on: null, arka: null, kenar: null, ust: null }

      for (const key of thumbKeys) {
        const file = form[thumbFormKeys[key]] as File | null
        if (!file) continue
        const tfd = new FormData()
        tfd.set('slug', slug)
        tfd.set('view', key)
        tfd.set('file', file)
        const tres = await fetch('/api/upload-thumbnail', { method: 'POST', credentials: 'include', body: tfd })
        if (!tres.ok) {
          const text = await tres.text()
          let errMsg = `${key} görseli yüklenemedi (HTTP ${tres.status})`
          try {
            const b = JSON.parse(text) as { error?: string }
            if (b.error) errMsg = `${key} görseli: ${b.error} (HTTP ${tres.status})`
          } catch {
            if (text.length < 200) errMsg = text || errMsg
          }
          throw new Error(errMsg)
        }
        const td = await tres.json() as { url?: string }
        thumbViews[key] = td.url ?? null
      }

      const thumbnailUrl = thumbViews.on ?? thumbViews.arka ?? thumbViews.kenar ?? thumbViews.ust ?? null
      console.log('thumbViews', thumbViews)

      // Çeviri patch yoksa ayrıca çek
      let trPatch = uploadData.translationPatch ?? null
      if (!trPatch) {
        try {
          const trRes = await fetch('/api/product-translations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              name, story: form.story.trim(), sourceLang: form.contentSourceLang,
            }),
          })
          const trJson = await trRes.json() as { ok?: boolean; patch?: typeof trPatch }
          if (trJson.ok && trJson.patch) trPatch = trJson.patch
        } catch { /* çeviri opsiyonel */ }
      }
      console.log('trPatch', trPatch)

      // Supabase insert
      const { createClient } = await import('@/utils/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const payload = {
        sku:          `TM-3D-${Date.now()}`,
        name,
        slug,
        story:        form.story.trim(),
        ...(trPatch ?? {
          story_en: null, story_de: null, story_ru: null,
          name_en: null,  name_de: null,  name_ru: null,
          translations: null,
        }),
        content_source_locale: form.contentSourceLang,
        jewelry_type:    form.jewelryType,
        personal_price:  form.licensePersonal
          ? Number(form.licensePersonalPrice) || price
          : price,
        commercial_price: form.licenseCommercial
          ? Number(form.licenseCommercialPrice) || null
          : null,
        glb_url:       uploadData.glbUrl ?? null,
        stl_url:       uploadData.stlUrl ?? null,
        thumbnail_url: thumbnailUrl,
        images:        thumbViews,
        dimensions:    { width, height, depth, weight },
        is_published:  false,
        show_on_home:  false,
        show_on_modeller: true,
        seller_id:     user?.id ?? null,
        seller_email:  user?.email ?? null,
      }
      console.log('insert payload', payload)

      const { error: dbError } = await supabase.from('products_3d').insert(payload)

      if (dbError) throw new Error(`Supabase insert hatası: ${dbError.message}`)

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onSuccess()
        onClose()
      }, 1500)
    } catch (e) {
      console.error('[UrunEkleModal] handleSave failed:', e)
      showError(e instanceof Error ? e.message : 'Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }, [form, onSuccess, onClose, showError])

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-foreground/20 backdrop-blur-sm">
      <div className="mx-auto flex min-h-full max-w-2xl items-start justify-center p-4 py-8">
        <div className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">

          <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
            <h2 className="font-display text-lg font-medium text-foreground">Yeni Ürün Ekle</h2>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-alt hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>

          {error && (
            <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-[13px] text-red-400">
              <X size={14} className="shrink-0" /> {error}
            </div>
          )}

          {success && (
            <div className="mx-6 mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 text-[13px] text-emerald-400">
              Ürün başarıyla eklendi!
            </div>
          )}

          <div
            className="grid grid-cols-1 gap-5 overflow-y-auto p-6 pb-4 sm:grid-cols-2"
            style={{ maxHeight: '70vh' }}
          >
            <Field label="Ürün Adı" span2>
              <input type="text" className={inputCls} placeholder="Ürün adını girin"
                value={form.name} onChange={(e) => set('name', e.target.value)} />
            </Field>

            <Field label="Mücevher Türü">
              <select className={inputCls} value={form.jewelryType}
                onChange={(e) => set('jewelryType', e.target.value as JewelryType)}>
                {['Yüzük','Kolye','Bilezik','Küpe','Pandant','Broş'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>

            <Field label="Fiyat (₺)">
              <input type="number" min={1} className={inputCls} placeholder="0"
                value={form.price} onChange={(e) => set('price', e.target.value)} />
            </Field>

            <Field label="Genişlik (mm)">
              <input type="number" min={0.1} step="0.1" className={inputCls} placeholder="0.0"
                value={form.width} onChange={(e) => set('width', e.target.value)} />
            </Field>
            <Field label="Yükseklik (mm)">
              <input type="number" min={0.1} step="0.1" className={inputCls} placeholder="0.0"
                value={form.height} onChange={(e) => set('height', e.target.value)} />
            </Field>
            <Field label="Derinlik (mm)">
              <input type="number" min={0.1} step="0.1" className={inputCls} placeholder="0.0"
                value={form.depth} onChange={(e) => set('depth', e.target.value)} />
            </Field>
            <Field label="Ağırlık (gr)">
              <input type="number" min={0.1} step="0.1" className={inputCls} placeholder="0.0"
                value={form.weight} onChange={(e) => set('weight', e.target.value)} />
            </Field>

            <Field label="Ürün Hikayesi" span2>
              <textarea rows={3} className={inputCls} placeholder="Ürününüzü anlatın..."
                value={form.story} onChange={(e) => set('story', e.target.value)} />
            </Field>

            <Field label="İçerik Dili" span2>
              <p className="mb-2 text-[11px] leading-relaxed text-muted">
                Yukarıdaki metni hangi dilde yazdığınızı seçin — diğer diller otomatik çevrilir.
              </p>
              <select className={inputCls} value={form.contentSourceLang}
                onChange={(e) => set('contentSourceLang', normalizeContentSourceLocale(e.target.value))}>
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="ru">Русский</option>
              </select>
            </Field>

            <Field label="GLB Dosyası">
              <input type="file" accept=".glb" className={fileCls}
                onChange={(e) => set('glbFile', e.target.files?.[0] ?? null)} />
            </Field>
            <Field label="STL Dosyası">
              <input type="file" accept=".stl" className={fileCls}
                onChange={(e) => set('stlFile', e.target.files?.[0] ?? null)} />
            </Field>

            <Field label="Görseller" span2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'thumbnailOn',    label: 'Ön' },
                  { key: 'thumbnailArka',  label: 'Arka' },
                  { key: 'thumbnailKenar', label: 'Kenar' },
                  { key: 'thumbnailUst',   label: 'Üst' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <p className="mb-1 text-[11px] text-muted">{label}</p>
                    <input type="file" accept="image/*" className={fileCls}
                      onChange={(e) => set(key as keyof ProductForm, e.target.files?.[0] ?? null)} />
                  </div>
                ))}
              </div>
            </Field>

            <Field label="Lisans Türü" span2>
              <div className="space-y-3 rounded-xl border border-border/60 bg-surface-alt p-4">
                <div className="flex items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-2 text-[14px] text-foreground">
                    <input type="checkbox" checked={form.licensePersonal}
                      onChange={(e) => set('licensePersonal', e.target.checked)}
                      className="h-4 w-4 accent-accent" />
                    Kişisel Kullanım
                  </label>
                  <input type="number" min={1} disabled={!form.licensePersonal}
                    className="w-32 rounded-xl border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none disabled:opacity-40"
                    placeholder="₺" value={form.licensePersonalPrice}
                    onChange={(e) => set('licensePersonalPrice', e.target.value)} />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-2 text-[14px] text-foreground">
                    <input type="checkbox" checked={form.licenseCommercial}
                      onChange={(e) => set('licenseCommercial', e.target.checked)}
                      className="h-4 w-4 accent-accent" />
                    Ticari Kullanım
                  </label>
                  <input type="number" min={1} disabled={!form.licenseCommercial}
                    className="w-32 rounded-xl border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none disabled:opacity-40"
                    placeholder="₺" value={form.licenseCommercialPrice}
                    onChange={(e) => set('licenseCommercialPrice', e.target.value)} />
                </div>
              </div>
            </Field>

          </div>

          <div className="flex justify-end gap-3 border-t border-border/60 px-6 py-4">
            <button onClick={onClose}
              className="rounded-xl border border-border px-5 py-2.5 text-[13px] font-medium text-muted hover:text-foreground">
              Vazgeç
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-[13px] font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50">
              {saving ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Kaydediliyor...
                </>
              ) : (
                <><Upload size={14} /> Kaydet ve Gönder</>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
