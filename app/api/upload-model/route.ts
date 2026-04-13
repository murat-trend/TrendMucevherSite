import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import {
  buildProductTranslationsFromSource,
  normalizeContentSourceLocale,
  productTranslationsToDbPatch,
} from '@/lib/modeller/product-translations-anthropic'
import { requireSeller } from '@/lib/auth/seller'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_GLB_SIZE = 50 * 1024 * 1024
const MAX_STL_SIZE = 100 * 1024 * 1024

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export async function POST(req: NextRequest) {
  // 1. Auth
  const auth = await requireSeller()
  if (!auth.ok) return auth.response

  // 2. Form parse
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Form verisi okunamadı' }, { status: 400 })
  }

  const slug = (formData.get('slug') as string | null)?.trim()
  if (!slug) {
    return NextResponse.json({ error: 'Slug eksik' }, { status: 400 })
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: 'Geçersiz slug formatı' }, { status: 400 })
  }

  const glb = formData.get('glb') as File | null
  const stl = formData.get('stl') as File | null

  if (!glb && !stl) {
    return NextResponse.json(
      { error: 'En az bir model dosyası gerekli (GLB veya STL)' },
      { status: 400 }
    )
  }

  // 3. Dosya validasyonu
  if (glb) {
    if (glb.size > MAX_GLB_SIZE) {
      return NextResponse.json({ error: "GLB dosyası 50 MB'dan büyük olamaz" }, { status: 413 })
    }
    if (!glb.name.toLowerCase().endsWith('.glb')) {
      return NextResponse.json({ error: 'Geçersiz GLB dosyası' }, { status: 400 })
    }
  }

  if (stl) {
    if (stl.size > MAX_STL_SIZE) {
      return NextResponse.json({ error: "STL dosyası 100 MB'dan büyük olamaz" }, { status: 413 })
    }
    if (!stl.name.toLowerCase().endsWith('.stl')) {
      return NextResponse.json({ error: 'Geçersiz STL dosyası' }, { status: 400 })
    }
  }

  // 4. Metin alanları
  const nameField  = ((formData.get('name')      as string) ?? '').trim()
  const storyField = ((formData.get('story')     as string) ?? '').trim()
  const sourceLang = normalizeContentSourceLocale(
    (formData.get('sourceLang') as string) ?? 'tr'
  )

  // 5. R2 yükleme
  const payload: {
    slug: string
    sellerId: string
    glbUrl?: string
    stlUrl?: string
    translationPatch?: ReturnType<typeof productTranslationsToDbPatch> | null
  } = { slug, sellerId: auth.session.userId }

  if (glb) {
    const buffer = Buffer.from(await glb.arrayBuffer())
    if (buffer.readUInt32LE(0) !== 0x46546c67) {
      return NextResponse.json({ error: 'Geçersiz GLB dosya formatı' }, { status: 400 })
    }
    const key = `models/${auth.session.userId}/${slug}.glb`
    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: 'model/gltf-binary',
      Metadata: {
        'uploaded-by': auth.session.userId,
        'product-slug': slug,
      },
    }))
    payload.glbUrl = `${process.env.R2_PUBLIC_BASE_URL}/${key}`
  }

  if (stl) {
    const buffer = Buffer.from(await stl.arrayBuffer())
    const key = `models/${auth.session.userId}/${slug}.stl`
    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: 'model/stl',
      Metadata: {
        'uploaded-by': auth.session.userId,
        'product-slug': slug,
      },
    }))
    payload.stlUrl = `${process.env.R2_PUBLIC_BASE_URL}/${key}`
  }

  // 6. Çeviri
  if (nameField) {
    try {
      const built = await buildProductTranslationsFromSource(sourceLang, nameField, storyField)
      if (built) {
        payload.translationPatch = productTranslationsToDbPatch(built, sourceLang)
      }
    } catch (e) {
      console.warn('[upload-model] translations skipped:', e)
    }
  }

  return NextResponse.json(payload)
}
