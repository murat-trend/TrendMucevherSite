import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']

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
  } catch {
    return NextResponse.json({ error: 'Form verisi okunamadı' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const slug = formData.get('slug') as string | null
  const view = formData.get('view') as string | null

  if (!file || !slug) {
    return NextResponse.json({ error: 'Dosya veya slug eksik' }, { status: 400 })
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

  const filename = view ? `${slug}-${view}.webp` : `${slug}.webp`
  const key = `thumbnails/${filename}`

  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: webpBuffer,
    ContentType: 'image/webp',
  }))

  const url = `${process.env.R2_PUBLIC_BASE_URL}/${key}`

  return NextResponse.json({
    url,
    originalSize: buffer.length,
    webpSize: webpBuffer.length,
  })
}
