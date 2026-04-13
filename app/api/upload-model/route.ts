import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import {
  buildProductTranslationsFromSource,
  normalizeContentSourceLocale,
  productTranslationsToDbPatch,
} from '@/lib/modeller/product-translations-anthropic'

export const runtime = 'nodejs'
export const maxDuration = 60

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export async function POST(req: NextRequest) {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch (e) {
    console.error('[upload-model] formData parse failed:', e)
    return NextResponse.json(
      { error: 'Form verisi okunamadı. Dosya çok büyük olabilir.' },
      { status: 400 }
    )
  }

  const slug = formData.get('slug') as string | null
  const glb = formData.get('glb') as File | null
  const stl = formData.get('stl') as File | null

  if (!slug) {
    return NextResponse.json({ error: 'Slug eksik' }, { status: 400 })
  }

  const nameField = typeof formData.get('name') === 'string' ? (formData.get('name') as string) : ''
  const storyField = typeof formData.get('story') === 'string' ? (formData.get('story') as string) : ''
  const sourceLang = normalizeContentSourceLocale(
    typeof formData.get('sourceLang') === 'string' ? (formData.get('sourceLang') as string) : 'tr',
  )

  const payload: {
    slug: string
    glbUrl?: string
    stlUrl?: string
    translationPatch?: ReturnType<typeof productTranslationsToDbPatch> | null
  } = { slug }

  try {
    if (glb) {
      const buffer = Buffer.from(await glb.arrayBuffer())
      const key = `models/${slug}.glb`
      await s3.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: buffer,
        ContentType: 'model/gltf-binary',
      }))
      payload.glbUrl = `${process.env.R2_PUBLIC_BASE_URL}/${key}`
    }

    if (stl) {
      const buffer = Buffer.from(await stl.arrayBuffer())
      const key = `models/${slug}.stl`
      await s3.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: buffer,
        ContentType: 'model/stl',
      }))
      payload.stlUrl = `${process.env.R2_PUBLIC_BASE_URL}/${key}`
    }
  } catch (e) {
    console.error('[upload-model] R2 upload failed:', e)
    return NextResponse.json(
      { error: 'Model dosyası yüklenemedi (depolama hatası)' },
      { status: 502 }
    )
  }

  if (nameField.trim()) {
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
