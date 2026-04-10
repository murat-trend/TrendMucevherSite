'use client'

import Link from 'next/link'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { type DbProduct3D, type Ui3DModel, mapDbProductToUi } from '@/lib/modeller/supabase'
import { jewelryTypeLabel } from '@/lib/modeller/jewelry-labels'
import { getModelGlbUrl, getThumbnailViewUrl } from '@/lib/modeller/model-store'

type DemoCard = { name: string; story: string; tags: string[] }

type ModellerCategoryId = 'all' | 'ring' | 'mens_ring' | 'necklace' | 'earring' | 'bracelet' | 'brooch'

function matchesModellerCategoryFilter(
  p: { jewelryType: Ui3DModel['jewelryType']; name: string; story: string; slug: string },
  filterId: ModellerCategoryId,
): boolean {
  if (filterId === 'all') return true
  const j = p.jewelryType
  const hay = `${p.name} ${p.story} ${p.slug}`.toLowerCase()
  const mensRingHint =
    /erkek|mens|men|male|мужск|herren|herrenring|masculin|men'?s|мужской|männer/i.test(hay)

  switch (filterId) {
    case 'ring':
      return j === 'Yüzük' && !mensRingHint
    case 'mens_ring':
      return j === 'Yüzük' && mensRingHint
    case 'necklace':
      return j === 'Kolye' || j === 'Pandant'
    case 'earring':
      return j === 'Küpe'
    case 'bracelet':
      return j === 'Bilezik'
    case 'brooch':
      return j === 'Broş'
    default:
      return true
  }
}

const baseProducts = [
  {
    slug: 'melek-yuzuk',
    price: 1200,
  },
  {
    slug: 'kurt-yuzuk',
    price: 950,
  },
  {
    slug: 'ejderha-kolye',
    price: 1500,
  },
  {
    slug: 'aslan-yuzuk',
    price: 1100,
  },
  {
    slug: 'melek-kolye',
    price: 1350,
  },
  {
    slug: 'kafatasi-yuzuk',
    price: 880,
  },
]

function getPageCopy(locale: string) {
  if (locale === 'en') {
    return {
      modelLabel: 'Models',
      collectionTitle: 'Digital Collection',
      heading: '3D Jewelry Models',
      intro: 'Each model is delivered in STL and GLB formats. Buy, download, produce.',
      inspect: 'Review',
      filterCategories: [
        { id: 'all' as const, label: 'All' },
        { id: 'ring' as const, label: 'Rings' },
        { id: 'mens_ring' as const, label: "Men's rings" },
        { id: 'necklace' as const, label: 'Necklaces & pendants' },
        { id: 'earring' as const, label: 'Earrings' },
        { id: 'bracelet' as const, label: 'Bracelets' },
        { id: 'brooch' as const, label: 'Brooches' },
      ],
      products: {
        'melek-yuzuk': {
          name: 'Angel Ring',
          story: 'A mystical design inspired by Byzantine motifs, crafted with wing ornaments.',
          tags: ['Ring', 'Silver', 'Figurative'],
        },
        'kurt-yuzuk': {
          name: 'Wolf Head Ring',
          story: 'A men’s ring inspired by epic wolf mythology with deep relief craftsmanship.',
          tags: ['Ring', 'Gold', 'Animal'],
        },
        'ejderha-kolye': {
          name: 'Dragon Pendant',
          story: 'A dragon pendant design inspired by eastern mythology and 3D sculptural form.',
          tags: ['Pendant', 'Silver', 'Mythology'],
        },
        'aslan-yuzuk': {
          name: 'Lion Ring',
          story: 'A symbolic lion ring with detailed relief carving and a bold character.',
          tags: ['Ring', 'Gold', 'Animal'],
        },
        'melek-kolye': {
          name: 'Guardian Angel Pendant',
          story: 'A gothic pendant with guardian wings and spiritual symbolism.',
          tags: ['Pendant', 'Silver', 'Figurative'],
        },
        'kafatasi-yuzuk': {
          name: 'Vanitas Ring',
          story: 'A Vanitas-inspired ring merging mortality symbolism with modern jewelry.',
          tags: ['Ring', 'Oxidized', 'Symbolic'],
        },
      } as Record<string, { name: string; story: string; tags: string[] }>,
    }
  }
  if (locale === 'de') {
    return {
      modelLabel: 'Modelle',
      collectionTitle: 'Digitale Kollektion',
      heading: '3D Schmuckmodelle',
      intro: 'Jedes Modell wird in STL- und GLB-Formaten geliefert. Kaufen, herunterladen, produzieren.',
      inspect: 'Ansehen',
      filterCategories: [
        { id: 'all' as const, label: 'Alle' },
        { id: 'ring' as const, label: 'Ringe' },
        { id: 'mens_ring' as const, label: 'Herrenringe' },
        { id: 'necklace' as const, label: 'Ketten & Anhänger' },
        { id: 'earring' as const, label: 'Ohrringe' },
        { id: 'bracelet' as const, label: 'Armreife' },
        { id: 'brooch' as const, label: 'Broschen' },
      ],
      products: {
        'melek-yuzuk': {
          name: 'Engelsring',
          story: 'Ein mystisches Design mit Flügelmotiven, inspiriert von der byzantinischen Kunst.',
          tags: ['Ring', 'Silber', 'Figurativ'],
        },
        'kurt-yuzuk': {
          name: 'Wolfskopf-Ring',
          story: 'Ein markanter Ring mit tiefem Relief, inspiriert von der Wolfslegende.',
          tags: ['Ring', 'Gold', 'Tier'],
        },
        'ejderha-kolye': {
          name: 'Drachen-Anhänger',
          story: 'Anhängerdesign mit Drachenfigur, inspiriert von östlicher Mythologie.',
          tags: ['Anhänger', 'Silber', 'Mythologie'],
        },
        'aslan-yuzuk': {
          name: 'Löwenring',
          story: 'Ein detailreicher Löwenring als Symbol für Stärke und Mut.',
          tags: ['Ring', 'Gold', 'Tier'],
        },
        'melek-kolye': {
          name: 'Schutzengel-Anhänger',
          story: 'Gotischer Anhänger mit Engelsflügeln und spirituellem Ausdruck.',
          tags: ['Anhänger', 'Silber', 'Figurativ'],
        },
        'kafatasi-yuzuk': {
          name: 'Vanitas-Ring',
          story: 'Ein Vanitas-inspirierter Ring zwischen Symbolik und modernem Design.',
          tags: ['Ring', 'Oxidiert', 'Symbolisch'],
        },
      } as Record<string, { name: string; story: string; tags: string[] }>,
    }
  }
  if (locale === 'ru') {
    return {
      modelLabel: 'Модели',
      collectionTitle: 'Цифровая коллекция',
      heading: '3D Ювелирные Модели',
      intro: 'Каждая модель поставляется в форматах STL и GLB. Покупайте, скачивайте, производите.',
      inspect: 'Открыть',
      filterCategories: [
        { id: 'all' as const, label: 'Все' },
        { id: 'ring' as const, label: 'Кольца' },
        { id: 'mens_ring' as const, label: 'Мужские кольца' },
        { id: 'necklace' as const, label: 'Колье и подвески' },
        { id: 'earring' as const, label: 'Серьги' },
        { id: 'bracelet' as const, label: 'Браслеты' },
        { id: 'brooch' as const, label: 'Броши' },
      ],
      products: {
        'melek-yuzuk': {
          name: 'Кольцо Ангела',
          story: 'Мистический дизайн с крыльями, вдохновленный византийским искусством.',
          tags: ['Кольцо', 'Серебро', 'Фигуратив'],
        },
        'kurt-yuzuk': {
          name: 'Кольцо Голова Волка',
          story: 'Мужское кольцо с глубоким рельефом, вдохновленное легендой о волке.',
          tags: ['Кольцо', 'Золото', 'Животное'],
        },
        'ejderha-kolye': {
          name: 'Кулон Дракон',
          story: 'Дизайн кулона с фигурой дракона в стиле восточной мифологии.',
          tags: ['Кулон', 'Серебро', 'Мифология'],
        },
        'aslan-yuzuk': {
          name: 'Кольцо Лев',
          story: 'Кольцо с детализированным рельефом льва — символ силы и смелости.',
          tags: ['Кольцо', 'Золото', 'Животное'],
        },
        'melek-kolye': {
          name: 'Кулон Ангел-Хранитель',
          story: 'Готический кулон с крыльями ангела и духовным смыслом.',
          tags: ['Кулон', 'Серебро', 'Фигуратив'],
        },
        'kafatasi-yuzuk': {
          name: 'Кольцо Vanitas',
          story: 'Кольцо в духе Vanitas: символика бренности и современное ювелирное искусство.',
          tags: ['Кольцо', 'Оксид', 'Символика'],
        },
      } as Record<string, { name: string; story: string; tags: string[] }>,
    }
  }
  return {
    modelLabel: 'Model',
    collectionTitle: 'Dijital Koleksiyon',
    heading: '3D Mücevher Modelleri',
    intro: 'Her model STL ve GLB formatında teslim edilir. Satın al, indir, üret.',
    inspect: 'Incele',
    filterCategories: [
      { id: 'all' as const, label: 'Tümü' },
      { id: 'ring' as const, label: 'Yüzük' },
      { id: 'mens_ring' as const, label: 'Erkek Yüzük' },
      { id: 'necklace' as const, label: 'Kolye' },
      { id: 'earring' as const, label: 'Küpe' },
      { id: 'bracelet' as const, label: 'Bilezik' },
      { id: 'brooch' as const, label: 'Broş' },
    ],
    products: {
      'melek-yuzuk': {
        name: 'Melek Yüzüğü',
        story: 'Bizans döneminden ilham alınan, kanat motifleriyle işlenmiş mistik bir tasarım.',
        tags: ['Yüzük', 'Gümüş', 'Figüratif'],
      },
      'kurt-yuzuk': {
        name: 'Kurt Başı Yüzük',
        story: 'Bozkurt efsanesinden doğan, derin kabartma tekniğiyle işlenmiş erkek yüzüğü.',
        tags: ['Yüzük', 'Altın', 'Hayvan'],
      },
      'ejderha-kolye': {
        name: 'Ejderha Kolye',
        story: 'Doğu mitolojisinden ilham alınan, üç boyutlu ejderha figürlü kolye tasarımı.',
        tags: ['Kolye', 'Gümüş', 'Mitoloji'],
      },
      'aslan-yuzuk': {
        name: 'Aslan Yüzüğü',
        story: 'Güç ve cesaretin simgesi, detaylı aslan kabartmalı özel tasarım yüzük.',
        tags: ['Yüzük', 'Altın', 'Hayvan'],
      },
      'melek-kolye': {
        name: 'Koruyucu Melek Kolye',
        story: 'Azizlerin ruhunu koruyan kanatlar — gotik detaylarla işlenmiş kolye.',
        tags: ['Kolye', 'Gümüş', 'Figüratif'],
      },
      'kafatasi-yuzuk': {
        name: 'Vanitas Yüzük',
        story: 'Rönesans döneminin ölümlülük sembolizmi, modern kuyumculukla buluşuyor.',
        tags: ['Yüzük', 'Okside', 'Sembolik'],
      },
    } as Record<string, { name: string; story: string; tags: string[] }>,
  }
}

export default function ModellerPage() {
  const { locale } = useLanguage()
  const copy = getPageCopy(locale)
  const [models, setModels] = useState<ReturnType<typeof mapDbProductToUi>[]>([])
  const [selectedCategory, setSelectedCategory] = useState<ModellerCategoryId | null>(null)
  const localeMap: Record<string, string> = {
    tr: 'tr-TR',
    en: 'en-US',
    de: 'de-DE',
    ru: 'ru-RU',
  }
  useEffect(() => {
    let alive = true
    const loadModels = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('products_3d')
        .select('*')
        .eq('is_published', true)
        .eq('show_on_modeller', true)
        .order('created_at', { ascending: false })
      if (error) {
        console.error('[modeller:list] supabase error', error)
        if (alive) setModels([])
        return
      }
      if (!alive) return
      setModels(((data ?? []) as DbProduct3D[]).map(mapDbProductToUi))
    }
    void loadModels()
    return () => {
      alive = false
    }
  }, [])
  const demoBySlug = copy.products as Record<string, DemoCard>
  const mockProducts = models.map((m) => {
    const demo = demoBySlug[m.slug]
    const storyDb = (m.story ?? "").trim()
    const nameDb = (m.name ?? "").trim()
    return {
      slug: m.slug,
      price: m.price,
      name: nameDb || demo?.name || m.name,
      story: storyDb || demo?.story || "",
      tags: [jewelryTypeLabel(m.jewelryType, locale)],
      jewelryType: m.jewelryType,
      thumbnailUrl: m.thumbnailViews.on || m.thumbnailUrl || getThumbnailViewUrl(m.slug, "on"),
      glbUrl: m.glbUrl || getModelGlbUrl(m.slug),
    }
  })

  const filteredProducts =
    selectedCategory === null
      ? mockProducts
      : mockProducts.filter((p) => matchesModellerCategoryFilter(p, selectedCategory))

  return (
    <main className="min-h-screen" style={{ background: '#0a0a0a', color: '#e8e0d0' }}>
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
        <div style={{ fontSize: '11px', color: '#8a8278', letterSpacing: '0.1em' }}>
          {mockProducts.length} {copy.modelLabel}
        </div>
      </header>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '4rem 2rem' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <p
            style={{
              fontSize: '10px',
              letterSpacing: '0.4em',
              color: '#c9a84c',
              textTransform: 'uppercase',
              marginBottom: '1rem',
            }}
          >
            {copy.collectionTitle}
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '3rem',
              fontWeight: 300,
              letterSpacing: '0.1em',
              marginBottom: '1rem',
            }}
          >
            {copy.heading}
          </h1>
          <p
            style={{
              color: '#8a8278',
              fontSize: '13px',
              maxWidth: '400px',
              margin: '0 auto',
              lineHeight: 1.8,
            }}
          >
            {copy.intro}
          </p>
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          {copy.filterCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() =>
                setSelectedCategory(cat.id === 'all' ? null : (cat.id as Exclude<ModellerCategoryId, 'all'>))
              }
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

        {/* Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.5rem',
            alignItems: 'stretch',
          }}
        >
          {filteredProducts.map((product) => (
            <Link
              key={product.slug}
              href={`/modeller/${product.slug}`}
              style={{
                textDecoration: 'none',
                color: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
                minHeight: '100%',
                alignSelf: 'stretch',
                width: '100%',
              }}
            >
              <div
                style={{
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  transition: 'border-color 0.3s',
                  cursor: 'pointer',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                  width: '100%',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')
                }
              >
                {/* Görsel placeholder */}
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '1 / 1',
                    overflow: 'hidden',
                    background: '#0a0a0a',
                    flexShrink: 0,
                  }}
                >
                  {"thumbnailUrl" in product &&
                  Boolean((product as { thumbnailUrl?: string | null }).thumbnailUrl) ? (
                    <img
                      src={String((product as { thumbnailUrl?: string | null }).thumbnailUrl || '')}
                      alt={product.name}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : null}
                  <span
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      fontSize: '3rem',
                      opacity: 0.15,
                      pointerEvents: 'none',
                    }}
                  >
                    ◈
                  </span>
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      fontSize: '9px',
                      letterSpacing: '0.15em',
                      background: 'rgba(201,168,76,0.1)',
                      color: '#c9a84c',
                      border: '1px solid rgba(201,168,76,0.2)',
                      padding: '3px 8px',
                      borderRadius: '2px',
                    }}
                  >
                    GLB + STL
                  </div>
                </div>

                {/* Bilgi */}
                <div
                  style={{
                    padding: '1.25rem',
                    borderTop: '1px solid rgba(255,255,255,0.07)',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                  }}
                >
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    {product.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: '9px',
                          letterSpacing: '0.1em',
                          color: '#4a4642',
                          border: '1px solid rgba(255,255,255,0.07)',
                          padding: '2px 7px',
                          borderRadius: '2px',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h2
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '1.2rem',
                      fontWeight: 300,
                      marginBottom: '6px',
                      lineHeight: 1.35,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      wordBreak: 'break-word',
                      minHeight: '3.24em',
                    }}
                  >
                    {product.name}
                  </h2>
                  <p
                    style={{
                      color: '#8a8278',
                      fontSize: '12px',
                      lineHeight: 1.7,
                      marginBottom: 0,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      wordBreak: 'break-word',
                      minHeight: '2.7rem',
                    }}
                  >
                    {product.story}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 'auto',
                      paddingTop: '0.5rem',
                    }}
                  >
                    <span
                      style={{
                        color: '#c9a84c',
                        fontFamily: 'var(--font-serif)',
                        fontSize: '1.3rem',
                        fontWeight: 300,
                      }}
                    >
                      ₺{product.price.toLocaleString(localeMap[locale] ?? 'tr-TR')}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        letterSpacing: '0.15em',
                        color: '#4a4642',
                        textTransform: 'uppercase',
                      }}
                    >
                      {copy.inspect} →
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
