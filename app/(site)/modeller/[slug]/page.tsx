'use client'

import Link from 'next/link'
import dynamicImport from 'next/dynamic'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import type React from 'react'
import { use, useEffect, useRef, useState } from 'react'
import { jewelryTypeLabel } from '@/lib/modeller/jewelry-labels'
import { getThumbnailViewUrl, resolvePublicModelAssetUrl } from '@/lib/modeller/model-store'

const ModellerStlPreview = dynamicImport(
  () =>
    import('@/components/modeller/ModellerStlPreview').then((m) => ({ default: m.ModellerStlPreview })),
  { ssr: false },
)
import { createClient } from '@/utils/supabase/client'
import { pickLocalizedProductText } from '@/lib/modeller/product-translations-anthropic'
import { type DbProduct3D, mapDbProductToUi } from '@/lib/modeller/supabase'

function getDetailCopy(locale: string) {
  if (locale === 'en') {
    return {
      notFound: 'MODEL NOT FOUND',
      backToCollection: '← Back to Collection',
      viewLabels: { on: 'Front', arka: 'Back', kenar: 'Side', ust: 'Top' },
      close: '✕ Close',
      dimensions: { width: 'Width', height: 'Height', depth: 'Depth', weight: 'Weight' },
      priceTitle: 'Digital Model Price',
      storyTitle: 'Design Story',
      packageTitle: 'What Is Included',
      packageItems: [
        { fmt: 'GLB', desc: '3D web viewer, AR, render' },
        { fmt: 'STL', desc: '3D printing, CNC production' },
      ],
      buy: '◆ Buy',
      footer: 'Instant download after payment · Secure delivery',
      licensePersonal: 'Personal Use',
      licenseCommercial: 'Commercial Use',
      convertGlbStl: 'Convert GLB → STL for Free',
      currencyLocale: 'en-US',
      viewerNoGlb: 'No GLB or STL preview is available for this model yet.',
      viewerGlbChecking: 'Checking preview…',
      viewerGlbMissing: 'The 3D file could not be loaded. It may be missing on the server or the link may be incorrect.',
    }
  }
  if (locale === 'de') {
    return {
      notFound: 'MODELL NICHT GEFUNDEN',
      backToCollection: '← Zurück zur Kollektion',
      viewLabels: { on: 'Vorne', arka: 'Hinten', kenar: 'Seite', ust: 'Oben' },
      close: '✕ Schließen',
      dimensions: { width: 'Breite', height: 'Höhe', depth: 'Tiefe', weight: 'Gewicht' },
      priceTitle: 'Preis des Digitalmodells',
      storyTitle: 'Designgeschichte',
      packageTitle: 'Im Paket enthalten',
      packageItems: [
        { fmt: 'GLB', desc: '3D-Webviewer, AR, Render' },
        { fmt: 'STL', desc: '3D-Druck, CNC-Produktion' },
      ],
      buy: '◆ Kaufen',
      footer: 'Sofortiger Download nach Zahlung · Sichere Lieferung',
      licensePersonal: 'Persönliche Nutzung',
      licenseCommercial: 'Kommerzielle Nutzung',
      convertGlbStl: 'Kostenlos GLB → STL konvertieren',
      currencyLocale: 'de-DE',
      viewerNoGlb: 'Für dieses Modell ist weder GLB- noch STL-Vorschau verknüpft.',
      viewerGlbChecking: 'Vorschau wird geprüft…',
      viewerGlbMissing: 'Die 3D-Datei konnte nicht geladen werden. Sie fehlt möglicherweise auf dem Server.',
    }
  }
  if (locale === 'ru') {
    return {
      notFound: 'МОДЕЛЬ НЕ НАЙДЕНА',
      backToCollection: '← Назад к коллекции',
      viewLabels: { on: 'Спереди', arka: 'Сзади', kenar: 'Сбоку', ust: 'Сверху' },
      close: '✕ Закрыть',
      dimensions: { width: 'Ширина', height: 'Высота', depth: 'Глубина', weight: 'Вес' },
      priceTitle: 'Цена цифровой модели',
      storyTitle: 'История дизайна',
      packageTitle: 'Что входит в пакет',
      packageItems: [
        { fmt: 'GLB', desc: '3D веб‑просмотр, AR, рендер' },
        { fmt: 'STL', desc: '3D печать, CNC производство' },
      ],
      buy: '◆ Купить',
      footer: 'Мгновенная загрузка после оплаты · Безопасная доставка',
      licensePersonal: 'Личное использование',
      licenseCommercial: 'Коммерческое использование',
      convertGlbStl: 'Конвертировать GLB → STL бесплатно',
      currencyLocale: 'ru-RU',
      viewerNoGlb: 'Для этой модели нет привязки GLB или STL для превью.',
      viewerGlbChecking: 'Проверка превью…',
      viewerGlbMissing: 'Не удалось загрузить 3D-файл. Возможно, он отсутствует на сервере.',
    }
  }
  return {
    notFound: 'MODEL BULUNAMADI',
    backToCollection: '← Koleksiyona Dön',
    viewLabels: { on: 'Ön', arka: 'Arka', kenar: 'Kenar', ust: 'Üst' },
    close: '✕ Kapat',
    dimensions: { width: 'Genişlik', height: 'Yükseklik', depth: 'Derinlik', weight: 'Ağırlık' },
    priceTitle: 'Dijital Model Fiyatı',
    storyTitle: 'Tasarım Hikayesi',
    packageTitle: 'Pakette Neler Var',
    packageItems: [
      { fmt: 'GLB', desc: '3D web görüntüleyici, AR, render' },
      { fmt: 'STL', desc: '3D baskı, CNC üretim' },
    ],
    buy: '◆ Satın Al',
    footer: 'Ödeme sonrası anında indir · Güvenli teslimat',
    licensePersonal: 'Kişisel Kullanım',
    licenseCommercial: 'Ticari Kullanım',
    convertGlbStl: 'Ücretsiz GLB → STL Dönüştür',
    currencyLocale: 'tr-TR',
    viewerNoGlb: 'Bu model için tanımlı GLB veya STL dosyası yok; önizleme gösterilemiyor.',
    viewerGlbChecking: 'Önizleme kontrol ediliyor…',
    viewerGlbMissing:
      '3D dosyası yüklenemedi. Dosya sunucuda olmayabilir veya bağlantı hatalı olabilir (yerelde public/models klasörüne yükleyin veya glb_url alanını kontrol edin).',
  }
}

export default function ModelDetayPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { locale } = useLanguage()
  const copy = getDetailCopy(locale)
  const { slug } = use(params)
  const [dbProduct, setDbProduct] = useState<ReturnType<typeof mapDbProductToUi> | null>(null)
  const [sellerEmail, setSellerEmail] = useState<string | null>(null)
  const [storeName, setStoreName] = useState<string | null>(null)
  const [sellerAvatar, setSellerAvatar] = useState<string | null>(null)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [messageSending, setMessageSending] = useState(false)
  const [messageSent, setMessageSent] = useState(false)
  const [messageError, setMessageError] = useState<string | null>(null)
  const [reviews, setReviews] = useState<Array<{ id: string; rating: number; comment: string; created_at: string; buyer_id: string }>>([])
  const [userReview, setUserReview] = useState<{ rating: number; comment: string } | null>(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewSuccess, setReviewSuccess] = useState(false)
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [sellerNoteRaw, setSellerNoteRaw] = useState<{
    tr: string | null; en: string | null; de: string | null; ru: string | null
  } | null>(null)
  const localizedSellerNote = sellerNoteRaw
    ? (locale === 'en' ? sellerNoteRaw.en : locale === 'de' ? sellerNoteRaw.de : locale === 'ru' ? sellerNoteRaw.ru : sellerNoteRaw.tr)?.trim() || null
    : null
  useEffect(() => {
    let alive = true
    const loadProduct = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('products_3d')
        .select('*')
        .eq('slug', slug)
        .maybeSingle()
      if (error) {
        console.error('[modeller:detail] supabase error', error)
        if (alive) {
          setDbProduct(null)
          setSellerEmail(null)
          setStoreName(null)
        }
        return
      }
      if (!alive) return
      const row = data as (DbProduct3D & { seller_email?: string | null }) | null
      setDbProduct(
        data
          ? ({
              ...mapDbProductToUi(data as DbProduct3D),
              seller_id: (data as { seller_id?: string | null }).seller_id ?? null,
            } as ReturnType<typeof mapDbProductToUi>)
          : null,
      )
      if (alive && data) {
        const r = data as Record<string, unknown>
        setSellerNoteRaw({
          tr: (r.seller_note   as string | null) ?? null,
          en: (r.seller_note_en as string | null) ?? null,
          de: (r.seller_note_de as string | null) ?? null,
          ru: (r.seller_note_ru as string | null) ?? null,
        })
      } else if (alive) {
        setSellerNoteRaw(null)
      }
      const email = row?.seller_email?.trim() || null
      setSellerEmail(email)
      const sellerId = (row as any)?.seller_id
      if (sellerId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('store_name, avatar_url')
          .eq('id', sellerId)
          .maybeSingle()
        if (alive) setStoreName(profile?.store_name ?? null)
        if (alive) setSellerAvatar(profile?.avatar_url ?? null)
      } else if (alive) {
        setStoreName(null)
      }
    }
    void loadProduct()
    return () => {
      alive = false
    }
  }, [slug])
  useEffect(() => {
    if (!dbProduct?.id) return
    const loadReviews = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user?.id ?? null)
      const { data } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, buyer_id')
        .eq('product_id', dbProduct.id)
        .order('created_at', { ascending: false })
      setReviews(data ?? [])
      if (user) {
        const existing = (data ?? []).find((r) => r.buyer_id === user.id)
        if (existing) setUserReview(existing)
      }
    }
    void loadReviews()
  }, [dbProduct?.id])
  useEffect(() => {
    if (!dbProduct?.id) return
    const track = async () => {
      const referrer = document.referrer
      let source = 'direct'
      if (referrer.includes('google') || referrer.includes('bing') || referrer.includes('yahoo')) source = 'organic'
      else if (referrer.includes('instagram') || referrer.includes('facebook') || referrer.includes('twitter') || referrer.includes('tiktok')) source = 'social'
      else if (referrer && !referrer.includes(window.location.hostname)) source = 'referral'
      try {
        await fetch('/api/page-view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            page_path: typeof window !== 'undefined' ? window.location.pathname : '/modeller',
            source,
            product_id: dbProduct.id,
          }),
        })
      } catch {
        /* izleme isteğe bağlı */
      }
    }
    void track()
  }, [dbProduct?.id])
  const dynamic = dbProduct
  const rawGlbHref =
    dynamic?.glbUrl && String(dynamic.glbUrl).trim() !== '' ? String(dynamic.glbUrl).trim() : null
  const glbUrl = rawGlbHref ? resolvePublicModelAssetUrl(rawGlbHref) : null
  const rawStlHref =
    dynamic?.stlUrl && String(dynamic.stlUrl).trim() !== '' ? String(dynamic.stlUrl).trim() : null
  const stlUrl = rawStlHref ? resolvePublicModelAssetUrl(rawStlHref) : null

  const [glbReachable, setGlbReachable] = useState<boolean | null>(null)
  useEffect(() => {
    if (!glbUrl) {
      setGlbReachable(false)
      return
    }
    if (typeof window !== 'undefined') {
      try {
        const u = new URL(glbUrl, window.location.origin)
        if (u.origin !== window.location.origin) {
          setGlbReachable(true)
          return
        }
      } catch {
        setGlbReachable(true)
        return
      }
    }
    let alive = true
    setGlbReachable(null)
    fetch(glbUrl, { method: 'HEAD', cache: 'no-store' })
      .then((r) => {
        if (alive) setGlbReachable(r.ok)
      })
      .catch(() => {
        if (alive) setGlbReachable(false)
      })
    return () => {
      alive = false
    }
  }, [glbUrl])
  const dynamicViewImages: Record<'on' | 'arka' | 'kenar' | 'ust', string | null> = {
    on: dynamic?.thumbnailViews?.on ?? dynamic?.thumbnailUrl ?? getThumbnailViewUrl(slug, 'on'),
    arka: dynamic?.thumbnailViews?.arka ?? getThumbnailViewUrl(slug, 'arka'),
    kenar: dynamic?.thumbnailViews?.kenar ?? getThumbnailViewUrl(slug, 'kenar'),
    ust: dynamic?.thumbnailViews?.ust ?? getThumbnailViewUrl(slug, 'ust'),
  }
  const product = dynamic
    ? {
        name: dynamic.name,
        story: dynamic.story || '',
        price: dynamic.price,
        tags: [dynamic.jewelryType],
        glbFile: slug,
        dimensions: dynamic.dimensions || { width: 22, height: 28, depth: 12 },
        weight: dynamic.weight || 8,
      }
    : undefined
  const [activeImage, setActiveImage] = useState<string | null>(null)
  const [selectedLicense, setSelectedLicense] = useState<'personal' | 'commercial'>('personal')
  const [viewerReady, setViewerReady] = useState(false)
  const viewerRef = useRef<HTMLDivElement>(null)
  const visibleActiveImage =
    activeImage &&
    (activeImage.startsWith(`/thumbnails/${slug}`) ||
      activeImage.includes('/thumbnails/'))
      ? activeImage
      : null
  useEffect(() => {
    let cancelled = false
    const markReady = () => {
      if (!cancelled) setViewerReady(true)
    }
    const bootModelViewer = async () => {
      if (typeof window === 'undefined') return
      if (window.customElements.get('model-viewer')) {
        markReady()
        return
      }
      const hasScript = !!document.querySelector('script[src*="model-viewer"]')
      if (!hasScript) {
        const script = document.createElement('script')
        script.type = 'module'
        script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js'
        script.setAttribute('data-model-viewer-loader', '1')
        document.head.appendChild(script)
      }
      try {
        await window.customElements.whenDefined('model-viewer')
        markReady()
      } catch {
        // Keep placeholder if definition fails.
      }
    }
    void bootModelViewer()
    return () => {
      cancelled = true
    }
  }, [])

  if (!product) {
    return (
      <main style={{ background: '#0a0a0a', color: '#e8e0d0', minHeight: '100vh' }}>
        <p
          style={{
            color: '#8a8278',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            letterSpacing: '0.2em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
          }}
        >
          {copy.notFound}
        </p>
      </main>
    )
  }
  const model = dbProduct!
  const { name: productName, story: productStory } = pickLocalizedProductText(locale, model.translations, {
    name: model.name,
    story: model.story,
    name_en: model.name_en,
    name_de: model.name_de,
    name_ru: model.name_ru,
    story_en: model.story_en,
    story_de: model.story_de,
    story_ru: model.story_ru,
  })
  const localizedProduct = {
    ...product,
    tags: [jewelryTypeLabel(dynamic?.jewelryType ?? 'Pandant', locale)],
  }
  const personalPrice =
    dynamic?.licensePersonalPrice && dynamic.licensePersonalPrice > 0
      ? dynamic.licensePersonalPrice
      : localizedProduct.price
  const commercialPrice =
    dynamic?.licenseCommercialPrice && dynamic.licenseCommercialPrice > 0
      ? dynamic.licenseCommercialPrice
      : Math.round(localizedProduct.price * 1.8)
  const selectedPrice = selectedLicense === 'commercial' ? commercialPrice : personalPrice

  const handleSendMessage = async () => {
    if (!messageText.trim()) return
    setMessageSending(true)
    setMessageError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setMessageError('Mesaj göndermek için giriş yapmalısınız.'); setMessageSending(false); return }
    const sellerId = (dbProduct as any)?.seller_id ?? null
    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: sellerId,
      product_id: dbProduct?.id ?? null,
      message: messageText.trim(),
    })
    if (error) { setMessageError('Mesaj gönderilemedi.'); setMessageSending(false); return }
    setMessageSent(true)
    setMessageSending(false)
    setTimeout(() => { setShowMessageModal(false); setMessageSent(false); setMessageText('') }, 2000)
  }

  const handleAddToCart = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const productId = dbProduct?.id ?? null
    await supabase.from('cart_events').insert({
      product_id: productId,
      user_id: user?.id ?? null,
      event_type: 'add',
    })
    window.location.href = `/checkout/${slug}?license=${selectedLicense}`
  }

  const handleReviewSubmit = async () => {
    if (!dbProduct?.id || reviewSubmitting) return
    setReviewSubmitting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setReviewSubmitting(false); return }
    const { error } = await supabase.from('reviews').insert({
      product_id: dbProduct.id,
      buyer_id: user.id,
      rating: reviewRating,
      comment: reviewComment.trim(),
    })
    if (!error) {
      setReviewSuccess(true)
      setUserReview({ rating: reviewRating, comment: reviewComment })
      const { data } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, buyer_id')
        .eq('product_id', dbProduct.id)
        .order('created_at', { ascending: false })
      setReviews(data ?? [])
    }
    setReviewSubmitting(false)
  }

  return (
    <main style={{ background: '#0a0a0a', color: '#e8e0d0', minHeight: '100vh' }}>
      {/* Header */}
      <header
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          padding: '1.5rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '10px',
              letterSpacing: '0.4em',
              color: '#c9a84c',
              textTransform: 'uppercase',
              marginBottom: '2px',
            }}
          >
            Trend Mücevher
          </div>
          <div
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.2rem',
              fontWeight: 300,
              letterSpacing: '0.1em',
            }}
          >
            Remaura Store
          </div>
        </div>
        <Link
          href="/modeller"
          style={{
            fontSize: '11px',
            color: '#8a8278',
            letterSpacing: '0.1em',
            textDecoration: 'none',
          }}
        >
          {copy.backToCollection}
        </Link>
      </header>

      <div
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '4rem 2rem',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '4rem',
          alignItems: 'start',
        }}
      >
        {/* SOL: 3D Viewer + Görseller */}
        <div>
          {(storeName || reviews.length > 0) && (
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {sellerAvatar ? (
                  <img src={sellerAvatar} alt={storeName ?? ''} className="h-6 w-6 rounded-full object-cover" />
                ) : storeName ? (
                  <div className="h-6 w-6 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px] font-bold text-amber-300">
                    {storeName.charAt(0).toUpperCase()}
                  </div>
                ) : null}
                {storeName && <span className="text-xs text-muted">{storeName}</span>}
              </div>
              {reviews.length > 0 && (
                <span className="text-xs text-[#c9a84c]">
                  ★ {(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)} ({reviews.length})
                </span>
              )}
            </div>
          )}
          {/* 3D Viewer */}
          <div
            ref={viewerRef}
            style={{
              background: '#111',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '2px',
              aspectRatio: '1',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div suppressHydrationWarning style={{ width: '100%', height: '100%' }}>
              {glbUrl && glbReachable === true && viewerReady ? (
                <>
                  {/* @ts-expect-error model-viewer is a custom element */}
                  <model-viewer
                    key={glbUrl}
                    src={glbUrl}
                    alt={productName}
                    suppressHydrationWarning
                    auto-rotate
                    rotation-per-second="30deg"
                    auto-rotate-delay="0"
                    camera-orbit="0deg 75deg 105%"
                    min-camera-orbit="auto 75deg auto"
                    max-camera-orbit="auto 75deg auto"
                    camera-controls
                    shadow-intensity="1.5"
                    exposure="1.2"
                    environment-image="https://modelviewer.dev/shared-assets/environments/moon_1k.hdr"
                    style={
                      {
                        width: '100%',
                        height: '100%',
                        display: 'block',
                        background: '#111111',
                        '--poster-color': '#111111',
                      } as React.CSSProperties
                    }
                  />
                </>
              ) : glbUrl && glbReachable === true && !viewerReady ? (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6f6a63',
                    fontSize: '12px',
                    letterSpacing: '0.08em',
                  }}
                >
                  3D viewer yukleniyor...
                </div>
              ) : glbUrl && glbReachable === null ? (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6f6a63',
                    fontSize: '12px',
                    letterSpacing: '0.08em',
                  }}
                >
                  {copy.viewerGlbChecking}
                </div>
              ) : stlUrl && (!glbUrl || glbReachable === false) ? (
                <ModellerStlPreview stlUrl={stlUrl} />
              ) : glbUrl && glbReachable === false && !stlUrl ? (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1.5rem',
                    textAlign: 'center',
                    color: '#8a7060',
                    fontSize: '12px',
                    letterSpacing: '0.05em',
                    lineHeight: 1.6,
                  }}
                >
                  {copy.viewerGlbMissing}
                </div>
              ) : !glbUrl && !stlUrl ? (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1.5rem',
                    textAlign: 'center',
                    color: '#6f6a63',
                    fontSize: '12px',
                    letterSpacing: '0.06em',
                    lineHeight: 1.6,
                  }}
                >
                  {copy.viewerNoGlb}
                </div>
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6f6a63',
                    fontSize: '12px',
                    letterSpacing: '0.08em',
                  }}
                >
                  3D viewer yukleniyor...
                </div>
              )}
            </div>

            {/* Format badge */}
            <div
              style={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                display: 'flex',
                gap: '6px',
              }}
            >
              {['GLB', 'STL'].map((fmt) => (
                <span
                  key={fmt}
                  style={{
                    fontSize: '9px',
                    letterSpacing: '0.15em',
                    background: 'rgba(201,168,76,0.08)',
                    color: '#c9a84c',
                    border: '1px solid rgba(201,168,76,0.15)',
                    padding: '3px 8px',
                    borderRadius: '2px',
                  }}
                >
                  {fmt}
                </span>
              ))}
            </div>
          </div>

          {/* 4 Görsel — Ön, Arka, Kenar, Üst */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
              marginTop: '8px',
            }}
          >
            {[
              { key: 'on', label: copy.viewLabels.on },
              { key: 'arka', label: copy.viewLabels.arka },
              { key: 'kenar', label: copy.viewLabels.kenar },
              { key: 'ust', label: copy.viewLabels.ust },
            ].map((view) => {
              const src = dynamic
                ? dynamicViewImages[view.key as keyof typeof dynamicViewImages]
                : `/thumbnails/${slug}-${view.key}.jpg`
              return (
                <div
                  key={view.key}
                  onClick={() => setActiveImage(src)}
                  style={{
                    aspectRatio: '1',
                    background: '#111',
                    border: `1px solid ${visibleActiveImage === src ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: '2px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {src ? (
                    <img
                      src={src}
                      alt={view.label}
                      style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : null}
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '4px',
                      left: '0',
                      right: '0',
                      textAlign: 'center',
                      fontSize: '9px',
                      letterSpacing: '0.1em',
                      color: '#4a4642',
                      textTransform: 'uppercase',
                    }}
                  >
                    {view.label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Yorumlar */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Değerlendirmeler ({reviews.length})
            </h3>
            {currentUser && !userReview && (
              <div className="mb-4 rounded-xl border border-border/40 bg-white/[0.02] p-4">
                <div className="flex gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" onClick={() => setReviewRating(star)} className="text-xl" style={{ color: star <= reviewRating ? '#c9a84c' : '#444' }}>★</button>
                  ))}
                </div>
                <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Deneyiminizi paylaşın..." rows={3} className="w-full rounded-lg border border-border/40 bg-black/20 px-3 py-2 text-sm text-foreground outline-none resize-none" />
                {reviewSuccess ? (
                  <p className="mt-2 text-xs text-emerald-400">✓ Yorumunuz eklendi.</p>
                ) : (
                  <button type="button" onClick={() => void handleReviewSubmit()} disabled={reviewSubmitting || !reviewComment.trim()} className="mt-3 rounded-lg bg-[#c9a84c]/20 border border-[#c9a84c]/30 px-4 py-2 text-xs font-semibold text-[#c9a84c] disabled:opacity-50">
                    {reviewSubmitting ? 'Gönderiliyor...' : 'Yorumu Gönder'}
                  </button>
                )}
              </div>
            )}
            {!currentUser && <p className="text-xs text-muted mb-3">Yorum için <a href="/giris" className="text-[#c9a84c]">giriş yapın</a>.</p>}
            {reviews.length === 0 ? (
              <p className="text-xs text-muted">Henüz değerlendirme yok.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {reviews.map((r) => (
                  <div key={r.id} className="rounded-xl border border-border/40 bg-white/[0.02] p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-[#c9a84c]">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                      <span className="text-[10px] text-muted">{new Date(r.created_at).toLocaleDateString('tr-TR')}</span>
                    </div>
                    <p className="text-sm text-foreground">{r.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seçili görsel büyük göster */}
          {visibleActiveImage && (
            <div
              style={{
                marginTop: '8px',
                background: '#111',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '2px',
                overflow: 'hidden',
                aspectRatio: '1',
                position: 'relative',
              }}
              onClick={() => setActiveImage(null)}
            >
              <img
                src={visibleActiveImage}
                alt="Detay"
                style={{ objectFit: 'cover', width: '100%', height: '100%', display: 'block' }}
              />
              <span
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  fontSize: '9px',
                  color: '#4a4642',
                  letterSpacing: '0.1em',
                }}
              >
                {copy.close}
              </span>
            </div>
          )}

          {/* Boyutlar */}
          <div
            style={{
              marginTop: '8px',
              padding: '1rem',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '2px',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1rem',
            }}
          >
            {[
              { label: copy.dimensions.width, value: `${product.dimensions.width}mm` },
              { label: copy.dimensions.height, value: `${product.dimensions.height}mm` },
              { label: copy.dimensions.depth, value: `${product.dimensions.depth}mm` },
              { label: copy.dimensions.weight, value: `~${product.weight}g` },
            ].map((item) => (
              <div key={item.label} style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: '9px',
                    color: '#4a4642',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.1rem',
                    fontWeight: 300,
                    color: '#e8e0d0',
                  }}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SAĞ: Bilgi */}
        <div style={{ paddingTop: '1rem' }}>
          {/* Tags */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {localizedProduct.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: '9px',
                  letterSpacing: '0.1em',
                  color: '#4a4642',
                  border: '1px solid rgba(255,255,255,0.07)',
                  padding: '3px 8px',
                  borderRadius: '2px',
                  textTransform: 'uppercase',
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* İsim */}
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '2.8rem',
              fontWeight: 300,
              letterSpacing: '0.05em',
              lineHeight: 1.2,
              marginBottom: '2rem',
            }}
          >
            {productName}
          </h1>

          {/* Fiyat */}
          <div
            style={{
              marginBottom: '2rem',
              paddingBottom: '2rem',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                letterSpacing: '0.2em',
                color: '#4a4642',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}
            >
              {copy.priceTitle}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '2.5rem',
                fontWeight: 300,
                color: '#c9a84c',
              }}
            >
              ₺{localizedProduct.price.toLocaleString(copy.currencyLocale)}
            </div>
          </div>

          {/* Hikaye */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div
              style={{
                fontSize: '10px',
                letterSpacing: '0.2em',
                color: '#c9a84c',
                textTransform: 'uppercase',
                marginBottom: '1rem',
              }}
            >
              {copy.storyTitle}
            </div>
            <p
              style={{
                color: '#8a8278',
                lineHeight: 2,
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontSize: '1rem',
                fontWeight: 300,
                whiteSpace: 'pre-line',
              }}
            >
              {productStory}
            </p>
          </div>

          {/* Ne alacaksın */}
          <div
            style={{
              marginBottom: '2.5rem',
              padding: '1.25rem',
              background: '#111',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '2px',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                letterSpacing: '0.2em',
                color: '#4a4642',
                textTransform: 'uppercase',
                marginBottom: '1rem',
              }}
            >
              {copy.packageTitle}
            </div>
            {copy.packageItems.map((item) => (
              <div
                key={item.fmt}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: '9px',
                    letterSpacing: '0.1em',
                    background: 'rgba(201,168,76,0.08)',
                    color: '#c9a84c',
                    border: '1px solid rgba(201,168,76,0.15)',
                    padding: '3px 8px',
                    borderRadius: '2px',
                    minWidth: '42px',
                    textAlign: 'center',
                  }}
                >
                  {item.fmt}
                </span>
                <span style={{ fontSize: '12px', color: '#8a8278' }}>{item.desc}</span>
              </div>
            ))}
          </div>

          <div
            style={{
              marginBottom: '12px',
              padding: '12px',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '2px',
              background: '#111',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                marginBottom: '10px',
                color: '#d5cfc5',
                fontSize: '12px',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="radio"
                  name="license"
                  checked={selectedLicense === 'personal'}
                  onChange={() => setSelectedLicense('personal')}
                />
                {copy.licensePersonal}
              </span>
              <span style={{ color: '#c9a84c' }}>₺{personalPrice.toLocaleString(copy.currencyLocale)}</span>
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                color: '#d5cfc5',
                fontSize: '12px',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="radio"
                  name="license"
                  checked={selectedLicense === 'commercial'}
                  onChange={() => setSelectedLicense('commercial')}
                />
                {copy.licenseCommercial}
              </span>
              <span style={{ color: '#c9a84c' }}>₺{commercialPrice.toLocaleString(copy.currencyLocale)}</span>
            </label>
          </div>

          {/* Satın Al */}
          <button
            type="button"
            onClick={() => void handleAddToCart()}
            style={{
              width: '100%',
              padding: '16px',
              background: 'transparent',
              border: '1px solid #c9a84c',
              color: '#c9a84c',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              borderRadius: '2px',
              marginBottom: '12px',
              transition: 'all 0.2s',
              display: 'block',
              textAlign: 'center',
              textDecoration: 'none',
            }}
          >
            {copy.buy} — ₺{selectedPrice.toLocaleString(copy.currencyLocale)}
          </button>

          {localizedSellerNote && (
            <div className="mt-4 rounded-xl border border-border/40 bg-white/[0.02] p-4 text-sm text-muted">
              {localizedSellerNote}
              <Link
                href="/convert"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#c9a84c]/40 bg-[#c9a84c]/10 px-3 py-1.5 text-xs font-medium text-[#c9a84c] transition-colors hover:bg-[#c9a84c]/20 hover:border-[#c9a84c]/60"
              >
                {copy.convertGlbStl}
              </Link>
            </div>
          )}

          {(storeName || sellerEmail) && (
            <div className="mt-4 rounded-xl border border-border/40 bg-white/[0.03] p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Satıcı</p>
              <button type="button" onClick={() => setShowMessageModal(true)} className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-border/40 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-white/[0.06]">
                Mesaj Gönder
              </button>
            </div>
          )}

          <p
            style={{
              fontSize: '10px',
              color: '#4a4642',
              textAlign: 'center',
              letterSpacing: '0.1em',
              lineHeight: 1.8,
            }}
          >
            {copy.footer}
          </p>
        </div>
      </div>

      {showMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl border border-border/40 bg-[#0f1117] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Satıcıya Mesaj Gönder</h3>
              <button type="button" onClick={() => setShowMessageModal(false)} className="text-muted hover:text-foreground">✕</button>
            </div>
            {storeName && <p className="mb-3 text-xs text-muted">Alıcı: <span className="text-foreground font-medium">{storeName}</span></p>}
            <p className="mb-3 text-xs text-muted">Ürün: <span className="text-foreground font-medium">{productName}</span></p>
            {messageSent ? (
              <p className="text-center text-sm text-emerald-400 py-4">✓ Mesajınız gönderildi!</p>
            ) : (
              <>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Mesajınızı yazın..."
                  rows={4}
                  className="w-full rounded-lg border border-border/40 bg-white/[0.04] px-3 py-2 text-sm text-foreground outline-none resize-none"
                />
                {messageError && <p className="mt-2 text-xs text-red-400">{messageError}</p>}
                <button
                  type="button"
                  onClick={() => void handleSendMessage()}
                  disabled={messageSending || !messageText.trim()}
                  className="mt-3 w-full rounded-lg bg-amber-500/20 border border-amber-500/30 px-4 py-2.5 text-sm font-semibold text-amber-200 hover:bg-amber-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {messageSending ? 'Gönderiliyor...' : 'Gönder'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
