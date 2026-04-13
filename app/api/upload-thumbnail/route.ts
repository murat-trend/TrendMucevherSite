import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { requireSeller } from '@/lib/auth/seller'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_VIEWS = ['on', 'arka', 'kenar', 'ust']

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

  const file = formData.get('file') as File | null
  const slug = (formData.get('slug') as string | null)?.trim()
  const view = (formData.get('view') as string | null)?.trim()

  // 3. Validasyon
  if (!file || !slug) {
    return NextResponse.json({ error: 'Dosya veya slug eksik' }, { status: 400 })
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: 'Geçersiz slug formatı' }, { status: 400 })
  }

  if (view && !ALLOWED_VIEWS.includes(view)) {
    return NextResponse.json({ error: 'Geçersiz görsel açısı' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Dosya 10 MB'dan büyük olamaz" }, { status: 413 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Sadece JPG, PNG, WebP ve GIF desteklenir' },
      { status: 400 }
    )
  }

  // 4. Sharp ile WebP'ye çevir
  const buffer = Buffer.from(await file.arrayBuffer())

  let webpBuffer: Buffer
  try {
    webpBuffer = await sharp(buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer()
  } catch {
    return NextResponse.json({ error: 'Görsel işlenemedi' }, { status: 422 })
  }

  // 5. R2'ye yükle — key'e userId ekle (çakışma önleme)
  const filename = view
    ? `${auth.session.userId}/${slug}-${view}.webp`
    : `${auth.session.userId}/${slug}.webp`
  const key = `thumbnails/${filename}`

  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: webpBuffer,
    ContentType: 'image/webp',
    Metadata: {
      'uploaded-by': auth.session.userId,
      'product-slug': slug,
      'original-type': file.type,
    },
  }))

  const url = `${process.env.R2_PUBLIC_BASE_URL}/${key}`

  return NextResponse.json({
    url,
    originalSize: buffer.length,
    webpSize: webpBuffer.length,
    savings: `${Math.round((1 - webpBuffer.length / buffer.length) * 100)}%`,
  })
}
