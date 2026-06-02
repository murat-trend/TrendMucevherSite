"use client";

import Link from 'next/link'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { useCurrency } from '@/context/CurrencyContext'
import { useState } from 'react'
import { type Ui3DModel } from '@/lib/modeller/supabase'
import { jewelryTypeLabel } from '@/lib/modeller/jewelry-labels'

type ModellerCategoryId = 'all' | 'ring' | 'mens_ring' | 'necklace' | 'earring' | 'bracelet' | 'brooch'

function matchesCategoryFilter(
  p: { jewelryType: Ui3DModel['jewelryType']; name: string; story: string; slug: string },
  filterId: ModellerCategoryId,
): boolean {
  if (filterId === 'all') return true
  const j = p.jewelryType
  const hay = `${p.name} ${p.story} ${p.slug}`.toLowerCase()
  const mensRingHint = /erkek|mens|men|male|мужск|herren|herrenring|masculin|men'?s|мужской|männer/i.test(hay)
  switch (filterId) {
    case 'ring':      return j === 'Yüzük' && !mensRingHint
    case 'mens_ring': return j === 'Yüzük' && mensRingHint
    case 'necklace':  return j === 'Kolye' || j === 'Pandant'
    case 'earring':   return j === 'Küpe'
    case 'bracelet':  return j === 'Bilezik'
    case 'brooch':    return j === 'Broş'
    default:          return true
  }
}

function getPageCopy(locale: string) {
  if (locale === 'en') return {
    heading: '3D Jewelry Portfolio',
    intro: 'Each model is delivered in STL and GLB formats. Buy, download, produce.',
    inspect: 'View',
    free: 'Free Download',
    buy: 'Buy',
    filterCategories: [
      { id: 'all' as const, label: 'All' },
      { id: 'ring' as const, label: 'Rings' },
      { id: 'mens_ring' as const, label: "Men's rings" },
      { id: 'necklace' as const, label: 'Necklaces' },
      { id: 'earring' as const, label: 'Earrings' },
      { id: 'bracelet' as const, label: 'Bracelets' },
      { id: 'brooch' as const, label: 'Brooches' },
    ],
  }
  if (locale === 'de') return {
    heading: '3D Schmuck Portfolio',
    intro: 'Jedes Modell wird in STL- und GLB-Formaten geliefert. Kaufen, herunterladen, produzieren.',
    inspect: 'Ansehen',
    free: 'Kostenlos laden',
    buy: 'Kaufen',
    filterCategories: [
      { id: 'all' as const, label: 'Alle' },
      { id: 'ring' as const, label: 'Ringe' },
      { id: 'mens_ring' as const, label: 'Herrenringe' },
      { id: 'necklace' as const, label: 'Ketten' },
      { id: 'earring' as const, label: 'Ohrringe' },
      { id: 'bracelet' as const, label: 'Armreife' },
      { id: 'brooch' as const, label: 'Broschen' },
    ],
  }
  if (locale === 'ru') return {
    heading: '3D Ювелирное Портфолио',
    intro: 'Каждая модель поставляется в форматах STL и GLB.',
    inspect: 'Открыть',
    free: 'Скачать бесплатно',
    buy: 'Купить',
    filterCategories: [
      { id: 'all' as const, label: 'Все' },
      { id: 'ring' as const, label: 'Кольца' },
      { id: 'mens_ring' as const, label: 'Мужские кольца' },
      { id: 'necklace' as const, label: 'Колье' },
      { id: 'earring' as const, label: 'Серьги' },
      { id: 'bracelet' as const, label: 'Браслеты' },
      { id: 'brooch' as const, label: 'Броши' },
    ],
  }
  return {
    heading: '3D Mücevher Portföyü',
    intro: 'Her model STL ve GLB formatında teslim edilir. Satın al, indir, üret.',
    inspect: 'İncele',
    free: 'Ücretsiz İndir',
    buy: 'Satın Al',
    filterCategories: [
      { id: 'all' as const, label: 'Tümü' },
      { id: 'ring' as const, label: 'Yüzük' },
      { id: 'mens_ring' as const, label: 'Erkek Yüzük' },
      { id: 'necklace' as const, label: 'Kolye' },
      { id: 'earring' as const, label: 'Küpe' },
      { id: 'bracelet' as const, label: 'Bilezik' },
      { id: 'brooch' as const, label: 'Broş' },
    ],
  }
}

export function PortfolyoPageClient({ models }: { models: Ui3DModel[] }) {
  const { locale } = useLanguage()
  const { formatPrice } = useCurrency()
  const copy = getPageCopy(locale)
  const [selectedCategory, setSelectedCategory] = useState<ModellerCategoryId | null>(null)

  const items = models.map((m) => ({
    slug: m.slug,
    price: m.price,
    name: m.name,
    story: m.story ?? '',
    jewelryType: m.jewelryType,
    tag: jewelryTypeLabel(m.jewelryType, locale),
    thumbnailUrl: m.thumbnailViews?.on ?? m.thumbnailUrl ?? null,
    videoUrl: m.videoUrl ?? null,
    isFree: m.isFree,
  }))

  const filtered = selectedCategory === null
    ? items
    : items.filter((p) => matchesCategoryFilter(p, selectedCategory))

  return (
    <main className="min-h-screen" style={{ background: '#0a0a0a', color: '#e8e0d0' }}>
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '10px', letterSpacing: '0.4em', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '2px' }}>
            Trend Mücevher
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 300, letterSpacing: '0.1em' }}>
            Portföy
          </div>
        </div>
        <div style={{ fontSize: '11px', color: '#8a8278', letterSpacing: '0.1em' }}>
          {filtered.length} model
        </div>
      </header>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '4rem 2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '3rem', fontWeight: 300, letterSpacing: '0.1em', marginBottom: '1rem' }}>
            {copy.heading}
          </h1>
          <p style={{ color: '#8a8278', fontSize: '13px', maxWidth: '400px', margin: '0 auto', lineHeight: 1.8 }}>
            {copy.intro}
          </p>
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          {copy.filterCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id === 'all' ? null : (cat.id as Exclude<ModellerCategoryId, 'all'>))}
              className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                (cat.id === 'all' && selectedCategory === null) || selectedCategory === cat.id
                  ? 'border-[#c9a84c] bg-[#c9a84c]/10 text-[#c9a84c]'
                  : 'border-border/40 text-muted hover:border-[#c9a84c]/40 hover:text-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {filtered.map((product) => (
            <div
              key={product.slug}
              style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: '2px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
            >
              {/* Media — video loop veya thumbnail */}
              <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', overflow: 'hidden', background: '#0a0a0a', flexShrink: 0 }}>
                {product.videoUrl ? (
                  <video
                    src={product.videoUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : product.thumbnailUrl ? (
                  <img
                    src={product.thumbnailUrl}
                    alt={product.name}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                ) : (
                  <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', fontSize: '3rem', opacity: 0.15 }}>◈</span>
                )}
                <div style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '9px', letterSpacing: '0.15em', background: 'rgba(201,168,76,0.1)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.2)', padding: '3px 8px', borderRadius: '2px' }}>
                  {product.isFree ? 'FREE' : 'GLB + STL'}
                </div>
              </div>

              {/* Bilgi */}
              <div style={{ padding: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.07)', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '9px', letterSpacing: '0.1em', color: '#4a4642', border: '1px solid rgba(255,255,255,0.07)', padding: '2px 7px', borderRadius: '2px', alignSelf: 'flex-start' }}>
                  {product.tag}
                </span>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 300, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '3.24em' }}>
                  {product.name}
                </h2>
                <p style={{ color: '#8a8278', fontSize: '12px', lineHeight: 1.7, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '2.7rem', marginBottom: '4px' }}>
                  {product.story}
                </p>

                {/* CTA */}
                {product.isFree ? (
                  <Link
                    href={`/modeller/${product.slug}`}
                    style={{ display: 'block', padding: '10px', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.35)', color: '#c9a84c', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', borderRadius: '2px', textAlign: 'center', textDecoration: 'none', transition: 'background 0.2s', marginTop: 'auto' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(201,168,76,0.22)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(201,168,76,0.12)')}
                  >
                    {copy.free}
                  </Link>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '4px' }}>
                    <span style={{ color: '#c9a84c', fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 300 }}>
                      {formatPrice(product.price)}
                    </span>
                    <Link
                      href={`/modeller/${product.slug}`}
                      style={{ fontSize: '10px', letterSpacing: '0.15em', color: '#8a8278', textDecoration: 'none', textTransform: 'uppercase' }}
                    >
                      {copy.inspect} →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
